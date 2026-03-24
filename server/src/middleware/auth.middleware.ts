import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { verifyToken } from "../utils/jwt";
import { AppError } from "../utils/http";

function parseBearerToken(headerValue?: string): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    return next(new AppError(401, "Missing access token"));
  }

  try {
    const payload = verifyToken(token, "access");
    req.authUser = { userId: payload.sub, role: payload.role as UserRole };
    return next();
  } catch {
    return next(new AppError(401, "Invalid or expired access token"));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.authUser) return next(new AppError(401, "Unauthorized"));
    if (!roles.includes(req.authUser.role)) return next(new AppError(403, "Forbidden"));
    return next();
  };
}
