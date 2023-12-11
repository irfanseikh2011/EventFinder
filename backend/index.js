const express = require('express')
const app = express();
const cors = require('cors');
const db = require("./db");
const userRoutes = require('./routers/User');
const eventRoutes = require('./routers/Event')
const ticketRoutes = require('./routers/Ticket')
const adminRoutes = require('./routers/SysAdmin')
const nodemailer  = require('nodemailer')
const statsRoutes = require('./routers/Statistics');
const Ticket = require('./models/Ticket');
const AppData = require('./models/AppData');


require('./eventScheduler');

require('./reminderEmail');

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json())

require('dotenv').config();  
db.connect();


// const currentDate = new Date();
// const tomorrowDate = new Date(currentDate);

// tomorrowDate.setDate(currentDate.getDate() + 2);

// tomorrowDate.setHours(0,0,0,0)

// console.log(tomorrowDate)


app.use('/users',userRoutes);
app.use('/events',eventRoutes);
app.use('/ticket',ticketRoutes);
app.use('/data', statsRoutes);
app.use('/admin', adminRoutes);





const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_EMAIL,
    pass: process.env.MAIL_PASS 
  }
});

app.post('/sendReceipt', async (req, res) => {
   try {
    const { userEmail, ticketCode, qrCode,name } = req.body;

    const ticket = await Ticket.findOne({qrCode:qrCode}).populate('event');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
  }



let mailOptions = {
    from: 'YOUR_EMAIL',
    to: userEmail,
    subject: 'Ticket Details',
    html: `
    <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Event Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <table style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
    <tr>
      <td style="background-color: #007bff; color: #fff; text-align: center; padding: 20px; border-top-left-radius: 10px; border-top-right-radius: 10px;">
        <h1>Thank you for your purchase!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px;">
        <p>Dear ${name},</p>
        <p>We are excited to have you attend our event. Here are your receipt and ticket details:</p>
        <h4>Event Name: ${ticket.event.title}</h4>
        <h4>No. of Tickets: ${ticket.numberOfTickets}</h4>
        <h4>Venue: ${ticket.event.location.address}, ${ticket.event.location.city} , ${ticket.event.location.pincode}</h4>
        <h4>Time: ${ticket.event.time} GMT</h4>

        
        <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px;">
          <p><strong>Ticket code:</strong> ${ticketCode}</p>
          <div style="display: block; width: 200px; height: 200px; margin: 20px auto; background-image: url(${qrCode}); background-size: cover; background-repeat: no-repeat;"></div>
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

// Send the email
let info = await transporter.sendMail(mailOptions);

res.send({ status: 'Email sent' });

   } catch(err) {
    res.status(500).json({message:err});
   }
});



app.post("/addTraffic", async(req,res)=> {
  try{
    const currentDate =  new Date().setHours(0, 0, 0, 0);
    const trafficData = await AppData.findOne({date:currentDate})

    if(!trafficData)
      await AppData.create({date:currentDate, trafficCount:1});
    else {
      trafficData.trafficCount +=1;
      await trafficData.save();
    }
    res.json(trafficData);

  } catch (err) {
    res.status(500).json({message:err});
  }
})



app.post("/create-payment-intent", async (req, res) => {
  try {
    const amount = req.body.amount;

    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "gbp",
        automatic_payment_methods: {
            enabled: true,
        },
    });
  
    res.send({
        clientSecret: paymentIntent.client_secret,
    });
  } catch(err){
    res.status(400).json({message:err});
  }

});







app.listen(PORT, () => {
    console.log(`Queue Interest API is running on PORT No- ${PORT}`);
  });

