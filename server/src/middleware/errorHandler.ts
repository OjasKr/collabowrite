"use strict";

import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }
  if (err.name === "ValidationError") {
    res.status(400).json({ success: false, message: "Validation failed." });
    return;
  }
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    res.status(401).json({ success: false, message: "Invalid or expired token." });
    return;
  }
  res.status(500).json({ success: false, message: "Internal server error." });
};
