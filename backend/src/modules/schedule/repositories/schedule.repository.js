export const employeeProfileForScheduleSelect = `
  SELECT
    e.employee_id,
    e.employee_code,
    e.full_name,
    e.position,
    e.status,
    d.department_id,
    d.department_code,
    d.department_name,
    r.room_id,
    r.room_code,
    r.room_name
  FROM employees e
  JOIN departments d ON d.department_id = e.department_id
  LEFT JOIN rooms r ON r.room_id = e.room_id
  WHERE e.user_id = $1
  LIMIT 1
`;

export const personalScheduleSelect = `
  SELECT
    s.schedule_id,
    to_char(s.duty_date, 'YYYY-MM-DD') AS duty_date,
    s.status,
    s.note,
    d.department_id,
    d.department_code,
    d.department_name,
    r.room_id,
    r.room_code,
    r.room_name,
    sh.shift_id,
    sh.shift_code,
    sh.shift_name,
    to_char(sh.start_time, 'HH24:MI') AS start_time,
    to_char(sh.end_time, 'HH24:MI') AS end_time,
    sh.shift_type,
    assigned_by.username AS assigned_by_username,
    active_swap.status AS swap_request_status
  FROM schedules s
  JOIN departments d ON d.department_id = s.department_id
  JOIN rooms r ON r.room_id = s.room_id
  JOIN shifts sh ON sh.shift_id = s.shift_id
  LEFT JOIN users assigned_by ON assigned_by.user_id = s.assigned_by_user_id
  LEFT JOIN LATERAL (
    SELECT sr.status
    FROM swap_requests sr
    WHERE sr.source_schedule_id = s.schedule_id
      AND sr.status IN ('PENDING_RESPONSE', 'PENDING_APPROVAL')
    ORDER BY sr.requested_at DESC
    LIMIT 1
  ) active_swap ON true
  WHERE s.employee_id = $1
    AND s.duty_date BETWEEN $2::date AND ($2::date + INTERVAL '6 days')
    AND s.status <> 'CANCELLED'
    AND sh.status = 'ACTIVE'
  ORDER BY s.duty_date ASC, sh.start_time ASC, sh.shift_id ASC
`;

export const scheduleRoomsSelect = `
  SELECT
    d.department_id,
    d.department_code,
    d.department_name,
    r.room_id,
    r.room_code,
    r.room_name
  FROM departments d
  LEFT JOIN rooms r
    ON r.department_id = d.department_id
   AND r.status = 'ACTIVE'
  WHERE d.status = 'ACTIVE'
  ORDER BY d.department_name ASC, r.room_code ASC
`;

export const scheduleShiftsSelect = `
  SELECT
    shift_id,
    shift_code,
    shift_name,
    to_char(start_time, 'HH24:MI') AS start_time,
    to_char(end_time, 'HH24:MI') AS end_time,
    shift_type
  FROM shifts
  WHERE status = 'ACTIVE'
  ORDER BY start_time ASC, shift_id ASC
`;

export const assignmentEmployeesSelect = `
  SELECT
    e.employee_id,
    e.employee_code,
    e.full_name,
    e.position,
    e.department_id,
    e.room_id,
    r.room_code
  FROM employees e
  LEFT JOIN rooms r ON r.room_id = e.room_id
  WHERE e.status = 'ACTIVE'
  ORDER BY e.department_id ASC, e.position ASC, e.full_name ASC
`;

export const requiredShiftConfigsSelect = `
  SELECT
    drs.department_id,
    drs.shift_id,
    drs.is_required,
    drs.min_staff,
    drs.max_staff
  FROM department_required_shifts drs
  JOIN departments d ON d.department_id = drs.department_id
  JOIN shifts sh ON sh.shift_id = drs.shift_id
  WHERE drs.status = 'ACTIVE'
    AND d.status = 'ACTIVE'
    AND sh.status = 'ACTIVE'
  ORDER BY drs.department_id ASC, sh.start_time ASC, sh.shift_id ASC
`;

