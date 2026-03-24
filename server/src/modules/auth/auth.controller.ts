import { NextFunction, Request, Response } from "express";
import { env, isProduction } from "../../config/env";
import { ok } from "../../utils/http";
import { AuthService } from "./auth.service";
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "./auth.validation";

export class AuthController {
  constructor(private readonly service: AuthService) {}

  // Store refresh token in HTTP-only cookie to reduce XSS token theft.
  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      path: "/api/auth",
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie("refreshToken", { path: "/api/auth" });
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = registerSchema.parse(req.body);
      const data = await this.service.register(payload.email, payload.password);
      this.setRefreshCookie(res, data.refreshToken);
      return res.status(201).json(ok({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken }));
    } catch (error) {
      return next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = loginSchema.parse(req.body);
      const data = await this.service.login(payload.email, payload.password);
      this.setRefreshCookie(res, data.refreshToken);
      return res.json(ok({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken }));
    } catch (error) {
      return next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bodyToken = req.body?.refreshToken;
      const cookieToken = req.cookies?.refreshToken;
      const payload = refreshSchema.parse({ refreshToken: bodyToken || cookieToken });
      const data = await this.service.refresh(payload.refreshToken);
      this.setRefreshCookie(res, data.refreshToken);
      return res.json(ok({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken }));
    } catch (error) {
      return next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bodyToken = req.body?.refreshToken;
      const cookieToken = req.cookies?.refreshToken;
      const payload = logoutSchema.parse({ refreshToken: bodyToken || cookieToken });
      const data = await this.service.logout(payload.refreshToken);
      this.clearRefreshCookie(res);
      return res.json(ok(data));
    } catch (error) {
      return next(error);
    }
  };
}
