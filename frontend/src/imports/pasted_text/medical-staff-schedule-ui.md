Prompt Figma AI

Thiết kế giao diện frontend cho hệ thống Quản lý lịch trực nhân viên y tế.

Phong cách giao diện:

Giao diện web quản trị đơn giản, hiện đại vừa phải.
Không quá màu mè, ưu tiên dễ nhìn và dễ thao tác.
Màu chủ đạo: xanh dương nhạt hoặc xanh y tế, nền trắng/xám nhạt.
Font rõ ràng, dễ đọc.
Bố cục nhất quán giữa các màn hình.
Mỗi màn hình có:
Header phía trên
Sidebar bên trái
Khu vực nội dung chính
Các bảng dữ liệu, form, nút thao tác rõ ràng
Thiết kế phù hợp để sau này triển khai bằng React.

Tên hệ thống:
Hệ thống quản lý lịch trực nhân viên y tế

Vai trò người dùng:

Admin
Nhân viên y tế
Trưởng khoa
Phòng hành chính / Ban quản lý khoa
1. Màn hình Đăng nhập

Thiết kế màn hình đăng nhập đơn giản.

Thành phần:

Logo hoặc placeholder logo bệnh viện ở trên
Tên hệ thống
Form đăng nhập đặt giữa màn hình
Ô nhập:
Tên đăng nhập
Mật khẩu
Nút:
Đăng nhập
Khu vực hiển thị lỗi:
Sai tên đăng nhập hoặc mật khẩu

Yêu cầu:

Giao diện gọn, chuyên nghiệp
Không cần hình minh họa phức tạp
2. Trang tổng quan Admin

Thiết kế trang tổng quan dành cho Admin.

Bố cục:

Sidebar bên trái gồm menu:
Trang tổng quan
Quản lý nhân viên
Quản lý ca trực
Phân công ca trực
Xem lịch trực tổng quát
Đăng xuất
Header hiển thị:
Tên hệ thống
Tên người dùng
Vai trò Admin
Nội dung chính gồm các thẻ thống kê:
Tổng số nhân viên
Số ca trực hôm nay
Số yêu cầu đổi ca đang chờ
Số lịch trực trong tuần
Bên dưới có bảng nhỏ:
Lịch trực gần nhất
Yêu cầu đổi ca mới nhất
3. Màn hình Quản lý nhân viên y tế

Thiết kế màn hình quản lý nhân viên cho Admin.

Thành phần:

Tiêu đề: Quản lý nhân viên y tế
Bộ lọc phía trên:
Tìm kiếm theo tên/mã nhân viên
Khoa
Phòng
Chức vụ
Trạng thái
Nút:
Thêm nhân viên
Bảng danh sách nhân viên gồm các cột:
Mã nhân viên
Họ tên
Khoa
Phòng
Chức vụ
Số điện thoại
Trạng thái
Thao tác
Cột thao tác có nút:
Xem
Sửa
Xóa

Có form thêm/sửa nhân viên dạng modal hoặc panel bên phải.

Form gồm:

Họ tên
Giới tính
Ngày sinh
Số điện thoại
Email
Khoa
Phòng
Chức vụ
Trạng thái
Nút Lưu
Nút Hủy
4. Màn hình Quản lý ca trực

Thiết kế màn hình quản lý ca trực cho Admin.

Thành phần:

Tiêu đề: Quản lý ca trực
Nút:
Thêm ca trực
Bảng danh sách ca trực gồm:
Mã ca
Tên ca
Giờ bắt đầu
Giờ kết thúc
Loại ca
Trạng thái
Thao tác
Các ca mẫu:
Ca sáng
Ca tối
Ca cấp cứu
Cột thao tác:
Sửa
Ngừng áp dụng

Form thêm/sửa ca trực gồm:

Tên ca
Giờ bắt đầu
Giờ kết thúc
Loại ca
Ghi chú
Trạng thái
Nút Lưu
Nút Hủy
5. Màn hình Phân công ca trực

Thiết kế màn hình phân công ca trực dạng bảng giống Excel.

Đây là màn hình quan trọng của Admin.