export const generalScheduleSelect = `
  SELECT
    s.schedule_id,
    to_char(s.duty_date, 'YYYY-MM-DD') AS duty_date,
    s.status,
    s.note,
    d.department_id,
    d.department_code,
    d.department_name,
    r.room_id,
    r.room_code,
    r.room_name,
    sh.shift_id,
    sh.shift_code,
    sh.shift_name,
    to_char(sh.start_time, 'HH24:MI') AS start_time,
    to_char(sh.end_time, 'HH24:MI') AS end_time,
    sh.shift_type,
    e.employee_id,
    e.employee_code,
    e.full_name,
    e.position
  FROM schedules s
  JOIN departments d ON d.department_id = s.department_id
  JOIN rooms r ON r.room_id = s.room_id
  JOIN shifts sh ON sh.shift_id = s.shift_id
  JOIN employees e ON e.employee_id = s.employee_id
  WHERE s.status <> 'CANCELLED'
    AND s.duty_date BETWEEN $1::date AND ($1::date + INTERVAL '6 days')
    AND sh.status = 'ACTIVE'
  ORDER BY
    d.department_name ASC,
    r.room_code ASC,
    s.duty_date ASC,
    sh.start_time ASC,
    e.position ASC,
    e.full_name ASC
`;

export class ScheduleRepository {
  static async getEmployeeProfile(client, userId) {
    const result = await client.query(employeeProfileForScheduleSelect, [userId]);
    return result.rows[0];
  }

  static async getPersonalSchedule(client, employeeId, weekStart) {
    const result = await client.query(personalScheduleSelect, [employeeId, weekStart]);
    return result.rows;
  }

  static async getRooms(client) {
    const result = await client.query(scheduleRoomsSelect);
    return result.rows;
  }

  static async getShifts(client) {
    const result = await client.query(scheduleShiftsSelect);
    return result.rows;
  }

  static async getAssignmentEmployees(client) {
    const result = await client.query(assignmentEmployeesSelect);
    return result.rows;
  }

  static async getRequiredShiftConfigs(client) {
    const result = await client.query(requiredShiftConfigsSelect);
    return result.rows;
  }

  static async getGeneralSchedule(client, weekStart) {
    const result = await client.query(generalScheduleSelect, [weekStart]);
    return result.rows;
  }

  static async getWeeklySchedulesForAssignment(client, weekStart) {
    const result = await client.query(
      `
      SELECT
        schedule_id,
        employee_id,
        department_id,
        room_id,
        shift_id,
        to_char(duty_date, 'YYYY-MM-DD') AS duty_date,
        status,
        note
      FROM schedules
      WHERE status <> 'CANCELLED'
        AND duty_date BETWEEN $1::date AND ($1::date + INTERVAL '6 days')
      `,
      [weekStart],
    );
    return result.rows;
  }

  static async resetWeeklySchedules(client, weekStart) {
    const result = await client.query(
      `
      UPDATE schedules
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE duty_date BETWEEN $1::date AND ($1::date + INTERVAL '6 days')
        AND status <> 'CANCELLED'
      RETURNING schedule_id
      `,
      [weekStart],
    );
    return result.rows;
  }

  static async saveAssignmentCell(client, { employeeId, departmentId, roomId, shiftId, dutyDate, note, assignedByUserId }) {
    if (!employeeId) {
      // Clear assignment
      const result = await client.query(
        `
        UPDATE schedules
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE department_id = $1
          AND room_id = $2
          AND shift_id = $3
          AND duty_date = $4::date
          AND status <> 'CANCELLED'
        RETURNING schedule_id, employee_id
        `,
        [departmentId, roomId, shiftId, dutyDate],
      );
      return { action: "CANCEL", affected: result.rows };
    }

    // Insert or Update assignment
    const result = await client.query(
      `
      INSERT INTO schedules (
        employee_id, department_id, room_id, shift_id, duty_date, note, assigned_by_user_id, status
      )
      VALUES ($1, $2, $3, $4, $5::date, $6, $7, 'ASSIGNED')
      ON CONFLICT (employee_id, duty_date, shift_id)
      DO UPDATE SET
        department_id = EXCLUDED.department_id,
        room_id = EXCLUDED.room_id,
        note = EXCLUDED.note,
        assigned_by_user_id = EXCLUDED.assigned_by_user_id,
        status = 'UPDATED',
        updated_at = CURRENT_TIMESTAMP
      RETURNING schedule_id, status, (
        SELECT status FROM schedules WHERE employee_id = $1 AND duty_date = $5::date AND shift_id = $4
      ) AS old_status
      `,
      [employeeId, departmentId, roomId, shiftId, dutyDate, note || null, assignedByUserId],
    );
    return { action: "ASSIGN", data: result.rows[0] };
  }

