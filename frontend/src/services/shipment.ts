import { http, unwrap } from './http';
import type { ApiResponse, ShipmentEvent, ShipmentStatus } from '@/types';

export async function fetchShipmentEvents(orderId: number): Promise<ShipmentEvent[]> {
  return unwrap<ShipmentEvent[]>(
    http.get<ApiResponse<ShipmentEvent[]>>(`/orders/${orderId}/shipment-events`),
  );
}

export async function fetchAdminShipmentEvents(orderId: number): Promise<ShipmentEvent[]> {
  return unwrap<ShipmentEvent[]>(
    http.get<ApiResponse<ShipmentEvent[]>>(`/admin/orders/${orderId}/shipment-events`),
  );
}

export interface ShipmentEventInput {
  status: ShipmentStatus;
  location?: string | null;
  note?: string | null;
}

export async function addAdminShipmentEvent(
  orderId: number,
  input: ShipmentEventInput,
): Promise<ShipmentEvent> {
  return unwrap<ShipmentEvent>(
    http.post<ApiResponse<ShipmentEvent>>(`/admin/orders/${orderId}/shipment-events`, input),
  );
}
