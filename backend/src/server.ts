import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import { connectDB }  from "./config/db";
import { logger }     from "./config/logger";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";

import authRoutes     from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";
import summaryRoutes  from "./routes/summary.routes";
import ragRoutes      from "./routes/rag.routes";
import userRoutes     from "./routes/user.routes";

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/api", apiLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth",      authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/summaries", summaryRoutes);
app.use("/api/rag",       ragRoutes);
app.use("/api/users",     userRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`🚀 SnipixAI backend running on http://localhost:${PORT}`);
      logger.info(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();

export default app;