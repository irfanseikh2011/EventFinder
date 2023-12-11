const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Event = require('../models/Event')
const User = require('../models/User')
const Ticket = require('../models/Ticket');
const AppData = require("../models/AppData");


router.get('/event-popularity', async (req, res) => {
    try {
      const events = await Event.find({}, 'ticketSold ticketPrice').exec();

      const data = events.map((event) => ({
        price: event.ticketPrice,
        ticketsSold: event.ticketSold,
      }));
  
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  router.get('/ticket-sales-by-category', async (req, res) => {
    try {
      const events = await Event.find({}, 'tag ticketSold').exec();
      const ticketSalesByCategory = {};
      events.forEach((event) => {
        if (!ticketSalesByCategory[event.tag]) {
          ticketSalesByCategory[event.tag] = event.ticketSold;
        } else {
          ticketSalesByCategory[event.tag] += event.ticketSold;
        }
      });

  
      const data = Object.keys(ticketSalesByCategory).map((category) => ({
        category,
        ticketSales: ticketSalesByCategory[category],
      }));
  
      return res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  router.get('/dashboard-daily-data', async (req, res) => {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
  
      const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });
      const newUsersYesterday = await User.countDocuments({ createdAt: { $gte: yesterday, $lt: today } });
      const newUsersChange = newUsersToday - newUsersYesterday;
  
      const ticketsBoughtToday = await Ticket.countDocuments({ createdAt: { $gte: today } });
      const ticketsBoughtYesterday = await Ticket.countDocuments({ createdAt: { $gte: yesterday, $lt: today } });
      const ticketsBoughtChange = ticketsBoughtToday - ticketsBoughtYesterday;
  
      const dashboardData = {
        newUsers: newUsersToday,
        ticketsBought: ticketsBoughtToday,
        newUsersChange: newUsersChange,
        ticketsBoughtChange: ticketsBoughtChange,
      };
  
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred while fetching dashboard data.' });
    }
  });


  router.get('/testData/:id', async (req,res)=> {
    try{
      const { id } = req.params;
      const userId = await User.findOne({email:id}) 

      if(!userId)
        return res.json({"message": "User not found"})

      const userEvents = await Event.find({ createdBy: userId });
      const eventIds = userEvents.map(event => event._id);

      const ticketsByCountry = await Ticket.aggregate([
        {
          $match: { event: { $in: eventIds } }
        },
        {
          $group: {
            _id: '$BoughtCountryCode',
            totalTickets: { $sum: '$numberOfTickets' }
          }
        }
      ]);
      res.json(ticketsByCountry);
    }catch(err) {
      res.json(err);
    }
  })


  router.get('/adminData', async(req,res)=> {
    try{
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      today.setHours(0,0,0,0);

      const allEvents = await Event.find();
      const totalIncome = allEvents.reduce((total, event) => total + event.income, 0);

      const incomeTillYesterday = await Event.find({createdAt: {$lt: today}});
      const orginalIncome = incomeTillYesterday.reduce((total, event) => total + event.income, 0);

      const todayAndFutureEvents = await Event.find({ createdAt: { $gte: today } });
      const todayIncome = todayAndFutureEvents.reduce((total, event) => total + event.income, 0);
      const percentageChange = Math.floor((todayIncome  / orginalIncome) * 100);

      const revenue = {
        totalIncome,
        percentageChange,
      }


      const allUsers = await User.find();
      const totalUsers = allUsers.length;

      const usersTillYesterday = await User.find({createdAt: {$lt: today}});
      const orginalUsers = usersTillYesterday.length;

      const todayAndFutureUsers = await User.find({ createdAt: { $gte: today } });
      const todayUsers = todayAndFutureUsers.length;
      const usersPercentageChange = Math.floor((todayUsers  / orginalUsers) * 100);

      const usersData = {
        totalUsers,
        usersPercentageChange,
        todayUsers,
        orginalUsers
      }



      const allTickets = await Ticket.find();
      const totalTickets = allTickets.length;

      const ticketsTillYesterday = await Ticket.find({createdAt: {$lt: today}});
      const orginalTickets = ticketsTillYesterday.length;

      const todayAndFutureTickets = await Ticket.find({ createdAt: { $gte: today } });
      const todayTickets = todayAndFutureTickets.length;
      const TicketPercentageChange = Math.floor((todayTickets  / orginalTickets) * 100);

      const ticketData = {
        totalTickets,
        TicketPercentageChange,
      }



      const trafficYesterday = await AppData.findOne({date: yesterday});
      const orginalTraffic = trafficYesterday?.trafficCount ? trafficYesterday.trafficCount : 0;

      const todayAndFutureTraffic = await AppData.findOne({ date: today  });
      const todayTraffic = todayAndFutureTraffic?.trafficCount ? todayAndFutureTraffic.trafficCount : 0 ;
      const TrafficPercentageChange = Math.floor(((todayTraffic - orginalTraffic)  / orginalTraffic) * 100);

      const trafficData = {
        todayTraffic,
        TrafficPercentageChange,
      }



      const salesByEventCategory = await Event.aggregate([
        {
          $group: {
            _id: '$tag', 
            totalIncomeByCategory: { $sum: '$income' },
            ticketSales: { $sum: '$ticketSold' }
          }
        },
        {
          $project: {
            category: '$_id',
            totalIncomeByCategory: 1,
            ticketSales: 1
          }
        },
        {
          $sort: {
            totalIncomeByCategory: -1
          }
        }
      ]);

      const salesByTicketPrice = await Event.aggregate([
        {
          $group: {
            _id: {
              ticketPrice: '$ticketPrice'
            },
            totalTicketSales: { $sum: '$ticketSold' }
          }
        },
        {
          $project: {
            _id: 0,
            ticketPrice: '$_id.ticketPrice',
            totalTicketSales: 1
          }
        }
      ]);



      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      function getAdjustedStartOfDay() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        startOfDay.setHours(startOfDay.getHours() - 1);
        return startOfDay;
      }

      function getAdjustedEndOfDay() {
        const endOfDay = new Date();
        endOfDay.setHours(0, 0, 0, 0);
        endOfDay.setHours(endOfDay.getHours() + 23);
        return endOfDay;
      }
      
      // function adjustByOneHourBack(date) {
      //   const adjustedDate = new Date(date);
      //   adjustedDate.setHours(adjustedDate.getHours() - 1);
      //   return adjustedDate;
      // }
      

      const startOfLastDay = getAdjustedStartOfDay();
    const endOfNextDay = getAdjustedEndOfDay();

    const ticketSalesByHourData = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLastDay, $lt: endOfNextDay }
        }
      },
      {
        $group: {
          _id: {
            hour: {
              $hour: {
                $add: ['$createdAt', 60 * 60 * 1000] 
              }
            }
          },
          totalTicketsSold: { $sum: '$numberOfTickets' }
        }
      },
      {
        $sort: {
          '_id.hour': 1
        }
      }
    ]);


