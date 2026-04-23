import { expect, test } from '@playwright/test';
import {
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
 * Review submission is gated on having a 已完成 order for the product. We
 * drive the entire order through to done via the API, then exercise the
 * review composer on the product detail page.
 */
test('user can post a review on a completed order', async ({ page, request }) => {
  const creds = uniqueCreds('review');
  const { token, user } = await register(request, creds);
  const addressId = await createAddress(request, token, {
    name: '评价人',
    phone: '13700000000',
    province: '广东',
    city: '深圳',
    district: '南山',
    detail: '科技园',
    isDefault: true,
  });

  const products = await listProducts(request);
  const tshirt = products.find((p) => p.name === 'E2E T-Shirt');
  if (!tshirt) throw new Error('E2E T-Shirt fixture missing — re-seed');

  const cartId = await addToCart(request, token, tshirt.id, 1);
  const order = await createOrder(request, token, addressId, [cartId]);
  await transitionOrder(request, token, order.id, 'pay');
  const adminToken = await loginAdmin(request);
  await adminShipOrder(request, adminToken, order.id);
  await transitionOrder(request, token, order.id, 'confirm');

  await seedAuthStorage(page, token, user);
  await page.goto(`/products/${tshirt.id}`);
  await expect(page.getByRole('heading', { name: 'E2E T-Shirt' })).toBeVisible();

  // Composer appears once the server confirms eligibility for this completed order.
  const submitBtn = page.getByRole('button', { name: '发布评价' });
  await expect(submitBtn).toBeVisible();

  // AntD Rate renders 5 stars as li.ant-rate-star — click the 5th (rating=5).
  await page.locator('.ant-rate-star').nth(4).click();
  await page.getByPlaceholder('说点什么吧（可选）').fill('真的很好穿，推荐！');
  await submitBtn.click();

  await expect(page.getByText('真的很好穿，推荐！')).toBeVisible();
});
