import { pool } from "../../../db.js";
import { recordActivityLog } from "../../activity/services/activity.service.js";
import { hashPassword } from "../../auth/services/password.service.js";

import { roles } from "../../../config/roles.js";
import { AdminRepository } from "../repositories/admin.repository.js";
import {
  parsePositiveId,
} from "./admin.helpers.js";
import {
  validateEmployeeDTO,
  validateShiftDTO,
} from "../dtos/admin.dto.js";
import { sendSuccess, sendError } from "../../../utils/response.js";


export async function listDepartments(req, res) {
  try {
    const data = await AdminRepository.listDepartments(pool);
    sendSuccess(res, {
      total: data.length,
      data,
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy danh sách khoa", 500, { error: error.message });
  }
}

export async function listRooms(req, res) {
  try {
    const data = await AdminRepository.listRooms(pool);
    sendSuccess(res, {
      total: data.length,
      data,
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy danh sách phòng", 500, { error: error.message });
  }
}

export async function listEmployees(req, res) {
  try {
    const data = await AdminRepository.listEmployees(pool);
    sendSuccess(res, {
      total: data.length,
      data,
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy danh sách nhân viên", 500, { error: error.message });
  }
}

export async function createEmployee(req, res) {
  const client = await pool.connect();

  try {
    const dto = validateEmployeeDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { fullName, gender, dateOfBirth, phone, email, departmentId, roomId, position, status } = dto.data;

    await client.query("BEGIN");

    const employeeCode = await AdminRepository.generateEmployeeCode(client);
    if (roomId) {
      const roomValid = await AdminRepository.checkRoomBelongsToDepartment(client, roomId, departmentId);
      if (!roomValid) {
        await client.query("ROLLBACK");
        return sendError(res, "Phòng không thuộc khoa đã chọn", 400);
      }
    }

    const userId = await AdminRepository.insertUser(client, {
      username: employeeCode,
      passwordHash: hashPassword("1"),
      role: roles.MEDICAL_STAFF,
      status,
    });

    const employeeId = await AdminRepository.insertEmployee(client, {
      userId,
      departmentId,
      roomId,
      employeeCode,
      fullName: fullName.trim(),
      gender,
      dateOfBirth,
      phone,
      email,
      position: position.trim(),
      status,
    });

    const employee = await AdminRepository.getEmployeeById(client, employeeId);

    await recordActivityLog(client, {
      req,
      action: "CREATE_EMPLOYEE",
      entityType: "employees",
      entityId: employee.employee_id,
      description: `Thêm nhân viên ${employee.employee_code} - ${employee.full_name}`,
      metadata: {
        employee_code: employee.employee_code,
        department_id: employee.department_id,
        room_id: employee.room_id,
        position: employee.position,
        status: employee.status,
      },
    });

    await client.query("COMMIT");

    sendSuccess(res, {
      message: "Tạo nhân viên thành công",
      data: employee,
      login: {
        username: employee.employee_code,
        default_password: "1",
      },
    }, 201);
  } catch (error) {
    await client.query("ROLLBACK");
    sendError(res, "Lỗi khi tạo nhân viên", 500, { error: error.message });
  } finally {
    client.release();
  }
}

export async function updateEmployee(req, res) {
  const client = await pool.connect();

  try {
    const employeeId = parsePositiveId(req.params.id);
    if (!employeeId) {
      return sendError(res, "Mã nhân viên không hợp lệ", 400);
    }

    const dto = validateEmployeeDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { fullName, gender, dateOfBirth, phone, email, departmentId, roomId, position, status } = dto.data;

    await client.query("BEGIN");

    if (roomId) {
      const roomValid = await AdminRepository.checkRoomBelongsToDepartment(client, roomId, departmentId);
      if (!roomValid) {
        await client.query("ROLLBACK");
        return sendError(res, "Phòng không thuộc khoa đã chọn", 400);
      }
    }

    const result = await AdminRepository.updateEmployee(client, employeeId, {
      departmentId,
      roomId,
      fullName: fullName.trim(),
      gender,
      dateOfBirth,
      phone,
      email,
      position: position.trim(),
      status,
    });

    if (!result) {
      await client.query("ROLLBACK");
      return sendError(res, "Không tìm thấy nhân viên", 404);
    }

    const userId = result.user_id;
    if (userId) {
      await AdminRepository.updateUserStatus(client, userId, status);
    }

    const employee = await AdminRepository.getEmployeeById(client, employeeId);

    await recordActivityLog(client, {
      req,
      action: "UPDATE_EMPLOYEE",
      entityType: "employees",
      entityId: employee.employee_id,
      description: `Cập nhật nhân viên ${employee.employee_code} - ${employee.full_name}`,
      metadata: {
        employee_code: employee.employee_code,
        department_id: employee.department_id,
        room_id: employee.room_id,
        position: employee.position,
        status: employee.status,
      },
    });

    await client.query("COMMIT");

    sendSuccess(res, {
      message: "Cập nhật nhân viên thành công",
      data: employee,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    sendError(res, "Lỗi khi cập nhật nhân viên", 500, { error: error.message });
  } finally {
    client.release();
  }
}

export async function deactivateEmployee(req, res) {
  const client = await pool.connect();

  try {
    const employeeId = parsePositiveId(req.params.id);
    if (!employeeId) {
      return sendError(res, "Mã nhân viên không hợp lệ", 400);
    }

    await client.query("BEGIN");

    const result = await AdminRepository.deactivateEmployee(client, employeeId);
    if (!result) {
      await client.query("ROLLBACK");
      return sendError(res, "Không tìm thấy nhân viên", 404);
    }

    const userId = result.user_id;
    if (userId) {
      await AdminRepository.updateUserStatus(client, userId, "INACTIVE");
    }

    const employee = await AdminRepository.getEmployeeById(client, employeeId);

    await recordActivityLog(client, {
      req,
      action: "DEACTIVATE_EMPLOYEE",
      entityType: "employees",
      entityId: employee.employee_id,
      description: `Ngừng hoạt động nhân viên ${employee.employee_code} - ${employee.full_name}`,
      metadata: {
        employee_code: employee.employee_code,
        department_id: employee.department_id,
        room_id: employee.room_id,
        position: employee.position,
        status: employee.status,
      },
    });

    await client.query("COMMIT");

    sendSuccess(res, {
      message: "Đã ngừng hoạt động nhân viên",
      data: employee,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    sendError(res, "Lỗi khi ngừng hoạt động nhân viên", 500, { error: error.message });
  } finally {
    client.release();
  }
}

export async function listShifts(req, res) {
  try {
    const data = await AdminRepository.listShifts(pool);
    sendSuccess(res, {
      total: data.length,
      data,
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy danh sách ca trực", 500, { error: error.message });
  }
}

export async function createShift(req, res) {
  const client = await pool.connect();

  try {
    const dto = validateShiftDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { shiftName, startTime, endTime, shiftType, note, status, departmentConfigs } = dto.data;

    await client.query("BEGIN");

    const shiftCode = await AdminRepository.generateShiftCode(client);
    const shiftId = await AdminRepository.insertShift(client, {
      shiftCode,
      shiftName: shiftName.trim(),
      startTime,
      endTime,
      shiftType,
      note,
      status,
    });

    await AdminRepository.syncShiftDepartments(client, shiftId, departmentConfigs, status);

    const shift = await AdminRepository.getShiftById(client, shiftId);

    await recordActivityLog(client, {
      req,
      action: "CREATE_SHIFT",
      entityType: "shifts",
      entityId: shift.shift_id,
      description: `Thêm ca trực ${shift.shift_code} - ${shift.shift_name}`,
      metadata: {
        shift_code: shift.shift_code,
        shift_type: shift.shift_type,
        start_time: shift.start_time,
        end_time: shift.end_time,
        status: shift.status,
        department_count: departmentConfigs.length,
      },
    });

    await client.query("COMMIT");

    sendSuccess(res, {
      message: "Tạo ca trực thành công",
      data: shift,
    }, 201);
  } catch (error) {
    await client.query("ROLLBACK");
    const statusCode = error.statusCode || 500;
    sendError(res, statusCode === 400 ? error.message : "Lỗi khi tạo ca trực", statusCode, { error: error.message });
  } finally {
    client.release();
  }
}

export async function updateShift(req, res) {
  const client = await pool.connect();

  try {
    const shiftId = parsePositiveId(req.params.id);
    if (!shiftId) {
      return sendError(res, "Mã ca trực không hợp lệ", 400);
    }

    const dto = validateShiftDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { shiftName, startTime, endTime, shiftType, note, status, departmentConfigs } = dto.data;

    await client.query("BEGIN");

    const updated = await AdminRepository.updateShift(client, shiftId, {
      shiftName: shiftName.trim(),
      startTime,
      endTime,
      shiftType,
      note,
      status,
    });

    if (!updated) {
      await client.query("ROLLBACK");
      return sendError(res, "Không tìm thấy ca trực", 404);
    }

    await AdminRepository.syncShiftDepartments(client, shiftId, departmentConfigs, status);

    const shift = await AdminRepository.getShiftById(client, shiftId);

    await recordActivityLog(client, {
      req,
      action: "UPDATE_SHIFT",
      entityType: "shifts",
      entityId: shift.shift_id,
      description: `Cập nhật ca trực ${shift.shift_code} - ${shift.shift_name}`,
      metadata: {
        shift_code: shift.shift_code,
        shift_type: shift.shift_type,
        start_time: shift.start_time,
        end_time: shift.end_time,
        status: shift.status,
        department_count: departmentConfigs.length,
      },
    });

    await client.query("COMMIT");

    sendSuccess(res, {
      message: "Cập nhật ca trực thành công",
      data: shift,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const statusCode = error.statusCode || 500;
    sendError(res, statusCode === 400 ? error.message : "Lỗi khi cập nhật ca trực", statusCode, { error: error.message });
  } finally {
    client.release();
  }
}

export async function deactivateShift(req, res) {
  const client = await pool.connect();

  try {
    const shiftId = parsePositiveId(req.params.id);
    if (!shiftId) {
      return sendError(res, "Mã ca trực không hợp lệ", 400);
    }

    await client.query("BEGIN");

    const updated = await AdminRepository.deactivateShift(client, shiftId);
    if (!updated) {
      await client.query("ROLLBACK");
      return sendError(res, "Không tìm thấy ca trực", 404);
    }

    await AdminRepository.deactivateDepartmentRequiredShifts(client, shiftId);

    const shift = await AdminRepository.getShiftById(client, shiftId);

    await recordActivityLog(client, {
      req,
      action: "DEACTIVATE_SHIFT",
      entityType: "shifts",
      entityId: shift.shift_id,
      description: `Ngừng áp dụng ca trực ${shift.shift_code} - ${shift.shift_name}`,
      metadata: {
        shift_code: shift.shift_code,
        shift_type: shift.shift_type,
        start_time: shift.start_time,
        end_time: shift.end_time,
        status: shift.status,
      },
    });

    await client.query("COMMIT");

    sendSuccess(res, {
      message: "Đã ngừng áp dụng ca trực",
      data: shift,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    sendError(res, "Lỗi khi ngừng áp dụng ca trực", 500, { error: error.message });
  } finally {
    client.release();
  }
}
