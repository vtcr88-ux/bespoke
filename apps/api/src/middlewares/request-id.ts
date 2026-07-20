import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  req.requestId = incoming && incoming.length <= 80 ? incoming : crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}
