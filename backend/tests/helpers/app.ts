import type { Application } from 'express';
import { createApp } from '../../src/app';

let cached: Application | null = null;

export function getApp(): Application {
  if (!cached) cached = createApp();
  return cached;
}
