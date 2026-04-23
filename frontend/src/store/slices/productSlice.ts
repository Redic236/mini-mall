import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchCategories, fetchProduct, fetchProducts } from '@/services/product';
import type { CategorySummary, PagedResult, Product, ProductFilter } from '@/types';

interface ProductState {
  list: Product[];
  current: Product | null;
  categories: CategorySummary[];
  page: number;
  limit: number;
  total: number;
  loading: boolean;
  error: string | null;
}

const DEFAULT_LIMIT = 20;

const initialState: ProductState = {
  list: [],
  current: null,
  categories: [],
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  loading: false,
  error: null,
};

export const loadProducts = createAsyncThunk(
  'products/load',
  async (filter: ProductFilter | undefined) => fetchProducts(filter ?? {}),
);

export const loadProduct = createAsyncThunk('products/loadOne', async (id: number) =>
  fetchProduct(id),
);

export const loadCategories = createAsyncThunk('products/loadCategories', async () =>
  fetchCategories(),
);

const slice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null;
    },
    setPage(state, action: { payload: number }) {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProducts.fulfilled, (state, action: PayloadAction<PagedResult<Product>>) => {
        state.loading = false;
        state.list = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(loadProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load products';
      })
      .addCase(loadProduct.fulfilled, (state, action: PayloadAction<Product>) => {
        state.current = action.payload;
      })
      .addCase(loadCategories.fulfilled, (state, action: PayloadAction<CategorySummary[]>) => {
        state.categories = action.payload;
      });
  },
});

export const { clearCurrent, setPage } = slice.actions;
export default slice.reducer;
