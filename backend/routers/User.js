const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require('../models/User');
const { getUserCountry } = require('./utils');
require('dotenv').config();





// router.get('/test', async (req,res)=> {
//   try{
//     const isLocalDevelopment = process.env.NODE_ENV === 'development' ;
//     res.json(isLocalDevelopment);
//   }catch(err){
//     res.json(err);
//   }
// })



router.post('/createuser', async (req, res) => {
    const userIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const isLocalDevelopment = process.env.NODE_ENV === 'development';

    try {
      const oldUser = await User.find({email:req.body.email});
      var country='';
      if(isLocalDevelopment)
      {
        country = 'GB'
      } else {
        country = await getUserCountry(userIpAddress);
      }
      if(oldUser.length < 1){
        
        const newUser = new User({
          ...req.body,
          country: country,
        });
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
      } else {
        res.status(400).json({message: "User already Exists"});
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });


router.get('/getuser/:id', async (req,res) => {
    try {
        const resUser = await User.findOne({email:req.params.id});
        if (!resUser)
          return res.status(400).json({"error": "User not found"})

        res.status(201).json(resUser);
    } catch (err) {
        res.status(400).json({error: err.message})
    }
})


router.put('/updateUser/:id', async (req, res) => {
  const userId = req.params.id;
  const updates = req.body;

  try {
    const updatedUser = await User.findOneAndUpdate({email:userId}, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});






module.exports = router;
