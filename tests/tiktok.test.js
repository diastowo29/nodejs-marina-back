// Tests for routes/tiktok/index.js

jest.mock('../prisma/generated/baseClient', () => {
  const findUnique = jest.fn();
  const PrismaClientMock = jest.fn().mockImplementation(() => ({
    stores: {
      findUnique
    }
  }));
  return { PrismaClient: PrismaClientMock };
});

jest.mock('../prisma/generated/client', () => {
  const PrismaClientMock = jest.fn().mockImplementation(() => ({}));
  return { PrismaClient: PrismaClientMock };
});

jest.mock('../services/prismaServices', () => ({
  getPrismaClientForTenant: jest.fn().mockImplementation(() => ({
    orders: {
      upsert: jest.fn().mockResolvedValue({
        id: 555,
        origin_id: 'order-1',
        status: 'PAID',
        order_items: [],
        store: {
          token: 'token',
          secondary_token: 'cipher',
          refresh_token: 'refresh',
          id: 10,
          origin_id: 'shop-1'
        }
      })
    }
  }))
}));

jest.mock('../middleware/tenantIdentifier', () => ({
  getTenantDB: jest.fn().mockImplementation(() => ({ url: 'dummy-db-url' }))
}));

jest.mock('../functions/queue/task', () => {
  return {
    pushTask: jest.fn(),
    addTask: jest.fn()
  };
});

jest.mock('../functions/tiktok/function', () => ({ callTiktok: jest.fn() }));

const request = require('supertest');
const app = require('../app');
const baseClientModule = require('../prisma/generated/baseClient');
const { getPrismaClientForTenant } = require('../services/prismaServices');
const { pushTask } = require('../functions/queue/task');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Tiktok routes', () => {
  const headers = { 'zd-event': 'local_test' };

  test('GET /api/v1/tiktok/webhook returns 200 and empty object', async () => {
    const res = await request(app).get('/api/v1/tiktok/webhook').set(headers);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({});
  });

  test('POST /api/v1/tiktok/webhook returns 400 when store not found', async () => {
    // ensure findUnique resolves to null
    const baseInstance = baseClientModule.PrismaClient.mock.instances[0];
    baseInstance.stores.findUnique.mockResolvedValue(null);

    const payload = { type: 1, data: { order_id: 'order-1', order_status: 'PAID' }, shop_id: 'shop-1' };
    const res = await request(app).post('/api/v1/tiktok/webhook').set(headers).send(payload);
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/v1/tiktok/webhook upserts order and pushes task when store found', async () => {
    // make findUnique return a store with clients.org_id base64 of 'orgid:orgname'
    const orgBase64 = Buffer.from('orgid:orgname').toString('base64');
    const baseInstance = baseClientModule.PrismaClient.mock.instances[0];
    baseInstance.stores.findUnique.mockResolvedValue({ clients: { org_id: orgBase64 } });

    const payload = { type: 1, data: { order_id: 'order-1', order_status: 'PAID' }, shop_id: 'shop-1' };
    const res = await request(app).post('/api/v1/tiktok/webhook').set(headers).send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ order: 555, origin_id: 'order-1', status: 'PAID' });

    // ensure getPrismaClientForTenant was called and pushTask was invoked
    expect(getPrismaClientForTenant).toHaveBeenCalled();
    expect(pushTask).toHaveBeenCalled();

    // verify pushTask was called with env 'development' (default) and payload containing channel TIKTOK
    const pushArgs = pushTask.mock.calls[0];
    expect(pushArgs[0]).toBe(process.env.NODE_ENV || 'development');
    expect(pushArgs[1]).toHaveProperty('channel', 'tiktok');
    expect(pushArgs[1]).toHaveProperty('order_id', 'order-1');
  });
});
