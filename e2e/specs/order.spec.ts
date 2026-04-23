import { expect, test } from '@playwright/test';
import {
  addToCart,
  createAddress,
  listProducts,
  register,
  uniqueCreds,
} from '../helpers/api';
import { seedAuthStorage } from '../helpers/session';

const ADDRESS_INPUT = {
  name: 'E2E 买家',
  phone: '13800000999',
  province: '上海',
  city: '上海',
  district: '浦东新区',
  detail: '世纪大道 1 号',
  isDefault: true,
};

/**
 * Order lifecycle via the UI: arrange a user + address + cart item via API so
 * we can test from the checkout screen forward. The state transitions (pay,
 * ship, confirm) are exercised through the order list buttons — exactly how
 * a real session would drive them.
 */
test.describe('Order lifecycle', () => {
  test('checkout → pay → ship → confirm walks the full state machine', async ({ page, request }) => {
    const creds = uniqueCreds('order');
    const { token, user } = await register(request, creds);
    await createAddress(request, token, ADDRESS_INPUT);

    const products = await listProducts(request);
    const tshirt = products.find((p) => p.name === 'E2E T-Shirt');
    if (!tshirt) throw new Error('E2E T-Shirt fixture missing — re-seed');
    await addToCart(request, token, tshirt.id, 2);

    await seedAuthStorage(page, token, user);

    // Go directly to cart, then checkout.
    await page.goto('/cart');
    await expect(page.getByText('E2E T-Shirt')).toBeVisible();
    await page.getByRole('button', { name: '去结算' }).click();

    await expect(page).toHaveURL('/order-confirm');
    await page.getByRole('button', { name: '提交订单' }).click();

    await expect(page).toHaveURL('/orders');
    const orderRow = page.locator('.ant-list-item').first();
    await expect(orderRow.getByText('待支付')).toBeVisible();

    // Sandbox pay flow: 去支付 dropdown → pick a method → /checkout → 支付成功.
    await orderRow.getByRole('button', { name: /^去\s*支\s*付$/ }).click();
    await page.getByRole('menuitem', { name: /支付宝（沙箱）/ }).click();
    await expect(page).toHaveURL(/\/checkout\?pid=\d+$/);
    await page.getByRole('button', { name: '模拟支付成功' }).click();
    await expect(page).toHaveURL('/orders');
    await expect(orderRow.getByText('已支付')).toBeVisible();

    await orderRow.getByRole('button', { name: /发\s*货（管理）/ }).click();
    await expect(orderRow.getByText('已发货')).toBeVisible();

    await orderRow.getByRole('button', { name: /确认收货/ }).click();
    await expect(orderRow.getByText('已完成')).toBeVisible();
  });

  test('user can cancel a 待支付 order from the list', async ({ page, request }) => {
    const creds = uniqueCreds('ordercancel');
    const { token, user } = await register(request, creds);
    await createAddress(request, token, ADDRESS_INPUT);

    const products = await listProducts(request);
    const jeans = products.find((p) => p.name === 'E2E Jeans');
    if (!jeans) throw new Error('E2E Jeans fixture missing — re-seed');
    await addToCart(request, token, jeans.id, 1);

    await seedAuthStorage(page, token, user);
    await page.goto('/cart');
    await page.getByRole('button', { name: '去结算' }).click();
    await page.getByRole('button', { name: '提交订单' }).click();

    await expect(page).toHaveURL('/orders');
    const orderRow = page.locator('.ant-list-item').first();
    await orderRow.getByRole('button', { name: '取消订单' }).click();
    // AntD Popconfirm — confirm.
    await page.getByRole('button', { name: /确\s*定/ }).click();

    await expect(orderRow.getByText('已取消')).toBeVisible();
  });
});
