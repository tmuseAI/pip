import { RefreshToken, User, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class AuthRepository {
  findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  createUser(email: string, password: string, role: UserRole = "USER"): Promise<User> {
    return prisma.user.create({
      data: { email, password, role },
    });
  }

  createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  findRefreshToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { token } });
  }

  revokeRefreshTokenById(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { id },
      data: { revoked: true },
    });
  }

  deleteRefreshTokenById(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.delete({ where: { id } });
  }

  revokeAllUserRefreshTokens(userId: string): Promise<{ count: number }> {
    return prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}
