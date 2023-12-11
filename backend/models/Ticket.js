const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  qrCode: {
    type: String,
    required: true,
    unique: true,
  },
  ticketCode: {
    type: String,
    required: true,
    unique: true,
  },
  numberOfTickets: {
    type: Number,
    required: true
  },
  BoughtCountryCode: {
    type: String,
    required: true
  },
  checkedIn: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
