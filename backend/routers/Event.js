const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const User = require("../models/User");
const moment = require("moment");
const Ticket = require("../models/Ticket");
const { transporter } = require('./utils');



router.post("/createevent", findUserByEmail, async (req, res) => {
  try {
    const eventDate = new Date(req.body.date);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate < today) {
      return res
        .status(400)
        .json({
          message: "Event date is in the past. Please select a valid date.",
        });
    }

    const event = new Event(req.body);
    const savedEvent = await event.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
    console.log(error);
  }
});

router.get("/search", async (req, res) => {
  try {
    let filter = { expired: false };

    if (req.query.term) {
      const searchTerm = new RegExp(req.query.term, "i");
      filter.$or = [
        { title: { $regex: searchTerm } },
        { description: { $regex: searchTerm } },
      ];
    }

    if (req.query.date) {
      const searchDate = new Date(req.query.date);
      filter.date = { $gte: searchDate };
    }

    if (req.query.country) {
      filter["location.country"] = req.query.country;
    }

    if (req.query.city) {
      filter["location.city"] = req.query.city;
    }

    if (req.query.tag) {
      filter.tag = req.query.tag;
    }

    const events = await Event.find(filter).sort({ date: 1 });

    res.json(events);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
    console.log(err)
  }
});

router.get("/getAllEvents/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findOne({ email: userId });
    const events = await Event.find({ createdBy: user._id });
    res.status(201).json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

router.get("/getUpcomingEvents", async (req, res) => {
  try {
    const currentDate = new Date();
    const upcomingEvents = await Event.find({
      expired: false,
      date: { $gte: currentDate },
    })
      .sort({ date: "asc" })
      .exec();

    res.status(201).json(upcomingEvents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/getExpiredEvents/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findOne({ email: userId });
    const events = await Event.find({ createdBy: user._id, expired: true });

    // if (!events || events.length === 0) {
    //   return res.status(201).json({ message: "No expired events found" });
    // }

    res.status(200).json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/editevent/:id", async (req, res) => {
  try {
    const eventId = req.params.id;
    const updatedEvent = req.body;

    const dateString1 = new Date();
    const dateString2 = updatedEvent.date;

    const date1 = moment(dateString1);
    const date2 = moment(dateString2, "YYYY-MM-DD");

    const formattedDate1 = date1.format("YYYY-MM-DD");

    if (dateString2 < formattedDate1) {
      updatedEvent.expired = true;
    }

    const event = await Event.findByIdAndUpdate(eventId, updatedEvent, {
      new: true,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/getevent/:id", async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId).populate("createdBy");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/searchevents", async (req, res) => {
  try {
    const { title, description } = req.query;

    const events = await Event.find({
      $or: [
        { title: { $regex: title, $options: "i" } },
        { description: { $regex: description, $options: "i" } },
      ],
    });

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/deleteevent/:id", async (req, res) => {
  try {
    const eventId = req.params.id;
    const isAdmin = req.body.isAdmin;

    const event = await Event.findById(eventId).populate("createdBy");

    console.log(event)

    const deletedEvent = await Event.findByIdAndDelete(eventId);

    if(event?.expired){
      console.log("Expired event deleted")
      return res.json({message:"deleted the expired event"});
    }

    if (!deletedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    const tickets = await Ticket.find({ event: eventId }).populate("user");
    await Ticket.deleteMany({ event: eventId });

    if (isAdmin) {
      let mailOptions = {
        from: "YOUR_EMAIL",
        to: event.createdBy.email,
        subject: "Your Event has been deleted",
        html: `
          <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Event Deleted</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
    <table style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="background-color: #f54278; color: #fff; text-align: center; padding: 20px; border-top-left-radius: 10px; border-top-right-radius: 10px;">
          <h1>Event Deleted</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px;">
          <p>Dear ${event.createdBy.displayName},</p>
          <p>We regret to inform you that the event <span style="font-weight: 800"> ${event.title} </span> you created has been deleted by our system administrator due to policy violations.</p>
          <p>Please feel free to contact our support team if you have any questions or concerns.</p>
        </td>
      </tr>
      <tr>
        <td style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
          <div style="background-color: #900797; padding: 1em;">
            <img src="https://firebasestorage.googleapis.com/v0/b/event-finder12.appspot.com/o/logo.png?alt=media&token=7d4c3f0f-6c77-4c17-9e48-3bcc0e5f0445" alt="Your Logo" style="width: 105px; height: 85px;">
          </div>
          <p>Discover upcoming events in your town: Your go-to online destination for staying updated with the latest happenings.</p>
          <p>Made with ❤️ by Sekh Mohammad Irfan</p>
        </td>
      </tr>
    </table>
  </body>
  </html>
  
          `,
      };

      // Send the email
      let info = await transporter.sendMail(mailOptions);
    }

    for (const ticket of tickets) {
    let mailOptions = {
      from: "YOUR_EMAIL",
      to: ticket.user.email,
      subject: "Your ticket has been canceled due to event cancelation",
      html: `
        <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Event Deleted</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <table style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
    <tr>
      <td style="background-color: #f54278; color: #fff; text-align: center; padding: 20px; border-top-left-radius: 10px; border-top-right-radius: 10px;">
        <h1>Event Deleted</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px;">
        <p>Dear ${ticket.user.displayName},</p>
        <p>We regret to inform you that the event <span style="font-weight: 800">${event.title}</span> has been deleted due to some unforeseen circumstances.</p>
        <p>Your ticket for this event has been canceled due to the event's removal. A support team member will follow up within 72 working hours to process your refund.</p>
        <p>We sincerely apologize for any inconvenience this may have caused.</p>
      </td>
    </tr>
    <tr>
      <td style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
        <div style="background-color: #900797; padding: 1em;">
          <img src="https://firebasestorage.googleapis.com/v0/b/event-finder12.appspot.com/o/logo.png?alt=media&token=7d4c3f0f-6c77-4c17-9e48-3bcc0e5f0445" alt="Your Logo" style="width: 105px; height: 85px;">
        </div>
        <p>Discover upcoming events in your town: Your go-to online destination for staying updated with the latest happenings.</p>
        <p>Made with ❤️ by Sekh Mohammad Irfan</p>
      </td>
    </tr>
  </table>
</body>
</html>


        `,
    };

    // Send the email
    let info = await transporter.sendMail(mailOptions);
  }

    res.json({ message: "Event deleted successfully and the tickets for it, also email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

async function findUserByEmail(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.body.createdBy = user._id;
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = router;
