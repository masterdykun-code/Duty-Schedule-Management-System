-- PostgreSQL schema + sample data
-- Hệ thống quản lý lịch trực và yêu cầu đổi ca
-- Chạy được trên database trống.
-- PostgreSQL đề xuất: 16.x

BEGIN;

-- =========================================================
-- 0) DROP TABLES - dùng để chạy lại nhiều lần khi test
-- Nếu bạn KHÔNG muốn xóa bảng cũ, hãy comment khối DROP này.
-- =========================================================
DROP TABLE IF EXISTS swap_requests CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS department_required_shifts CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =========================================================
-- 1) CREATE TABLES
-- =========================================================

CREATE TABLE users (
  user_id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT chk_users_role
    CHECK (role IN ('ADMIN', 'MEDICAL_STAFF', 'DEPARTMENT_HEAD', 'OFFICE')),
  CONSTRAINT chk_users_status
    CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE departments (
  department_id BIGSERIAL PRIMARY KEY,
  department_code VARCHAR(20) NOT NULL UNIQUE,
  department_name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT chk_departments_status
    CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE rooms (
  room_id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL,
  room_code VARCHAR(20) NOT NULL,
  room_name VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT fk_rooms_department
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
  CONSTRAINT uq_rooms_department_code
    UNIQUE (department_id, room_code),
  CONSTRAINT chk_rooms_status
    CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE employees (
  employee_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE,
  department_id BIGINT NOT NULL,
  room_id BIGINT,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  gender VARCHAR(10),
  date_of_birth DATE,
  phone VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  position VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT fk_employees_user
    FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_employees_department
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
  CONSTRAINT fk_employees_room
    FOREIGN KEY (room_id) REFERENCES rooms(room_id),
  CONSTRAINT chk_employees_gender
    CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE', 'OTHER')),
  CONSTRAINT chk_employees_status
    CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE shifts (
  shift_id BIGSERIAL PRIMARY KEY,
  shift_code VARCHAR(20) NOT NULL UNIQUE,
  shift_name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type VARCHAR(30) NOT NULL,
  note TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT chk_shifts_type
    CHECK (shift_type IN ('SANG', 'CHIEU', 'CAP_CUU', 'HANH_CHINH')),
  CONSTRAINT chk_shifts_status
    CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE department_required_shifts (
  department_required_shift_id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL,
  shift_id BIGINT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  min_staff INTEGER NOT NULL DEFAULT 1,
  max_staff INTEGER NOT NULL DEFAULT 2,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT fk_department_required_shifts_department
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
  CONSTRAINT fk_department_required_shifts_shift
    FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
  CONSTRAINT uq_department_required_shifts_department_shift
    UNIQUE (department_id, shift_id),
  CONSTRAINT chk_department_required_shifts_staff_count
    CHECK (
      min_staff >= 0
      AND max_staff BETWEEN 1 AND 2
      AND min_staff <= max_staff
      AND (is_required = FALSE OR min_staff >= 1)
    ),
  CONSTRAINT chk_department_required_shifts_status
    CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE schedules (
  schedule_id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  department_id BIGINT NOT NULL,
  room_id BIGINT NOT NULL,
  shift_id BIGINT NOT NULL,
  assigned_by_user_id BIGINT,
  duty_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT fk_schedules_employee
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
  CONSTRAINT fk_schedules_department
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
  CONSTRAINT fk_schedules_room
    FOREIGN KEY (room_id) REFERENCES rooms(room_id),
  CONSTRAINT fk_schedules_shift
    FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
  CONSTRAINT fk_schedules_assigned_by_user
    FOREIGN KEY (assigned_by_user_id) REFERENCES users(user_id),
  CONSTRAINT chk_schedules_status
    CHECK (status IN ('ASSIGNED', 'UPDATED', 'CANCELLED')),
  CONSTRAINT uq_schedules_employee_date_shift
    UNIQUE (employee_id, duty_date, shift_id)
);

CREATE TABLE swap_requests (
  request_id BIGSERIAL PRIMARY KEY,
  source_schedule_id BIGINT NOT NULL,
  requester_employee_id BIGINT NOT NULL,
  target_employee_id BIGINT NOT NULL,
  target_schedule_id BIGINT,
  approved_by_employee_id BIGINT,
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_RESPONSE',
  response_note TEXT,
  approval_note TEXT,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT fk_swap_requests_source_schedule
    FOREIGN KEY (source_schedule_id) REFERENCES schedules(schedule_id),
  CONSTRAINT fk_swap_requests_target_schedule
    FOREIGN KEY (target_schedule_id) REFERENCES schedules(schedule_id),
  CONSTRAINT fk_swap_requests_requester_employee
    FOREIGN KEY (requester_employee_id) REFERENCES employees(employee_id),
  CONSTRAINT fk_swap_requests_target_employee
    FOREIGN KEY (target_employee_id) REFERENCES employees(employee_id),
  CONSTRAINT fk_swap_requests_approved_by_employee
    FOREIGN KEY (approved_by_employee_id) REFERENCES employees(employee_id),
  CONSTRAINT chk_swap_requests_status
    CHECK (status IN ('PENDING_RESPONSE', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED')),
  CONSTRAINT chk_swap_requests_different_employee
    CHECK (requester_employee_id <> target_employee_id)
);

CREATE TABLE activity_logs (
  log_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  username VARCHAR(50),
  role VARCHAR(30),
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80),
  entity_id BIGINT,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT chk_activity_logs_role
    CHECK (role IS NULL OR role IN ('ADMIN', 'MEDICAL_STAFF', 'DEPARTMENT_HEAD', 'OFFICE'))
);

CREATE TABLE notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  recipient_user_id BIGINT,
  recipient_role VARCHAR(30),
  sender_user_id BIGINT,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(80),
  entity_id BIGINT,
  link_target VARCHAR(120),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_recipient_user
    FOREIGN KEY (recipient_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_sender_user
    FOREIGN KEY (sender_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT chk_notifications_recipient
    CHECK (recipient_user_id IS NOT NULL OR recipient_role IS NOT NULL),
  CONSTRAINT chk_notifications_recipient_role
    CHECK (recipient_role IS NULL OR recipient_role IN ('ADMIN', 'MEDICAL_STAFF', 'DEPARTMENT_HEAD', 'OFFICE')),
  CONSTRAINT chk_notifications_type
    CHECK (
      notification_type IN (
        'SCHEDULE_ASSIGNED',
        'SCHEDULE_UPDATED',
        'SCHEDULE_RESET',
        'SWAP_REQUEST_CREATED',
        'SWAP_REQUEST_RESPONDED',
        'SWAP_REQUEST_APPROVED',
        'SWAP_REQUEST_REJECTED',
        'SWAP_REQUEST_EXPIRED',
        'SYSTEM'
      )
    ),
  CONSTRAINT chk_notifications_read_at
    CHECK ((is_read = FALSE AND read_at IS NULL) OR (is_read = TRUE))
);

-- =========================================================
-- 2) INDEXES
-- =========================================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_departments_status ON departments(status);

CREATE INDEX idx_rooms_department_id ON rooms(department_id);
CREATE INDEX idx_rooms_status ON rooms(status);

CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_room_id ON employees(room_id);
CREATE INDEX idx_employees_full_name ON employees(full_name);
CREATE INDEX idx_employees_position ON employees(position);
CREATE INDEX idx_employees_status ON employees(status);

CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_type ON shifts(shift_type);

CREATE INDEX idx_department_required_shifts_department_id
ON department_required_shifts(department_id);
CREATE INDEX idx_department_required_shifts_shift_id
ON department_required_shifts(shift_id);
CREATE INDEX idx_department_required_shifts_status
ON department_required_shifts(status);

CREATE INDEX idx_schedules_employee_id ON schedules(employee_id);
CREATE INDEX idx_schedules_department_id ON schedules(department_id);
CREATE INDEX idx_schedules_room_id ON schedules(room_id);
CREATE INDEX idx_schedules_shift_id ON schedules(shift_id);
CREATE INDEX idx_schedules_duty_date ON schedules(duty_date);
CREATE INDEX idx_schedules_week_filter ON schedules(department_id, room_id, duty_date);
CREATE INDEX idx_schedules_room_shift_capacity
ON schedules(department_id, room_id, duty_date, shift_id)
WHERE status <> 'CANCELLED';

CREATE INDEX idx_swap_requests_source_schedule_id ON swap_requests(source_schedule_id);
CREATE INDEX idx_swap_requests_requester_employee_id ON swap_requests(requester_employee_id);
CREATE INDEX idx_swap_requests_target_employee_id ON swap_requests(target_employee_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_swap_requests_requested_at ON swap_requests(requested_at);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

CREATE INDEX idx_notifications_recipient_user_id ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_recipient_role ON notifications(recipient_role);
CREATE INDEX idx_notifications_sender_user_id ON notifications(sender_user_id);
CREATE INDEX idx_notifications_unread_user
ON notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_unread_role
ON notifications(recipient_role, is_read, created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Chỉ cho phép 1 yêu cầu đổi ca đang chờ trên cùng 1 lịch trực.
CREATE UNIQUE INDEX uq_active_swap_request
ON swap_requests(source_schedule_id)
WHERE status IN ('PENDING_RESPONSE', 'PENDING_APPROVAL');

-- Moi phong trong cung khoa, cung ngay, cung ca chi duoc phan cong theo cau hinh khoa/ca.
CREATE OR REPLACE FUNCTION check_schedule_room_shift_capacity()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
  max_staff_limit INTEGER;
BEGIN
  IF NEW.status = 'CANCELLED' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM rooms r
    WHERE r.room_id = NEW.room_id
      AND r.department_id = NEW.department_id
  ) THEN
    RAISE EXCEPTION 'Phong khong thuoc khoa da chon'
      USING ERRCODE = '23514';
  END IF;

  SELECT drs.max_staff
  INTO max_staff_limit
  FROM department_required_shifts drs
  WHERE drs.department_id = NEW.department_id
    AND drs.shift_id = NEW.shift_id
    AND drs.status = 'ACTIVE'
  LIMIT 1;

  IF max_staff_limit IS NULL THEN
    RAISE EXCEPTION 'Ca truc nay khong ap dung cho khoa da chon'
      USING ERRCODE = '23514';
  END IF;

  SELECT COUNT(*)
  INTO existing_count
  FROM schedules s
  WHERE s.department_id = NEW.department_id
    AND s.room_id = NEW.room_id
    AND s.duty_date = NEW.duty_date
    AND s.shift_id = NEW.shift_id
    AND s.status <> 'CANCELLED'
    AND (TG_OP = 'INSERT' OR s.schedule_id <> NEW.schedule_id);

  IF existing_count >= max_staff_limit THEN
    RAISE EXCEPTION 'Trung ca: phong nay da co toi da % nguoi truc trong cung khoa, ngay va ca', max_staff_limit
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_schedule_room_shift_capacity
BEFORE INSERT OR UPDATE OF department_id, room_id, shift_id, duty_date, status
ON schedules
FOR EACH ROW
EXECUTE FUNCTION check_schedule_room_shift_capacity();

-- =========================================================
-- 3) SEED DATA
-- =========================================================

-- Ghi chú: password_hash đang dùng chuỗi demo.
-- Nếu backend kiểm tra bcrypt/argon2, hãy thay bằng hash thật được sinh từ backend.

-- 3.1) USERS
INSERT INTO users (username, password_hash, role, status, created_at)
VALUES
  ('admin', 'DEMO_HASH_123456', 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP),
  ('phong_hanh_chinh', 'DEMO_HASH_123456', 'OFFICE', 'ACTIVE', CURRENT_TIMESTAMP),
  ('truong_kcc', 'DEMO_HASH_123456', 'DEPARTMENT_HEAD', 'ACTIVE', CURRENT_TIMESTAMP),
  ('truong_kno', 'DEMO_HASH_123456', 'DEPARTMENT_HEAD', 'ACTIVE', CURRENT_TIMESTAMP),
  ('truong_kng', 'DEMO_HASH_123456', 'DEPARTMENT_HEAD', 'ACTIVE', CURRENT_TIMESTAMP),
  ('truong_ksn', 'DEMO_HASH_123456', 'DEPARTMENT_HEAD', 'ACTIVE', CURRENT_TIMESTAMP),
  ('truong_kxn', 'DEMO_HASH_123456', 'DEPARTMENT_HEAD', 'ACTIVE', CURRENT_TIMESTAMP),
  ('bs_an', 'DEMO_HASH_123456', 'MEDICAL_STAFF', 'ACTIVE', CURRENT_TIMESTAMP),
  ('yt_binh', 'DEMO_HASH_123456', 'MEDICAL_STAFF', 'ACTIVE', CURRENT_TIMESTAMP),
  ('bs_chau', 'DEMO_HASH_123456', 'MEDICAL_STAFF', 'ACTIVE', CURRENT_TIMESTAMP),
  ('yt_dung', 'DEMO_HASH_123456', 'MEDICAL_STAFF', 'ACTIVE', CURRENT_TIMESTAMP),
  ('bs_huy', 'DEMO_HASH_123456', 'MEDICAL_STAFF', 'ACTIVE', CURRENT_TIMESTAMP),
  ('yt_mai', 'DEMO_HASH_123456', 'MEDICAL_STAFF', 'ACTIVE', CURRENT_TIMESTAMP),
  ('bs_nam', 'DEMO_HASH_123456', 'MEDICAL_STAFF', 'ACTIVE', CURRENT_TIMESTAMP),
  ('yt_oanh', 'DEMO_HASH_123456', 'MEDICAL_STAFF', 'ACTIVE', CURRENT_TIMESTAMP),
  ('ktv_phuc', 'DEMO_HASH_123456', 'MEDICAL_STAFF', 'ACTIVE', CURRENT_TIMESTAMP),
  ('ktv_quynh', 'DEMO_HASH_123456', 'MEDICAL_STAFF', 'ACTIVE', CURRENT_TIMESTAMP);

-- 3.2) DEPARTMENTS
INSERT INTO departments (department_code, department_name, description, status, created_at)
VALUES
  ('KCC', 'Khoa Cấp cứu', 'Tiếp nhận và xử lý các ca cấp cứu.', 'ACTIVE', CURRENT_TIMESTAMP),
  ('KNO', 'Khoa Nội tổng hợp', 'Khám và điều trị bệnh nội khoa.', 'ACTIVE', CURRENT_TIMESTAMP),
  ('KNG', 'Khoa Ngoại tổng hợp', 'Khám, điều trị và phẫu thuật ngoại khoa.', 'ACTIVE', CURRENT_TIMESTAMP),
  ('KSN', 'Khoa Sản nhi', 'Chăm sóc sản phụ và nhi khoa.', 'ACTIVE', CURRENT_TIMESTAMP),
  ('KXN', 'Khoa Xét nghiệm', 'Thực hiện xét nghiệm cận lâm sàng.', 'ACTIVE', CURRENT_TIMESTAMP);

-- 3.3) ROOMS
INSERT INTO rooms (department_id, room_code, room_name, status, created_at)
SELECT d.department_id, v.room_code, v.room_name, 'ACTIVE', CURRENT_TIMESTAMP
FROM (
  VALUES
    ('KCC', 'CC01', 'Phòng cấp cứu 1'),
    ('KCC', 'CC02', 'Phòng cấp cứu 2'),
    ('KNO', 'NO01', 'Phòng nội tổng hợp 1'),
    ('KNO', 'NO02', 'Phòng nội tổng hợp 2'),
    ('KNG', 'NG01', 'Phòng ngoại tổng hợp 1'),
    ('KNG', 'NG02', 'Phòng ngoại tổng hợp 2'),
    ('KSN', 'SN01', 'Phòng sản'),
    ('KSN', 'SN02', 'Phòng nhi'),
    ('KXN', 'XN01', 'Phòng xét nghiệm huyết học'),
    ('KXN', 'XN02', 'Phòng xét nghiệm sinh hóa')
) AS v(department_code, room_code, room_name)
JOIN departments d ON d.department_code = v.department_code;

-- 3.4) SHIFTS
INSERT INTO shifts (shift_code, shift_name, start_time, end_time, shift_type, note, status, created_at)
VALUES
  ('SANG', 'Ca sáng', '07:00', '11:30', 'SANG', 'Ca trực buổi sáng', 'ACTIVE', CURRENT_TIMESTAMP),
  ('CHIEU', 'Ca chiều', '12:00', '19:00', 'CHIEU', 'Ca trực buổi chiều', 'ACTIVE', CURRENT_TIMESTAMP),
  ('CAP_CUU', 'Ca cấp cứu', '19:00', '07:00', 'CAP_CUU', 'Ca trực cấp cứu', 'ACTIVE', CURRENT_TIMESTAMP),
  ('HANH_CHINH', 'Ca hành chính', '08:00', '17:00', 'HANH_CHINH', 'Ca giờ hành chính', 'ACTIVE', CURRENT_TIMESTAMP);

-- 3.5) DEPARTMENT REQUIRED SHIFTS
-- Cau hinh khoa nao ap dung ca nao, ca do co bat buoc khong, toi thieu/toi da bao nhieu nguoi.
INSERT INTO department_required_shifts (
  department_id, shift_id, is_required, min_staff, max_staff, status, created_at
)
SELECT
  d.department_id,
  sh.shift_id,
  v.is_required,
  v.min_staff,
  v.max_staff,
  'ACTIVE',
  CURRENT_TIMESTAMP
FROM (
  VALUES
    ('KCC', 'SANG', TRUE, 1, 2),
    ('KCC', 'CHIEU', TRUE, 1, 2),
    ('KCC', 'CAP_CUU', TRUE, 1, 2),
    ('KNO', 'SANG', TRUE, 1, 2),
    ('KNO', 'CHIEU', TRUE, 1, 2),
    ('KNO', 'HANH_CHINH', TRUE, 1, 2),
    ('KNG', 'SANG', TRUE, 1, 2),
    ('KNG', 'CHIEU', TRUE, 1, 2),
    ('KNG', 'CAP_CUU', TRUE, 1, 2),
    ('KSN', 'SANG', TRUE, 1, 2),
    ('KSN', 'CHIEU', TRUE, 1, 2),
    ('KSN', 'HANH_CHINH', TRUE, 1, 2),
    ('KXN', 'SANG', TRUE, 1, 2),
    ('KXN', 'CHIEU', TRUE, 1, 2),
    ('KXN', 'HANH_CHINH', TRUE, 1, 2)
) AS v(department_code, shift_code, is_required, min_staff, max_staff)
JOIN departments d ON d.department_code = v.department_code
JOIN shifts sh ON sh.shift_code = v.shift_code;

-- 3.6) EMPLOYEES
INSERT INTO employees (
  user_id, department_id, room_id, employee_code, full_name, gender,
  date_of_birth, phone, email, position, status, created_at
)
SELECT
  u.user_id,
  d.department_id,
  r.room_id,
  v.employee_code,
  v.full_name,
  v.gender,
  v.date_of_birth::date,
  v.phone,
  v.email,
  v.position,
  'ACTIVE',
  CURRENT_TIMESTAMP
FROM (
  VALUES
    ('truong_kcc', 'KCC', 'CC01', 'TKCC001', 'Nguyễn Văn Hùng', 'MALE', '1980-02-12', '0901000001', 'hung.nv@benhvien.test', 'Trưởng khoa'),
    ('truong_kno', 'KNO', 'NO01', 'TKNO001', 'Phạm Thị Lan', 'FEMALE', '1982-06-20', '0901000002', 'lan.pt@benhvien.test', 'Trưởng khoa'),
    ('truong_kng', 'KNG', 'NG01', 'TKNG001', 'Lê Quốc Minh', 'MALE', '1979-11-05', '0901000003', 'minh.lq@benhvien.test', 'Trưởng khoa'),
    ('truong_ksn', 'KSN', 'SN01', 'TKSN001', 'Trần Thu Hà', 'FEMALE', '1983-03-18', '0901000004', 'ha.tt@benhvien.test', 'Trưởng khoa'),
    ('truong_kxn', 'KXN', 'XN01', 'TKXN001', 'Đặng Hoàng Sơn', 'MALE', '1981-09-09', '0901000005', 'son.dh@benhvien.test', 'Trưởng khoa'),
    ('bs_an', 'KCC', 'CC01', 'NV001', 'Nguyễn Văn An', 'MALE', '1990-01-15', '0912000001', 'an.nv@benhvien.test', 'Bác sĩ'),
    ('yt_binh', 'KCC', 'CC02', 'NV002', 'Trần Thị Bình', 'FEMALE', '1993-04-22', '0912000002', 'binh.tt@benhvien.test', 'Y tá'),
    ('bs_chau', 'KNO', 'NO01', 'NV003', 'Hoàng Minh Châu', 'MALE', '1989-07-11', '0912000003', 'chau.hm@benhvien.test', 'Bác sĩ'),
    ('yt_dung', 'KNO', 'NO02', 'NV004', 'Đỗ Thị Dung', 'FEMALE', '1994-12-02', '0912000004', 'dung.dt@benhvien.test', 'Y tá'),
    ('bs_huy', 'KNG', 'NG01', 'NV005', 'Bùi Quốc Huy', 'MALE', '1988-08-17', '0912000005', 'huy.bq@benhvien.test', 'Bác sĩ'),
    ('yt_mai', 'KNG', 'NG02', 'NV006', 'Vũ Thị Mai', 'FEMALE', '1992-10-30', '0912000006', 'mai.vt@benhvien.test', 'Y tá'),
    ('bs_nam', 'KSN', 'SN01', 'NV007', 'Phan Văn Nam', 'MALE', '1991-05-25', '0912000007', 'nam.pv@benhvien.test', 'Bác sĩ'),
    ('yt_oanh', 'KSN', 'SN02', 'NV008', 'Lý Thị Oanh', 'FEMALE', '1995-02-14', '0912000008', 'oanh.lt@benhvien.test', 'Y tá'),
    ('ktv_phuc', 'KXN', 'XN01', 'NV009', 'Đặng Văn Phúc', 'MALE', '1990-09-21', '0912000009', 'phuc.dv@benhvien.test', 'Kỹ thuật viên'),
    ('ktv_quynh', 'KXN', 'XN02', 'NV010', 'Mai Thị Quỳnh', 'FEMALE', '1996-01-19', '0912000010', 'quynh.mt@benhvien.test', 'Kỹ thuật viên')
) AS v(username, department_code, room_code, employee_code, full_name, gender, date_of_birth, phone, email, position)
LEFT JOIN users u ON u.username = v.username
JOIN departments d ON d.department_code = v.department_code
JOIN rooms r ON r.department_id = d.department_id AND r.room_code = v.room_code;

-- 3.7) SCHEDULES
WITH seed AS (
  SELECT * FROM (
    VALUES
      ('NV001', 'KCC', 'CC01', 'SANG', 'admin', '2026-05-25', 'ASSIGNED', 'Trực phòng cấp cứu 1'),
      ('NV002', 'KCC', 'CC02', 'CAP_CUU', 'admin', '2026-05-25', 'ASSIGNED', 'Trực cấp cứu phòng 2'),
      ('NV003', 'KNO', 'NO01', 'SANG', 'admin', '2026-05-25', 'ASSIGNED', 'Trực khoa nội'),
      ('NV004', 'KNO', 'NO02', 'HANH_CHINH', 'admin', '2026-05-25', 'ASSIGNED', 'Trực hành chính khoa nội'),
      ('NV005', 'KNG', 'NG01', 'CHIEU', 'admin', '2026-05-25', 'ASSIGNED', 'Trực khoa ngoại'),
      ('NV006', 'KNG', 'NG02', 'CAP_CUU', 'admin', '2026-05-25', 'ASSIGNED', 'Trực cấp cứu khoa ngoại'),
      ('NV007', 'KSN', 'SN01', 'SANG', 'admin', '2026-05-26', 'ASSIGNED', 'Trực phòng sản'),
      ('NV008', 'KSN', 'SN02', 'HANH_CHINH', 'admin', '2026-05-26', 'ASSIGNED', 'Trực hành chính phòng nhi'),
      ('NV009', 'KXN', 'XN01', 'SANG', 'admin', '2026-05-26', 'ASSIGNED', 'Trực xét nghiệm huyết học'),
      ('NV010', 'KXN', 'XN02', 'HANH_CHINH', 'admin', '2026-05-26', 'ASSIGNED', 'Trực hành chính xét nghiệm sinh hóa'),
      ('NV001', 'KCC', 'CC01', 'CHIEU', 'admin', '2026-05-27', 'ASSIGNED', 'Trực chiều cấp cứu'),
      ('NV002', 'KCC', 'CC02', 'CAP_CUU', 'admin', '2026-05-27', 'ASSIGNED', 'Trực cấp cứu'),
      ('NV003', 'KNO', 'NO01', 'CHIEU', 'admin', '2026-05-27', 'ASSIGNED', 'Trực chiều khoa nội'),
      ('NV005', 'KNG', 'NG01', 'SANG', 'admin', '2026-05-28', 'ASSIGNED', 'Trực sáng khoa ngoại'),
      ('NV007', 'KSN', 'SN01', 'CHIEU', 'admin', '2026-05-28', 'ASSIGNED', 'Trực chiều khoa sản'),
      ('NV009', 'KXN', 'XN01', 'CHIEU', 'admin', '2026-05-28', 'ASSIGNED', 'Trực chiều xét nghiệm'),
      ('NV004', 'KNO', 'NO02', 'SANG', 'admin', '2026-05-29', 'ASSIGNED', 'Trực sáng khoa nội'),
      ('NV006', 'KNG', 'NG02', 'CAP_CUU', 'admin', '2026-05-29', 'ASSIGNED', 'Trực cấp cứu khoa ngoại')
  ) AS t(employee_code, department_code, room_code, shift_code, assigned_by_username, duty_date, status, note)
)
INSERT INTO schedules (
  employee_id, department_id, room_id, shift_id, assigned_by_user_id,
  duty_date, status, note, created_at
)
SELECT
  e.employee_id,
  d.department_id,
  r.room_id,
  sh.shift_id,
  u.user_id,
  seed.duty_date::date,
  seed.status,
  seed.note,
  CURRENT_TIMESTAMP
