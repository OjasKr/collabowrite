"use strict";

import { Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { DocAccessRequest } from "./checkDocAccess";

export const checkOwnerOnly = (
  req: DocAccessRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (req.docRole !== "owner") {
    next(new AppError("Only the document owner can perform this action.", 403));
    return;
  }
  next();
};
