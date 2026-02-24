"use strict";

import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";
import { AppError } from "../utils/errors";

export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await Promise.all(validations.map((v) => v.run(req)));
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const msg = errors.array().map((e) => (e as { msg: string }).msg).join("; ");
        throw new AppError(msg, 400);
      }
      next();
    } catch (e) {
      next(e);
    }
  };
};
