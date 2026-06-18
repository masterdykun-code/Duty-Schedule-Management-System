import { pool } from "../../../db.js";
import { ScheduleRepository } from "../repositories/schedule.repository.js";
import { addDaysIso } from "../../../utils/schedule-date.js";
import {
  mapAssignmentEmployee,
  mapGeneralSchedule,
  mapRequiredShiftConfig,
  mapScheduleRoom,
  mapShift,
} from "../../../utils/schedule.mappers.js";

export async function getAssignmentCellContext(client, roomId, shiftId) {
  const result = await client.query(
    `
    SELECT
      r.room_id,
      r.room_code,
      r.department_id,
      d.department_code,
      d.department_name,
      sh.shift_id,
      sh.shift_code,
      sh.shift_name,
      drs.is_required,
      drs.min_staff,
      drs.max_staff
    FROM rooms r
    JOIN departments d
      ON d.department_id = r.department_id
     AND d.status = 'ACTIVE'
    JOIN shifts sh
      ON sh.shift_id = $2
     AND sh.status = 'ACTIVE'
    JOIN department_required_shifts drs
      ON drs.department_id = r.department_id
     AND drs.shift_id = sh.shift_id
     AND drs.status = 'ACTIVE'
    WHERE r.room_id = $1
      AND r.status = 'ACTIVE'
    LIMIT 1
    `,
    [roomId, shiftId],
  );

  return result.rows[0];
}

export async function findMissingRequiredAssignments(client, weekStart) {
  const result = await client.query(
    `
    WITH week_days AS (
      SELECT generate_series($1::date, $1::date + INTERVAL '6 days', INTERVAL '1 day')::date AS duty_date
    )
    SELECT
      d.department_id,
      d.department_code,
      d.department_name,
      r.room_id,
      r.room_code,
      sh.shift_id,
      sh.shift_code,
      sh.shift_name,
      to_char(wd.duty_date, 'YYYY-MM-DD') AS duty_date,
      drs.min_staff,
      drs.max_staff,
      COUNT(s.schedule_id)::INTEGER AS assigned_count
    FROM department_required_shifts drs
    JOIN departments d
      ON d.department_id = drs.department_id
     AND d.status = 'ACTIVE'
    JOIN rooms r
      ON r.department_id = d.department_id
     AND r.status = 'ACTIVE'
    JOIN shifts sh
      ON sh.shift_id = drs.shift_id
     AND sh.status = 'ACTIVE'
    CROSS JOIN week_days wd
    LEFT JOIN schedules s
      ON s.department_id = d.department_id
     AND s.room_id = r.room_id
     AND s.shift_id = sh.shift_id
     AND s.duty_date = wd.duty_date
     AND s.status <> 'CANCELLED'
    WHERE drs.status = 'ACTIVE'
      AND drs.is_required = TRUE
    GROUP BY
      d.department_id,
      d.department_code,
      d.department_name,
      r.room_id,
      r.room_code,
      sh.shift_id,
      sh.shift_code,
      sh.shift_name,
      wd.duty_date,
      drs.min_staff,
      drs.max_staff
    HAVING COUNT(s.schedule_id) < drs.min_staff
    ORDER BY d.department_name ASC, r.room_code ASC, wd.duty_date ASC, sh.shift_name ASC
    `,
    [weekStart],
  );

  return result.rows;
}

export async function upsertAssignedSchedule(
  client,
  { employeeId, departmentId, roomId, shiftId, dutyDate, assignedByUserId, note = null },
) {
  const existingResult = await client.query(
    `
    SELECT schedule_id, status
    FROM schedules
    WHERE employee_id = $1
      AND duty_date = $2::date
      AND shift_id = $3
    LIMIT 1
    `,
    [employeeId, dutyDate, shiftId],
  );

  const existing = existingResult.rows[0];

  if (existing) {
    await client.query(
      `
      UPDATE schedules
      SET
        department_id = $1,
        room_id = $2,
        assigned_by_user_id = $3,
        status = 'ASSIGNED',
        note = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = $5
      `,
      [departmentId, roomId, assignedByUserId, note, existing.schedule_id],
    );

    return existing.status === "CANCELLED" ? "created" : "updated";
  }

  await client.query(
    `
    INSERT INTO schedules (
      employee_id, department_id, room_id, shift_id, assigned_by_user_id, duty_date, status, note
    )
    VALUES ($1, $2, $3, $4, $5, $6::date, 'ASSIGNED', $7)
    `,
    [employeeId, departmentId, roomId, shiftId, assignedByUserId, dutyDate, note],
  );

  return "created";
}

export async function getAssignmentPayload(weekStart) {
  const [rooms, shifts, schedules, employees, requiredShifts] =
    await Promise.all([
      ScheduleRepository.getRooms(pool),
      ScheduleRepository.getShifts(pool),
      ScheduleRepository.getGeneralSchedule(pool, weekStart),
      ScheduleRepository.getAssignmentEmployees(pool),
      ScheduleRepository.getRequiredShiftConfigs(pool),
    ]);

  return {
    week_start: weekStart,
    week_end: addDaysIso(weekStart, 6),
    rooms: rooms.map(mapScheduleRoom),
    shifts: shifts.map(mapShift),
    employees: employees.map(mapAssignmentEmployee),
    required_shifts: requiredShifts.map(mapRequiredShiftConfig),
    total: schedules.length,
    data: schedules.map(mapGeneralSchedule),
  };
}
