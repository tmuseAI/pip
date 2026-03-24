import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, fail } from "../utils/http";
import { logger } from "../utils/logger";

export function notFoundMiddleware(_req: Request, res: Response) {
  res.status(404).json(fail("Route not found"));
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json(fail("Validation error", err.flatten()));
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(fail(err.message, err.details));
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json(fail("Email already exists"));
    }
    if (err.code === "P2022") {
      return res
        .status(500)
        .json(fail("Database schema is out of sync. Run prisma migrate before using auth APIs."));
    }
  }

  logger.error({ err }, "Unhandled server error");
  return res.status(500).json(fail("Internal server error"));
}
