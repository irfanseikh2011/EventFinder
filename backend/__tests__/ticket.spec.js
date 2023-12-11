const { describe } = require("node:test");
const router = require("../routers/Ticket");
const qrcode = require("qrcode");
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const Ticket = require('../models/Ticket');
const User = require('../models/User')
const Event = require('../models/Event')
const mongooseUniqueValidator = require('mongoose-unique-validator');
const { generateQRCode, generateRandomString } = require('../routers/utils');

const app = express();
app.use(express.json());
app.use('/', router);

app.set('etag', false);


jest.mock("qrcode");

describe("generateQRCode", () => {
  it("should generate a QR code data URL", async () => {
    qrcode.toDataURL.mockResolvedValue("mocked-data-url");
    const qrCodeDataURL = await generateQRCode("sample-text");
    expect(qrcode.toDataURL).toHaveBeenCalledWith("sample-text");
    expect(qrCodeDataURL).toBe("mocked-data-url");
  });

  it("should handle QR code generation failure", async () => {
    qrcode.toDataURL.mockRejectedValue(new Error("QR code generation failed"));
    const qrCodeDataURL = await generateQRCode("sample-text");
    expect(qrcode.toDataURL).toHaveBeenCalledWith("sample-text");
    expect(qrCodeDataURL).toBe(null);
  });
});


jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('6d6f636b65', 'hex')), 
  createHash: jest.fn(),
}));

describe('generateRandomString', () => {
  it('should generate a random string of specified length', () => {
    const result = generateRandomString(5); 

    expect(result).toEqual('6d6f6'); 
    expect(crypto.randomBytes).toHaveBeenCalledWith(Math.ceil(5 / 2)); 
  });
});



jest.mock('../models/Ticket.js', () => ({
  findByIdAndUpdate: jest.fn(),
}));

describe('PUT /update-qr-url/:ticketId', () => {
  it('should update the QR URL of a ticket', async () => {
    const mockTicket = { _id: 'mocked-id', qrCode: 'new-qr-url' };
    const mockUpdate = jest.fn(() => Promise.resolve(mockTicket));
    Ticket.findByIdAndUpdate.mockImplementation(mockUpdate);

    const response = await request(app)
      .put('/update-qr-url/mocked-id')
      .send({ qrURL: 'new-qr-url' });

    expect(mockUpdate).toHaveBeenCalledWith(
      'mocked-id',
      { $set: { qrCode: 'new-qr-url' } },
      { new: true }
    );

    expect(response.status).toBe(200);
    expect(response.type).toBe('application/json');
    expect(response.body.qrCode).toBe('new-qr-url');
  });

  it('should handle ticket not found', async () => {
    Ticket.findByIdAndUpdate.mockImplementation(() => Promise.resolve(null));


    const response = await request(app)
      .put('/update-qr-url/non-existent-id')
      .send({ qrURL: 'new-qr-url' });

  
    expect(response.status).toBe(404);
    expect(response.type).toBe('application/json');
    expect(response.body.message).toBe('Ticket not found');
  });

  it('should handle errors during update', async () => {
    const mockError = new Error('Database error');
    Ticket.findByIdAndUpdate.mockImplementation(() => Promise.reject(mockError));

    const response = await request(app)
      .put('/update-qr-url/mocked-id')
      .send({ qrURL: 'new-qr-url' });

    expect(response.status).toBe(500);
    expect(response.type).toBe('application/json');
    expect(response.body.message).toBe('An error occurred');
  });
});



jest.mock('../models/User');
jest.mock('../models/Ticket');
jest.mock('../models/Event')

describe('GET /getTicketForUser/:userId', () => {

  beforeAll(() => {
    mongooseUniqueValidator.errorMessages = false;
  });

  afterAll(() => {
    mongooseUniqueValidator.errorMessages = true;
  });



  it('should retrieve active and expired tickets for a user', async () => {
   
    const mockUser = { _id: 'mocked-user-id', email: 'user@example.com' };
    User.findOne.mockResolvedValue(mockUser);

   
    const mockTickets = [
      { _id: 'ticket-id-1', user: 'mocked-user-id', event: { date: '2023-08-25T12:00:00Z' } },
      { _id: 'ticket-id-2', user: 'mocked-user-id', event: { date: '2023-08-24T12:00:00Z' } },
      { _id: 'ticket-id-3', user: 'mocked-user-id', event: { date: '2023-08-26T12:00:00Z' } }
    ];

    Ticket.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockTickets),
      }),
    });

    mockTickets[0].event = { date: new Date('2023-08-25T12:00:00Z') }; 
    mockTickets[1].event = { date: new Date('2023-08-24T12:00:00Z') };
    mockTickets[2].event = { date: new Date('2023-08-26T12:00:00Z') };




    const response = await request(app).get('/getTicketForUser/user@example.com');

  
    expect(response.status).toBe(200); 
    expect(response.type).toBe('application/json');

    expect(response.body).toHaveProperty('activeTickets');
    expect(response.body).toHaveProperty('expiredTickets');

   
    Ticket.find.mockRestore();
  });
  
  it('should handle user not found', async () => {
    
    User.findOne.mockResolvedValue(null);

    
    const response = await request(app).get('/getTicketForUser/non-existent-user@example.com');

  
    expect(response.status).toBe(404);
    expect(response.type).toBe('application/json');
    expect(response.body.message).toBe('User not found');
  });

  it('should handle errors', async () => {
    
    const mockError = new Error('Database error');
    User.findOne.mockRejectedValue(mockError);

   
    const response = await request(app).get('/getTicketForUser/user@example.com');


    expect(response.status).toBe(500);
    expect(response.type).toBe('application/json');
    expect(response.body.message).toBe('An error occurred');
  });
});


describe('GET /getTicketDetails/:ticketID', () => {

  const mockTicket = {
    _id: 1,
    event: '6155b934c2a1e4aabc123456', 
    user: '6155b934c2a1e4aabc789012',  
    qrCode: 'mockQRCode123',
    ticketCode: 'mockTicketCode123',
    numberOfTickets: 2,
    BoughtCountryCode: 'US',
    checkedIn: false,
    createdAt: '2023-08-31T12:00:00Z',
  };
  
  it('should return details of a valid existing ticket', async () => {
   
    Ticket.findById = jest.fn().mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockTicket),
      lean: true
  }));

    const response = await request(app).get(`/getTicketDetails/${mockTicket._id}`);

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(mockTicket._id);
    expect(response.body).toEqual(mockTicket)
  });


  it('should handle an invalid ticket ID format', async () => {

    Ticket.findById = jest.fn().mockImplementation(() => ({
      populate: jest.fn().mockReturnValue(),
      lean: true
  }));

    const response = await request(app).get('/getTicketDetails/invalidTicketId');

    expect(response.status).toEqual(404);
    expect(response.body).toEqual({"message":"Ticket not found"})
  });

});



describe('POST /createticket', () => {

  it('should return an error if user does not exist', async () => {
    User.findOne = jest.fn().mockImplementation(()=> Promise.resolve(""));
    
    Event.findOne  = jest.fn().mockImplementation(()=> Promise.resolve(""));

    const response = await request(app)
      .post('/createticket')
      .send({ id: "123" , userId: 'nonExistentUserId', numberOfTickets: 2 });


      expect(response.body.message).toBe('User does not exist');
      expect(response.status).toBe(200);
 

    User.findOne.mockRestore();
  });
});


