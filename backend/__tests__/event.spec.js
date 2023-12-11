const { describe } = require("node:test");
const router = require("../routers/Event");
const qrcode = require("qrcode");
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const Ticket = require('../models/Ticket');
const User = require('../models/User')
const Event = require('../models/Event')
const {transporter} = require('../routers/utils')


const app = express();
app.use(express.json());
app.use('/', router);

app.set('etag', false);


jest.mock('../models/Event.js')

describe('GET /search', () => {
    it('should return filtered events based on query parameters', async () => {
      Event.find = jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue([
            { title: 'Event 1', description: 'Description 1' },
            { title: 'Event 2', description: 'Description 2' },
          ]),
        lean: true
    }));
      
  
      const response = await request(app)
        .get('/search')
        .query({ term: 'Event', date: '2023-09-01', country: 'Country', city: 'City', tag: 'Tag' })
        .expect(200);
  
      expect(response.body).toEqual([
        { title: 'Event 1', description: 'Description 1' },
        { title: 'Event 2', description: 'Description 2' },
      ]);


      Event.find.mockRestore();
    });
  
    it('should handle server error', async () => {
      Event.find = jest.fn().mockReturnValue(new Error('database error'));
  
      const response = await request(app)
        .get('/search')
        .query({ term: 'Event' })
        .expect(500);
  
      expect(response.body).toEqual({
        success: false,
        message: 'Server Error',
      });

      Event.find.mockRestore();
    });
  });


  jest.mock('../models/User'); 
  
  describe('GET /getAllEvents/:id', () => {
    it('should return events created by the user', async () => {
      User.findOne = jest.fn().mockResolvedValue({ _id: 'user123' });
      
      Event.find.mockResolvedValue([
        { title: 'Event 1', createdBy: 'user123' },
        { title: 'Event 2', createdBy: 'user123' },
      ]);
  
      const response = await request(app)
        .get('/getAllEvents/user@example.com')
        .expect(201);
  
      expect(response.body).toEqual([
        { title: 'Event 1', createdBy: 'user123' },
        { title: 'Event 2', createdBy: 'user123' },
      ]);
  
      expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(Event.find).toHaveBeenCalledWith({ createdBy: 'user123' });
      Event.find.mockRestore();
    });


    it('should handle server error', async () => {
        User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
        Event.find = jest.fn().mockResolvedValue([]);
    
        const response = await request(app)
          .get('/getAllEvents/user@example.com')
          .expect(500);
    
        expect(response.body).toEqual({
          message: 'Database error',
        });
    
        expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    
        expect(Event.find).not.toHaveBeenCalled();
      });


  });




  describe("GET /getUpcomingEvents", () => {
    it("should return upcoming events", async () => {
        Event.find = jest.fn().mockImplementation(() => ({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([
                { title: "Event 1", date: new Date("2023-09-01"), expired: false },
                { title: "Event 2", date: new Date("2023-09-05"), expired: false },
              ]),
            }),
          }));
      
          const response = await request(app).get("/getUpcomingEvents").expect(201);
      
          expect(response.body).toEqual([
            { title: "Event 1", date: expect.any(String), expired: false },
            { title: "Event 2", date: expect.any(String), expired: false },
          ]);
      
          expect(Event.find).toHaveBeenCalledWith({
            expired: false,
            date: expect.objectContaining({ $gte: expect.any(Date) }),
          });
    });



    
  it("should handle server error", async () => {
    Event.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(), // Chain the mock for `sort`
        exec: jest.fn().mockRejectedValue(new Error('error')),
      });
    
      const response = await request(app).get("/getUpcomingEvents").expect(500);
    
      expect(response.body).toEqual({
        message: "Internal server error",
      });
    
      expect(Event.find).toHaveBeenCalledWith(
        expect.objectContaining({
          expired: false,
          date: expect.objectContaining({ $gte: expect.any(Date) }),
        })
      );
  });

 
  });  



  describe('GET /getExpiredEvents/:id', () => {
    it('should return expired events created by the user', async () => {
      User.findOne = jest.fn().mockResolvedValue({ _id: 'user123' });
  
      Event.find.mockResolvedValue([
        { title: 'Expired Event 1', createdBy: 'user123', expired: true },
        { title: 'Expired Event 2', createdBy: 'user123', expired: true },
      ]);
  
      const response = await request(app)
        .get('/getExpiredEvents/user@example.com')
        .expect(200);
  
      expect(response.body).toEqual([
        { title: 'Expired Event 1', createdBy: 'user123', expired: true },
        { title: 'Expired Event 2', createdBy: 'user123', expired: true },
      ]);
  
      expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(Event.find).toHaveBeenCalledWith({ createdBy: 'user123', expired: true });
    });
  
    it('should handle server error', async () => {
      User.findOne = jest.fn().mockResolvedValue({ _id: 'user123' });
  
      Event.find.mockRejectedValue(new Error('Database error'));
  
      const response = await request(app)
        .get('/getExpiredEvents/user@example.com')
        .expect(500);
  
      expect(response.body).toEqual({
        message: 'Internal server error',
      });
  
      expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(Event.find).toHaveBeenCalledWith({ createdBy: 'user123', expired: true });
    });
  });



  describe('PUT /editevent/:id', () => {
    it('should update and return the event with updated data', async () => {
      const updatedEventData = {
        title: 'Updated Event',
        date: '2023-09-10',
      
      };
  
      const mockEvent = {
        _id: 'event123',
        title: 'Old Event',
        date: '2023-08-31', 
        
      };
  
      Event.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedEventData);
  
      const response = await request(app)
        .put('/editevent/event123')
        .send(updatedEventData)
        .expect(200);
  
      expect(response.body).toEqual(updatedEventData);
      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(
        'event123',
        updatedEventData,
        { new: true }
      );
    });
  
    it('should handle event not found', async () => {
      Event.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
  
      const response = await request(app)
        .put('/editevent/nonexistent-event')
        .send({ title: 'Updated Event' })
        .expect(404);
  
      expect(response.body).toEqual({ message: 'Event not found' });
      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(
        'nonexistent-event',
        { title: 'Updated Event' },
        { new: true }
      );
    });
  
    it('should handle server error', async () => {
      Event.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));
  
      const response = await request(app)
        .put('/editevent/event123')
        .send({ title: 'Updated Event' })
        .expect(500);
  
      expect(response.body).toEqual({ message: 'Internal server error' });
      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(
        'event123',
        { title: 'Updated Event' },
        { new: true }
      );
    });
  });


  describe('GET /getevent/:id', () => {
    it('should return the event details by ID', async () => {
        const mockEvent = {
            _id: 'event123',
            title: 'Event 1',
            createdBy: 'user123',
          };
      
          const mockUser = {
            _id: 'user123',
            name: 'John Doe',
          };
      
          Event.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              ...mockEvent,
              createdBy: mockUser
            }),
          });
      
          const response = await request(app)
            .get('/getevent/event123')
            .expect(200);
      
          expect(response.body).toEqual({
            _id: 'event123',
            title: 'Event 1',
            createdBy: {
              _id: 'user123',
              name: 'John Doe',
            },
          });
      
          expect(Event.findById).toHaveBeenCalledWith('event123');
    });
  
    it('should handle event not found', async () => {
        Event.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
          });

        const response = await request(app)
          .get('/getevent/nonexistent-event')
          .expect(404);
    
        expect(response.body).toEqual({ message: 'Event not found' });
        expect(Event.findById).toHaveBeenCalledWith('nonexistent-event');
    });
  
    it('should handle server error', async () => {
        Event.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('Database error'))
          });
  
      const response = await request(app)
        .get('/getevent/event123')
        .expect(500);
  
      expect(response.body).toEqual({ message: 'Internal server error' });
      expect(Event.findById).toHaveBeenCalledWith('event123');
    });
  });


  describe('GET /searchevents', () => {
    it('should return filtered events based on title and description query parameters', async () => {
      const mockEvents = [
        { title: 'Event 1', description: 'Description 1' },
        { title: 'Event 2', description: 'Description 2' },
      ];
      Event.find = jest.fn().mockResolvedValue(mockEvents);
  
      const response = await request(app)
        .get('/searchevents')
        .query({ title: 'Event', description: 'Desc' })
        .expect(200);
  
      expect(response.body).toEqual(mockEvents);
      expect(Event.find).toHaveBeenCalledWith({
        $or: [
          { title: { $regex: 'Event', $options: 'i' } },
          { description: { $regex: 'Desc', $options: 'i' } },
        ],
      });
    });
  
    it('should handle server error', async () => {
      Event.find = jest.fn().mockRejectedValue(new Error('Database error'));
  
      const response = await request(app)
        .get('/searchevents')
        .query({ title: 'Event', description: 'Desc' })
        .expect(500);
  
      expect(response.body).toEqual({ message: 'Internal server error' });
      expect(Event.find).toHaveBeenCalledWith({
        $or: [
          { title: { $regex: 'Event', $options: 'i' } },
          { description: { $regex: 'Desc', $options: 'i' } },
        ],
      });
    });
  });


  describe('DELETE /deleteevent/:id', () => {
  
    it('should delete an expired event without associated tickets', async () => {
      const mockEvent = {
        _id: 'expiredEvent123',
        expired: true,
        title: 'Expired Event',
        createdBy: { email: 'user@example.com' },
      };
      Event.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockEvent),
      });
      Event.findByIdAndDelete = jest.fn().mockResolvedValue(mockEvent);
  
      const response = await request(app)
        .delete('/deleteevent/expiredEvent123')
        .send({ isAdmin: false })
        .expect(200);
  
      expect(response.body).toEqual({ message: 'deleted the expired event' });
      expect(Event.findById).toHaveBeenCalledWith('expiredEvent123');
      expect(Event.findByIdAndDelete).toHaveBeenCalledWith('expiredEvent123');
    });
  
    it('should handle event not found', async () => {
        Event.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
          });

          Event.findByIdAndDelete = jest.fn().mockResolvedValue();
  
      const response = await request(app)
        .delete('/deleteevent/nonexistent-event')
        .send({ isAdmin: true })
        .expect(404);
  
      expect(response.body).toEqual({ message: 'Event not found' });
      expect(Event.findById).toHaveBeenCalledWith('nonexistent-event');
    });
  
    it('should handle server error', async () => {
        Event.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('Database error')),
          });
  
      const response = await request(app)
        .delete('/deleteevent/event123')
        .send({ isAdmin: true })
        .expect(500);
  
      expect(response.body).toEqual({ message: 'Internal server error' });
      expect(Event.findById).toHaveBeenCalledWith('event123');
    });
  });



