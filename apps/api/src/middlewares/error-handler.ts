import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ApiError } from "../shared/api-error.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "O arquivo enviado excede o limite permitido.",
        requestId: req.requestId
      }
    });
  }

  if (error instanceof ApiError) {
    if (error.statusCode >= 500) {
      req.log?.error(
        { err: error.cause ?? error, requestId: req.requestId },
        "request_failed",
      );
    }
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: req.requestId
      }
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request.",
        requestId: req.requestId
      }
    });
  }

  const statusCode = typeof error?.statusCode === "number" ? error.statusCode : 500;
  const code = typeof error?.code === "string" ? error.code : "INTERNAL_ERROR";
  const message = statusCode >= 500 ? "Unexpected server error." : String(error?.message ?? "Request failed.");

  req.log?.error({ err: error, requestId: req.requestId }, "request_failed");

  return res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: req.requestId
    }
  });
};
