import { expect, test } from '@playwright/test';
import {
  addToCart,
  createAddress,
  createCouponAsAdmin,
  listProducts,
  loginAdmin,
  register,
  uniqueCreds,
} from '../helpers/api';
import { seedAuthStorage } from '../helpers/session';

/**
 * Coupon redemption through the confirm-order UI: admin creates a
 * percentage-off coupon, user applies it at checkout, sees the discount
 * reflected in the payable total, submits, and lands on /orders.
 */
test('user applies a coupon code at checkout and order total reflects the discount', async ({
  page,
  request,
}) => {
  const adminToken = await loginAdmin(request);
  const code = `E2E${Date.now().toString().slice(-6)}`;
  await createCouponAsAdmin(request, adminToken, {
    code,
    name: '八折测试',
    type: 'percentage',
    value: 20, // 20% off
    perUserLimit: 1,
  });

  const creds = uniqueCreds('coupon');
  const { token, user } = await register(request, creds);
  await createAddress(request, token, {
    name: '优惠用户',
    phone: '13800000111',
    province: '北京',
    city: '北京',
    district: '海淀',
    detail: '中关村大街 1 号',
    isDefault: true,
  });

  const products = await listProducts(request);
  const jeans = products.find((p) => p.name === 'E2E Jeans');
  if (!jeans) throw new Error('E2E Jeans fixture missing — re-seed');
  // Price 199, qty 1 → subtotal 199, 20% off → discount 39.80, payable 159.20.
  await addToCart(request, token, jeans.id, 1);

  await seedAuthStorage(page, token, user);
  await page.goto('/order-confirm');

  // Apply the coupon via the input + 应用 button.
  const couponInput = page.getByPlaceholder('输入优惠券码');
  await couponInput.fill(code);
  await page.getByRole('button', { name: /^应\s*用/ }).click();

  // Applied state replaces the input with a Tag + the discount amount.
  // The discount figure appears twice on this page (once next to the coupon
  // tag, once in the "优惠：" summary line) so match loosely via first().
  await expect(page.getByText(code)).toBeVisible();
  await expect(page.getByText(/-¥39\.80/).first()).toBeVisible();
  // Payable total updates to post-discount value.
  await expect(page.getByText('¥159.20')).toBeVisible();

  await page.getByRole('button', { name: '提交订单' }).click();
  await expect(page).toHaveURL('/orders');

  // The order card shows both the total AND the "优惠 -¥39.80" annotation.
  const orderRow = page.locator('.ant-list-item').first();
  await expect(orderRow.getByText('¥159.20')).toBeVisible();
  await expect(orderRow.getByText(/优惠 -¥39\.80/)).toBeVisible();
});

test('invalid coupon code shows an error and does not apply', async ({ page, request }) => {
  const creds = uniqueCreds('couponbad');
  const { token, user } = await register(request, creds);
  await createAddress(request, token, {
    name: '买家',
    phone: '13800000222',
    province: '上海',
    city: '上海',
    district: '黄浦',
    detail: '南京东路 1 号',
    isDefault: true,
  });
  const products = await listProducts(request);
  const tshirt = products.find((p) => p.name === 'E2E T-Shirt');
  if (!tshirt) throw new Error('E2E T-Shirt fixture missing — re-seed');
  await addToCart(request, token, tshirt.id, 1);

  await seedAuthStorage(page, token, user);
  await page.goto('/order-confirm');

  await page.getByPlaceholder('输入优惠券码').fill('DOES-NOT-EXIST');
  await page.getByRole('button', { name: /^应\s*用/ }).click();

  // http interceptor surfaces the backend's "优惠券不存在" message as a toast.
  await expect(page.getByText(/优惠券不存在|优惠券已停用|优惠券已过期/)).toBeVisible();

  // The Tag for an applied coupon never appears — input is still there.
  await expect(page.getByPlaceholder('输入优惠券码')).toBeVisible();
});
