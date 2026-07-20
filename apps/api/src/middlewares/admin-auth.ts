import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/api-error.js";

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        role: "owner" | "manager" | "support";
        permissions: string[];
      };
    }
  }
}

const demoAdmin = {
  id: "00000000-0000-4000-8000-000000000001",
  role: "owner" as const,
  permissions: ["products:write", "orders:read", "reports:read", "settings:write"]
};

export function requireAdmin(permission?: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const session = req.signedCookies?.bespoke_admin_session ?? req.header("x-bespoke-admin-session");
    if (session !== "dev-admin-session") {
      return next(new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication is required."));
    }

    if (permission && !demoAdmin.permissions.includes(permission)) {
      return next(new ApiError(403, "PERMISSION_DENIED", "You do not have permission to perform this action."));
    }

    req.admin = demoAdmin;
    return next();
  };
}
