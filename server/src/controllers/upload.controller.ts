"use strict";

import { Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import { AuthenticatedRequest } from "../middleware/requireAuth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

type RequestWithFile = AuthenticatedRequest & { file?: { buffer: Buffer; mimetype: string } };

export const uploadImage = async (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ success: false, message: "No image file provided." });
      return;
    }
    if (!ALLOWED_MIMES.includes(file.mimetype || "")) {
      res.status(400).json({
        success: false,
        message: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP.",
      });
      return;
    }
    if (file.buffer.length > MAX_FILE_SIZE) {
      res.status(400).json({
        success: false,
        message: "Image must be at most 5MB.",
      });
      return;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      res.status(503).json({
        success: false,
        message: "Image upload is not configured.",
      });
      return;
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    const b64 = file.buffer.toString("base64");
    const dataUri = `data:${file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "collabowrite",
      resource_type: "image",
    });

    if (!result?.secure_url) {
      res.status(502).json({ success: false, message: "Upload failed." });
      return;
    }

    res.status(200).json({ success: true, url: result.secure_url });
  } catch (e) {
    next(e);
  }
};
