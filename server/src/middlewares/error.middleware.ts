import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { env } from "../config/env";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message
        }))
      }
    });
    return;
  }

  // 2. Custom AppErrors (Operational errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.constructor.name,
        message: err.message
      }
    });
    return;
  }

  // 3. Mongoose Duplicate Key Error (code 11000)
  if ((err as unknown as { code?: number }).code === 11000) {
    res.status(409).json({
      success: false,
      error: {
        code: "CONFLICT_ERROR",
        message: "An item with this name already exists in this folder."
      }
    });
    return;
  }

  // 4. Multer File Size Limit Error
  if (err.name === "MulterError") {
    res.status(413).json({
      success: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: err.message
      }
    });
    return;
  }

  // 5. Unhandled / Unexpected Errors
  console.error("💥 Unhandled Error:", err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: env.NODE_ENV === "production" ? "Something went wrong on the server." : err.message
    }
  });
};