Bố cục:

Tiêu đề: Phân công ca trực
Bộ lọc phía trên:
Khoa
Phòng
Tuần
Nút Lọc
Bảng lịch trực lớn dạng Excel.

Cấu trúc bảng:

Hàng: danh sách nhân viên y tế
Cột: các ngày trong tuần từ Thứ 2 đến Chủ nhật
Mỗi ngày chia thành 3 cột con:
Ca sáng
Ca tối
Ca cấp cứu

Trong mỗi ô:

Nếu đã phân công: hiển thị tên phòng hoặc trạng thái “Có trực”
Nếu chưa phân công: hiển thị “Trống”

Tương tác:

Khi nhấn vào ô trống:
Hiển thị panel chi tiết bên phải
Cho chọn nhân viên
Nút Phân công
Nút Xác nhận phân công
Khi nhấn vào ô đã có người:
Hiển thị thông tin ca trực
Nút Sửa
Khi nhấn Sửa:
Cho chọn nhân viên thay thế
Nút Lưu thay đổi
Nút Hủy
6. Màn hình Xem lịch trực tổng quát

Thiết kế màn hình xem lịch trực tổng quát dạng bảng Excel.

Dùng cho:

Admin
Nhân viên y tế
Trưởng khoa
Phòng hành chính / Ban quản lý khoa

Bố cục:

Tiêu đề: Lịch trực tổng quát
Bộ lọc:
Khoa
Phòng
Tuần
Ca trực
Nút Lọc
Nút Đặt lại
Bảng lịch trực dạng Excel.

Cấu trúc bảng:

Hàng: danh sách nhân viên
Cột: Thứ 2 đến Chủ nhật
Mỗi ngày có 3 cột con:
Ca sáng
Ca tối
Ca cấp cứu

Khi nhấn vào một ô:

Hiển thị panel chi tiết:
Nhân viên
Ngày trực
Ca trực
Khoa
Phòng
Trạng thái

Màn hình này chỉ xem, không cần nút sửa.

7. Trang tổng quan Nhân viên y tế

Thiết kế trang tổng quan cho nhân viên y tế.

Sidebar gồm:

Trang tổng quan
Xem lịch trực cá nhân
Xem lịch trực tổng quát
Xem yêu cầu đổi ca
Đăng xuất

Nội dung chính:

Thẻ thông tin:
Ca trực hôm nay
Ca trực trong tuần
Yêu cầu đổi ca đang chờ phản hồi
Yêu cầu đã duyệt
Bảng nhỏ:
Lịch trực sắp tới
Yêu cầu đổi ca mới nhất
8. Màn hình Xem lịch trực cá nhân

Thiết kế lịch trực cá nhân dạng bảng Excel.

Bố cục:

Tiêu đề: Lịch trực cá nhân
Thông tin cá nhân:
Họ tên
Khoa
Phòng
Bộ lọc tuần
Bảng lịch trực cá nhân.

Cấu trúc bảng:

Hàng:
Thứ 2
Thứ 3
Thứ 4
Thứ 5
Thứ 6
Thứ 7
Chủ nhật
Cột:
Ca sáng
Ca tối
Ca cấp cứu

Trong ô:

Có trực
Trống
Tên phòng trực

Khi nhấn vào một ô có ca trực:

Hiển thị panel chi tiết:
Ngày trực
Ca trực
Phòng
Trạng thái
Hiển thị nút:
Gửi yêu cầu đổi ca

Form gửi yêu cầu đổi ca gồm:

Ca trực muốn đổi
Nhân viên muốn đổi ca
Lý do đổi ca
Nút Gửi yêu cầu
Nút Hủy
9. Màn hình Xem yêu cầu đổi ca của Nhân viên y tế

Thiết kế màn hình xem và phản hồi yêu cầu đổi ca.

Thành phần:

Tiêu đề: Yêu cầu đổi ca
Bộ lọc trạng thái:
Tất cả
Hết hạn
Chờ phản hồi
Chờ xử lý
Đã duyệt
Bị từ chối
Bảng danh sách yêu cầu:
Mã yêu cầu
Ngày gửi
Người gửi
Người nhận
Ca trực
Trạng thái
Thao tác
Khi chọn một yêu cầu:
Hiển thị panel chi tiết bên phải

