# Bank Reconcile App

Hệ thống quản lý và xử lý đối soát sổ phụ ngân hàng cho kế toán (Local-first Internal Web Application).

## Tech Stack
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + Shadcn UI
- **Database & Auth:** Supabase (PostgreSQL)
- **Exporting:** `exceljs`

## Kiến trúc thư mục (File Tree)

- `src/app/(dashboard)/`: Giao diện UI các màn hình chính (Imports, Transactions, Categories, Rules, Exports).
- `src/app/api/`: Các endpoint giao tiếp client-server (nếu cần outside Server Actions).
- `src/components/`:
  - `/ui`: Các component UI tái sử dụng (Button, Input, Table...).
  - `/features`: Các component logic nghiệp vụ (UploadZone, ExcelDataGrid).
- `src/lib/`: Tiện ích dùng chung (config supabase, utils).
- `src/services/`: Lớp xử lý logic nghiệp vụ backend tách biệt với UI:
  - `import.service`: Đẩy file gốc, tạo metadata batch.
  - `parser.service`: Xử lý buffer, trích xuất dòng CSV/Excel.
  - `classification.service`: Chạy thuật toán map keyword & category.
  - `export.service`: Sinh file excel đối soát / hạch toán.
  - `audit.service`: Ghi vết mọi thao tác review tay.
- `src/domain/`: Định nghĩa các models, entities, validation schemas.
- `src/workers/`: (Tương lai) Chứa logic xử lý job nặng chạy ngầm.
- `src/tests/`: Unit test và Integration test.
- `src/scripts/`: Script chạy migrate DB hoặc tiện ích dùng 1 lần ngoài app.

## Hướng dẫn chạy Local

1. Cài đặt dependency:
   \`\`\`bash
   npm install
   \`\`\`
2. Điền biến môi trường:
   Khởi tạo file \`.env.local\` và cấu hình khóa Supabase:
   \`\`\`
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   \`\`\`
3. Khởi chạy Server dev:
   \`\`\`bash
   npm run dev
   \`\`\`
4. Truy cập: [http://localhost:3000](http://localhost:3000)
