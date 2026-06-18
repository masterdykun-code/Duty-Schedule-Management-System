import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import adminRoutes from "./modules/admin/routes/admin.routes.js";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import notificationRoutes from "./modules/notification/routes/notification.routes.js";
import scheduleRoutes from "./modules/schedule/routes/schedule.routes.js";
import tableRoutes from "./routes/table.routes.js";
import userRoutes from "./modules/user/routes/user.routes.js";
import { sendSuccess, sendError } from "./utils/response.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (req, res) => {
    sendSuccess(res, {
      message: "Backend Node.js + PostgreSQL đang chạy",
    });
  });

  app.get("/health", async (req, res) => {
    try {
      const result = await pool.query("SELECT NOW()");
      sendSuccess(res, {
        status: "OK",
        database_time: result.rows[0].now,
      });
    } catch (error) {
      sendError(res, error.message, 500, { status: "ERROR" });
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
