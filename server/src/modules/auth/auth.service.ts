import { UserRole } from "@prisma/client";
import { AppError } from "../../utils/http";
import { comparePassword, hashPassword } from "../../utils/hash";
import { hashToken, signAccessToken, signRefreshToken, verifyToken } from "../../utils/jwt";
import { env } from "../../config/env";
import { AuthRepository } from "./auth.repository";

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  private buildTokenPair(userId: string, role: UserRole): TokenPair {
    return {
      accessToken: signAccessToken(userId, role),
      refreshToken: signRefreshToken(userId, role),
    };
  }

  private getRefreshExpiry(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
    return expiresAt;
  }

  async register(email: string, password: string) {
    const existing = await this.repo.findUserByEmail(email);
    if (existing) throw new AppError(409, "Email already exists");

    const hashed = await hashPassword(password);
    const user = await this.repo.createUser(email, hashed, "USER");
    const tokens = this.buildTokenPair(user.id, user.role);
    await this.repo.createRefreshToken(user.id, hashToken(tokens.refreshToken), this.getRefreshExpiry());

    return {
      user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await this.repo.findUserByEmail(email);
    if (!user) throw new AppError(401, "Invalid email or password");

    const validPassword = await comparePassword(password, user.password);
    if (!validPassword) throw new AppError(401, "Invalid email or password");

    const tokens = this.buildTokenPair(user.id, user.role);
    await this.repo.createRefreshToken(user.id, hashToken(tokens.refreshToken), this.getRefreshExpiry());

    return {
      user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyToken(refreshToken, "refresh");
    } catch {
      throw new AppError(401, "Invalid or expired refresh token");
    }

    const storedToken = await this.repo.findRefreshToken(hashToken(refreshToken));
    if (!storedToken) {
      // If token was valid but missing in DB, revoke all user tokens (reuse detection).
      await this.repo.revokeAllUserRefreshTokens(payload.sub);
      throw new AppError(401, "Refresh token reuse detected");
    }

    if (storedToken.revoked || storedToken.expiresAt.getTime() <= Date.now()) {
      await this.repo.revokeRefreshTokenById(storedToken.id);
      throw new AppError(401, "Refresh token has been revoked or expired");
    }

    const user = await this.repo.findUserById(payload.sub);
    if (!user) throw new AppError(401, "User not found");

    await this.repo.deleteRefreshTokenById(storedToken.id);
    const nextTokens = this.buildTokenPair(user.id, user.role);
    await this.repo.createRefreshToken(user.id, hashToken(nextTokens.refreshToken), this.getRefreshExpiry());

    return {
      user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
      ...nextTokens,
    };
  }

  async meFromRefreshToken(refreshToken: string) {
    let payload;
    try {
      payload = verifyToken(refreshToken, "refresh");
    } catch {
      throw new AppError(401, "Unauthorized");
    }
    const storedToken = await this.repo.findRefreshToken(hashToken(refreshToken));
    if (!storedToken || storedToken.revoked || storedToken.expiresAt.getTime() <= Date.now()) {
      throw new AppError(401, "Unauthorized");
    }
    const user = await this.repo.findUserById(payload.sub);
    if (!user) throw new AppError(401, "Unauthorized");
    return { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified };
  }

  async logout(refreshToken: string) {
    try {
      verifyToken(refreshToken, "refresh");
    } catch {
      return { loggedOut: true };
    }

    const storedToken = await this.repo.findRefreshToken(hashToken(refreshToken));
    if (storedToken) {
      await this.repo.revokeRefreshTokenById(storedToken.id);
    }
    return { loggedOut: true };
  }
}
