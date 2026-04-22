import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from '@/services/address';
import type { Address, AddressInput } from '@/types';

interface AddressState {
  list: Address[];
  loading: boolean;
}

const initialState: AddressState = { list: [], loading: false };

export const loadAddresses = createAsyncThunk('addresses/load', async () => fetchAddresses());

export const addAddress = createAsyncThunk(
  'addresses/create',
  async (input: AddressInput, { dispatch }) => {
    await createAddress(input);
    await dispatch(loadAddresses());
  },
);

export const editAddress = createAsyncThunk(
  'addresses/update',
  async (payload: { id: number; input: AddressInput }, { dispatch }) => {
    await updateAddress(payload.id, payload.input);
    await dispatch(loadAddresses());
  },
);

export const removeAddress = createAsyncThunk(
  'addresses/remove',
  async (id: number, { dispatch }) => {
    await deleteAddress(id);
    await dispatch(loadAddresses());
  },
);

export const makeDefault = createAsyncThunk(
  'addresses/setDefault',
  async (id: number, { dispatch }) => {
    await setDefaultAddress(id);
    await dispatch(loadAddresses());
  },
);

const slice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadAddresses.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(loadAddresses.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default slice.reducer;
