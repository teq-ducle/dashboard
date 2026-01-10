import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // https://nextjs.org/docs/app/api-reference/file-conventions/proxy#matcher
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};

/* Giải thích
1. export default NextAuth(authConfig).auth
Dòng này khởi tạo NextAuth với các cấu hình đã định nghĩa trước đó (authConfig).
Việc xuất ra thuộc tính .auth cho phép Middleware sử dụng logic kiểm tra quyền truy cập (authorized callback mà bạn đã viết ở file auth.config.ts) để quyết định xem một yêu cầu có được phép đi tiếp hay không 1.

2. Cấu hình matcher
Thuộc tính matcher trong đối tượng config dùng để lọc những đường dẫn (URL) nào mà Middleware nên hoặc không nên chạy qua.
'/((?!api|_next/static|_next/image|.*\\.png$).*)': Đây là một biểu thức chính quy (Regex) dùng để loại trừ các file tài nguyên hệ thống.
+Ý nghĩa: Middleware sẽ chạy trên tất cả các trang, NGOẠI TRỪ:
/api: Các route xử lý dữ liệu gọi từ phía client.
/_next/static: Các file Javascript và CSS đã biên dịch.
/_next/image: Các ảnh đã được Next.js tối ưu hóa.
.*\\.png$: Các file có đuôi .png.

+Mục đích: Giúp tăng tốc độ ứng dụng vì Middleware không cần phải kiểm tra quyền truy cập khi trình duyệt chỉ muốn tải một tấm ảnh hoặc một file CSS 2.

3. Tại sao lại dùng cách này (Lợi ích của Proxy/Middleware)?
Vào năm 2026, kiến trúc Next.js ưu tiên xử lý bảo mật ngay tại lớp Middleware vì:

+Bảo mật tuyệt đối: Trang web sẽ không bắt đầu quá trình render (dựng giao diện) cho đến khi Middleware xác nhận người dùng có quyền. Điều này ngăn chặn việc rò rỉ dữ liệu nhạy cảm thông qua việc hiển thị nội dung chớp nhoáng trước khi bị đá ra trang login.

+Hiệu suất cao: Middleware chạy trên môi trường Edge (gần người dùng nhất về mặt địa lý). Nó ngăn chặn các yêu cầu trái phép ngay lập tức mà không cần phải truy vấn sâu vào logic phức tạp của server, giúp tiết kiệm tài nguyên 3.
*/
