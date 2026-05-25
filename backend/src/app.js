import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import adminRoutes from "./admin/admin.routes.js";
import authRoutes from "./auth/auth.routes.js";
import notificationRoutes from "./notifications/notification.routes.js";
import scheduleRoutes from "./schedules/schedule.routes.js";
import tableRoutes from "./routes/table.routes.js";
import userRoutes from "./users/user.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (req, res) => {
    res.json({
      message: "Backend Node.js + PostgreSQL dang chay",
    });
  });

  app.get("/health", async (req, res) => {
    try {
      const result = await pool.query("SELECT NOW()");
      res.json({
        status: "OK",
        database_time: result.rows[0].now,
      });
    } catch (error) {
      res.status(500).json({
        status: "ERROR",
        message: error.message,
      });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/schedules", scheduleRoutes);
  app.use("/api", userRoutes);
  app.use("/api", tableRoutes);

  return app;
}
