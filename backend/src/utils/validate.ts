import { z, ZodError, ZodSchema } from 'zod';
import { HttpError } from './apiResponse';

export function parseOrThrow<T>(schema: ZodSchema<T>, input: unknown, context = '请求参数'): T {
  try {
    return schema.parse(input);
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      const path = first.path.length > 0 ? first.path.join('.') : context;
      throw new HttpError(400, `${path}: ${first.message}`);
    }
    throw err;
  }
}

// Reusable primitives
export const idSchema = z.coerce.number().int().positive();
export const positiveIntSchema = z.number().int().positive();
export const nonNegativeNumberSchema = z.number().nonnegative();

// Cart
export const addCartBodySchema = z.object({
  productId: positiveIntSchema,
  quantity: positiveIntSchema,
});

export const updateCartBodySchema = z.object({
  quantity: positiveIntSchema,
});

// Address
export const addressBodySchema = z.object({
  name: z.string().trim().min(1).max(50),
  phone: z.string().trim().min(1).max(20),
  province: z.string().trim().min(1).max(50),
  city: z.string().trim().min(1).max(50),
  district: z.string().trim().min(1).max(50),
  detail: z.string().trim().min(1).max(255),
  isDefault: z.boolean().optional(),
});

// Order
export const createOrderBodySchema = z.object({
  addressId: positiveIntSchema,
  cartItemIds: z.array(positiveIntSchema).min(1, '请至少选择一件商品'),
});

export const orderStatusQuerySchema = z
  .enum(['待支付', '已支付', '已发货', '已完成', '已取消'])
  .optional();
