import cors from 'cors';
import { appConfig } from '../config/app';

export const corsMiddleware = cors({
  origin: appConfig.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});