  static async bulkInsertSchedules(client, schedules, assignedByUserId) {
    if (schedules.length === 0) return;
    
    // De-duplicate schedules (in case multiple elements assign same employee to same date and shift)
    const uniqueMap = new Map();
    for (const s of schedules) {
      const key = `${s.employee_id}_${s.duty_date}_${s.shift_id}`;
      uniqueMap.set(key, s);
    }
    
    const dedupedSchedules = Array.from(uniqueMap.values());

    for (const s of dedupedSchedules) {
      await client.query(
        `
        INSERT INTO schedules (
          employee_id, department_id, room_id, shift_id, duty_date, note, assigned_by_user_id, status
        )
        VALUES ($1, $2, $3, $4, $5::date, $6, $7, 'ASSIGNED')
        ON CONFLICT (employee_id, duty_date, shift_id)
        DO UPDATE SET
          department_id = EXCLUDED.department_id,
          room_id = EXCLUDED.room_id,
          assigned_by_user_id = EXCLUDED.assigned_by_user_id,
          status = 'UPDATED',
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          s.employee_id,
          s.department_id,
          s.room_id,
          s.shift_id,
          s.duty_date,
          s.note || null,
          assignedByUserId,
        ],
      );
    }
  }

  static async getAssignmentCellContext(client, roomId, shiftId) {
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

  static async findMissingRequiredAssignments(client, weekStart) {
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

  static async getActiveEmployeesInDepartment(client, employeeIds, departmentId) {
    const result = await client.query(
      `
      SELECT employee_id
      FROM employees
      WHERE employee_id = ANY($1::bigint[])
        AND department_id = $2
        AND status = 'ACTIVE'
      `,
      [employeeIds, departmentId],
    );
    return result.rows;
  }

  static async getEmployeesBusyInOtherRooms(client, employeeIds, dutyDate, shiftId, roomId) {
    const result = await client.query(
      `
      SELECT e.full_name, r.room_code
      FROM schedules s
      JOIN employees e ON e.employee_id = s.employee_id
      JOIN rooms r ON r.room_id = s.room_id
      WHERE s.employee_id = ANY($1::bigint[])
        AND s.duty_date = $2::date
        AND s.shift_id = $3
        AND s.status <> 'CANCELLED'
        AND s.room_id <> $4
      `,
      [employeeIds, dutyDate, shiftId, roomId],
    );
    return result.rows;
  }

  static async getCurrentCellAssignments(client, roomId, dutyDate, shiftId) {
    const result = await client.query(
      `
      SELECT schedule_id, employee_id
      FROM schedules
      WHERE room_id = $1
        AND duty_date = $2::date
        AND shift_id = $3
        AND status <> 'CANCELLED'
      `,
      [roomId, dutyDate, shiftId],
    );
    return result.rows;
  }

  static async cancelSchedules(client, scheduleIds) {
    await client.query(
      `
      UPDATE schedules
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = ANY($1::bigint[])
      `,
      [scheduleIds],
    );
  }

  static async upsertAssignedSchedule(
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

  static async getWeeklyActiveEmployeeIds(client, weekStart) {
    const result = await client.query(
      `
      SELECT DISTINCT employee_id
      FROM schedules
      WHERE duty_date BETWEEN $1::date AND ($1::date + INTERVAL '6 days')
        AND status <> 'CANCELLED'
      `,
      [weekStart],
    );
    return result.rows;
  }
}


