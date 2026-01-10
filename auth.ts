import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { User } from "@/app/lib/definitions";
import bcrypt from "bcrypt";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email =${email}`;
    return user[0];
  } catch (error) {
    console.error("Failed to fecth user:", error);
    throw new Error("Failed to fetch user.");
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credenials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credenials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordMatch = await bcrypt.compare(password, user.password);
          if (passwordMatch) return user;
        }
        console.log("Invalid credentials.");
        return null;
      },
    }),
  ],
});

/* Giải thích
...authConfig: Sử dụng spread operator để trải tất cả các cấu hình từ file auth.config.ts (như pages, callbacks) vào hàm khởi tạo này.

Destructuring { auth, signIn, signOut }: Bạn đang lấy ra 3 công cụ quan trọng nhất để điều khiển luồng đăng nhập:
+auth: Dùng để kiểm tra phiên đăng nhập (session) hiện tại. Bạn có thể gọi await auth() trong Server Components để lấy thông tin người dùng.
+signIn: Hàm dùng để kích hoạt quá trình đăng nhập (ví dụ: đăng nhập với Google, Credentials).
+signOut: Hàm dùng để đăng xuất người dùng và hủy bỏ session. 

1.Tại sao lại tách ra như vậy?
Vào năm 2026, kiến trúc chuẩn của NextAuth v5 khuyến khích chia làm hai phần để tối ưu hiệu suất: 
File auth.config.ts: Chỉ chứa các cấu hình cơ bản (như logic điều hướng). File này nhẹ và có thể chạy được trên Edge Runtime (cho Middleware).
File auth.ts (đoạn mã bạn đưa ra): Kết hợp authConfig với các cấu hình nặng hơn như Database Adapters hoặc Providers (những thứ có thể không chạy được trên Edge). File này sẽ được dùng trong các Server Components hoặc Server Actions. 

2. Tại sao trong Credentials lai dùng authorize mà không phải authen?
trong thư viện NextAuth.js (Auth.js), hàm này bắt buộc phải tên là authorize vì những lý do sau:
1. Ý nghĩa "Cấp phép truy cập"
Dù công việc chính của hàm này là kiểm tra tên đăng nhập và mật khẩu (Authentication), nhưng kết quả trả về của nó lại mang tính chất ủy quyền:
Nếu hàm trả về một đối tượng user, bạn đang nói với NextAuth: "Thông tin này hợp lệ, tôi cho phép (authorize) người dùng này tạo một phiên đăng nhập (session) vào hệ thống".
Nếu trả về null, bạn đang từ chối cấp quyền truy cập.
Vì vậy, authorize ở đây được hiểu theo nghĩa rộng: Cấp quyền để thiết lập một phiên làm việc chính thức.
2. Sự nhất quán trong thiết kế thư viện (Design Pattern)
NextAuth hỗ trợ rất nhiều Providers khác nhau (Google, GitHub, Email, Credentials).
Với OAuth (Google/GitHub), việc xác thực (Authentication) đã diễn ra ở máy chủ của Google.
Khi quay về ứng dụng của bạn, NextAuth cần một bước để quyết định xem có "cho phép" người dùng đó vào hệ thống của bạn hay không.
Cái tên authorize được dùng chung cho tất cả các Providers để giữ sự nhất quán về cấu trúc API.
3. Quy trình thực hiện trong NextAuth
Vào năm 2026, luồng hoạt động của NextAuth v5 được chuẩn hóa như sau:
Authentication: Bạn thực hiện thủ công bên trong hàm authorize (so khớp mật khẩu bằng bcrypt, kiểm tra database).
Authorization (Quyết định): Dựa trên kết quả xác thực ở bước 1, hàm authorize trả về dữ liệu. Nếu có dữ liệu, NextAuth coi như bước "ủy quyền khởi tạo session" đã thành công.
*/
