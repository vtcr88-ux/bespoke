export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function assertFound<T>(value: T | null | undefined, code: string, message: string): T {
  if (value == null) {
    throw new ApiError(404, code, message);
  }

  return value;
}
