const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  tag: {
    type: String,
    required: true
  },
  ticketSold: {
    type: Number,
    default: 0
  },
  income: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  ticketPrice: {
    type: Number,
    required: true
  },
  numberOfTickets: {
    type: Number,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    }
  },
  duration: {
    type: Number,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expired: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
