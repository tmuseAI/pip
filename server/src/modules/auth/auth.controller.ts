import { NextFunction, Request, Response } from "express";
import { env, isProduction } from "../../config/env";
import { ok } from "../../utils/http";
import { AuthService } from "./auth.service";
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "./auth.validation";
import { verifyToken } from "../../utils/jwt";

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
      console.log("REQ BODY:", req.body);
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({ success: false, message: "Missing fields" });
      }
      const payload = registerSchema.parse({ email, password });
      const data = await this.service.register(payload.email, payload.password);
      this.setRefreshCookie(res, data.refreshToken);
      return res.status(201).json({ success: true, user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch (error) {
      console.error("🔥 REGISTER ERROR FULL:", error);
      console.error("🔥 STACK:", (error as Error)?.stack);
      return next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = loginSchema.parse(req.body);
      const data = await this.service.login(payload.email, payload.password);
      this.setRefreshCookie(res, data.refreshToken);
      return res.json({ success: true, user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch (error) {
      console.error("LOGIN ERROR:", error);
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
      return res.json({ success: true, user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch (error) {
      console.error("REFRESH ERROR:", error);
      return next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const bearer = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (bearer) {
        const payload = verifyToken(bearer, "access");
        return res.json(ok({ user: { id: payload.sub, role: payload.role } }));
      }
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      const user = await this.service.meFromRefreshToken(refreshToken);
      return res.json(ok({ user }));
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
      console.error("LOGOUT ERROR:", error);
      return next(error);
    }
  };
}
