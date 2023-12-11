const express = require('express');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const router = express.Router();
const Event = require('../models/Event')
const { transporter,formatDate } = require('./utils');



var serviceAccount = require("../event-finder12-firebase-adminsdk-e50mx-68d29c88d7.json");
const User = require('../models/User');
const Ticket = require('../models/Ticket');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});






router.get('/getcustomers', async (req, res) => {
  
    try {
        const mongoUsers = await User.find({
            role: 'customer', 
          });
      
          const emailAddresses = mongoUsers.map(user => user.email);
      

          const firebaseUsers = [];
          for (const email of emailAddresses) {
            try {
              const [firebaseUser] = await Promise.all([
                admin.auth().getUserByEmail(email)
              ]);
              if (firebaseUser ) {
                const firebaseDetails = {
                    ...firebaseUser,
                    creationTimeFormatted: formatDate(firebaseUser.metadata.creationTime)
                  }
                firebaseUsers.push(firebaseDetails);
              }
            } catch (error) {
              console.error(`Error fetching user: ${email}`, error);
            }
          }
  
        res.status(200).json(firebaseUsers);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Error fetching user' });
    }
  });




  router.get('/getorganizers', async (req, res) => {
  
    try {
        const mongoUsers = await User.find({
            role: 'organizer', 
          });
      
          const emailAddresses = mongoUsers.map(user => user.email);
      

          const firebaseUsers = [];
          for (const email of emailAddresses) {
            try {
              const [firebaseUser] = await Promise.all([
                admin.auth().getUserByEmail(email)
              ]);
              if (firebaseUser ) {
                const firebaseDetails = {
                    ...firebaseUser,
                    creationTimeFormatted: formatDate(firebaseUser.metadata.creationTime)
                  }
                firebaseUsers.push(firebaseDetails);
              }
            } catch (error) {
              console.error(`Error fetching user: ${email}`, error);
            }
          }
  
        res.status(200).json(firebaseUsers);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Error fetching user' });
    }
  });


  router.delete('/deleteUser/:email', async(req,res)=> {
        const {email} = req.params;
    try{
        const user = await admin.auth().getUserByEmail(email);

    await admin.auth().deleteUser(user.uid);
    
    const UserDetails = await User.findOne({email:email});
    await User.findOneAndDelete({ email: email });

    var userMessage = '';

   if(UserDetails.role === 'organizer'){
    userMessage = `<p>Dear ${UserDetails.displayName},</p>
      <p>We regret to inform you that your account and the events you created with us has been deleted by our system administrator due to policy violations.</p>
      <p>Please feel free to contact our support team if you have any questions or concerns.</p>`
   } else {
    userMessage = `<p>Dear ${UserDetails.displayName},</p>
      <p>We regret to inform you that your account and the tickets you purchased with us has been deleted and canceled by our system administrator due to policy violations.</p>
      <p> A support team member will follow up within 72 working hours to process your refund if any.</p>
      <p>Please feel free to contact our support team if you have any questions or concerns.</p>`
   }


    let mailOptions = {
      from: 'YOUR_EMAIL',
      to: email,
      subject: 'Your Event-Finder account has been deleted',
      html: `
      <!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Account Deleted</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
<table style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
  <tr>
    <td style="background-color: #f54278; color: #fff; text-align: center; padding: 20px; border-top-left-radius: 10px; border-top-right-radius: 10px;">
      <h1>Account Deleted</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 20px;">
     ${userMessage}
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


  if(UserDetails.role === 'organizer') {
    const eventsToDelete = await Event.find({ createdBy: UserDetails._id });
    if (eventsToDelete.length === 0) {
      return res.status(404).json({ message: 'No events found for the user' });
    }

    var tickets = [];
    for (const event of eventsToDelete) {
      tickets = await Ticket.find({event:event._id}).populate("user").populate('event');
      await Ticket.deleteMany({ event: event._id });
    }

    await Event.deleteMany({ createdBy: UserDetails._id });


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
    <title>Ticket Cancelled</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
    <table style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="background-color: #f54278; color: #fff; text-align: center; padding: 20px; border-top-left-radius: 10px; border-top-right-radius: 10px;">
          <h1>Ticket Cancelled</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px;">
          <p>Dear ${ticket.user.displayName},</p>
          <p>We regret to inform you that the event <span style="font-weight: 800">${ticket.event.title}</span> has been deleted due to some unforeseen circumstances.</p>
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


  }




    res.json({message:"Delete successfuly and sent emails as well"});
    } catch(err) {
        res.json({message:err});
    }
  })


  router.put('/disableUser/:email', async(req,res)=> {
    const {email} = req.params;
    try{
        const user = await admin.auth().getUserByEmail(email);
        if(!user){
          return res.json("User not found");
        }
        await admin.auth().updateUser(user.uid, {
          disabled: true
        });
        
    
        res.json({message:"User Disabled"});
    } catch(err) {
        res.json(err);
    }
  })


  router.put('/enableUser/:email', async(req,res)=> {
    const {email} = req.params;
    try{
        const user = await admin.auth().getUserByEmail(email);
        if(!user){
          return res.json("User not found");
        }
        await admin.auth().updateUser(user.uid, {
          disabled: false
        });
        console.log("About to send: User Enabled");
        res.json({message:"User Enabled"});
    } catch(err) {
      console.log(err)
        res.json(err);
    }
  })



  router.get('/manageEvents', async (req,res) => {
    try {
      const events = await Event.find({}).sort({ date: 1 }).populate("createdBy");
      if(!events)
        return res.json({message:"No events"})

        const expiredEvents = events.filter(event => event.expired);
        const activeEvents = events.filter(event => !event.expired);
    
        res.json({ expiredEvents, activeEvents });
    } catch(err) {
      res.status(500).json({message:"Error occured", err});
    }
  })



  module.exports = router