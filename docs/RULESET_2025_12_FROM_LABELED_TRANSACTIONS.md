# Rules đề xuất từ bộ giao dịch tháng 12/2025

Tài liệu này tổng hợp rules theo đúng cơ chế engine hiện tại trong `ClassificationService`:
- Chạy theo `priority` tăng dần.
- Rule khớp đầu tiên (ưu tiên cao nhất) là rule được chọn.
- `keyword` hỗ trợ nhiều từ khóa cách nhau bằng `|`.

## Bộ rules đề xuất (theo thứ tự ưu tiên)

> Lưu ý: toàn bộ mô tả nên được chuẩn hóa không dấu/lowercase trước khi match (engine hiện tại đã làm bước này).

1. **Lãi HĐ**
   - type: `keyword`
   - keyword: `thanh toan lai tai khoan tien gui|lai tai khoan tien gui`

2. **Cô Thương**
   - type: `keyword`
   - keyword: `tat toan tai khoan tien gui|@@|_chiho_|trich quan ly ban quan ly du an`

3. **Liên doanh liên kết**
   - type: `keyword`
   - keyword: `qlxd &tk bao lam|thiet ke bao lam|nop hd so 869|nop hd so 870`

4. **Thực tập doanh nghiệp**
   - type: `keyword`
   - keyword: `thanh toan pql|cung ung nhan luc xanh|thanh toan hd 6758`

5. **Ngắn hạn**
   - type: `keyword`
   - keyword: `thanh toan chi phi dao tao|hoc phi daikin|lap dat, sua chua, bao tri sa|thanh toan tien lop hoc bao tri sa`

6. **NVSP**
   - type: `keyword`
   - keyword: `nvsp|so cap 25spsc|07/hd-cdncn`

7. **Thu học phí K49 HKI 25/26**
   - type: `keyword`
   - keyword: `thu hoc phi k49 hki 25/26|2510679|2510788|ngo thi thuy duong`

8. **BHYT**
   - type: `keyword`
   - keyword: `bhyt|bao hiem y te|bao hiem|mua bo sung`

9. **Học lại**
   - type: `keyword`
   - keyword: `hoc lai|hl `

10. **Chưa rõ (cần soát thủ công)**
    - type: `keyword`
    - keyword: `le anh tuan chuyen tien`

11. **Fallback mặc định**
    - type: `fallback`
    - keyword: ``

## Ghi chú chất lượng dữ liệu

- Có giao dịch chứa cụm `Hoc Lai ...` nhưng đang được gắn nhãn `BHYT` (khả năng gắn nhãn nhầm ở dữ liệu mẫu).
- Với nhóm `Thu học phí K49 HKI 25/26`, một số dòng không có từ khóa học phí rõ ràng; nên bổ sung thêm mã sinh viên hoặc danh sách tên/ID đối soát vào keyword/exact rule.
