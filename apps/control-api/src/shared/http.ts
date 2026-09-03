import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "./api-error.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  req.requestId = incoming && incoming.length <= 80 ? incoming : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ApiError) {
    if (error.statusCode >= 500) req.log?.error({ err: error }, "request_failed");
    return res.status(error.statusCode).json({
      error: { code: error.code, message: error.message, requestId: req.requestId },
    });
  }
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Dados invalidos.",
        requestId: req.requestId,
      },
    });
  }
  req.log?.error({ err: error }, "request_failed");
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Erro interno inesperado.", requestId: req.requestId },
  });
};
