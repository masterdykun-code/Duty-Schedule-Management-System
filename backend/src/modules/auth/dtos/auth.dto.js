const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{10}$/;
const allowedGenders = ["MALE", "FEMALE", "OTHER", ""];

export function validateLoginDTO(data) {
  const errors = [];
  if (!data.username) {
    errors.push("Tên đăng nhập là bắt buộc");
  }
  if (!data.password) {
    errors.push("Mật khẩu là bắt buộc");
  }
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      username: typeof data.username === "string" ? data.username.trim() : "",
      password: data.password || "",
    },
  };
}

export function validateChangePasswordDTO(data) {
  const errors = [];
  if (!data.current_password) {
    errors.push("Vui lòng nhập mật khẩu cũ");
  }
  if (!data.new_password) {
    errors.push("Vui lòng nhập mật khẩu mới");
  }
  if (!data.confirm_password) {
    errors.push("Vui lòng nhập xác nhận mật khẩu");
  }
  if (data.new_password && data.confirm_password && data.new_password !== data.confirm_password) {
    errors.push("Mật khẩu mới và xác nhận mật khẩu không khớp");
  }
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      current_password: data.current_password || "",
      new_password: data.new_password || "",
      confirm_password: data.confirm_password || "",
    },
  };
}

export function validateUpdateProfileDTO(data) {
  const errors = [];
  const fullName = typeof data.full_name === "string" ? data.full_name.trim() : "";
  const gender = typeof data.gender === "string" ? data.gender : "";
  const dateOfBirth = data.date_of_birth || null;
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";

  if (!fullName) {
    errors.push("Vui lòng nhập họ tên");
  }
  if (gender && !allowedGenders.includes(gender)) {
    errors.push("Giới tính không hợp lệ");
  }
  if (phone && !phonePattern.test(phone)) {
    errors.push("Số điện thoại phải gồm đúng 10 chữ số");
  }
  if (email && !emailPattern.test(email)) {
    errors.push("Email không đúng định dạng");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      fullName,
      gender,
      dateOfBirth,
      phone,
      email,
    },
  };
}
