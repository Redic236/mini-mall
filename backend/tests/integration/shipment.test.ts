import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData } from '../helpers/db';
import { createAdmin, createUser, makeAuthed, type AuthedUser } from '../helpers/auth';

async function createPaidOrder(me: AuthedUser, data: SeededData): Promise<number> {
  await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: data.products[0].id, quantity: 1 });
  const cart = await request(getApp()).get('/api/cart').set(...me.authHeader);
  const order = await request(getApp()).post('/api/orders').set(...me.authHeader).send({
    addressId: data.address!.get('id'),
    cartItemIds: cart.body.data.items.map((it: { id: number }) => it.id),
  });
  const id = order.body.data.id as number;
  await request(getApp()).put(`/api/orders/${id}/pay`).set(...me.authHeader);
  return id;
}

describe('Shipment events', () => {
  let data: SeededData;
  let me: AuthedUser;
  let admin: AuthedUser;

  beforeEach(async () => {
    data = await seed();
    me = await makeAuthed(data.user!);
    admin = await createAdmin();
  });

  it('admin shipping an order auto-adds a picked_up event', async () => {
    const id = await createPaidOrder(me, data);
    await request(getApp()).put(`/api/admin/orders/${id}/ship`).set(...admin.authHeader);

    const res = await request(getApp())
      .get(`/api/orders/${id}/shipment-events`)
      .set(...me.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('picked_up');
    expect(res.body.data[0].note).toContain('发货');
  });

  it('admin can append more tracking events', async () => {
    const id = await createPaidOrder(me, data);
    await request(getApp()).put(`/api/admin/orders/${id}/ship`).set(...admin.authHeader);

    const events = [
      { status: 'in_transit', location: '上海分拣中心', note: '已发出' },
      { status: 'arrived', location: '北京朝阳站', note: '到站' },
      { status: 'out_for_delivery', location: '朝阳配送点', note: '派送中' },
    ];
    for (const e of events) {
      const r = await request(getApp())
        .post(`/api/admin/orders/${id}/shipment-events`)
        .set(...admin.authHeader)
        .send(e);
      expect(r.status).toBe(201);
    }

    const list = await request(getApp())
      .get(`/api/orders/${id}/shipment-events`)
      .set(...me.authHeader);
    expect(list.body.data).toHaveLength(4); // picked_up + 3 added
    const statuses = list.body.data.map((e: { status: string }) => e.status);
    expect(statuses).toEqual(['picked_up', 'in_transit', 'arrived', 'out_for_delivery']);
  });

  it('rejects an unknown status', async () => {
    const id = await createPaidOrder(me, data);
    const res = await request(getApp())
      .post(`/api/admin/orders/${id}/shipment-events`)
      .set(...admin.authHeader)
      .send({ status: 'teleported' });
    expect(res.status).toBe(400);
  });

  it('non-admin cannot add events', async () => {
    const id = await createPaidOrder(me, data);
    const res = await request(getApp())
      .post(`/api/admin/orders/${id}/shipment-events`)
      .set(...me.authHeader)
      .send({ status: 'in_transit' });
    expect(res.status).toBe(403);
  });

  it('another user cannot read someone else\'s timeline', async () => {
    const id = await createPaidOrder(me, data);
    const other = await createUser();

    const res = await request(getApp())
      .get(`/api/orders/${id}/shipment-events`)
      .set(...other.authHeader);
    expect(res.status).toBe(404);
  });

  it('empty list when the order was never shipped', async () => {
    const id = await createPaidOrder(me, data);
    const res = await request(getApp())
      .get(`/api/orders/${id}/shipment-events`)
      .set(...me.authHeader);
    expect(res.body.data).toHaveLength(0);
  });
});