FROM seed
JOIN employees e ON e.employee_code = seed.employee_code
JOIN departments d ON d.department_code = seed.department_code
JOIN rooms r ON r.department_id = d.department_id AND r.room_code = seed.room_code
JOIN shifts sh ON sh.shift_code = seed.shift_code
LEFT JOIN users u ON u.username = seed.assigned_by_username;

-- 3.8) SWAP_REQUESTS
WITH seed AS (
  SELECT * FROM (
    VALUES
      ('NV001', '2026-05-25', 'SANG', 'NV001', 'NV002', '2026-05-25', 'CAP_CUU', 'TKCC001', 'Có việc gia đình nên xin đổi ca.', 'APPROVED', 'Đồng ý đổi ca.', 'Đã duyệt đổi ca.', '2026-05-20 08:10:00', '2026-05-20 09:00:00', '2026-05-20 10:00:00'),
      ('NV005', '2026-05-25', 'CHIEU', 'NV005', 'NV006', '2026-05-25', 'CAP_CUU', NULL, 'Cần hỗ trợ đổi sang ca cấp cứu.', 'PENDING_APPROVAL', 'Đồng ý hỗ trợ đổi ca.', NULL, '2026-05-21 14:20:00', '2026-05-21 15:10:00', NULL),
      ('NV007', '2026-05-26', 'SANG', 'NV007', 'NV008', '2026-05-26', 'HANH_CHINH', 'TKSN001', 'Bận lịch khám chuyên khoa.', 'REJECTED', 'Không thể đổi do có lịch cá nhân.', 'Từ chối vì chưa có người thay phù hợp.', '2026-05-21 09:30:00', '2026-05-21 11:00:00', '2026-05-21 13:00:00'),
      ('NV009', '2026-05-26', 'SANG', 'NV009', 'NV010', '2026-05-26', 'HANH_CHINH', NULL, 'Xin đổi ca để tham gia đào tạo nội bộ.', 'PENDING_RESPONSE', NULL, NULL, '2026-05-22 07:45:00', NULL, NULL),
      ('NV003', '2026-05-27', 'CHIEU', 'NV003', 'NV004', '2026-05-29', 'SANG', 'TKNO001', 'Yêu cầu đổi ca đã quá thời hạn phản hồi.', 'EXPIRED', NULL, 'Yêu cầu hết hạn.', '2026-05-18 16:00:00', NULL, '2026-05-20 16:00:00')
  ) AS t(source_employee_code, source_duty_date, source_shift_code,
         requester_employee_code, target_employee_code, target_duty_date, target_shift_code,
         approved_by_employee_code, reason, status, response_note, approval_note,
         requested_at, responded_at, approved_at)
)
INSERT INTO swap_requests (
  source_schedule_id, requester_employee_id, target_employee_id, target_schedule_id,
  approved_by_employee_id, reason, status, response_note, approval_note,
  requested_at, responded_at, approved_at, created_at
)
SELECT
  ss.schedule_id,
  req.employee_id,
  tgt.employee_id,
  ts.schedule_id,
  appr.employee_id,
  seed.reason,
  seed.status,
  seed.response_note,
  seed.approval_note,
  seed.requested_at::timestamp,
  seed.responded_at::timestamp,
  seed.approved_at::timestamp,
  CURRENT_TIMESTAMP
