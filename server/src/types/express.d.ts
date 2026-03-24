import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        userId: string;
        role: UserRole;
      };
    }
  }
}

export {};
