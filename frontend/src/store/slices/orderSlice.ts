import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  cancelOrder,
  confirmOrder,
  createOrder,
  fetchOrder,
  fetchOrders,
  payOrder,
  type OrderListQuery,
} from '@/services/order';
import type { Order, OrderStatus, PagedResult } from '@/types';

interface OrderState {
  list: Order[];
  current: Order | null;
  statusFilter: OrderStatus | null;
  page: number;
  limit: number;
  total: number;
  loading: boolean;
}

const DEFAULT_LIMIT = 20;

const initialState: OrderState = {
  list: [],
  current: null,
  statusFilter: null,
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  loading: false,
};

export const loadOrders = createAsyncThunk('orders/load', async (query: OrderListQuery = {}) =>
  fetchOrders(query),
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
      const state = getState().orders;
      await dispatch(
        loadOrders({
          status: state.statusFilter ?? undefined,
          page: state.page,
          limit: state.limit,
        }),
      );
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
      // Filter change resets to first page — paginating stale results is confusing.
      state.page = 1;
    },
    setPage(state, action: { payload: number }) {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadOrders.fulfilled, (state, action: PayloadAction<PagedResult<Order>>) => {
        state.loading = false;
        state.list = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(loadOrders.rejected, (state) => {
        state.loading = false;
      })
      .addCase(loadOrder.fulfilled, (state, action) => {
        state.current = action.payload;
      });
  },
});

export const { setStatusFilter, setPage } = slice.actions;
export default slice.reducer;
