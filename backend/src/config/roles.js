export const roles = {
  ADMIN: "ADMIN",
  MEDICAL_STAFF: "MEDICAL_STAFF",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  OFFICE: "OFFICE",
};

export const tableReadPermissions = {
  users: [roles.ADMIN],
  departments: [roles.ADMIN, roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD, roles.OFFICE],
  rooms: [roles.ADMIN, roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD, roles.OFFICE],
  employees: [roles.ADMIN, roles.DEPARTMENT_HEAD, roles.OFFICE],
  shifts: [roles.ADMIN, roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD, roles.OFFICE],
  schedules: [roles.ADMIN, roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD, roles.OFFICE],
  swap_requests: [roles.ADMIN, roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD],
};
