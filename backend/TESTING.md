# Hướng dẫn kiểm thử backend bằng Jest

Backend đang dùng ES Module (`"type": "module"`), nên các lệnh test chạy Jest qua Node với `--experimental-vm-modules`.

## 1. Chạy test

```bash
cd backend
npm test
```

Chạy một file test cụ thể:

```bash
npm test -- tests/auth/auth.middleware.test.js
```

Chạy test tự động khi sửa file:

```bash
npm run test:watch
```

Xem coverage:

```bash
npm run test:coverage
```

## 2. Cấu trúc test

Test nằm trong thư mục `tests/`, đặt tên theo mẫu:

```text
tests/<nhom-chuc-nang>/<ten-file>.test.js
```

Ví dụ:

```text
tests/auth/password.service.test.js
tests/auth/auth.middleware.test.js
tests/schedules/common/schedule-date.test.js
```

## 3. Cách viết test cơ bản

Mẫu một test đơn giản:

```js
import { describe, expect, test } from "@jest/globals";
import { parsePositiveId } from "../../src/schedules/common/schedule-ids.js";

describe("parsePositiveId", () => {
  test("tra ve number khi id hop le", () => {
    expect(parsePositiveId("10")).toBe(10);
  });

  test("tra ve null khi id khong hop le", () => {
    expect(parsePositiveId("0")).toBeNull();
  });
});
```

## 4. Nên test gì trước?

- Hàm thuần: validate ngày, validate id, normalize dữ liệu.
- Service bảo mật: hash mật khẩu, verify token.
- Middleware: thiếu token, token hợp lệ, role không đủ quyền.
- Controller/API: chỉ nên test sau khi biết mock database hoặc dùng database test riêng.

## 5. Quy tắc nhỏ để test dễ bảo trì

- Mỗi test chỉ kiểm tra một ý chính.
- Tên test nên mô tả hành vi mong muốn.
- Không dùng database thật trong unit test nếu có thể mock được.
- Khi sửa bug, hãy thêm test tái hiện bug trước, rồi sửa code.
