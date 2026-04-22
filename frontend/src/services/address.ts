import { http, unwrap } from './http';
import type { Address, AddressInput, ApiResponse } from '@/types';

export async function fetchAddresses(): Promise<Address[]> {
  return unwrap<Address[]>(http.get<ApiResponse<Address[]>>('/addresses'));
}

export async function createAddress(input: AddressInput): Promise<Address> {
  return unwrap<Address>(http.post<ApiResponse<Address>>('/addresses', input));
}

export async function updateAddress(id: number, input: AddressInput): Promise<Address> {
  return unwrap<Address>(http.put<ApiResponse<Address>>(`/addresses/${id}`, input));
}

export async function deleteAddress(id: number): Promise<void> {
  await http.delete<ApiResponse<null>>(`/addresses/${id}`);
}

export async function setDefaultAddress(id: number): Promise<Address> {
  return unwrap<Address>(http.patch<ApiResponse<Address>>(`/addresses/${id}/default`));
}
