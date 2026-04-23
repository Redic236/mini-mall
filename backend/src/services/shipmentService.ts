import type { Transaction } from 'sequelize';
import { Order, ShipmentEvent, SHIPMENT_STATUS } from '../models';
import type { ShipmentStatus } from '../models';
import { HttpError } from '../utils/apiResponse';
import { audit } from '../utils/audit';

export interface ShipmentEventInput {
  status: ShipmentStatus;
  location?: string | null;
  note?: string | null;
  happenedAt?: Date;
}

export async function addShipmentEvent(
  orderId: number,
  input: ShipmentEventInput,
  transaction?: Transaction,
): Promise<ShipmentEvent> {
  const event = await ShipmentEvent.create(
    {
      orderId,
      status: input.status,
      location: input.location ?? null,
      note: input.note ?? null,
      happenedAt: input.happenedAt ?? new Date(),
    },
    { transaction },
  );
  audit({
    event: 'shipment.event',
    entity: 'shipment',
    entityId: event.get('id') as number,
    details: { orderId, status: input.status, location: input.location ?? null },
  });
  return event;
}

/**
 * Read the timeline for an order the caller owns. Admin paths skip the
 * ownership filter and go through listForOrderUnchecked.
 */
export async function listForOrderOwned(
  userId: number,
  orderId: number,
): Promise<ShipmentEvent[]> {
  const order = await Order.findOne({ where: { id: orderId, userId } });
  if (!order) throw new HttpError(404, '订单不存在');
  return ShipmentEvent.findAll({
    where: { orderId },
    order: [['happenedAt', 'ASC'], ['id', 'ASC']],
  });
}

export async function listForOrderUnchecked(orderId: number): Promise<ShipmentEvent[]> {
  return ShipmentEvent.findAll({
    where: { orderId },
    order: [['happenedAt', 'ASC'], ['id', 'ASC']],
  });
}

export { SHIPMENT_STATUS };
