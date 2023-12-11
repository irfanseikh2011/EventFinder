const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['organizer', 'siteAdmin', 'customer'],
      default: 'customer',
    },
    phone: {
      code: {
        type: String,
        enum: ['GB','IT','IN','FR','ES','US'],
        default: 'GB'
      },
      mobileNumber: {
        type: String,
        default:null
      },
      },
      picture: {
        type: String,
        default: null,
      },
      country: {
        type: String,
        default: null,
      }
  },
  { timestamps: true }
);
  
const User = mongoose.model('User', userSchema);

module.exports = User;
