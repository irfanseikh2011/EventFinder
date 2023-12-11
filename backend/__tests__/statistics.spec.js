const { describe } = require("node:test");
const router = require("../routers/Statistics");
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

jest.mock('../models/Event');
jest.mock('../models/User');
jest.mock('../models/Ticket')

describe('GET /event-popularity', () => {
    const mockEvents = [
        { ticketPrice: 100, ticketSold: 50 },
        { ticketPrice: 200, ticketSold: 30 }
      ];

    afterEach(() => {
      jest.restoreAllMocks();
    });
  
    it('should return event popularity data', async () => {
        Event.find = jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockEvents)
          })
  
      const response = await request(app).get('/event-popularity');
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { price: 100, ticketsSold: 50 },
        { price: 200, ticketsSold: 30 }
      ]);
    });
  
    it('should return an empty array if no events', async () => {
        Event.find = jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          })
  
      const response = await request(app).get('/event-popularity');
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  
    it('should handle errors', async () => {
        Event.find = jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error("error"))
          })
  
      const response = await request(app).get('/event-popularity');
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  
  });




  describe('GET /ticket-sales-by-category', () => {

    afterEach(() => {
        jest.restoreAllMocks();
      });

    it('should aggregate ticket sales by category and return the data', async () => {
      const mockEvents = [
        { tag: 'Music', ticketSold: 50 },
        { tag: 'Theatre', ticketSold: 30 },
        { tag: 'Music', ticketSold: 10 }
      ];
  
      Event.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEvents)
      })
  
      const response = await request(app).get('/ticket-sales-by-category');
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { category: 'Music', ticketSales: 60 },
        { category: 'Theatre', ticketSales: 30 }
      ]);
    });
  
    it('should handle errors gracefully', async () => {
        Event.find = jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error("error"))
          })
  
      const response = await request(app).get('/ticket-sales-by-category');
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  
  });



  describe('GET /dashboard-daily-data', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should retrieve daily dashboard data successfully', async () => {
      User.countDocuments
        .mockResolvedValueOnce(100) 
        .mockResolvedValueOnce(80); 
  
      Ticket.countDocuments
        .mockResolvedValueOnce(50)  
        .mockResolvedValueOnce(40); 
  
      const response = await request(app).get('/dashboard-daily-data');
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        newUsers: 100,
        ticketsBought: 50,
        newUsersChange: 20,
        ticketsBoughtChange: 10
      });
    });
  
    it('should handle errors gracefully', async () => {
      User.countDocuments.mockRejectedValueOnce(new Error('Database error'));
  
      const response = await request(app).get('/dashboard-daily-data');
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'An error occurred while fetching dashboard data.' });
    });
  
  });



  describe('GET /testData/:id', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should retrieve tickets by country for a specific user email', async () => {
      const mockUserId = '12345';
      const mockUser = { _id: mockUserId };
      const mockUserEvents = [{ _id: 'e1', createdBy: mockUserId }];
      const mockAggregateData = [{ _id: 'US', totalTickets: 100 }];
  
      User.findOne.mockResolvedValueOnce(mockUser);
      Event.find.mockResolvedValueOnce(mockUserEvents);
      Ticket.aggregate.mockResolvedValueOnce(mockAggregateData);
  
      const response = await request(app).get('/testData/test@example.com');
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAggregateData);
    });
  
    it('should handle user not found scenario', async () => {
      User.findOne.mockResolvedValueOnce(null);
  
      const response = await request(app).get('/testData/nonexistent@example.com');
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'User not found' });
    });
  
  });



  describe('GET /organizerData/:id', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

  
    it('should handle when a user is not found', async () => {
      User.findOne.mockResolvedValueOnce(null);
  
      const response = await request(app).get('/organizerData/nonexistent@example.com');
  
      expect(response.status).toBe(500);
      expect(response.body.message).toEqual('Server Error');
    });
  
    it('should handle database errors gracefully', async () => {
      User.findOne.mockRejectedValueOnce(new Error('Database error'));
  
      const response = await request(app).get('/organizerData/test@example.com');
  
      expect(response.status).toBe(500);
      expect(response.body.message).toEqual('Server Error');
    });
  
  });