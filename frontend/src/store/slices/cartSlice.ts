import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { addCart, fetchCart, removeCart, updateCart } from '@/services/cart';
import type { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  totalPrice: number;
  totalQuantity: number;
  loading: boolean;
}

const initialState: CartState = { items: [], totalPrice: 0, totalQuantity: 0, loading: false };

export const loadCart = createAsyncThunk('cart/load', async () => fetchCart());

export const addToCart = createAsyncThunk(
  'cart/add',
  async (payload: { productId: number; quantity: number }, { dispatch }) => {
    await addCart(payload.productId, payload.quantity);
    await dispatch(loadCart());
  },
);

export const updateCartItem = createAsyncThunk(
  'cart/update',
  async (payload: { id: number; quantity: number }, { dispatch }) => {
    await updateCart(payload.id, payload.quantity);
    await dispatch(loadCart());
  },
);

export const removeCartItem = createAsyncThunk(
  'cart/remove',
  async (id: number, { dispatch }) => {
    await removeCart(id);
    await dispatch(loadCart());
  },
);

const slice = createSlice({
  name: 'cart',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.totalPrice = action.payload.totalPrice;
        state.totalQuantity = action.payload.totalQuantity;
      })
      .addCase(loadCart.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default slice.reducer;
