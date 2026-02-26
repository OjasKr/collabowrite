"use strict";

import http from "http";
import express from "express";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";

import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import documentRoutes from "./routes/documentRoutes";
import aiRoutes from "./routes/ai.routes";
import { registerDocumentHandlers } from "./sockets/documentHandlers";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

mongoose
  .connect(process.env.DATABASE_URL || "", { dbName: "collabowrite" })
  .then(() => console.log("Database connected."))
  .catch((err) => console.error("DB connection failed.", err));

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(mongoSanitize());

app.use("/api/auth", authRoutes);
app.use("/api/docs", documentRoutes);
app.use("/api/ai", aiRoutes);

app.use(errorHandler);

registerDocumentHandlers(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
