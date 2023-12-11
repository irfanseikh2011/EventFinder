const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Ticket = require('./models/Ticket');
const Event = require('./models/Event');  

require('dotenv').config();  

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_EMAIL,
      pass: process.env.MAIL_PASS 
    }
  });


cron.schedule('0 1 * * *', async () => {
  try {
    const currentDate = new Date();
    const tomorrowDate = new Date(currentDate);
    tomorrowDate.setDate(currentDate.getDate() + 2);
    
    tomorrowDate.setHours(0,0,0,0)
    

    const tickets = await Ticket.find({
      event: { $in: await Event.find({ date: { $eq: tomorrowDate.toISOString().split('T')[0] } }) },
    }).populate('user event');

    console.log(tickets)

   
    for (const ticket of tickets) {
      const mailOptions = {
        from: 'YOUR_EMAIL',
        to: ticket.user.email,
        subject: `Reminder: Event - ${ticket.event.title}`,
        html: `
        <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Event Reminder Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <table style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
        <tr>
          <td style="background-color: #007bff; color: #fff; text-align: center; padding: 20px; border-top-left-radius: 10px; border-top-right-radius: 10px;">
            <h1>Event Reminder Email</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px;">
            <p>Hi ${ticket.user.displayName},</p>
            <p>We are excited to have you attend our event tomorrow. Enjoy the event! </p>
            <h4>Event Name: ${ticket.event.title}</h4>
            <h4>No. of Tickets: ${ticket.numberOfTickets}</h4>
            <h4>Venue: ${ticket.event.location.address}, ${ticket.event.location.city} , ${ticket.event.location.pincode}</h4>
            <h4>Time: ${ticket.event.time} GMT</h4>
    
            
            <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px;">
              <p><strong>Ticket code:</strong> ${ticket.ticketCode}</p>
              <div style="display: block; width: 200px; height: 200px; margin: 20px auto; background-image: url(${ticket.qrCode}); background-size: cover; background-repeat: no-repeat;"></div>
            </div>
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

      await transporter.sendMail(mailOptions);
      console.log(`Reminder email sent to ${ticket.user.email}`);
    }
  } catch (error) {
    console.error('Error sending reminder emails:', error);
  }
}, {
  scheduled: true,
  timezone: 'Europe/London', 
});