FROM seed
JOIN employees src_emp ON src_emp.employee_code = seed.source_employee_code
JOIN shifts src_shift ON src_shift.shift_code = seed.source_shift_code
JOIN schedules ss
  ON ss.employee_id = src_emp.employee_id
 AND ss.duty_date = seed.source_duty_date::date
 AND ss.shift_id = src_shift.shift_id
JOIN employees req ON req.employee_code = seed.requester_employee_code
JOIN employees tgt ON tgt.employee_code = seed.target_employee_code
JOIN shifts tgt_shift ON tgt_shift.shift_code = seed.target_shift_code
LEFT JOIN schedules ts
  ON ts.employee_id = tgt.employee_id
 AND ts.duty_date = seed.target_duty_date::date
 AND ts.shift_id = tgt_shift.shift_id
LEFT JOIN employees appr ON appr.employee_code = seed.approved_by_employee_code;

-- 3.9) ACTIVITY_LOGS
INSERT INTO activity_logs (
  user_id, username, role, action, entity_type, entity_id, description, metadata, ip_address, created_at
)
SELECT
  u.user_id,
  u.username,
  u.role,
  v.action,
  v.entity_type,
  v.entity_id::bigint,
  v.description,
  v.metadata::jsonb,
  v.ip_address,
  v.created_at::timestamp
