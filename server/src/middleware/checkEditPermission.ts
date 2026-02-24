"use strict";

import { Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { DocAccessRequest } from "./checkDocAccess";

export const checkEditPermission = (
  req: DocAccessRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (req.docRole === "viewer") {
    next(new AppError("You do not have permission to edit this document.", 403));
    return;
  }
  if (req.docRole === "owner" || req.docRole === "editor") {
    next();
    return;
  }
  next(new AppError("You do not have permission to edit this document.", 403));
};
