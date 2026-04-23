import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchCategories, fetchProduct, fetchProducts } from '@/services/product';
import type { CategorySummary, Product, ProductFilter } from '@/types';

interface ProductState {
  list: Product[];
  current: Product | null;
  categories: CategorySummary[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  list: [],
  current: null,
  categories: [],
  loading: false,
  error: null,
};

export const loadProducts = createAsyncThunk(
  'products/load',
  async (filter: ProductFilter | undefined) => fetchProducts(filter ?? {}),
);

export const loadProduct = createAsyncThunk('products/loadOne', async (id: number) => fetchProduct(id));

export const loadCategories = createAsyncThunk('products/loadCategories', async () => fetchCategories());

const slice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProducts.fulfilled, (state, action: PayloadAction<Product[]>) => {
        state.loading = false;
        state.list = action.payload;
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

export const { clearCurrent } = slice.actions;
export default slice.reducer;