FROM (
  VALUES
    ('admin', 'ASSIGN_SCHEDULE_AUTO', 'schedules', NULL, 'Phan cong lich truc tu dong tuan 25/05 - 31/05/2026', '{"week_start":"2026-05-25","week_end":"2026-05-31"}', '127.0.0.1', '2026-05-20 08:00:00'),
    ('admin', 'CREATE_EMPLOYEE', 'employees', NULL, 'Them nhan vien mau trong he thong', '{"employee_code":"NV001"}', '127.0.0.1', '2026-05-20 08:05:00'),
    ('bs_an', 'CREATE_SWAP_REQUEST', 'swap_requests', NULL, 'Gui yeu cau doi ca', '{"source_date":"2026-05-25","target_employee_code":"NV002"}', '127.0.0.1', '2026-05-20 08:10:00'),
    ('truong_kcc', 'APPROVE_SWAP_REQUEST', 'swap_requests', NULL, 'Duyet yeu cau doi ca cua nhan vien', '{"request_status":"APPROVED"}', '127.0.0.1', '2026-05-20 10:00:00')
) AS v(username, action, entity_type, entity_id, description, metadata, ip_address, created_at)
JOIN users u ON u.username = v.username;

-- 3.10) NOTIFICATIONS
INSERT INTO notifications (
  recipient_user_id, recipient_role, sender_user_id, title, message,
  notification_type, entity_type, entity_id, link_target, metadata, is_read, created_at
)
SELECT
  recipient.user_id,
  v.recipient_role,
  sender.user_id,
  v.title,
  v.message,
  v.notification_type,
  v.entity_type,
  v.entity_id::bigint,
  v.link_target,
  v.metadata::jsonb,
  v.is_read,
  v.created_at::timestamp
