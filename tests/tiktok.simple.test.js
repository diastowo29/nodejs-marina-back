const request = require('supertest');
const app = require('../app');

describe('Tiktok routes (simple, no mocks)', () => {
  test('GET /api/v1/tiktok/webhook -> 200', async () => {
    const res = await request(app).get('/api/v1/tiktok/webhook');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({});
  });

  test("POST /api/v1/tiktok/webhook with UNPAID order -> 200 and message", async () => {
    const payload = { type: 1, data: { order_status: 'UNPAID' } };
    const res = await request(app).post('/api/v1/tiktok/webhook').send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Order is unpaid, ignoring');
  });

  test('GET /api/v1/tiktok/return_refund -> 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/tiktok/return_refund');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/v1/tiktok/order -> 401 when not authenticated', async () => {
    const res = await request(app).post('/api/v1/tiktok/order').send({});
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/v1/tiktok/cancellation -> 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/tiktok/cancellation');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/v1/tiktok/authorize -> 401 when not authenticated', async () => {
    const res = await request(app).post('/api/v1/tiktok/authorize').send({});
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});