import type { NextFunction, Request, Response } from "express";
import type { AdminAuthService, AdminPrincipal, AdminSession } from "@bespoke/server-auth";
import { ApiError } from "./shared/api-error.js";

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPrincipal;
      adminSession?: AdminSession;
    }
  }
}

const protectedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function signedSessionCookie(req: Request, cookieName: string) {
  const value = req.signedCookies?.[cookieName];
  return typeof value === "string" ? value : undefined;
}

export function requireControlAdmin(auth: AdminAuthService, permission?: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const session = auth.session(signedSessionCookie(req, auth.sessionCookieName));
    if (!session) {
      return next(new ApiError(401, "AUTHENTICATION_REQUIRED", "Entre para continuar."));
    }
    if (permission && !session.admin.permissions.includes(permission)) {
      return next(new ApiError(403, "PERMISSION_DENIED", "Permissao insuficiente."));
    }
    if (
      protectedMethods.has(req.method) &&
      !auth.csrfMatches(session, req.header("x-csrf-token"))
    ) {
      return next(new ApiError(403, "CSRF_TOKEN_INVALID", "A sessao nao validou esta alteracao."));
    }
    req.admin = session.admin;
    req.adminSession = session;
    return next();
  };
}
