import type { NextFunction, Request, Response } from "express";
import {
  type AdminAuthService,
  type AdminPrincipal,
  type AdminSession,
} from "../modules/auth/admin-auth.service.js";
import { ApiError } from "../shared/api-error.js";

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPrincipal;
      adminSession?: AdminSession;
    }
  }
}

const csrfProtectedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function requireAdmin(
  auth: AdminAuthService,
  permission?: string | readonly string[],
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = signedSessionCookie(req, auth.sessionCookieName);
    const session = auth.session(token);
    if (!session) {
      return next(
        new ApiError(
          401,
          "AUTHENTICATION_REQUIRED",
          "Authentication is required.",
        ),
      );
    }

    const hasPermission = !permission
      ? true
      : typeof permission === "string"
        ? session.admin.permissions.includes(permission)
        : permission.some((candidate) =>
            session.admin.permissions.includes(candidate),
          );

    if (!hasPermission) {
      return next(
        new ApiError(
          403,
          "PERMISSION_DENIED",
          "You do not have permission to perform this action.",
        ),
      );
    }

    if (
      csrfProtectedMethods.has(req.method) &&
      !auth.csrfMatches(session, req.header("x-csrf-token"))
    ) {
      return next(
        new ApiError(
          403,
          "CSRF_TOKEN_INVALID",
          "A sessao administrativa nao pode validar esta alteracao.",
        ),
      );
    }

    req.admin = session.admin;
    req.adminSession = session;
    return next();
  };
}

export function signedSessionCookie(req: Request, cookieName: string) {
  const value = req.signedCookies?.[cookieName];
  return typeof value === "string" ? value : undefined;
}
