import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/auth.middleware";
import { ok } from "../../utils/http";
import { UserController } from "./user.controller";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

export const userRouter = Router();
userRouter.get("/profile", authMiddleware, userController.profile);
userRouter.get("/admin-only", authMiddleware, requireRole("ADMIN"), (_req, res) =>
  res.json(ok({ message: "Admin access granted" })),
);
