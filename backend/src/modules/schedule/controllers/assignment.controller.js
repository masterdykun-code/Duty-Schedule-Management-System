import { pool } from "../../../db.js";
import { getRequestedWeekStart } from "../../../utils/schedule-date.js";
import {
  saveAssignmentCellService,
  autoAssignScheduleService,
  resetAssignmentScheduleService,
  validateAssignmentScheduleService,
  getAssignmentPayload,
} from "../services/assignment.service.js";
import {
  validateSaveAssignmentCellDTO,
  validateWeekStartDTO,
} from "../dtos/schedule.dto.js";
import { sendSuccess, sendError } from "../../../utils/response.js";

export async function getAssignmentSchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.query.week_start);
    if (!weekStart) {
      return sendError(res, "week_start phải có định dạng YYYY-MM-DD", 400);
    }

    const payload = await getAssignmentPayload(weekStart);
    sendSuccess(res, payload);
  } catch (error) {
    sendError(res, "Lỗi khi lấy dữ liệu phân công lịch trực", 500, { error: error.message });
  }
}

export async function saveAssignmentCell(req, res) {
  const client = await pool.connect();

  try {
    const dto = validateSaveAssignmentCellDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { employeeIds, departmentId, roomId, shiftId, dutyDate, note } = dto.data;

    await client.query("BEGIN");

    await saveAssignmentCellService(client, {
      employeeIds,
      departmentId,
      roomId,
      shiftId,
      dutyDate,
      note,
      user: req.user,
      req,
    });

    await client.query("COMMIT");

    sendSuccess(res, {
      message: "Lưu phân công thành công",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const statusCode = error.statusCode || 500;
    const isConflict = ["23505", "23514"].includes(error.code);
    sendError(
      res,
      isConflict ? error.message : (error.message || "Lỗi khi lưu phân công"),
      isConflict ? 400 : statusCode,
      { error: error.message }
    );
  } finally {
    client.release();
  }
}

export async function validateAssignmentSchedule(req, res) {
  try {
    const weekStartVal = req.body.week_start || req.query.week_start;
    const dto = validateWeekStartDTO({ week_start: weekStartVal });
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { weekStart } = dto.data;
    const result = await validateAssignmentScheduleService(weekStart);

    sendSuccess(res, result);
  } catch (error) {
    sendError(res, "Lỗi khi kiểm tra lịch trực", 500, { error: error.message });
  }
}

export async function autoAssignSchedule(req, res) {
  const client = await pool.connect();

  try {
    const weekStartVal = req.body.week_start || req.query.week_start;
    const dto = validateWeekStartDTO({ week_start: weekStartVal });
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { weekStart } = dto.data;

    await client.query("BEGIN");

    const result = await autoAssignScheduleService(client, {
      weekStart,
      user: req.user,
      req,
    });

    await client.query("COMMIT");

    sendSuccess(res, result);
  } catch (error) {
    await client.query("ROLLBACK");
    const isConflict = ["23505", "23514"].includes(error.code);
    sendError(
      res,
      isConflict ? error.message : "Lỗi khi phân công tự động",
      isConflict ? 400 : 500,
      { error: error.message }
    );
  } finally {
    client.release();
  }
}

export async function resetAssignmentSchedule(req, res) {
  const client = await pool.connect();

  try {
    const weekStartVal = req.body.week_start || req.query.week_start;
    const dto = validateWeekStartDTO({ week_start: weekStartVal });
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { weekStart } = dto.data;

    await client.query("BEGIN");

    const result = await resetAssignmentScheduleService(client, {
      weekStart,
      user: req.user,
      req,
    });

    await client.query("COMMIT");

    sendSuccess(res, result);
  } catch (error) {
    await client.query("ROLLBACK");
    sendError(res, "Lỗi khi reset phân công", 500, { error: error.message });
  } finally {
    client.release();
  }
}