FROM (
  VALUES
    ('bs_an', NULL, 'admin', 'Lich truc moi', 'Ban co lich truc moi trong tuan 25/05 - 31/05/2026.', 'SCHEDULE_ASSIGNED', 'schedules', NULL, 'personal_schedule', '{"week_start":"2026-05-25"}', FALSE, '2026-05-20 08:02:00'),
    ('yt_binh', NULL, 'bs_an', 'Yeu cau doi ca moi', 'Nguyen Van An gui yeu cau doi ca voi ban.', 'SWAP_REQUEST_CREATED', 'swap_requests', NULL, 'exchange_requests', '{"source_date":"2026-05-25"}', FALSE, '2026-05-20 08:10:00'),
    ('truong_kcc', NULL, 'yt_binh', 'Yeu cau doi ca cho duyet', 'Co yeu cau doi ca trong khoa can truong khoa xu ly.', 'SWAP_REQUEST_RESPONDED', 'swap_requests', NULL, 'exchange_requests', '{"request_status":"PENDING_APPROVAL"}', FALSE, '2026-05-20 09:00:00'),
    (NULL, 'ADMIN', NULL, 'He thong da san sang', 'Bang thong bao da duoc khoi tao cho quan tri vien.', 'SYSTEM', 'notifications', NULL, 'activity_logs', '{}', TRUE, '2026-05-20 07:50:00')
) AS v(recipient_username, recipient_role, sender_username, title, message,
       notification_type, entity_type, entity_id, link_target, metadata, is_read, created_at)
LEFT JOIN users recipient ON recipient.username = v.recipient_username
LEFT JOIN users sender ON sender.username = v.sender_username;

COMMIT;

-- =========================================================
-- 4) KIỂM TRA NHANH SỐ DÒNG SAU KHI INSERT
-- =========================================================
SELECT 'users' AS table_name, COUNT(*) AS total FROM users
UNION ALL SELECT 'departments', COUNT(*) FROM departments
UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'shifts', COUNT(*) FROM shifts
UNION ALL SELECT 'schedules', COUNT(*) FROM schedules
UNION ALL SELECT 'swap_requests', COUNT(*) FROM swap_requests
UNION ALL SELECT 'activity_logs', COUNT(*) FROM activity_logs
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;
