import { expect, test } from '@playwright/test';
import {
  addShipmentEvent,
  addToCart,
  adminShipOrder,
  createAddress,
  createOrder,
  listProducts,
  loginAdmin,
  register,
  transitionOrder,
  uniqueCreds,
} from '../helpers/api';
import { seedAuthStorage } from '../helpers/session';

/**
 * Shipment timeline visibility from the user side: admin ships an order (which
 * seeds the picked_up event) and then appends a second node. The user opens
 * the order's "查看物流" collapse and sees both events in chronological order.
 */
test('user sees shipment timeline after admin adds events', async ({ page, request }) => {
  const creds = uniqueCreds('shipment');
  const { token, user } = await register(request, creds);
  const addressId = await createAddress(request, token, {
    name: '收件人',
    phone: '13800000333',
    province: '浙江',
    city: '杭州',
    district: '西湖区',
    detail: '文三路 123 号',
    isDefault: true,
  });

  const products = await listProducts(request);
  const tshirt = products.find((p) => p.name === 'E2E T-Shirt');
  if (!tshirt) throw new Error('E2E T-Shirt fixture missing — re-seed');
  const cartId = await addToCart(request, token, tshirt.id, 1);
  const order = await createOrder(request, token, addressId, [cartId]);
  await transitionOrder(request, token, order.id, 'pay');

  // Admin ship → auto-seeds a picked_up event. Then append a second node so
  // the timeline has more than one point to render.
  const adminToken = await loginAdmin(request);
  await adminShipOrder(request, adminToken, order.id);
  await addShipmentEvent(request, adminToken, order.id, {
    status: 'in_transit',
    location: '杭州转运中心',
    note: '已离开始发地',
  });

  await seedAuthStorage(page, token, user);
  await page.goto('/orders');

  const orderRow = page.locator('.ant-list-item').first();
  await expect(orderRow.getByText('已发货')).toBeVisible();

  // The "查看物流" collapse is inside the order row; open it.
  await orderRow.getByText('查看物流').click();

  await expect(orderRow.getByText('已揽件')).toBeVisible();
  await expect(orderRow.getByText('运输中')).toBeVisible();
  await expect(orderRow.getByText('杭州转运中心')).toBeVisible();
  await expect(orderRow.getByText('已离开始发地')).toBeVisible();
});
