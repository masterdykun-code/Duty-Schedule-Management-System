import { pool } from "../../../db.js";
import { recordActivityLog, recordActivityLogSafely } from "../../activity/services/activity.service.js";
import { AuthRepository, toPublicUser } from "../repositories/auth.repository.js";
import { hashPassword, verifyPassword } from "../services/password.service.js";
import { createToken, getTokenTtlSeconds } from "../services/token.service.js";
import {
  validateLoginDTO,
  validateChangePasswordDTO,
  validateUpdateProfileDTO,
} from "../dtos/auth.dto.js";
import { sendSuccess, sendError } from "../../../utils/response.js";

export async function login(req, res) {
  try {
    const dto = validateLoginDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { username, password } = dto.data;
    const user = await AuthRepository.findUserByUsername(pool, username);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return sendError(res, "Sai tên đăng nhập hoặc mật khẩu", 401);
    }

    if (user.status !== "ACTIVE") {
      return sendError(res, "Tài khoản đã bị khóa", 403);
    }

    await recordActivityLogSafely(pool, {
      req,
      actor: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
      },
      action: "LOGIN",
      entityType: "users",
      entityId: user.user_id,
      description: `Đăng nhập tài khoản ${user.username}`,
      metadata: {
        user_id: user.user_id,
      },
    });

    sendSuccess(res, {
      message: "Đăng nhập thành công",
      token: createToken(user),
      expires_in: getTokenTtlSeconds(),
      user: toPublicUser(user),
    });
  } catch (error) {
    sendError(res, "Lỗi khi đăng nhập", 500, { error: error.message });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const user = await AuthRepository.findUserById(pool, req.user.sub);

    if (!user || user.status !== "ACTIVE") {
      return sendError(res, "Tài khoản không còn hoạt động", 401);
    }

    sendSuccess(res, {
      user: toPublicUser(user),
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy thông tin đăng nhập", 500, { error: error.message });
  }
}

export async function changePassword(req, res) {
  try {
    const dto = validateChangePasswordDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    const { current_password, new_password } = dto.data;
    const user = await AuthRepository.getUserCredentials(pool, req.user.sub);

    if (!user || user.status !== "ACTIVE") {
      return sendError(res, "Tài khoản không còn hoạt động", 401);
    }

    if (!verifyPassword(current_password, user.password_hash)) {
      return sendError(res, "Mật khẩu cũ không đúng", 400);
    }

    await AuthRepository.updatePassword(pool, user.user_id, hashPassword(new_password));

    await recordActivityLog(pool, {
      req,
      action: "CHANGE_PASSWORD",
      entityType: "users",
      entityId: user.user_id,
      description: `Đổi mật khẩu tài khoản ${req.user.username}`,
      metadata: {
        user_id: user.user_id,
      },
    });

    sendSuccess(res, {
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    sendError(res, "Lỗi khi đổi mật khẩu", 500, { error: error.message });
  }
}

export async function updateCurrentUserProfile(req, res) {
  try {
    const employee = await AuthRepository.findActiveEmployeeByUserId(pool, req.user.sub);
    if (!employee) {
      return sendError(res, "Tài khoản này chưa liên kết với nhân viên y tế", 400);
    }

    const dto = validateUpdateProfileDTO(req.body);
    if (!dto.isValid) {
      return sendError(res, dto.errors.join(", "), 400);
    }

    await AuthRepository.updateEmployeeProfile(pool, employee.employee_id, dto.data);

    await recordActivityLog(pool, {
      req,
      action: "UPDATE_PROFILE",
      entityType: "employees",
      entityId: employee.employee_id,
      description: `Cập nhật thông tin cá nhân ${req.user.username}`,
      metadata: {
        employee_id: employee.employee_id,
      },
    });

    const user = await AuthRepository.findUserById(pool, req.user.sub);

    sendSuccess(res, {
      message: "Cập nhật thông tin cá nhân thành công",
      user: toPublicUser(user),
    });
  } catch (error) {
    const isUniqueEmail = error.code === "23505";
    sendError(
      res,
      isUniqueEmail ? "Email đã được sử dụng" : "Lỗi khi cập nhật thông tin cá nhân",
      isUniqueEmail ? 400 : 500,
      { error: error.message }
    );
  }
}
