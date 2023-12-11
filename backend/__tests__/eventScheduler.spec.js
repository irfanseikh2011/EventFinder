const cron = require('node-cron');
const Event = require('../models/Event');

jest.mock('node-cron', () => ({
    schedule: jest.fn(),
  }));



  describe('Cron Job - Expire Events', () => {
    beforeAll(() => {
      cron.schedule.mockReset();
    });
  
    it('should schedule the cron job to run daily at midnight', () => {
      require('../eventScheduler');
  
      expect(cron.schedule).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
    });
  
    it('should mark events as expired', async () => {
        const currentDate = new Date('2023-09-01T00:00:00Z');
      
        Event.updateMany = jest.fn().mockResolvedValue({});
      
        require('../eventScheduler');
      
        const cronJobFunction = cron.schedule.mock.calls[0][1];
      
        await cronJobFunction();
      
        expect(Event.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            date: expect.objectContaining({
              $lt: expect.any(Date),
            }),
            expired: false,
          }),
          { $set: { expired: true } }
        );
      });
  
  });