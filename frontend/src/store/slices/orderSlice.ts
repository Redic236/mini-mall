import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  cancelOrder,
  confirmOrder,
  createOrder,
  fetchOrder,
  fetchOrders,
  payOrder,
} from '@/services/order';
import type { Order, OrderStatus } from '@/types';

interface OrderState {
  list: Order[];
  current: Order | null;
  statusFilter: OrderStatus | null;
  loading: boolean;
}

const initialState: OrderState = { list: [], current: null, statusFilter: null, loading: false };

export const loadOrders = createAsyncThunk(
  'orders/load',
  async (status: OrderStatus | undefined) => fetchOrders(status),
);

export const loadOrder = createAsyncThunk('orders/loadOne', async (id: number) => fetchOrder(id));

export const submitOrder = createAsyncThunk(
  'orders/submit',
  async (payload: { addressId: number; cartItemIds: number[]; couponCode?: string }) =>
    createOrder(payload.addressId, payload.cartItemIds, payload.couponCode),
);

function makeTransitionThunk(
  name: string,
  action: (id: number) => Promise<Order>,
): ReturnType<typeof createAsyncThunk<void, number, { state: { orders: OrderState } }>> {
  return createAsyncThunk<void, number, { state: { orders: OrderState } }>(
    `orders/${name}`,
    async (id, { dispatch, getState }) => {
      await action(id);
      const state = getState();
      await dispatch(loadOrders(state.orders.statusFilter ?? undefined));
    },
  );
}

export const cancelOrderThunk = makeTransitionThunk('cancel', cancelOrder);
export const payOrderThunk = makeTransitionThunk('pay', payOrder);
// Shipping moved to admin — see services/admin.ts `shipAdminOrder`.
export const confirmOrderThunk = makeTransitionThunk('confirm', confirmOrder);

const slice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setStatusFilter(state, action: { payload: OrderStatus | null }) {
      state.statusFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(loadOrders.rejected, (state) => {
        state.loading = false;
      })
      .addCase(loadOrder.fulfilled, (state, action) => {
        state.current = action.payload;
      });
  },
});

export const { setStatusFilter } = slice.actions;
export default slice.reducer;
