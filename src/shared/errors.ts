export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const Errors = {
  // Auth
  INVALID_CREDENTIALS: () =>
    new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
  UNAUTHORIZED: (msg = 'Unauthorized') =>
    new AppError(401, 'UNAUTHORIZED', msg),
  TOKEN_EXPIRED: () =>
    new AppError(401, 'TOKEN_EXPIRED', 'Token has expired'),
  INVALID_REFRESH_TOKEN: () =>
    new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token'),

  // Resources
  NOT_FOUND: (resource: string) =>
    new AppError(404, 'NOT_FOUND', `${resource} not found`),
  CONFLICT: (msg: string) =>
    new AppError(409, 'CONFLICT', msg),

  // Validation
  VALIDATION_ERROR: (msg: string) =>
    new AppError(400, 'VALIDATION_ERROR', msg),

  // Permissions
  FORBIDDEN: (msg = 'Forbidden') =>
    new AppError(403, 'FORBIDDEN', msg),

  // Server
  INTERNAL: (msg = 'Internal server error') =>
    new AppError(500, 'INTERNAL_ERROR', msg),
  NOT_IMPLEMENTED: (msg = 'Not implemented') =>
    new AppError(501, 'NOT_IMPLEMENTED', msg),
};