const currentHour = new Date().getHours();

const data = [];


for (let hour = 0; hour <= currentHour; hour++) {
  data.push({
    x: hour === 24 ? '00:00' : `${hour.toString().padStart(2, '0')}:00`,
    y: 0
  });
}

if (currentHour === 0) {
  data.push({
    x: '01:00',
    y: 0
  });
}

// ticketSalesByHourData.forEach(item => {
//   const hour = item._id.hour;
//   if (hour !== undefined && hour >= 0 && hour < 24) {
//     data[hour].y = item.totalTicketsSold;
//   }
// });

ticketSalesByHourData.forEach(item => {
  const hour = item._id.hour;
  if (hour !== undefined && hour >= 0 && hour < 24) {
    if (data[hour]) { 
      data[hour].y = item.totalTicketsSold;
    } else {
      console.log(`Data for hour ${hour} is missing.`);
    }
  }
});

    const ticketSalesByHour = [{
      id: 'Tickets Sold', 
      color: 'hsl(348, 70%, 50%)',
      data
    }]




    const ticketsByCountry = await Ticket.aggregate([
      {
        $group: {
          _id: '$BoughtCountryCode',
          totalTickets: { $sum: '$numberOfTickets' }
        }
      }
    ]);


      const adminStats = {
        revenue,
        usersData,
        ticketData,
        trafficData,
        salesByEventCategory,
        salesByTicketPrice,
        ticketSalesByHour,
        ticketsByCountry
      }


      res.json(adminStats);

    } catch(err) {
      res.json({err});
      console.log(err)
    }
  })


  router.get('/organizerData/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const userId = await User.findOne({email:id}) 

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventsCreatedByUser = await Event.find({ createdBy: userId._id });


      const EventsCreatedYesterday = (await Event.find({createdBy: userId._id,createdAt: { $gte: yesterday, $lt: today }}));
      const EventsCreatedToday = (await Event.find({createdBy: userId._id, createdAt: { $gte: today }}));
      const eventsDifference = EventsCreatedToday.length - EventsCreatedYesterday.length;
      var eventDifferencePercentage = 0;
      if(eventsDifference !== 0){
        eventDifferencePercentage = Math.floor((eventsDifference / EventsCreatedYesterday) * 100);
      }
      





        const eventIds = eventsCreatedByUser.map(event => event._id);

        const ticketsYesterday = await Ticket.find({
            event: { $in: eventIds },
            createdAt: { $gte: yesterday, $lt: today }
        }).populate('event');

        const ticketsToday = await Ticket.find({
            event: { $in: eventIds },
            createdAt: { $gte: today } 
        }).populate('event');


        const ticketsByCountry = await Ticket.aggregate([
          {
            $match: { event: { $in: eventIds } }
          },
          {
            $group: {
              _id: '$BoughtCountryCode',
              totalTickets: { $sum: '$numberOfTickets' }
            }
          }
        ]);
  




        const totalRevenueYesterday = ticketsYesterday.reduce((sum, ticket) => sum + ticket.numberOfTickets * ticket.event.ticketPrice, 0);
        const totalRevenueToday = ticketsToday.reduce((sum, ticket) => sum + ticket.numberOfTickets * ticket.event.ticketPrice, 0);
        const revenueDifference = totalRevenueToday - totalRevenueYesterday;
        var revenuePercentage = 0;
        if(revenueDifference!== 0)
          revenuePercentage = Math.floor((revenueDifference / totalRevenueYesterday) * 100);


        const totalTicketsSoldYesterday = ticketsYesterday.reduce((sum, ticket) => sum + ticket.numberOfTickets, 0);
        const totalTicketsSoldToday = ticketsToday.reduce((sum, ticket) => sum + ticket.numberOfTickets, 0);
        const ticketsSoldDifference = totalTicketsSoldToday - totalTicketsSoldYesterday;
        var ticketsSoldPercentage = 0;
        if(ticketsSoldDifference!==0)
          ticketsSoldPercentage = Math.floor((ticketsSoldDifference / totalTicketsSoldYesterday) * 100);


        const Eventbreakdown = await Event.aggregate([
          {
            $match: {
              createdBy: userId._id,
            },
          },
          {
            $group: {
              _id: '$tag',
              totalEvents: { $sum: 1 },
            },
          },
          {
            $project: {
              category: '$_id',
              totalEvents: 1,
            },
          },
        ]);


        const aggregateResult = await Event.aggregate([
          {
              $match: {
                  createdBy: userId._id
              }
          },
          {
              $group: {
                  _id: '$createdBy',
                  totalIncome: { $sum: '$income' },
                  totalTicketsPurchased: { $sum: '$ticketSold' },
                  totalEvents: { $sum: 1 }
              }
          }
      ]);

     
      const topEvent = await Event.find({
          createdBy: userId._id
      },'title income ticketSold tag')
      .sort({ income: -1 })
      .limit(1);

      const salesByEventCategory = await Event.aggregate([
        {
            $match: {
                createdBy: userId._id
            }
        },
        {
            $group: {
                _id: '$tag', 
                totalIncomeByCategory: { $sum: '$income' },
                ticketSales: { $sum: '$ticketSold' }
            }
        },
        {
            $project: {
                category: '$_id',
                totalIncomeByCategory: 1,
                ticketSales: 1
            }
        },
        {
            $sort: {
                totalIncomeByCategory: -1
            }
        }
    ]);

    const responseData = {
        topEvent: topEvent.length > 0 ? topEvent[0] : null,
        salesByEventCategory: salesByEventCategory
    };

    const revenue = {
      totalIncome: aggregateResult.length > 0 ? aggregateResult[0].totalIncome : 0,
      revenuePercentage,
      totalRevenueYesterday,
      totalRevenueToday
    }

    const ticketsPurchased = {
      totalTicketsPurchased: aggregateResult.length > 0 ? aggregateResult[0].totalTicketsPurchased : 0,
      totalTicketsSoldYesterday,
      totalTicketsSoldToday,
      ticketsSoldPercentage
    }

    
    const totalEventCreated = {
      totalEvents: aggregateResult.length > 0 ? aggregateResult[0].totalEvents : 0,
      EventsCreatedYesterday: EventsCreatedYesterday.length,
      EventsCreatedToday:EventsCreatedToday.length,
      eventDifferencePercentage
    }


    responseData.revenue = revenue;

    responseData.Eventbreakdown = Eventbreakdown;

    responseData.ticketsPurchased = ticketsPurchased;

    responseData.totalEventCreated = totalEventCreated;

    responseData.ticketsByCountry = ticketsByCountry;


      return res.json(responseData);

  } catch (error) {
    console.log(error)
      res.status(500).json({ message: "Server Error", error });
  }
});






module.exports = router;