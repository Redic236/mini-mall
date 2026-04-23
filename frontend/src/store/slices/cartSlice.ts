import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { addCart, fetchCart, removeCart, updateCart } from '@/services/cart';
import type { CartItem, CartSummary } from '@/types';

interface CartState {
  items: CartItem[];
  totalPrice: number;
  totalQuantity: number;
  loading: boolean;
}

const initialState: CartState = { items: [], totalPrice: 0, totalQuantity: 0, loading: false };

export const loadCart = createAsyncThunk('cart/load', async () => fetchCart());

// Mutation thunks now return the fresh CartSummary directly — no second
// GET /cart is needed. The extraReducer below folds the payload into state.
export const addToCart = createAsyncThunk(
  'cart/add',
  async (payload: { productId: number; quantity: number }) =>
    addCart(payload.productId, payload.quantity),
);

export const updateCartItem = createAsyncThunk(
  'cart/update',
  async (payload: { id: number; quantity: number }) => updateCart(payload.id, payload.quantity),
);

export const removeCartItem = createAsyncThunk('cart/remove', async (id: number) => removeCart(id));

function applySummary(state: CartState, summary: CartSummary): void {
  state.items = summary.items;
  state.totalPrice = summary.totalPrice;
  state.totalQuantity = summary.totalQuantity;
}

const slice = createSlice({
  name: 'cart',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadCart.fulfilled, (state, action: PayloadAction<CartSummary>) => {
        state.loading = false;
        applySummary(state, action.payload);
      })
      .addCase(loadCart.rejected, (state) => {
        state.loading = false;
      })
      .addCase(addToCart.fulfilled, (state, action: PayloadAction<CartSummary>) => {
        applySummary(state, action.payload);
      })
      .addCase(updateCartItem.fulfilled, (state, action: PayloadAction<CartSummary>) => {
        applySummary(state, action.payload);
      })
      .addCase(removeCartItem.fulfilled, (state, action: PayloadAction<CartSummary>) => {
        applySummary(state, action.payload);
      });
  },
});

export default slice.reducer;
