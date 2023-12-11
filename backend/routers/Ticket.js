const express = require('express');
const mongoose = require("mongoose");
const router = express.Router();
const qrcode = require('qrcode');
const crypto = require('crypto');
const Event = require('../models/Event');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { generateQRCode, generateRandomString } = require('./utils');


  router.put('/update-qr-url/:ticketId', async (req, res) => {
    const { ticketId } = req.params;
    const { qrURL } = req.body;
    try {
      const ticket = await Ticket.findByIdAndUpdate(
        ticketId,
        { $set: {qrCode: qrURL } },
        { new: true }
      );
  
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
  
      res.status(200).json( ticket );
    } catch (error) {
      console.error('Error updating QR URL:', error);
      res.status(500).json({ message: 'An error occurred' });
    }
  });



  router.get('/getTicketForUser/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findOne({ email: userId });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const tickets = await Ticket.find({ user: user._id })
        .populate('event')
        .populate('user');



      if(!tickets)
        return res.json({message:"No tickets found"});
  
      tickets.sort((ticketA, ticketB) => ticketA.event !== null &&  ticketB.event !== null &&  new Date(ticketA.event.date) - new Date(ticketB.event.date));
  
      const currentDate = new Date().setHours(0,0,0,0);
     
      const activeTickets = tickets.filter(
        ticket =>
          ticket.event !== null && new Date(ticket.event.date) >= currentDate 
      );
      
      const expiredTickets = tickets.filter(
        ticket =>
          ticket.event !== null && new Date(ticket.event.date) < currentDate
      );
  
      res.status(200).json({ activeTickets, expiredTickets });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'An error occurred' });
    }
  });

  router.get('/getTicketDetails/:ticketID', async(req,res)=> {
    try{
      const {ticketID} = req.params;

      const ticket = await Ticket.findById(ticketID).populate('event');

      if(!ticket)
        return res.status(404).json({message:"Ticket not found"});

      res.status(200).json(ticket);
    } catch (err) {
      res.status(500).json({message:"An error occurred"});
    }
  })
  


router.post('/createticket', async (req, res) => {
    try {
      const { id, userId,numberOfTickets } = req.body;
      
      const user = await User.findOne({_id:userId});
      const event = await Event.findOne({_id:id});
      if(!user)
       return res.status(200).json({message:"User does not exist"})
    
      if(!event)
      return res.status(200).json({message:"Event does not exist"});

      const newTicketSold = event.ticketSold + parseInt(numberOfTickets)

        if (newTicketSold > event.numberOfTickets) {
            return res.status(400).json({ message: "Event is sold out.",tickets: newTicketSold});
          }
      
        const randomString = generateRandomString(16);

    const ticketCode = randomString+userId.slice(0,5); 
    const qrCodeData = `${event}-${user}-${randomString}`;

   
    const qrCode = await generateQRCode(qrCodeData); 
    const BoughtCountryCode = user.country;

      const ticket = await Ticket.create({ event, user, qrCode,ticketCode,numberOfTickets,BoughtCountryCode});
      event.ticketSold += parseInt(numberOfTickets);
      event.income += (event.ticketPrice * parseInt(numberOfTickets))
      await event.save();
      return res.status(201).json(ticket); 
    } catch (error) {
        return res.status(500).json({ message: error });
    }
  });


  module.exports = router