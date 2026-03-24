import { NextFunction, Request, Response } from "express";
import { ok } from "../../utils/http";
import { UserService } from "./user.service";

export class UserController {
  constructor(private readonly userService: UserService) {}

  profile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, data: null, error: { message: "Unauthorized", details: null } });
      }

      const profile = await this.userService.getProfile(userId);
      return res.json(ok(profile));
    } catch (error) {
      return next(error);
    }
  };
}
