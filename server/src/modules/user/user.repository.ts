import { User } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class UserRepository {
  findById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id: userId } });
  }
}
