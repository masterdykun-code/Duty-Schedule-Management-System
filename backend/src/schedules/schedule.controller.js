import { pool } from "../db.js";
import {
  employeeProfileForScheduleSelect,
  generalScheduleSelect,
  personalScheduleSelect,
  scheduleRoomsSelect,
  scheduleShiftsSelect,
} from "./schedule.queries.js";

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromIso(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDaysIso(value, days) {
  const date = dateFromIso(value);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

function currentWeekStartIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatIsoDate(date);
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const date = dateFromIso(value);
  return formatIsoDate(date) === value;
}

function getRequestedWeekStart(value) {
  if (!value) {
    return currentWeekStartIso();
  }

  if (!isValidIsoDate(value)) {
    return null;
  }

  return value;
}

function mapProfile(row) {
  return {
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    full_name: row.full_name,
    position: row.position,
    status: row.status,
    department_id: row.department_id,
    department_code: row.department_code,
    department_name: row.department_name,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
  };
}

function mapSchedule(row) {
  return {
    schedule_id: row.schedule_id,
    duty_date: row.duty_date,
    status: row.status,
    note: row.note,
    department_id: row.department_id,
    department_code: row.department_code,
    department_name: row.department_name,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
    shift_id: row.shift_id,
    shift_code: row.shift_code,
    shift_name: row.shift_name,
    start_time: row.start_time,
    end_time: row.end_time,
    shift_type: row.shift_type,
    assigned_by_username: row.assigned_by_username,
    swap_request_status: row.swap_request_status,
  };
}

function mapScheduleRoom(row) {
  return {
    department_id: row.department_id,
    department_code: row.department_code,
    department_name: row.department_name,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
  };
}

function mapShift(row) {
  return {
    shift_id: row.shift_id,
    shift_code: row.shift_code,
    shift_name: row.shift_name,
    start_time: row.start_time,
    end_time: row.end_time,
    shift_type: row.shift_type,
  };
}

function mapGeneralSchedule(row) {
  return {
    schedule_id: row.schedule_id,
    duty_date: row.duty_date,
    status: row.status,
    note: row.note,
    department_id: row.department_id,
    department_code: row.department_code,
    department_name: row.department_name,
    room_id: row.room_id,
    room_code: row.room_code,
    room_name: row.room_name,
    shift_id: row.shift_id,
    shift_code: row.shift_code,
    shift_name: row.shift_name,
    start_time: row.start_time,
    end_time: row.end_time,
    shift_type: row.shift_type,
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    full_name: row.full_name,
    position: row.position,
  };
}

export async function getMySchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phai co dinh dang YYYY-MM-DD",
      });
    }

    const profileResult = await pool.query(employeeProfileForScheduleSelect, [req.user.sub]);
    const profile = profileResult.rows[0];

    if (!profile) {
      return res.status(404).json({
        message: "Tai khoan nay chua lien ket voi nhan vien y te",
      });
    }

    const [shiftResult, scheduleResult] = await Promise.all([
      pool.query(scheduleShiftsSelect),
      pool.query(personalScheduleSelect, [
        profile.employee_id,
        weekStart,
      ]),
    ]);

    res.json({
      week_start: weekStart,
      week_end: addDaysIso(weekStart, 6),
      profile: mapProfile(profile),
      shifts: shiftResult.rows.map(mapShift),
      total: scheduleResult.rowCount,
      data: scheduleResult.rows.map(mapSchedule),
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay lich truc ca nhan",
      error: error.message,
    });
  }
}

export async function getGeneralSchedule(req, res) {
  try {
    const weekStart = getRequestedWeekStart(req.query.week_start);

    if (!weekStart) {
      return res.status(400).json({
        message: "week_start phai co dinh dang YYYY-MM-DD",
      });
    }

    const [roomsResult, shiftsResult, schedulesResult] = await Promise.all([
      pool.query(scheduleRoomsSelect),
      pool.query(scheduleShiftsSelect),
      pool.query(generalScheduleSelect, [weekStart]),
    ]);

    res.json({
      week_start: weekStart,
      week_end: addDaysIso(weekStart, 6),
      rooms: roomsResult.rows.map(mapScheduleRoom),
      shifts: shiftsResult.rows.map(mapShift),
      total: schedulesResult.rowCount,
      data: schedulesResult.rows.map(mapGeneralSchedule),
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay lich truc tong quat",
      error: error.message,
    });
  }
}