Panel chi tiết gồm:

Mã yêu cầu
Người gửi
Người nhận
Ngày trực
Ca trực hiện tại
Ca trực muốn đổi
Lý do
Trạng thái

Nếu trạng thái là Chờ phản hồi:

Nút Đồng ý
Nút Từ chối
10. Trang tổng quan Trưởng khoa

Thiết kế trang tổng quan cho Trưởng khoa.

Sidebar gồm:

Trang tổng quan
Xem lịch trực cá nhân
Xem lịch trực tổng quát
Xem yêu cầu đổi ca
Đăng xuất

Nội dung chính:

Thẻ thống kê:
Lịch trực trong tuần
Yêu cầu chờ xử lý
Yêu cầu đã duyệt
Yêu cầu đã từ chối
Bảng nhỏ:
Danh sách yêu cầu đổi ca chờ xử lý
11. Màn hình Xem yêu cầu đổi ca của Trưởng khoa

Thiết kế màn hình xem và xử lý yêu cầu đổi ca cho Trưởng khoa.

Thành phần:

Tiêu đề: Xử lý yêu cầu đổi ca
Bộ lọc trạng thái:
Tất cả
Hết hạn
Chờ xử lý
Đã duyệt
Đã từ chối
Bảng danh sách yêu cầu:
Mã yêu cầu
Người gửi
Người nhận
Khoa
Phòng
Trạng thái
Thao tác
Panel chi tiết yêu cầu:
Mã yêu cầu
Người gửi
Người nhận
Ngày trực
Ca trực
Lý do đổi ca
Trạng thái

Nếu trạng thái là Chờ xử lý:

Nút Duyệt
Nút Từ chối
12. Trang tổng quan Phòng hành chính / Ban quản lý khoa

Thiết kế trang tổng quan đơn giản.

Sidebar gồm:

Trang tổng quan
Xem lịch trực tổng quát
Đăng xuất

Nội dung chính:

Thẻ thống kê:
Tổng số nhân viên
Tổng số ca trực trong tuần
Số phòng có lịch trực
Bảng nhỏ:
Lịch trực tổng quát trong tuần
Yêu cầu chung cho toàn bộ giao diện
Thiết kế dạng web desktop, kích thước frame 1440px.
Sidebar rộng khoảng 240px.
Header cao khoảng 64px.
Nội dung chính có padding rộng, dễ nhìn.
Sử dụng bảng dữ liệu rõ ràng.
Các nút chính dùng màu xanh y tế.
Các nút phụ dùng xám hoặc viền.
Trạng thái nên hiển thị bằng badge:
Đang hoạt động
Đã phân công
Chờ phản hồi
Chờ xử lý
Đã duyệt
Bị từ chối
Hết hạn
Giao diện phải nhất quán giữa các vai trò.
Không dùng hình minh họa phức tạp.
Ưu tiên thiết kế dễ chuyển thành React component.
Component nên tạo trong Figma

Bạn nên tạo sẵn các component này:

Component	Dùng cho
Sidebar	Điều hướng theo vai trò
Header	Hiển thị tên hệ thống, người dùng
Button	Nút chính, nút phụ
Input	Form nhập liệu
Select	Bộ lọc khoa, phòng, ca trực
Data Table	Bảng nhân viên, ca trực, yêu cầu
Schedule Grid	Bảng lịch trực dạng Excel
Status Badge	Hiển thị trạng thái
Modal Form	Thêm/sửa dữ liệu
Detail Panel	Xem chi tiết ca trực/yêu cầu
Gợi ý màu đơn giản
Thành phần	Màu gợi ý
Nền chính	#F8FAFC
Sidebar	#0F766E
Nút chính	#0F766E
Nút phụ	#E5E7EB
Text chính	#111827
Border bảng	#E5E7EB
Badge chờ xử lý	Vàng nhạt
Badge đã duyệt	Xanh lá nhạt
Badge từ chối	Đỏ nhạt