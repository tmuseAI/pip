export function ok<T>(data: T) {
  return { success: true, data, error: null };
}

export function fail(message: string, details?: unknown) {
  return { success: false, data: null, error: { message, details: details ?? null } };
}

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
