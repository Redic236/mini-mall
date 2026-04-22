export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string | null;
  meta?: Record<string, unknown>;
}

export function ok<T>(data: T, message: string | null = null, meta?: Record<string, unknown>): ApiResponse<T> {
  return { success: true, data, message, meta };
}

export function fail(message: string, meta?: Record<string, unknown>): ApiResponse<null> {
  return { success: false, data: null, message, meta };
}

export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}
