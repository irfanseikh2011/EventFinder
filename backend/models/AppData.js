const mongoose = require('mongoose');

const appSchema = new mongoose.Schema({
    date: {
      type: Date,
      required: true,
    },
    trafficCount: {
      type: Number,
      default: 1,
    },
  });

const AppData = mongoose.model('site-data', appSchema);

module.exports = AppData;
