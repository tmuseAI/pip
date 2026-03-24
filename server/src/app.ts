import express from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { allowedOrigins } from "./config/env";
import { authRouter } from "./modules/auth/auth.route";
import { userRouter } from "./modules/user/user.route";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import { logger } from "./utils/logger";
import { ok } from "./utils/http";

export const app = express();

const corsOptions: CorsOptions = {
  origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked for this origin"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));

app.get("/api/health", (_req, res) => res.json(ok({ status: "ok" })));
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
