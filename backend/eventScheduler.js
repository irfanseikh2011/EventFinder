const cron = require('node-cron');
const Event = require('./models/Event');

cron.schedule('0 0 * * *', async () => {
    try {
        const currentDate = new Date();
        await Event.updateMany(
          { date: { $lt: currentDate }, expired: false },
          { $set: { expired: true } }
        );
        console.log('Events marked as expired:', currentDate);
      } catch (error) {
        console.error('Error marking events as expired:', error);
      }
})