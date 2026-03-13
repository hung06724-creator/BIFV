# API Contract – Bank Reconcile App

> Version: 1.0  
> Base URL: `/api`  
> Content-Type: `application/json`  
> Date format: ISO 8601 (`YYYY-MM-DD` hoặc `YYYY-MM-DDTHH:mm:ssZ`)

---

## Mục lục

1. [Error Response Shape (chung)](#1-error-response-shape-chung)
2. [Pagination Shape (chung)](#2-pagination-shape-chung)
3. [Imports](#3-imports)
4. [Transactions](#4-transactions)
5. [Categories](#5-categories)
6. [Rules](#6-rules)
7. [Reports](#7-reports)

---

## 1. Error Response Shape (chung)

Mọi endpoint khi lỗi đều trả về cùng một shape:

```ts
interface ApiError {
  error: {
    code: string;           // Mã lỗi máy đọc được, e.g. "DUPLICATE_FILE", "VALIDATION_ERROR"
    message: string;         // Mô tả lỗi cho người dùng (tiếng Việt)
    details?: Record<string, string[]>; // Chi tiết lỗi theo field (cho validation)
  };
}
```

**HTTP Status Codes:**
| Code | Ý nghĩa |
|------|----------|
| 400  | Request body/query params không hợp lệ |
| 404  | Resource không tồn tại |
| 409  | Xung đột (e.g. file trùng hash, rule trùng) |
| 422  | Dữ liệu hợp lệ về format nhưng không xử lý được (e.g. file Excel không có header) |
| 500  | Lỗi server nội bộ |

**Ví dụ Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ.",
    "details": {
      "filename": ["Tên file không được để trống."],
      "bank_code": ["Bank code phải là một trong: VCB, TCB, BIDV, MB."]
    }
  }
}
```

---

## 2. Pagination Shape (chung)

Các endpoint GET trả danh sách đều dùng chung pagination wrapper:

```ts
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}
```

---

## 3. Imports

### 3.1. `POST /api/imports` – Upload file sao kê ngân hàng

Upload file Excel/CSV, tạo batch mới và trả về preview data.

**Request:** `multipart/form-data`

| Field      | Type   | Required | Mô tả |
|------------|--------|----------|-------|
| `file`     | File   | ✅       | File Excel (.xlsx) hoặc CSV (.csv) |
| `bank_code`| string | ❌       | Mã ngân hàng: `VCB`, `TCB`, `BIDV`, `MB`. Default: `VCB` |

**Response:** `201 Created`

```ts
interface PostImportResponse {
  batch_id: string;                     // UUID
  filename: string;
  file_hash: string;
  bank_code: string;
  status: "processing";
  detected_columns: string[];           // Tên cột phát hiện được
  preview_rows: Record<string, any>[];  // Tối đa 20 dòng preview
  total_rows: number;                   // Tổng số dòng dữ liệu (không tính header)
  created_at: string;
}
```

**Ví dụ Response:**
```json
{
  "batch_id": "b7f1c2a3-4d5e-6f78-9a0b-1c2d3e4f5a6b",
  "filename": "VCB_032026.xlsx",
  "file_hash": "a1b2c3d4e5f6...",
  "bank_code": "VCB",
  "status": "processing",
  "detected_columns": [
    "STT", "Ngày hiệu lực", "Ghi nợ", "Ghi có", "Số dư", "Mô tả"
  ],
  "preview_rows": [
    {
      "STT": "08312td0-87Xs",
      "Ngày hiệu lực": "12/03/2026 13:28:56",
      "Ghi nợ": 0,
      "Ghi có": 200000,
      "Số dư": 3128672564,
      "Mô tả": "TKThe :19021015184017, tai Techcombank. PHAM THI NGOC BICH chuyen tien FT26071809742974"
    }
  ],
  "total_rows": 342,
  "created_at": "2026-03-13T10:30:00Z"
}
```

**Error Cases:**
```json
// 409 – File trùng lặp
{
  "error": {
    "code": "DUPLICATE_FILE",
    "message": "File này đã được upload (ID: b7f1c2a3..., Tên: VCB_032026.xlsx). Vui lòng kiểm tra lại."
  }
}

// 422 – File không hợp lệ
{
  "error": {
    "code": "INVALID_FILE_FORMAT",
    "message": "Không tìm thấy dòng tiêu đề (Header row) chuẩn."
  }
}
```

---

### 3.2. `GET /api/imports/[batchId]` – Lấy chi tiết một import batch

**Path Params:**
| Param     | Type   | Mô tả |
|-----------|--------|-------|
| `batchId` | string (UUID) | ID của batch |

**Response:** `200 OK`

```ts
interface GetImportBatchResponse {
  id: string;
  filename: string;
  file_hash: string;
  bank_code: string;
  status: "processing" | "reviewing" | "completed" | "failed";
  total_records: number;
  stats: {
    pending_classification: number;
    classified: number;
    confirmed: number;
    exported: number;
  };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
```

**Ví dụ Response:**
```json
{
  "id": "b7f1c2a3-4d5e-6f78-9a0b-1c2d3e4f5a6b",
  "filename": "VCB_032026.xlsx",
  "file_hash": "a1b2c3d4e5f6...",
  "bank_code": "VCB",
  "status": "reviewing",
  "total_records": 342,
  "stats": {
    "pending_classification": 12,
    "classified": 280,
    "confirmed": 45,
    "exported": 5
  },
  "created_by": null,
  "created_at": "2026-03-13T10:30:00Z",
  "updated_at": "2026-03-13T10:35:00Z"
}
```

---

### 3.3. `POST /api/imports/[batchId]/parse` – Parse toàn bộ file thành transactions

Đọc file từ storage, parse thành `bank_transactions` records và lưu vào DB.

**Path Params:**
| Param     | Type   | Mô tả |
|-----------|--------|-------|
| `batchId` | string (UUID) | ID của batch |

**Request Body:**

```ts
interface ParseRequest {
  column_mapping?: {                    // Override mapping nếu auto-detect sai
    date_column?: string;               // Tên cột ngày, e.g. "Ngày hiệu lực"
    debit_column?: string;              // Tên cột ghi nợ
    credit_column?: string;             // Tên cột ghi có
    balance_column?: string;            // Tên cột số dư
    description_columns?: string[];     // Danh sách cột mô tả (có thể > 1)
    reference_column?: string;          // Tên cột mã tham chiếu
  };
  skip_rows?: number;                   // Số dòng bỏ qua từ đầu (default: auto-detect)
}
```

**Ví dụ Request:**
```json
{
  "column_mapping": {
    "date_column": "Ngày hiệu lực",
    "debit_column": "Ghi nợ",
    "credit_column": "Ghi có",
    "description_columns": ["Mô tả", "Chi tiết"]
  }
}
```

**Response:** `200 OK`

```ts
interface ParseResponse {
  batch_id: string;
  status: "reviewing";
  total_parsed: number;
  total_skipped: number;                // Dòng bị bỏ qua (thiếu data, amount = 0, etc.)
  skipped_reasons: {
    row_index: number;
    reason: string;
  }[];
  sample_transactions: ParsedTransactionPreview[];  // 5 dòng đầu để confirm
}

interface ParsedTransactionPreview {
  raw_date: string;
  raw_desc: string;
  normalized_date: string;
  normalized_amount: number;
  type: "credit" | "debit";
}
```

**Ví dụ Response:**
```json
{
  "batch_id": "b7f1c2a3-4d5e-6f78-9a0b-1c2d3e4f5a6b",
  "status": "reviewing",
  "total_parsed": 338,
  "total_skipped": 4,
  "skipped_reasons": [
    { "row_index": 15, "reason": "Số tiền bằng 0, bỏ qua." },
    { "row_index": 99, "reason": "Thiếu mô tả giao dịch." }
  ],
  "sample_transactions": [
    {
      "raw_date": "01/03/2026 19:27:43",
      "raw_desc": "TKThe :19021015184017, tai Techcombank. PHAM THI NGOC BICH chuyen tien FT26071809742974",
      "normalized_date": "2026-03-01",
      "normalized_amount": 200000,
      "type": "credit"
    }
  ]
}
```

---

### 3.4. `POST /api/imports/[batchId]/classify` – Chạy classification engine trên batch

Áp dụng toàn bộ classification rules lên các transactions trong batch.

**Path Params:**
| Param     | Type   | Mô tả |
|-----------|--------|-------|
| `batchId` | string (UUID) | ID của batch |

**Request Body:**

```ts
interface ClassifyRequest {
  rule_ids?: string[];                  // Chỉ chạy các rule cụ thể. Nếu null → chạy tất cả active rules
  overwrite_existing?: boolean;         // Ghi đè kết quả classify cũ? Default: false
}
```

**Ví dụ Request:**
```json
{
  "overwrite_existing": true
}
```

**Response:** `200 OK`

```ts
interface ClassifyResponse {
  batch_id: string;
  total_transactions: number;
  classification_summary: {
    classified: number;                 // Có ít nhất 1 rule match
    unclassified: number;               // Không match rule nào (hoặc chỉ fallback)
    high_confidence: number;            // confidence >= 0.85
    low_confidence: number;             // confidence < 0.85
    already_confirmed: number;          // Đã confirmed, không classify lại
  };
  top_categories: {
    category_id: string;
    category_code: string;
    category_name: string;
    count: number;
  }[];
}
```

**Ví dụ Response:**
```json
{
  "batch_id": "b7f1c2a3-4d5e-6f78-9a0b-1c2d3e4f5a6b",
  "total_transactions": 338,
  "classification_summary": {
    "classified": 310,
    "unclassified": 28,
    "high_confidence": 245,
    "low_confidence": 65,
    "already_confirmed": 12
  },
  "top_categories": [
    {
      "category_id": "cat-001",
      "category_code": "REV-01",
      "category_name": "Doanh thu bán hàng",
      "count": 120
    },
    {
      "category_id": "cat-002",
      "category_code": "REV-02",
      "category_name": "Tiền chuyển khoản cá nhân",
      "count": 85
    }
  ]
}
```

---

### 3.5. `POST /api/imports/[batchId]/export` – Xuất file kết quả

Tạo file Excel đối soát hoặc sổ kế toán từ batch đã xử lý.

**Path Params:**
| Param     | Type   | Mô tả |
|-----------|--------|-------|
| `batchId` | string (UUID) | ID của batch |

**Request Body:**

```ts
interface ExportRequest {
  export_type: "reconciliation" | "accounting";
  filters?: {
    status?: ("classified" | "confirmed")[];        // Chỉ xuất transactions có status này
    category_ids?: string[];                          // Lọc theo category
    date_from?: string;                               // YYYY-MM-DD
    date_to?: string;                                 // YYYY-MM-DD
    min_confidence?: number;                          // Chỉ xuất nếu confidence >= giá trị này
  };
  include_unclassified?: boolean;                     // Bao gồm giao dịch chưa classify? Default: false
}
```

**Ví dụ Request:**
```json
{
  "export_type": "reconciliation",
  "filters": {
    "status": ["confirmed"],
    "date_from": "2026-03-01",
    "date_to": "2026-03-31"
  },
  "include_unclassified": false
}
```

**Response:** `200 OK`

```ts
interface ExportResponse {
  export_id: string;                   // UUID
  export_type: "reconciliation" | "accounting";
  status: "processing" | "completed";
  file_url: string | null;             // URL download (null nếu đang processing)
  total_records: number;
  created_at: string;
}
```

**Ví dụ Response:**
```json
{
  "export_id": "e1f2a3b4-c5d6-e7f8-9a0b-1c2d3e4f5a6b",
  "export_type": "reconciliation",
  "status": "completed",
  "file_url": "/api/exports/e1f2a3b4.../download",
  "total_records": 280,
  "created_at": "2026-03-13T11:00:00Z"
}
```

---

## 4. Transactions

### 4.1. `GET /api/transactions` – Lấy danh sách transactions

**Query Params:**

| Param             | Type    | Default | Mô tả |
|-------------------|---------|---------|-------|
| `page`            | number  | `1`     | Trang hiện tại |
| `page_size`       | number  | `50`    | Số items mỗi trang (max: 200) |
| `batch_id`        | string  | –       | Lọc theo batch |
| `status`          | string  | –       | `pending_classification`, `classified`, `confirmed`, `exported`. Hỗ trợ nhiều giá trị: `status=classified,confirmed` |
| `type`            | string  | –       | `credit` hoặc `debit` |
| `category_id`     | string  | –       | Lọc theo category đã gán |
| `review_status`   | string  | –       | `pending`, `approved`, `rejected` |
| `date_from`       | string  | –       | `YYYY-MM-DD` |
| `date_to`         | string  | –       | `YYYY-MM-DD` |
| `amount_min`      | number  | –       | Số tiền tối thiểu |
| `amount_max`      | number  | –       | Số tiền tối đa |
| `search`          | string  | –       | Tìm kiếm full-text trong `raw_desc` (tự động remove dấu) |
| `sort_by`         | string  | `normalized_date` | Cột sắp xếp: `normalized_date`, `normalized_amount`, `status`, `created_at` |
| `sort_order`      | string  | `desc`  | `asc` hoặc `desc` |

**Response:** `200 OK`

```ts
interface TransactionListItem {
  id: string;
  batch_id: string;
  raw_date: string;
  raw_desc: string;
  normalized_date: string;
  normalized_amount: number;
  type: "credit" | "debit";
  status: "pending_classification" | "classified" | "confirmed" | "exported";
  match: {
    suggested_category_id: string | null;
    suggested_category_code: string | null;
    suggested_category_name: string | null;
    confidence_score: number;
    is_manually_overridden: boolean;
    confirmed_category_id: string | null;
    confirmed_category_code: string | null;
    confirmed_category_name: string | null;
    review_status: "pending" | "approved" | "rejected";
  } | null;
}

type GetTransactionsResponse = PaginatedResponse<TransactionListItem>;
```

**Ví dụ Response:**
```json
{
  "data": [
    {
      "id": "txn-001-uuid",
      "batch_id": "b7f1c2a3-4d5e-6f78-9a0b-1c2d3e4f5a6b",
      "raw_date": "12/03/2026 13:28:56",
      "raw_desc": "TKThe :19021015184017, tai Techcombank. PHAM THI NGOC BICH chuyen tien FT26071809742974",
      "normalized_date": "2026-03-12",
      "normalized_amount": 200000,
      "type": "credit",
      "status": "classified",
      "match": {
        "suggested_category_id": "cat-002",
        "suggested_category_code": "REV-02",
        "suggested_category_name": "Tiền chuyển khoản cá nhân",
        "confidence_score": 0.85,
        "is_manually_overridden": false,
        "confirmed_category_id": null,
        "confirmed_category_code": null,
        "confirmed_category_name": null,
        "review_status": "pending"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total_items": 338,
    "total_pages": 7
  }
}
```

---

### 4.2. `GET /api/transactions/[id]` – Chi tiết một transaction

**Path Params:**
| Param | Type   | Mô tả |
|-------|--------|-------|
| `id`  | string (UUID) | ID transaction |

**Response:** `200 OK`

```ts
interface TransactionDetail {
  id: string;
  batch_id: string;
  raw_date: string;
  raw_desc: string;
  raw_amount: string;
  raw_reference: string;
  normalized_date: string;
  normalized_amount: number;
  type: "credit" | "debit";
  status: "pending_classification" | "classified" | "confirmed" | "exported";
  created_at: string;
  updated_at: string;

  // Parsed heuristics (từ VietnameseTransactionParser)
  parsed: {
    sender_name: string | null;
    sender_bank: string | null;
    sender_account_hint: string | null;
    transfer_ref: string | null;
    normalized_description: string;
    no_accent_description: string;
  };

  // Classification match info
  match: {
    id: string;
    suggested_category_id: string | null;
    suggested_category_code: string | null;
    suggested_category_name: string | null;
    confidence_score: number;
    matched_rule_ids: string[];
    explanation: string;
    is_manually_overridden: boolean;
    confirmed_category_id: string | null;
    confirmed_category_code: string | null;
    confirmed_category_name: string | null;
    review_status: "pending" | "approved" | "rejected";
    reviewer_id: string | null;
    reviewed_at: string | null;
  } | null;

  // Audit trail
  audit_logs: {
    id: string;
    action: "insert" | "update" | "delete" | "manual_override";
    old_values: Record<string, any> | null;
    new_values: Record<string, any> | null;
    user_id: string | null;
    created_at: string;
  }[];
}
```

**Ví dụ Response:**
```json
{
  "id": "txn-001-uuid",
  "batch_id": "b7f1c2a3-4d5e-6f78-9a0b-1c2d3e4f5a6b",
  "raw_date": "12/03/2026 13:28:56",
  "raw_desc": "TKThe :19021015184017, tai Techcombank. PHAM THI NGOC BICH chuyen tien FT26071809742974 -CTLNHIDI000014665179416-1/1-CRE-002",
  "raw_amount": "200000",
  "raw_reference": "08312td0-87Xs",
  "normalized_date": "2026-03-12",
  "normalized_amount": 200000,
  "type": "credit",
  "status": "classified",
  "created_at": "2026-03-13T10:35:00Z",
  "updated_at": "2026-03-13T10:40:00Z",
  "parsed": {
    "sender_name": "PHAM THI NGOC BICH",
    "sender_bank": "Techcombank",
    "sender_account_hint": "19021015184017",
    "transfer_ref": "FT26071809742974 | CRE-002",
    "normalized_description": "tkthe :19021015184017, tai techcombank. pham thi ngoc bich chuyen tien ft26071809742974 -ctlnhidi000014665179416-1/1-cre-002",
    "no_accent_description": "tkthe :19021015184017, tai techcombank. pham thi ngoc bich chuyen tien ft26071809742974 -ctlnhidi000014665179416-1/1-cre-002"
  },
  "match": {
    "id": "match-001-uuid",
    "suggested_category_id": "cat-002",
    "suggested_category_code": "REV-02",
    "suggested_category_name": "Tiền chuyển khoản cá nhân",
    "confidence_score": 0.85,
    "matched_rule_ids": ["rule-005-uuid"],
    "explanation": "Khớp rule [keyword]: 'chuyen tien'. Priority: 10",
    "is_manually_overridden": false,
    "confirmed_category_id": null,
    "confirmed_category_code": null,
    "confirmed_category_name": null,
    "review_status": "pending",
    "reviewer_id": null,
    "reviewed_at": null
  },
  "audit_logs": []
}
```

---

### 4.3. `PATCH /api/transactions/[id]` – Cập nhật thủ công transaction

Dùng cho manual override: gán category thủ công, sửa thông tin.

**Path Params:**
| Param | Type   | Mô tả |
|-------|--------|-------|
| `id`  | string (UUID) | ID transaction |

**Request Body:**

```ts
interface PatchTransactionRequest {
  confirmed_category_id?: string;       // Gán category thủ công
  review_status?: "approved" | "rejected";
  notes?: string;                       // Ghi chú của reviewer
}
```

**Ví dụ Request:**
```json
{
  "confirmed_category_id": "cat-003",
  "review_status": "approved",
  "notes": "Đây là doanh thu dịch vụ, không phải chuyển khoản cá nhân."
}
```

**Response:** `200 OK`

```ts
interface PatchTransactionResponse {
  id: string;
  status: "confirmed";
  confirmed_category_id: string;
  confirmed_category_code: string;
  confirmed_category_name: string;
  is_manually_overridden: boolean;      // true nếu confirmed ≠ suggested
  review_status: "approved" | "rejected";
  reviewed_at: string;
  updated_at: string;
}
```

**Ví dụ Response:**
```json
{
  "id": "txn-001-uuid",
  "status": "confirmed",
  "confirmed_category_id": "cat-003",
  "confirmed_category_code": "REV-03",
  "confirmed_category_name": "Doanh thu dịch vụ",
  "is_manually_overridden": true,
  "review_status": "approved",
  "reviewed_at": "2026-03-13T14:00:00Z",
  "updated_at": "2026-03-13T14:00:00Z"
}
```

---

### 4.4. `POST /api/transactions/[id]/confirm` – Xác nhận classification

Kế toán confirm rằng classification đúng (không thay đổi category).

**Path Params:**
| Param | Type   | Mô tả |
|-------|--------|-------|
| `id`  | string (UUID) | ID transaction |

**Request Body:**

```ts
interface ConfirmTransactionRequest {
  accept_suggested: boolean;            // true = đồng ý suggested_category, false = cần review thêm
}
```

**Ví dụ Request:**
```json
{
  "accept_suggested": true
}
```

**Response:** `200 OK`

```ts
interface ConfirmTransactionResponse {
  id: string;
  status: "confirmed";
  confirmed_category_id: string;
  confirmed_category_code: string;
  confirmed_category_name: string;
  is_manually_overridden: false;
  review_status: "approved";
  reviewed_at: string;
}
```

**Ví dụ Response:**
```json
{
  "id": "txn-001-uuid",
  "status": "confirmed",
  "confirmed_category_id": "cat-002",
  "confirmed_category_code": "REV-02",
  "confirmed_category_name": "Tiền chuyển khoản cá nhân",
  "is_manually_overridden": false,
  "review_status": "approved",
  "reviewed_at": "2026-03-13T14:05:00Z"
}
```

---

### 4.5. `POST /api/transactions/[id]/suggest` – Chạy lại classification cho 1 giao dịch

Re-classify một giao dịch cụ thể (e.g. sau khi thêm rule mới).

**Path Params:**
| Param | Type   | Mô tả |
|-------|--------|-------|
| `id`  | string (UUID) | ID transaction |

**Request Body:** _(không bắt buộc)_

```ts
interface SuggestRequest {
  rule_ids?: string[];                  // Chỉ chạy các rule cụ thể. Null → tất cả active rules
}
```

**Ví dụ Request:**
```json
{}
```

**Response:** `200 OK`

```ts
interface SuggestResponse {
  transaction_id: string;
  previous_suggestion: {
    category_id: string | null;
    category_code: string | null;
    confidence_score: number;
  };
  new_suggestion: {
    category_id: string | null;
    category_code: string | null;
    category_name: string | null;
    confidence_score: number;
    matched_rule_ids: string[];
    explanation: string;
  };
  changed: boolean;                     // true nếu suggestion mới khác cũ
}
```

**Ví dụ Response:**
```json
{
  "transaction_id": "txn-001-uuid",
  "previous_suggestion": {
    "category_id": "cat-002",
    "category_code": "REV-02",
    "confidence_score": 0.85
  },
  "new_suggestion": {
    "category_id": "cat-003",
    "category_code": "REV-03",
    "category_name": "Doanh thu dịch vụ",
    "confidence_score": 0.95,
    "matched_rule_ids": ["rule-010-uuid"],
    "explanation": "Khớp rule [regex]: 'techcombank.*chuyen tien'. Priority: 5"
  },
  "changed": true
}
```

---

### 4.6. `POST /api/transactions/bulk-assign` – Gán category hàng loạt

**Request Body:**

```ts
interface BulkAssignRequest {
  transaction_ids: string[];            // Danh sách transaction IDs (max: 500)
  category_id: string;                  // Category cần gán
  review_status?: "approved" | "rejected";  // Default: "approved"
  notes?: string;
}
```

**Ví dụ Request:**
```json
{
  "transaction_ids": [
    "txn-001-uuid",
    "txn-002-uuid",
    "txn-003-uuid"
  ],
  "category_id": "cat-002",
  "review_status": "approved",
  "notes": "Bulk assign: tất cả là chuyển khoản cá nhân."
}
```

**Response:** `200 OK`

```ts
interface BulkAssignResponse {
  total_requested: number;
  total_updated: number;
  total_skipped: number;                // Đã exported hoặc không tìm thấy
  skipped_ids: {
    id: string;
    reason: string;
  }[];
  category: {
    id: string;
    code: string;
    name: string;
  };
}
```

**Ví dụ Response:**
```json
{
  "total_requested": 3,
  "total_updated": 2,
  "total_skipped": 1,
  "skipped_ids": [
    {
      "id": "txn-003-uuid",
      "reason": "Transaction đã ở trạng thái 'exported', không thể thay đổi."
    }
  ],
  "category": {
    "id": "cat-002",
    "code": "REV-02",
    "name": "Tiền chuyển khoản cá nhân"
  }
}
```

---

## 5. Categories

### 5.1. `GET /api/categories` – Lấy danh sách categories

**Query Params:**

| Param        | Type    | Default | Mô tả |
|--------------|---------|---------|-------|
| `is_active`  | boolean | –       | Lọc theo trạng thái active |
| `group_name` | string  | –       | Lọc theo nhóm, e.g. `"Doanh thu"` |
| `search`     | string  | –       | Tìm trong `name`, `code`, `description` |

**Response:** `200 OK`

```ts
interface CategoryListItem {
  id: string;
  code: string;
  name: string;
  group_name: string | null;
  ledger_code: string | null;
  priority: number | null;
  description: string | null;
  is_active: boolean;
  usage_count: number;                  // Số transactions đang dùng category này
  created_at: string;
  updated_at: string;
}

// Không phân trang vì categories thường < 100 items
type GetCategoriesResponse = {
  data: CategoryListItem[];
};
```

**Ví dụ Response:**
```json
{
  "data": [
    {
      "id": "cat-001",
      "code": "REV-01",
      "name": "Doanh thu bán hàng",
      "group_name": "Doanh thu",
      "ledger_code": "5111",
      "priority": 1,
      "description": "Doanh thu từ bán hàng hóa, sản phẩm",
      "is_active": true,
      "usage_count": 120,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-03-10T08:00:00Z"
    },
    {
      "id": "cat-002",
      "code": "REV-02",
      "name": "Tiền chuyển khoản cá nhân",
      "group_name": "Doanh thu",
      "ledger_code": "5112",
      "priority": 2,
      "description": null,
      "is_active": true,
      "usage_count": 85,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### 5.2. `POST /api/categories` – Tạo category mới

**Request Body:**

```ts
interface CreateCategoryRequest {
  code: string;                         // Unique, e.g. "REV-05"
  name: string;                         // e.g. "Doanh thu quảng cáo"
  group_name?: string;                  // e.g. "Doanh thu"
  ledger_code?: string;                 // Mã tài khoản kế toán, e.g. "5115"
  priority?: number;                    // Thứ tự ưu tiên hiển thị
  description?: string;
}
```

**Ví dụ Request:**
```json
{
  "code": "REV-05",
  "name": "Doanh thu quảng cáo",
  "group_name": "Doanh thu",
  "ledger_code": "5115",
  "priority": 5,
  "description": "Doanh thu từ các hợp đồng quảng cáo online"
}
```

**Response:** `201 Created`

```ts
interface CreateCategoryResponse {
  id: string;
  code: string;
  name: string;
  group_name: string | null;
  ledger_code: string | null;
  priority: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Ví dụ Response:**
```json
{
  "id": "cat-005-uuid",
  "code": "REV-05",
  "name": "Doanh thu quảng cáo",
  "group_name": "Doanh thu",
  "ledger_code": "5115",
  "priority": 5,
  "description": "Doanh thu từ các hợp đồng quảng cáo online",
  "is_active": true,
  "created_at": "2026-03-13T15:00:00Z",
  "updated_at": "2026-03-13T15:00:00Z"
}
```

**Error Cases:**
```json
// 409 – Code trùng
{
  "error": {
    "code": "DUPLICATE_CODE",
    "message": "Category code 'REV-05' đã tồn tại."
  }
}
```

---

### 5.3. `PATCH /api/categories/[id]` – Cập nhật category

**Path Params:**
| Param | Type   | Mô tả |
|-------|--------|-------|
| `id`  | string (UUID) | ID category |

**Request Body:**

```ts
interface PatchCategoryRequest {
  name?: string;
  group_name?: string;
  ledger_code?: string;
  priority?: number;
  description?: string;
  is_active?: boolean;
}
```

**Ví dụ Request:**
```json
{
  "ledger_code": "5116",
  "is_active": false
}
```

**Response:** `200 OK` – Trả về full category object (giống `CreateCategoryResponse`).

**Ví dụ Response:**
```json
{
  "id": "cat-005-uuid",
  "code": "REV-05",
  "name": "Doanh thu quảng cáo",
  "group_name": "Doanh thu",
  "ledger_code": "5116",
  "priority": 5,
  "description": "Doanh thu từ các hợp đồng quảng cáo online",
  "is_active": false,
  "created_at": "2026-03-13T15:00:00Z",
  "updated_at": "2026-03-13T16:00:00Z"
}
```

---

## 6. Rules

### 6.1. `GET /api/rules` – Lấy danh sách classification rules

**Query Params:**

| Param         | Type    | Default | Mô tả |
|---------------|---------|---------|-------|
| `is_active`   | boolean | –       | Lọc active/inactive |
| `type`        | string  | –       | `exact`, `keyword`, `regex`, `amount`, `composite`, `fallback` |
| `category_id` | string  | –       | Lọc theo category |
| `search`      | string  | –       | Tìm trong `keyword` |
| `sort_by`     | string  | `priority` | `priority`, `type`, `created_at` |
| `sort_order`  | string  | `asc`   | `asc` hoặc `desc` |

**Response:** `200 OK`

```ts
interface RuleListItem {
  id: string;
  category_id: string;
  category_code: string;
  category_name: string;
  keyword: string;
  type: "exact" | "keyword" | "regex" | "amount" | "composite" | "fallback";
  priority: number;
  amount_min: number | null;
  amount_max: number | null;
  conditions: any | null;
  stop_on_match: boolean;
  is_active: boolean;
  match_count: number;                  // Số lần rule này đã match
  created_at: string;
  updated_at: string;
}

type GetRulesResponse = {
  data: RuleListItem[];
};
```

**Ví dụ Response:**
```json
{
  "data": [
    {
      "id": "rule-001-uuid",
      "category_id": "cat-002",
      "category_code": "REV-02",
      "category_name": "Tiền chuyển khoản cá nhân",
      "keyword": "chuyen tien|chuyen khoan",
      "type": "keyword",
      "priority": 10,
      "amount_min": null,
      "amount_max": null,
      "conditions": null,
      "stop_on_match": false,
      "is_active": true,
      "match_count": 156,
      "created_at": "2026-02-01T00:00:00Z",
      "updated_at": "2026-03-10T08:00:00Z"
    },
    {
      "id": "rule-002-uuid",
      "category_id": "cat-001",
      "category_code": "REV-01",
      "category_name": "Doanh thu bán hàng",
      "keyword": "thanh\\s+toan.*don\\s+hang",
      "type": "regex",
      "priority": 5,
      "amount_min": null,
      "amount_max": null,
      "conditions": null,
      "stop_on_match": true,
      "is_active": true,
      "match_count": 89,
      "created_at": "2026-02-01T00:00:00Z",
      "updated_at": "2026-02-01T00:00:00Z"
    },
    {
      "id": "rule-003-uuid",
      "category_id": "cat-004",
      "category_code": "REV-04",
      "category_name": "Giao dịch nhỏ lẻ",
      "keyword": "",
      "type": "amount",
      "priority": 50,
      "amount_min": 0,
      "amount_max": 50000,
      "conditions": null,
      "stop_on_match": false,
      "is_active": true,
      "match_count": 45,
      "created_at": "2026-02-15T00:00:00Z",
      "updated_at": "2026-02-15T00:00:00Z"
    }
  ]
}
```

---

### 6.2. `POST /api/rules` – Tạo rule mới

**Request Body:**

```ts
interface CreateRuleRequest {
  category_id: string;                  // UUID – category để gán khi match
  keyword: string;                      // Từ khóa, regex pattern, hoặc pipe-separated list
  type: "exact" | "keyword" | "regex" | "amount" | "composite" | "fallback";
  priority: number;                     // Số nhỏ = ưu tiên cao
  amount_min?: number;                  // Bắt buộc cho type = "amount" | "composite"
  amount_max?: number;                  // Bắt buộc cho type = "amount" | "composite"
  conditions?: any;                     // JSON object cho composite rules
  stop_on_match?: boolean;              // Default: false
}
```

**Ví dụ Request – Keyword rule:**
```json
{
  "category_id": "cat-002",
  "keyword": "chuyen tien|chuyen khoan|ck nhan",
  "type": "keyword",
  "priority": 10,
  "stop_on_match": false
}
```

**Ví dụ Request – Composite rule:**
```json
{
  "category_id": "cat-006",
  "keyword": "shopee|lazada|tiki",
  "type": "composite",
  "priority": 8,
  "amount_min": 100000,
  "amount_max": 50000000,
  "conditions": {
    "require_all": ["keyword_match", "amount_range"]
  },
  "stop_on_match": true
}
```

**Response:** `201 Created` – Trả về full rule object (giống `RuleListItem`, `match_count = 0`).

**Ví dụ Response:**
```json
{
  "id": "rule-new-uuid",
  "category_id": "cat-002",
  "category_code": "REV-02",
  "category_name": "Tiền chuyển khoản cá nhân",
  "keyword": "chuyen tien|chuyen khoan|ck nhan",
  "type": "keyword",
  "priority": 10,
  "amount_min": null,
  "amount_max": null,
  "conditions": null,
  "stop_on_match": false,
  "is_active": true,
  "match_count": 0,
  "created_at": "2026-03-13T16:00:00Z",
  "updated_at": "2026-03-13T16:00:00Z"
}
```

**Validation Errors:**
```json
// 400 – Validation
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ.",
    "details": {
      "category_id": ["Category không tồn tại."],
      "keyword": ["Keyword không được để trống cho rule type 'keyword'."],
      "priority": ["Priority phải là số nguyên dương."]
    }
  }
}

// 400 – Invalid regex
{
  "error": {
    "code": "INVALID_REGEX",
    "message": "Regex pattern không hợp lệ: 'Unterminated group'. Vui lòng kiểm tra lại cú pháp."
  }
}
```

---

### 6.3. `PATCH /api/rules/[id]` – Cập nhật rule

**Path Params:**
| Param | Type   | Mô tả |
|-------|--------|-------|
| `id`  | string (UUID) | ID rule |

**Request Body:**

```ts
interface PatchRuleRequest {
  category_id?: string;
  keyword?: string;
  type?: "exact" | "keyword" | "regex" | "amount" | "composite" | "fallback";
  priority?: number;
  amount_min?: number | null;
  amount_max?: number | null;
  conditions?: any | null;
  stop_on_match?: boolean;
  is_active?: boolean;
}
```

**Ví dụ Request:**
```json
{
  "keyword": "chuyen tien|chuyen khoan|ck nhan|nhan tien",
  "priority": 8
}
```

**Response:** `200 OK` – Trả về full rule object (giống `RuleListItem`).

---

### 6.4. `DELETE /api/rules/[id]` – Xoá rule

**Path Params:**
| Param | Type   | Mô tả |
|-------|--------|-------|
| `id`  | string (UUID) | ID rule |

**Request Body:** _(không có)_

**Response:** `200 OK`

```ts
interface DeleteRuleResponse {
  id: string;
  deleted: true;
}
```

**Ví dụ Response:**
```json
{
  "id": "rule-001-uuid",
  "deleted": true
}
```

**Error Case:**
```json
// 404
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Rule không tồn tại hoặc đã bị xoá."
  }
}
```

---

## 7. Reports

### 7.1. `GET /api/reports/summary` – Báo cáo tổng hợp

**Query Params:**

| Param       | Type   | Default | Mô tả |
|-------------|--------|---------|-------|
| `batch_id`  | string | –       | Lọc theo batch. Nếu không truyền → toàn bộ |
| `date_from` | string | –       | `YYYY-MM-DD` |
| `date_to`   | string | –       | `YYYY-MM-DD` |

**Response:** `200 OK`

```ts
interface SummaryReportResponse {
  period: {
    date_from: string | null;
    date_to: string | null;
    batch_id: string | null;
  };

  overview: {
    total_transactions: number;
    total_credit: number;               // Tổng tiền vào
    total_debit: number;                // Tổng tiền ra
    net_amount: number;                 // credit - debit
  };

  status_breakdown: {
    pending_classification: number;
    classified: number;
    confirmed: number;
    exported: number;
  };

  classification_quality: {
    total_classified: number;
    auto_classified: number;            // Chỉ dùng suggestion, không manual override
    manually_overridden: number;
    average_confidence: number;         // Trung bình confidence score
    high_confidence_count: number;      // >= 0.85
    low_confidence_count: number;       // < 0.85
  };

  by_category: {
    category_id: string;
    category_code: string;
    category_name: string;
    group_name: string | null;
    transaction_count: number;
    total_credit: number;
    total_debit: number;
    net_amount: number;
  }[];

  by_date: {
    date: string;                       // YYYY-MM-DD
    transaction_count: number;
    total_credit: number;
    total_debit: number;
  }[];
}
```

**Ví dụ Response:**
```json
{
  "period": {
    "date_from": "2026-03-01",
    "date_to": "2026-03-31",
    "batch_id": null
  },
  "overview": {
    "total_transactions": 338,
    "total_credit": 125000000,
    "total_debit": 45000000,
    "net_amount": 80000000
  },
  "status_breakdown": {
    "pending_classification": 12,
    "classified": 280,
    "confirmed": 45,
    "exported": 1
  },
  "classification_quality": {
    "total_classified": 326,
    "auto_classified": 290,
    "manually_overridden": 36,
    "average_confidence": 0.82,
    "high_confidence_count": 245,
    "low_confidence_count": 81
  },
  "by_category": [
    {
      "category_id": "cat-001",
      "category_code": "REV-01",
      "category_name": "Doanh thu bán hàng",
      "group_name": "Doanh thu",
      "transaction_count": 120,
      "total_credit": 65000000,
      "total_debit": 0,
      "net_amount": 65000000
    },
    {
      "category_id": "cat-002",
      "category_code": "REV-02",
      "category_name": "Tiền chuyển khoản cá nhân",
      "group_name": "Doanh thu",
      "transaction_count": 85,
      "total_credit": 35000000,
      "total_debit": 0,
      "net_amount": 35000000
    }
  ],
  "by_date": [
    {
      "date": "2026-03-01",
      "transaction_count": 15,
      "total_credit": 5200000,
      "total_debit": 1800000
    },
    {
      "date": "2026-03-02",
      "transaction_count": 12,
      "total_credit": 4100000,
      "total_debit": 900000
    }
  ]
}
```

---

## Tổng hợp tất cả Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/api/imports` | Upload file sao kê |
| `GET` | `/api/imports/[batchId]` | Chi tiết batch |
| `POST` | `/api/imports/[batchId]/parse` | Parse file → transactions |
| `POST` | `/api/imports/[batchId]/classify` | Chạy classification engine |
| `POST` | `/api/imports/[batchId]/export` | Xuất file kết quả |
| `GET` | `/api/transactions` | Danh sách transactions |
| `GET` | `/api/transactions/[id]` | Chi tiết transaction |
| `PATCH` | `/api/transactions/[id]` | Manual override category |
| `POST` | `/api/transactions/[id]/confirm` | Xác nhận classification |
| `POST` | `/api/transactions/[id]/suggest` | Re-classify 1 giao dịch |
| `POST` | `/api/transactions/bulk-assign` | Gán category hàng loạt |
| `GET` | `/api/categories` | Danh sách categories |
| `POST` | `/api/categories` | Tạo category mới |
| `PATCH` | `/api/categories/[id]` | Cập nhật category |
| `GET` | `/api/rules` | Danh sách rules |
| `POST` | `/api/rules` | Tạo rule mới |
| `PATCH` | `/api/rules/[id]` | Cập nhật rule |
| `DELETE` | `/api/rules/[id]` | Xoá rule |
| `GET` | `/api/reports/summary` | Báo cáo tổng hợp |
| `POST` | `/api/exports` | Tạo export (lưu storage + DB) |
| `GET` | `/api/exports/download` | Download file Excel trực tiếp |
