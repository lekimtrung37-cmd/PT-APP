
# KIM TRUNG - Nền tảng Huấn luyện viên Cá nhân

Chào mừng bạn đến với KIM TRUNG, một ứng dụng web được xây dựng để kết nối Huấn luyện viên Cá nhân (PT) với khách hàng, cung cấp các công cụ mạnh mẽ để quản lý, theo dõi và tối ưu hóa hành trình fitness.

## 1. Kiến trúc & Công nghệ

- **Frontend:** Next.js (App Router), React, TypeScript.
- **UI:** shadcn/ui, Tailwind CSS.
- **Backend & Database:** Firebase (Authentication, Firestore).
- **Biểu đồ:** Recharts.
- **Form:** React Hook Form & Zod.

Ứng dụng được thiết kế theo mô hình 3 vai trò chính: **Admin**, **Huấn luyện viên (PT)**, và **Khách hàng (Client)**.

## 2. Phân quyền & Luồng Hoạt động

### 2.1. Hệ thống Vai trò (Roles)

- **Admin:** Có quyền cao nhất, quản lý toàn bộ hệ thống, bao gồm người dùng, PT, và xem các phân tích kinh doanh.
- **Huấn luyện viên (PT):** Quản lý các khách hàng được gán cho mình, tạo kế hoạch tập luyện, theo dõi tiến độ.
- **Khách hàng (Client/User):** Tương tác với PT, xem lịch tập, ghi lại kết quả và theo dõi tiến trình của bản thân.

Vai trò của mỗi người dùng được lưu trong trường `role` trong document của họ tại collection `users` trên Firestore.

### 2.2. Đăng nhập & Đăng ký

- **Đăng nhập Hợp nhất:** Chỉ có một trang đăng nhập duy nhất (`/login`). Sau khi đăng nhập thành công, hệ thống sẽ tự động đọc vai trò của người dùng từ Firestore và điều hướng họ đến trang quản trị phù hợp (Admin, PT, hoặc Client).
- **Đăng ký:**
  - Khách hàng mới có thể tự đăng ký tài khoản. Sau khi đăng ký, tài khoản của họ sẽ ở trạng thái `Pending Activation` (Chờ kích hoạt).
  - Admin sẽ thấy các tài khoản này trên trang quản lý và có thể "Kích hoạt & Gán PT" cho họ.
- **Tạo tài khoản PT & Admin:** Các tài khoản này không thể tự đăng ký mà phải được tạo bởi Admin từ trang quản lý để đảm bảo an toàn.

## 3. Hành trình của một Huấn luyện viên (PT)

Đây là luồng hoạt động điển hình của một PT khi sử dụng hệ thống:

1.  **Tạo Tài khoản (Bởi Admin):**
    *   Tài khoản PT không thể tự đăng ký. Admin sẽ tạo tài khoản cho PT thông qua trang "Quản lý Thành viên & PT" (`/admin/members`).
    *   Admin cung cấp email và mật khẩu tạm thời cho PT.

2.  **Đăng nhập Lần đầu & Onboarding:**
    *   PT sử dụng thông tin được cấp để đăng nhập tại trang `/login`.
    *   Hệ thống nhận diện vai trò `pt` và tự động chuyển hướng họ đến quy trình onboarding tại `/trainer/onboarding`.
    *   PT điền khảo sát về chuyên môn: kinh nghiệm, mô hình làm việc, lĩnh vực chuyên sâu...
    *   Sau khi hoàn tất, PT được chuyển đến bảng điều khiển chính.

3.  **Bảng điều khiển & Quản lý Khách hàng:**
    *   Trang chính của PT là `/trainer/clients`, hiển thị danh sách tất cả khách hàng đang được họ phụ trách.
    *   PT có thể xem nhanh trạng thái, số buổi tập còn lại, và hoạt động gần nhất của từng khách hàng.

