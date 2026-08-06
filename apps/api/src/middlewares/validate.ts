import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export function validateBody<TSchema extends ZodTypeAny>(schema: TSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next({
        statusCode: 400,
        code: "INVALID_BODY",
        message: "Invalid request body.",
        cause: parsed.error.flatten(),
      });
    }

    req.body = parsed.data;
    return next();
  };
}

export function validateQuery<TSchema extends ZodTypeAny>(schema: TSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next({
        statusCode: 400,
        code: "INVALID_QUERY",
        message: "Invalid query string.",
        cause: parsed.error.flatten(),
      });
    }

    req.query = parsed.data as Request["query"];
    return next();
  };
}
