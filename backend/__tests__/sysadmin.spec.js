const { describe } = require("node:test");
const router = require("../routers/SysAdmin");
const Ticket = require('../models/Ticket');
const User = require('../models/User')
const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event')
const admin = require('firebase-admin');
const request = require('supertest');
const {formatDate} = require('../routers/utils');



const app = express();
app.use(express.json());
app.use('/', router);

app.set('etag', false);


const mockMongoUsers = [{ email: 'user1@example.com' }];
const mockFirebaseUser = {
  email: 'user1@example.com',
  metadata: { creationTime: '2023-01-01T00:00:00Z' },
};

const mockUser = {
    uid: 'userUID123',
  };



jest.mock('../models/User');
jest.mock('../models/Event') 
jest.mock('firebase-admin', () => {
    return {
      initializeApp: jest.fn(),
      credential: {
        cert: jest.fn(),
      },
      auth: jest.fn(() => ({
        getUserByEmail: jest.fn().mockResolvedValue(mockFirebaseUser),
        updateUser: jest.fn().mockReturnValue("Test Update Result"), 
      })),
    };
  });
  

describe('GET /getcustomers', () => {

  it('should fetch and return Firebase users for customer role', async () => {
 
    User.find.mockResolvedValue(mockMongoUsers);

    const response = await request(app).get('/getcustomers');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].email).toBe(mockFirebaseUser.email);
    expect(response.body[0].creationTimeFormatted).toBeDefined();
  });


  it('should handle errors gracefully', async () => {
    User.find.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/getcustomers');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Error fetching user' });
  });
});



describe('GET /getorganizers', () => {

    it('should fetch and return Firebase users for organizer role', async () => {
    
      User.find.mockResolvedValue(mockMongoUsers);
      const response = await request(app).get('/getorganizers');
  

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe(mockFirebaseUser.email);
      expect(response.body[0].creationTimeFormatted).toBeDefined();
    });
  
    it('should handle errors gracefully', async () => {
      User.find.mockRejectedValue(new Error('Database error'));
  
      const response = await request(app).get('/getorganizers');
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Error fetching user' });
    });
  });




  describe('PUT /disableUser/:email', () => {

    beforeEach(() => {
        jest.clearAllMocks(); 
    });

    it('should send User not found', async () => {

        admin.auth = jest.fn().mockReturnValueOnce({
          getUserByEmail: jest.fn().mockResolvedValue(null),
        });
    
    
        const response = await request(app).put('/disableUser/user@example.com');
    
        expect(response.status).toBe(200); 
        expect(response.body).toEqual('User not found');
    
      });
  
      it('should handle errors properly', async () => {
        admin.auth = jest.fn().mockReturnValueOnce({
          getUserByEmail: jest.fn().mockResolvedValue(null),
        });
    
    
        const response = await request(app).put('/disableUser/user@example.com');
    
        expect(response.status).toBe(200); 
        expect(response.body).toEqual('User not found');
    
      });
  });



  describe('PUT /enableUser/:email', () => {
    beforeEach(() => {
        jest.clearAllMocks(); 
    });

    it('should send User not found', async () => {

        admin.auth = jest.fn().mockReturnValueOnce({
          getUserByEmail: jest.fn().mockResolvedValue(null),
        });
    
    
        const response = await request(app).put('/enableUser/user@example.com');
    
        expect(response.status).toBe(200); 
        expect(response.body).toEqual('User not found');
    
      });



    it('should handle errors properly', async () => {

      admin.auth = jest.fn().mockReturnValueOnce({
        getUserByEmail: jest.fn().mockResolvedValue(null),
      });
  
  
      const response = await request(app).put('/enableUser/user@example.com');
  
      expect(response.status).toBe(200); 
      expect(response.body).toEqual('User not found');
  
    });
});




describe('/manageEvents endpoint', () => {
    
    beforeEach(() => {
        jest.clearAllMocks(); 
    });

    it('should fetch all events and categorize them', async () => {
        const mockEvents = [
            { _id: '1', expired: true, date: new Date() },
            { _id: '2', expired: false, date: new Date() }
        ];



        Event.find.mockReturnValue({
    sort: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockEvents)
    })
});

        const response = await request(app).get('/manageEvents');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('expiredEvents');
        expect(response.body).toHaveProperty('activeEvents');
        expect(response.body.expiredEvents.length).toBe(1);
        expect(response.body.activeEvents.length).toBe(1);


    });

    it('should return message if no events', async () => {
        Event.find.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            })
        });

        const response = await request(app).get('/manageEvents');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'No events');
    });

    it('should return error if something goes wrong', async () => {
        Event.find.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                populate: jest.fn().mockRejectedValue(new Error("error"))
            })
        });

        const response = await request(app).get('/manageEvents');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('message', 'Error occured');
    });
});





 
 
  
  
  
  
  