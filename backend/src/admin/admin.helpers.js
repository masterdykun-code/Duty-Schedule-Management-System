export function emptyToNull(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

export function parsePositiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function normalizeStatus(value, defaultValue = "ACTIVE") {
  if (value === "ACTIVE" || value === "INACTIVE") {
    return value;
  }

  return defaultValue;
}

export function normalizeGender(value) {
  if (!value) {
    return null;
  }

  if (["MALE", "FEMALE", "OTHER"].includes(value)) {
    return value;
  }

  return null;
}

export function normalizeShiftType(value) {
  if (["SANG", "TOI", "CAP_CUU", "HANH_CHINH"].includes(value)) {
    return value;
  }

  return null;
}

export function normalizeShiftDepartmentConfigs(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const configs = [];
  const seenDepartmentIds = new Set();
  let hasInvalidConfig = false;

  value.forEach((item) => {
    const departmentId = parsePositiveId(item?.department_id);
    const isRequired = item?.is_required !== false;
    const minStaff = Number(item?.min_staff ?? 1);
    const maxStaff = Number(item?.max_staff ?? 2);

    if (
      !departmentId ||
      seenDepartmentIds.has(departmentId) ||
      !Number.isInteger(minStaff) ||
      !Number.isInteger(maxStaff) ||
      minStaff < 0 ||
      maxStaff < 1 ||
      maxStaff > 2 ||
      minStaff > maxStaff ||
      (isRequired && minStaff < 1)
    ) {
      hasInvalidConfig = true;
      return;
    }

    configs.push({
      departmentId,
      isRequired,
      minStaff,
      maxStaff,
    });
    seenDepartmentIds.add(departmentId);
  });

  return hasInvalidConfig ? null : configs;
}

export function isValidEmail(value) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value) {
  if (!value) {
    return true;
  }

  return /^\d{10}$/.test(value);
}

export async function generateEmployeeCode(client) {
  const result = await client.query(`
    SELECT COALESCE(MAX(SUBSTRING(employee_code FROM 3)::INTEGER), 0) + 1 AS next_number
    FROM employees
    WHERE employee_code ~ '^NV[0-9]+$'
  `);

  return `NV${String(result.rows[0].next_number).padStart(3, "0")}`;
}

export async function generateShiftCode(client) {
  const result = await client.query(`
    SELECT COALESCE(MAX(SUBSTRING(shift_code FROM 3)::INTEGER), 0) + 1 AS next_number
    FROM shifts
    WHERE shift_code ~ '^CA[0-9]+$'
  `);

  return `CA${String(result.rows[0].next_number).padStart(3, "0")}`;
}
