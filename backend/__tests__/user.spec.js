const { describe } = require("node:test");
const router = require("../routers/User");
const Ticket = require('../models/Ticket');
const User = require('../models/User')
const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event')
const request = require('supertest');
const fetch = require('node-fetch'); 
jest.mock('node-fetch');
const { getUserCountry } = require('../routers/utils');

const app = express();
app.use(express.json());
app.use('/', router);

app.set('etag', false);




describe('GET /getuser/:id', () => {
    it('should get a user by email', async () => {
      const mockUser = {
        _id: 'userId123',
        email: 'user@example.com',
        name: 'Test User',
      };
  
      User.findOne = jest.fn().mockImplementation(()=> Promise.resolve(mockUser))
  
      const response = await request(app).get('/getuser/user@example.com');
    
      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockUser);
  
      User.findOne.mockRestore();
    });
  
    it('should handle user not found', async () => {
  
      User.findOne = jest.fn().mockResolvedValue(null);
  
      const response = await request(app).get('/getuser/nonexistent@example.com');
  
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'User not found' });
  
      User.findOne.mockRestore();
    });
  
    it('should handle database error', async () => {
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
  
      const response = await request(app).get('/getuser/some@example.com');
  
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Database error' });
  
      User.findOne.mockRestore();
    });
  });



  describe('PUT /updateUser/:id', () => {
    it('should update a user by email', async () => {
      const mockUser = {
        _id: 'userId123',
        email: 'user@example.com',
        name: 'Test User',
      };
  
      const mockUpdatedUser = {
        _id: 'userId123',
        email: 'user@example.com',
        name: 'Updated Test User',
        age: 30,
      };
  
      User.findOneAndUpdate = jest.fn().mockResolvedValue(mockUpdatedUser);
  
      const response = await request(app)
        .put('/updateUser/user@example.com')
        .send({ name: 'Updated Test User', age: 30 });
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdatedUser);
  
      User.findOneAndUpdate.mockRestore();
    });
  
    it('should handle user not found', async () => {
  
      User.findOneAndUpdate = jest.fn().mockResolvedValue(null);
  
      const response = await request(app)
        .put('/updateUser/nonexistent@example.com')
        .send({ name: 'Updated Test User' });
  
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'User not found' });
  
     
      User.findOneAndUpdate.mockRestore();
    });
  
    it('should handle database error', async () => {
     
      User.findOneAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));
  
      const response = await request(app)
        .put('/updateUser/some@example.com')
        .send({ name: 'Updated Test User' });
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
  
      User.findOneAndUpdate.mockRestore();
    });
  });


  fetch.mockImplementation(() =>
  Promise.resolve({
    json: () => Promise.resolve({ country: 'US' }),
  })
);


describe('POST /createuser', () => {
  it('should create a new user', async () => {
    const mockRequest = {
      headers: {},
      socket: {
        remoteAddress: '127.0.0.1',
      },
      body: {
        email: 'newuser@example.com',
      },
    };
    const mockResponse = {
      status: jest.fn(() => mockResponse),
      json: jest.fn(),
    };

    User.find = jest.fn().mockResolvedValue([]);
    User.prototype.save = jest.fn().mockResolvedValue(mockRequest.body);

   const response =  await request(app).post('/createuser').send(mockRequest.body);

   console.log(response)

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockRequest.body);
  });


  it('should not create a user if email already exists', async () => {
    const mockRequest = {
      headers: {},
      socket: {
        remoteAddress: '127.0.0.1',
      },
      body: {
        email: 'existing@example.com',
      },
    };
    const mockResponse = {
      status: jest.fn(() => mockResponse),
      json: jest.fn(),
    };

    User.find = jest.fn().mockResolvedValue([{ email: mockRequest.body.email }]);
    User.prototype.save = jest.fn(); 

    const response = await request(app).post('/createuser').send(mockRequest.body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'User already Exists' });
  });


  it('should handle database error', async () => {
    const mockRequest = {
      headers: {},
      socket: {
        remoteAddress: '127.0.0.1',
      },
      body: {
        email: 'newuser@example.com',
      
      },
    };
    const mockResponse = {
      status: jest.fn(() => mockResponse),
      json: jest.fn(),
    };

    User.find = jest.fn().mockResolvedValue([]);
    User.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

    const response = await request(app).post('/createuser').send(mockRequest.body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Database error' });
  });
});
