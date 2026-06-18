import { pool } from "../../../db.js";
import { ScheduleRepository } from "../repositories/schedule.repository.js";
import { addDaysIso } from "../../../utils/schedule-date.js";
import { recordActivityLog } from "../../activity/services/activity.service.js";
import { createNotificationsForEmployeeIds } from "../../notification/services/notification.service.js";
import {
  mapAssignmentEmployee,
  mapGeneralSchedule,
  mapRequiredShiftConfig,
  mapScheduleRoom,
  mapShift,
} from "../../../utils/schedule.mappers.js";

export async function getAssignmentCellContext(client, roomId, shiftId) {
  return ScheduleRepository.getAssignmentCellContext(client, roomId, shiftId);
}

export async function findMissingRequiredAssignments(client, weekStart) {
  return ScheduleRepository.findMissingRequiredAssignments(client, weekStart);
}

export async function upsertAssignedSchedule(client, params) {
  return ScheduleRepository.upsertAssignedSchedule(client, params);
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

export async function saveAssignmentCellService(
  client,
  { employeeIds, departmentId, roomId, shiftId, dutyDate, note, user, req }
) {
  const context = await ScheduleRepository.getAssignmentCellContext(client, roomId, shiftId);
  if (!context) {
    throw { statusCode: 400, message: "Ca trực này không áp dụng cho phòng/khoa đã chọn" };
  }

  if (employeeIds.length > context.max_staff) {
    throw { statusCode: 400, message: `Chỉ được phân công tối đa ${context.max_staff} người cho ca này` };
  }

  if (employeeIds.length > 0) {
    const activeEmployees = await ScheduleRepository.getActiveEmployeesInDepartment(
      client,
      employeeIds,
      context.department_id
    );

    if (activeEmployees.length !== employeeIds.length) {
      throw { statusCode: 400, message: "Nhân viên được chọn không hợp lệ hoặc không thuộc khoa này" };
    }

    const busyEmployees = await ScheduleRepository.getEmployeesBusyInOtherRooms(
      client,
      employeeIds,
      dutyDate,
      shiftId,
      roomId
    );

    if (busyEmployees.length > 0) {
      throw { statusCode: 400, message: `${busyEmployees[0].full_name} đã được phân công ca này tại phòng ${busyEmployees[0].room_code}` };
    }
  }

  const currentAssignments = await ScheduleRepository.getCurrentCellAssignments(
    client,
    roomId,
    dutyDate,
    shiftId
  );

  const selectedEmployeeSet = new Set(employeeIds);
  const removedScheduleIds = currentAssignments
    .filter((schedule) => !selectedEmployeeSet.has(Number(schedule.employee_id)))
    .map((schedule) => schedule.schedule_id);

  if (removedScheduleIds.length > 0) {
    await ScheduleRepository.cancelSchedules(client, removedScheduleIds);
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const employeeId of employeeIds) {
    const action = await ScheduleRepository.upsertAssignedSchedule(client, {
      employeeId,
      departmentId: context.department_id,
      roomId,
      shiftId,
      dutyDate,
      assignedByUserId: user.sub,
      note,
    });

    if (action === "created") {
      createdCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  // Activity Log
  await recordActivityLog(client, {
    req,
    action: "ASSIGN_SCHEDULE_MANUAL",
    entityType: "schedules",
    description: `Phân công thủ công ngày ${dutyDate}, phòng ${context.room_code}, ca ${context.shift_code}`,
    metadata: {
      duty_date: dutyDate,
      department_id: context.department_id,
      department_code: context.department_code,
      room_id: roomId,
      room_code: context.room_code,
      shift_id: shiftId,
      shift_code: context.shift_code,
      employee_ids: employeeIds,
      created_count: createdCount,
      updated_count: updatedCount,
      removed_count: removedScheduleIds.length,
      note,
    },
  });

  // Notifications for newly assigned employees
  if (employeeIds.length > 0) {
    await createNotificationsForEmployeeIds(client, {
      employeeIds,
      senderUserId: user.sub,
      title: "Lịch trực mới",
      message: `Bạn có lịch trực ${context.shift_name} ngày ${dutyDate} tại phòng ${context.room_code}.`,
      notificationType: "SCHEDULE_ASSIGNED",
      entityType: "schedules",
      linkTarget: "personal_schedule",
      metadata: {
        duty_date: dutyDate,
        department_id: context.department_id,
        department_code: context.department_code,
        room_id: roomId,
        room_code: context.room_code,
        shift_id: shiftId,
        shift_code: context.shift_code,
      },
    });
  }

  // Notifications for removed employees
  if (removedScheduleIds.length > 0) {
    const removedEmployeeIds = currentAssignments
      .filter((schedule) => !selectedEmployeeSet.has(Number(schedule.employee_id)))
      .map((schedule) => Number(schedule.employee_id));

    await createNotificationsForEmployeeIds(client, {
      employeeIds: removedEmployeeIds,
      senderUserId: user.sub,
      title: "Lịch trực đã thay đổi",
      message: `Ca trực ${context.shift_name} ngày ${dutyDate} tại phòng ${context.room_code} đã được cập nhật.`,
      notificationType: "SCHEDULE_UPDATED",
      entityType: "schedules",
      linkTarget: "personal_schedule",
      metadata: {
        duty_date: dutyDate,
        department_id: context.department_id,
        department_code: context.department_code,
        room_id: roomId,
        room_code: context.room_code,
        shift_id: shiftId,
        shift_code: context.shift_code,
        removed_schedule_ids: removedScheduleIds,
      },
    });
  }

  return { success: true };
}

export async function autoAssignScheduleService(client, { weekStart, user, req }) {
  const [missingCells, employees, weekSchedules] = await Promise.all([
    ScheduleRepository.findMissingRequiredAssignments(client, weekStart),
    ScheduleRepository.getAssignmentEmployees(client),
    ScheduleRepository.getWeeklySchedulesForAssignment(client, weekStart),
  ]);

  const employeesByDepartment = groupEmployeesByDepartment(employees);
  const { busyKeys, weeklyCounts } = buildWeekScheduleIndexes(weekSchedules);

  let createdCount = 0;
  let updatedCount = 0;
  const assignedEmployeeIds = [];
  const remaining = [];

  for (const cell of missingCells) {
    const needed = Number(cell.min_staff) - Number(cell.assigned_count);
    const selected = selectEmployeesForCell(cell, {
      employeesByDepartment,
      busyKeys,
      weeklyCounts,
      limit: Math.max(0, needed),
    });

    for (const employee of selected) {
      assignedEmployeeIds.push(employee.employee_id);

      const action = await ScheduleRepository.upsertAssignedSchedule(client, {
        employeeId: employee.employee_id,
        departmentId: cell.department_id,
        roomId: cell.room_id,
        shiftId: cell.shift_id,
        dutyDate: cell.duty_date,
        assignedByUserId: user.sub,
      });

      if (action === "created") {
        createdCount += 1;
      } else {
        updatedCount += 1;
      }

      markEmployeeBusy(employee, cell, { busyKeys, weeklyCounts });
    }

    if (selected.length < needed) {
      remaining.push({
        ...cell,
        assigned_count: Number(cell.assigned_count) + selected.length,
      });
    }
  }

  await recordActivityLog(client, {
    req,
    action: "ASSIGN_SCHEDULE_AUTO",
    entityType: "schedules",
    description: `Phân công tự động tuần bắt đầu ${weekStart}`,
    metadata: {
      week_start: weekStart,
      created_count: createdCount,
      updated_count: updatedCount,
      remaining_missing_count: remaining.length,
    },
  });

  if (assignedEmployeeIds.length > 0) {
    await createNotificationsForEmployeeIds(client, {
      employeeIds: assignedEmployeeIds,
      senderUserId: user.sub,
      title: "Lịch trực tuần mới",
      message: `Bạn có lịch trực mới trong tuần bắt đầu ${weekStart}.`,
      notificationType: "SCHEDULE_ASSIGNED",
      entityType: "schedules",
      linkTarget: "personal_schedule",
      metadata: {
        week_start: weekStart,
        created_count: createdCount,
        updated_count: updatedCount,
      },
    });
  }

  return {
    message:
      remaining.length === 0
        ? "Phân công tự động thành công"
        : "Phân công tự động một phần, vẫn còn ca thiếu nhân viên",
    created_count: createdCount,
    updated_count: updatedCount,
    remaining_missing_count: remaining.length,
    remaining_missing: remaining,
  };
}

export async function resetAssignmentScheduleService(client, { weekStart, user, req }) {
  const affectedRows = await ScheduleRepository.getWeeklyActiveEmployeeIds(client, weekStart);

  const result = await ScheduleRepository.resetWeeklySchedules(client, weekStart);

  await recordActivityLog(client, {
    req,
    action: "RESET_ASSIGNMENT",
    entityType: "schedules",
    description: `Reset phân công tuần bắt đầu ${weekStart}`,
    metadata: {
      week_start: weekStart,
      updated_count: result.length,
    },
  });

  if (affectedRows.length > 0) {
    await createNotificationsForEmployeeIds(client, {
      employeeIds: affectedRows.map((row) => Number(row.employee_id)),
      senderUserId: user.sub,
      title: "Lịch trực đã được reset",
      message: `Lịch trực tuần bắt đầu ${weekStart} đã được reset. Vui lòng kiểm tra lại lịch cá nhân.`,
      notificationType: "SCHEDULE_RESET",
      entityType: "schedules",
      linkTarget: "personal_schedule",
      metadata: {
        week_start: weekStart,
        updated_count: result.length,
      },
    });
  }

  return {
    message: "Reset phân công thành công",
    updated_count: result.length,
  };
}

export async function validateAssignmentScheduleService(weekStart) {
  const missing = await ScheduleRepository.findMissingRequiredAssignments(pool, weekStart);
  return {
    complete: missing.length === 0,
    missing_count: missing.length,
    missing,
    message:
      missing.length === 0
        ? "Lịch trực đã được phân công đầy đủ"
        : "Vui lòng phân công đầy đủ các ca trực bắt buộc",
  };
}

function groupEmployeesByDepartment(rows) {
  const employeesByDepartment = new Map();

  rows.forEach((employee) => {
    const departmentId = Number(employee.department_id);
    const current = employeesByDepartment.get(departmentId) || [];
    current.push({
      ...employee,
      employee_id: Number(employee.employee_id),
      department_id: departmentId,
      room_id: employee.room_id ? Number(employee.room_id) : null,
    });
    employeesByDepartment.set(departmentId, current);
  });

  return employeesByDepartment;
}

function buildWeekScheduleIndexes(rows) {
  const busyKeys = new Set();
  const weeklyCounts = new Map();

  rows.forEach((schedule) => {
    const employeeId = Number(schedule.employee_id);
    busyKeys.add(`${employeeId}-${schedule.duty_date}-${schedule.shift_id}`);
    weeklyCounts.set(employeeId, (weeklyCounts.get(employeeId) || 0) + 1);
  });

  return { busyKeys, weeklyCounts };
}

function selectEmployeesForCell(cell, { employeesByDepartment, busyKeys, weeklyCounts, limit }) {
  return (employeesByDepartment.get(Number(cell.department_id)) || [])
    .filter((employee) => !busyKeys.has(`${employee.employee_id}-${cell.duty_date}-${cell.shift_id}`))
    .sort((left, right) => {
      const leftRoomMatch = left.room_id === Number(cell.room_id) ? 0 : 1;
      const rightRoomMatch = right.room_id === Number(cell.room_id) ? 0 : 1;
      return (
        leftRoomMatch - rightRoomMatch ||
        (weeklyCounts.get(left.employee_id) || 0) -
          (weeklyCounts.get(right.employee_id) || 0) ||
        left.full_name.localeCompare(right.full_name)
      );
    })
    .slice(0, limit);
}

function markEmployeeBusy(employee, cell, { busyKeys, weeklyCounts }) {
  busyKeys.add(`${employee.employee_id}-${cell.duty_date}-${cell.shift_id}`);
  weeklyCounts.set(employee.employee_id, (weeklyCounts.get(employee.employee_id) || 0) + 1);
}