4.  **Xây dựng Thư viện Cá nhân:**
    *   **Bài tập:** PT truy cập `/trainer/library/exercises` để tham khảo kho bài tập chung hoặc tự tạo bài tập riêng cho mình.
    *   **Giáo án:** Tại `/trainer/library/programs`, PT có thể tạo các giáo án mẫu, sao chép giáo án từ kho chung, hoặc import hàng loạt từ file CSV để tiết kiệm thời gian.

5.  **Lập kế hoạch cho Khách hàng:**
    *   PT vào trang chi tiết của một khách hàng, mở tab "Kế hoạch".
    *   Sử dụng giao diện lịch trực quan, PT có thể kéo-thả các buổi tập hoặc toàn bộ giáo án từ thư viện vào lịch của khách hàng.

6.  **Tương tác & Theo dõi hàng ngày:**
    *   **Xem chi tiết:** PT có thể xem mọi thông tin của khách hàng, từ hồ sơ onboarding, tiến độ, nhật ký ăn uống, và các ghi chú cá nhân.
    *   **Giao tiếp:** Nhắn tin trực tiếp với khách hàng qua tính năng chat tích hợp.
    *   **Theo dõi & Điều chỉnh:** Dựa vào kết quả tập luyện và các chỉ số check-in, PT sẽ điều chỉnh kế hoạch để tối ưu hiệu quả.

## 4. Chức năng Chi tiết theo Vai trò

### 4.1. Quản trị viên (Admin)

- **Dashboard (`/admin/dashboard`):**
  - Cung cấp cái nhìn tổng quan về các chỉ số quan trọng: tổng thành viên, tổng PT, doanh thu, tỷ lệ hoạt động.
  - Hiển thị biểu đồ tăng trưởng và danh sách các PT hoạt động tốt nhất.
- **Quản lý Thành viên & PT (`/admin/members`):**
  - Danh sách toàn bộ người dùng (clients, PTs, admins).
  - **Thêm thành viên mới:** Tạo tài khoản cho khách hàng.
  - **Kích hoạt tài khoản:** Kích hoạt các tài khoản đang chờ và gán một PT phụ trách.
  - **Gán/Đổi PT:** Thay đổi PT phụ trách cho một khách hàng đã active.
  - **Nâng cấp thành PT:** Chuyển vai trò của một `user` thành `pt`.
- **Quản lý Huấn luyện viên (`/admin/trainers`):**
  - Danh sách các PT, cho phép thêm, sửa thông tin, và vô hiệu hóa/kích hoạt tài khoản PT.
  - Xem trang hiệu suất chi tiết của từng PT.
- **Phân tích (`/admin/analytics`):**
  - Xem các biểu đồ chi tiết về doanh thu, các gói dịch vụ phổ biến và hiệu suất của PT.
- **Thư viện chung (`/admin/library/...`):**
  - Quản lý kho bài tập và giáo án mẫu dùng chung cho toàn bộ hệ thống.

### 4.2. Huấn luyện viên (PT)

- **Quản lý Khách hàng (`/trainer/clients`):**
  - Liệt kê tất cả các khách hàng được gán cho PT đó, cung cấp các lối tắt nhanh để xem chi tiết, sửa kế hoạch, xem tiến độ.
- **Chi tiết Khách hàng (`/trainer/clients/[clientId]`):**
  - **Tổng quan:** Xem lịch tập hôm nay, tóm tắt tiến độ, quản lý gói tập (số buổi còn lại).
  - **Hồ sơ chi tiết:** Xem lại toàn bộ thông tin onboarding của khách hàng (chỉ số cơ thể, mục tiêu, kinh nghiệm, lối sống).
  - **Ghi chú của PT:** PT có thể ghi lại các lưu ý quan trọng về khách hàng.
