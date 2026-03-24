import crypto from "crypto";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

type TokenType = "access" | "refresh";

export type AuthJwtPayload = JwtPayload & {
  sub: string;
  role: "USER" | "ADMIN";
  type: TokenType;
};

function signToken(
  userId: string,
  role: "USER" | "ADMIN",
  type: TokenType,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"],
): string {
  return jwt.sign({ role, type }, secret, {
    subject: userId,
    expiresIn,
    jwtid: crypto.randomUUID(),
  });
}

export function signAccessToken(userId: string, role: "USER" | "ADMIN"): string {
  return signToken(userId, role, "access", env.JWT_ACCESS_SECRET, env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"]);
}

export function signRefreshToken(userId: string, role: "USER" | "ADMIN"): string {
  return signToken(userId, role, "refresh", env.JWT_REFRESH_SECRET, `${env.REFRESH_TOKEN_TTL_DAYS}d`);
}

export function verifyToken(token: string, type: TokenType): AuthJwtPayload {
  const secret = type === "access" ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
  const payload = jwt.verify(token, secret) as AuthJwtPayload;
  if (payload.type !== type || !payload.sub) {
    throw new Error("Invalid token type");
  }
  return payload;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
