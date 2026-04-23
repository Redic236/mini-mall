import type { Transaction } from 'sequelize';
import { Address } from '../models';
import { sequelize } from '../config/database';
import { HttpError } from '../utils/apiResponse';
import { audit } from '../utils/audit';

export interface AddressInput {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

async function findOwnedAddress(userId: number, id: number, transaction?: Transaction): Promise<Address> {
  const address = await Address.findOne({ where: { id, userId }, transaction });
  if (!address) throw new HttpError(404, '地址不存在');
  return address;
}

export async function listAddresses(userId: number): Promise<Address[]> {
  return Address.findAll({
    where: { userId },
    order: [['isDefault', 'DESC'], ['id', 'DESC']],
  });
}

export async function createAddress(userId: number, input: AddressInput): Promise<Address> {
  return sequelize.transaction(async (t) => {
    if (input.isDefault) {
      await Address.update({ isDefault: false }, { where: { userId }, transaction: t });
    }
    const created = await Address.create(
      {
        userId,
        name: input.name,
        phone: input.phone,
        province: input.province,
        city: input.city,
        district: input.district,
        detail: input.detail,
        isDefault: input.isDefault ?? false,
      },
      { transaction: t },
    );
    await created.reload({ transaction: t });
    audit({
      event: 'address.create',
      entity: 'address',
      entityId: created.get('id') as number,
      details: { userId, isDefault: Boolean(created.get('isDefault')) },
    });
    return created;
  });
}

export async function updateAddress(userId: number, id: number, input: AddressInput): Promise<Address> {
  return sequelize.transaction(async (t) => {
    const address = await findOwnedAddress(userId, id, t);
    if (input.isDefault) {
      await Address.update({ isDefault: false }, { where: { userId }, transaction: t });
    }
    address.set('name', input.name);
    address.set('phone', input.phone);
    address.set('province', input.province);
    address.set('city', input.city);
    address.set('district', input.district);
    address.set('detail', input.detail);
    address.set('isDefault', input.isDefault ?? false);
    await address.save({ transaction: t });
    await address.reload({ transaction: t });
    audit({
      event: 'address.update',
      entity: 'address',
      entityId: id,
      details: { userId, isDefault: Boolean(address.get('isDefault')) },
    });
    return address;
  });
}

export async function deleteAddress(userId: number, id: number): Promise<void> {
  await sequelize.transaction(async (t) => {
    const address = await findOwnedAddress(userId, id, t);
    const wasDefault = Boolean(address.get('isDefault'));
    await address.destroy({ transaction: t });

    let promotedId: number | null = null;
    if (wasDefault) {
      const next = await Address.findOne({
        where: { userId },
        order: [['id', 'ASC']],
        transaction: t,
      });
      if (next) {
        next.set('isDefault', true);
        await next.save({ transaction: t });
        promotedId = next.get('id') as number;
      }
    }
    audit({
      event: 'address.delete',
      entity: 'address',
      entityId: id,
      details: { userId, wasDefault, promotedDefaultId: promotedId },
    });
  });
}

export async function setDefaultAddress(userId: number, id: number): Promise<Address> {
  return sequelize.transaction(async (t) => {
    const address = await findOwnedAddress(userId, id, t);
    await Address.update({ isDefault: false }, { where: { userId }, transaction: t });
    address.set('isDefault', true);
    await address.save({ transaction: t });
    await address.reload({ transaction: t });
    audit({ event: 'address.setDefault', entity: 'address', entityId: id, details: { userId } });
    return address;
  });
}