- **Xây dựng Kế hoạch Tập luyện (`/trainer/clients/[clientId]/plan`):**
  - Giao diện lịch trực quan.
  - **Thư viện:** Chứa các giáo án mẫu và bài tập do PT tạo ra, được tổ chức theo thư mục.
  - **Tạo/Sửa buổi tập:** PT có thể tạo một buổi tập hoàn toàn mới hoặc chỉnh sửa buổi tập đã có cho một ngày cụ thể.
  - **Gán từ mẫu:** PT có thể click vào một ngày trên lịch, sau đó click vào một giáo án mẫu trong thư viện để gán nhanh kế hoạch cho ngày đó. 

### 4.3. Khách hàng (Client)

- **Onboarding (`/client/onboarding`):** Lần đầu đăng nhập, khách hàng sẽ phải điền một bản khảo sát chi tiết về thông tin cơ thể, mục tiêu, kinh nghiệm, lối sống để PT có cơ sở xây dựng kế hoạch.
- **Dashboard (`/client/dashboard`):**
  - **Check-in Hàng ngày:** Khách hàng báo cáo tâm trạng và giấc ngủ.
  - **Lịch tập hôm nay:** Nếu có lịch, một thẻ sẽ hiện ra với nút để xem chi tiết và ghi lại kết quả.
  - Tóm tắt nhanh về tiến độ và gói tập.
- **Lịch tập (`/client/calendar`):**
  - Xem toàn bộ kế hoạch tập luyện theo tháng.
  - Click vào một ngày để xem chi tiết buổi tập và nhập kết quả thực tế (số hiệp, số lần, số kg).
  - Nút "Lưu Kết quả" sẽ gửi dữ liệu này cho PT xem xét.
- **Tiến độ (`/client/progress`):**
  - Xem biểu đồ tiến trình thay đổi cân nặng, cảm xúc.
  - Cập nhật các số đo cơ thể, kỷ lục cá nhân (PR), và hình ảnh tiến độ (tải ảnh tự do).
- **Dinh dưỡng (`/client/nutrition`):** Xem lịch trình dinh dưỡng và lối sống do PT thiết lập.
- **Cài đặt (`/client/settings`):** Cập nhật thông tin cá nhân và đổi mật khẩu.

## 5. Mô hình Dữ liệu Firestore

- **/users/{userId}:**
  - Collection trung tâm, lưu trữ thông tin cốt lõi của **tất cả** người dùng.
  - Các trường quan trọng: `role`, `status`, `assignedPtId`, `onboardingData`, `ptNote`, `sessions`.
- **/trainerProfiles/{trainerId}:**
  - Lưu hồ sơ công khai của PT, giúp giảm tải việc truy vấn collection `users`.
- **Collections con dưới `/users/{userId}`:**
  - `/workouts`: Lưu các kế hoạch tập luyện cho từng ngày.
  - `/completedWorkouts`: Nhật ký các buổi tập đã hoàn thành cùng kết quả thực tế.
  - `/checkins`: Dữ liệu check-in hàng ngày (mood, sleep).
  - `/progressMetrics`: Các chỉ số tiến độ (cân nặng, số đo).
  - `/personalRecords`: Các kỷ lục cá nhân (PR).
  - `/progressPhotos`: Lưu trữ ảnh tiến độ do người dùng tải lên.
  - `/sessionHistory`: Lịch sử giao dịch cộng/trừ buổi tập.
  - `/nutritionPlan`: Kế hoạch dinh dưỡng và lối sống.
- **/programTemplatesPublic, /programTemplatesTrainer, /publicExercises, /trainerExercises:**
  - Các collection lưu trữ thư viện giáo án và bài tập, phân tách giữa kho chung (public) và kho riêng của từng PT.
- **/appointments/{appointmentId}:**
  - Collection gốc cho các lịch hẹn, giúp truy vấn dễ dàng hơn.
- **/conversations/{conversationId}:**
  - Collection gốc cho các cuộc trò chuyện.
  - Chứa sub-collection `/messages` để lưu tin nhắn.
