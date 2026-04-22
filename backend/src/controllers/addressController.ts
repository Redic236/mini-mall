import { NextFunction, Request, Response } from 'express';
import * as addressService from '../services/addressService';
import { ok } from '../utils/apiResponse';
import { addressBodySchema, idSchema, parseOrThrow } from '../utils/validate';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const addresses = await addressService.listAddresses();
    res.json(ok(addresses));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = parseOrThrow(addressBodySchema, req.body);
    const address = await addressService.createAddress(input);
    res.status(201).json(ok(address));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const input = parseOrThrow(addressBodySchema, req.body);
    const address = await addressService.updateAddress(id, input);
    res.json(ok(address));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    await addressService.deleteAddress(id);
    res.json(ok(null, '已删除'));
  } catch (err) {
    next(err);
  }
}

export async function setDefault(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseOrThrow(idSchema, req.params.id, 'id');
    const address = await addressService.setDefaultAddress(id);
    res.json(ok(address));
  } catch (err) {
    next(err);
  }
}
