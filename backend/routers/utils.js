const qrcode = require('qrcode');
const crypto = require('crypto');
const nodemailer = require("nodemailer");


async function generateQRCode(text) {
    try {
      return await qrcode.toDataURL(text);
    } catch (error) {
      console.error('QR code data URL generation failed:', error);
      return null;
    }
  }

  
  function generateRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  async function getUserCountry(ip) {
    const apiKey = process.env.IP_INFO_KEY;
    const response = await fetch(`https://ipinfo.io/${ip}?token=${apiKey}`);
    const data = await response.json();
    return data.country;
  }


const gmailEmail = process.env.MAIL_EMAIL;
const gmailPassword = process.env.MAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});


function formatDate(timestamp) {
  const date = new Date(timestamp);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}


  module.exports = {
    generateQRCode,
    generateRandomString,
    getUserCountry,
    transporter,
    formatDate
  };