# API Comment Endpoints - Postman Testing Guide

## Base URL
```
http://localhost:5000/api/v1/comments
```

## Endpoints Overview

### 1. GET - Lấy tất cả comments của một sản phẩm
**Endpoint:** `GET /api/v1/comments/product/:productId`

**Description:** Lấy danh sách các bình luận của một sản phẩm cụ thể

**Example URL:**
```
http://localhost:5000/api/v1/comments/product/66b5c3a2f12c4e0015abcd12
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Get comments successfully",
  "data": [
    {
      "_id": "66b5c3a2f12c4e0015abcd13",
      "product": {
        "_id": "66b5c3a2f12c4e0015abcd12",
        "title": "Áo thun nam"
      },
      "user": {
        "_id": "66b5c3a2f12c4e0015abcd11",
        "username": "john_doe",
        "fullName": "John Doe",
        "avatar": "https://example.com/avatar.jpg"
      },
      "rating": 5,
      "title": "Sản phẩm tuyệt vời",
      "content": "Tôi rất hài lòng với chất lượng sản phẩm này",
      "createdAt": "2024-04-06T10:30:00.000Z",
      "updatedAt": "2024-04-06T10:30:00.000Z",
      "isDeleted": false
    }
  ]
}
```

---

### 2. POST - Tạo bình luận mới
**Endpoint:** `POST /api/v1/comments`

**Authentication:** Required (Bearer Token)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "productId": "66b5c3a2f12c4e0015abcd12",
  "rating": 5,
  "title": "Sản phẩm tuyệt vời",
  "content": "Tôi rất hài lòng với chất lượng sản phẩm. Giao hàng nhanh, đóng gói cẩn thận. Sẽ mua lại!"
}
```

**Parameters:**
- `productId` (string, required): ID của sản phẩm
- `rating` (number, required): Điểm đánh giá từ 1 đến 5
- `title` (string, required): Tiêu đề bình luận
- `content` (string, required): Nội dung bình luận

**Response Success (201):**
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "_id": "66b5c3a2f12c4e0015abcd13",
    "product": {
      "_id": "66b5c3a2f12c4e0015abcd12",
      "title": "Áo thun nam"
    },
    "user": {
      "_id": "66b5c3a2f12c4e0015abcd11",
      "username": "john_doe",
      "fullName": "John Doe"
    },
    "rating": 5,
    "title": "Sản phẩm tuyệt vời",
    "content": "Tôi rất hài lòng với chất lượng sản phẩm. Giao hàng nhanh, đóng gói cẩn thận. Sẽ mua lại!",
    "createdAt": "2024-04-06T10:30:00.000Z",
    "updatedAt": "2024-04-06T10:30:00.000Z",
    "isDeleted": false
  }
}
```

**Response Error (400 - Validation Error):**
```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "msg": "Rating must be between 1 and 5",
      "param": "rating"
    }
  ]
}
```

**Response Error (401 - Unauthorized):**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

---

### 3. GET - Lấy bình luận theo ID
**Endpoint:** `GET /api/v1/comments/:commentId`

**Example URL:**
```
http://localhost:5000/api/v1/comments/66b5c3a2f12c4e0015abcd13
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Get comment successfully",
  "data": {
    "_id": "66b5c3a2f12c4e0015abcd13",
    "product": {
      "_id": "66b5c3a2f12c4e0015abcd12",
      "title": "Áo thun nam"
    },
    "user": {
      "_id": "66b5c3a2f12c4e0015abcd11",
      "username": "john_doe",
      "fullName": "John Doe",
      "avatar": "https://example.com/avatar.jpg"
    },
    "rating": 5,
    "title": "Sản phẩm tuyệt vời",
    "content": "Tôi rất hài lòng với chất lượng sản phẩm này",
    "createdAt": "2024-04-06T10:30:00.000Z",
    "updatedAt": "2024-04-06T10:30:00.000Z",
    "isDeleted": false
  }
}
```

---

### 4. PUT - Cập nhật bình luận
**Endpoint:** `PUT /api/v1/comments/:commentId`

**Authentication:** Required (Bearer Token)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body (tất cả trường là optional):**
```json
{
  "rating": 4,
  "title": "Sản phẩm tốt",
  "content": "Cập nhật: chất lượng rất tốt, giá cả phải chăng"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "_id": "66b5c3a2f12c4e0015abcd13",
    "rating": 4,
    "title": "Sản phẩm tốt",
    "content": "Cập nhật: chất lượng rất tốt, giá cả phải chăng",
    "updatedAt": "2024-04-06T10:30:00.000Z"
  }
}
```

**Response Error (403 - Not Authorized):**
```json
{
  "success": false,
  "message": "You can only edit your own comments"
}
```

---

### 5. DELETE - Xóa bình luận (Soft Delete)
**Endpoint:** `DELETE /api/v1/comments/:commentId`

**Authentication:** Required (Bearer Token)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

**Response Error (403 - Not Authorized):**
```json
{
  "success": false,
  "message": "You can only delete your own comments"
}
```

---

## Postman Collection Setup

### Variables to Set:
- `base_url`: `http://localhost:5000`
- `access_token`: Your JWT token từ login API
- `product_id`: ID của sản phẩm bạn muốn test

### Steps to Test:

1. **Login trước** để có JWT token:
   - POST `/api/v1/auth/login`
   - Copy `access_token` từ response

2. **Tạo Comment mới**:
   - POST `/api/v1/comments`
   - Set `Authorization: Bearer {{access_token}}`
   - Gửi request body

3. **Xem Comments của sản phẩm**:
   - GET `/api/v1/comments/product/{{product_id}}`
   - Không cần token

4. **Cập nhật Comment**:
   - PUT `/api/v1/comments/{{comment_id}}`
   - Set `Authorization: Bearer {{access_token}}`

5. **Xóa Comment**:
   - DELETE `/api/v1/comments/{{comment_id}}`
   - Set `Authorization: Bearer {{access_token}}`

---

## Postman Collection JSON

```json
{
  "info": {
    "name": "Comments API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Comments by Product",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{base_url}}/api/v1/comments/product/{{product_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "comments", "product", "{{product_id}}"]
        }
      }
    },
    {
      "name": "Create Comment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"productId\": \"{{product_id}}\",\n  \"rating\": 5,\n  \"title\": \"Sản phẩm tuyệt vời\",\n  \"content\": \"Tôi rất hài lòng với chất lượng sản phẩm\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/v1/comments",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "comments"]
        }
      }
    },
    {
      "name": "Get Comment by ID",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{base_url}}/api/v1/comments/{{comment_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "comments", "{{comment_id}}"]
        }
      }
    },
    {
      "name": "Update Comment",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"rating\": 4,\n  \"title\": \"Sản phẩm tốt\",\n  \"content\": \"Cập nhật: chất lượng rất tốt\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/v1/comments/{{comment_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "comments", "{{comment_id}}"]
        }
      }
    },
    {
      "name": "Delete Comment",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/v1/comments/{{comment_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "comments", "{{comment_id}}"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:5000"
    },
    {
      "key": "access_token",
      "value": ""
    },
    {
      "key": "product_id",
      "value": ""
    },
    {
      "key": "comment_id",
      "value": ""
    }
  ]
}
```

---

## Database Schema - MongoDB

**Collection: comments**

```javascript
{
  _id: ObjectId,
  product: ObjectId (ref: 'product'),
  user: ObjectId (ref: 'user'),
  rating: Number (1-5),
  title: String,
  content: String,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Notes

- ✅ Hỗ trợ tìm kiếm và populate user/product info
- ✅ Validation đầy đủ
- ✅ Chỉ người tạo comment mới được edit/delete
- ✅ Soft delete (không xóa thực sự khỏi DB)
- ✅ Auto timestamps (createdAt, updatedAt)
- ✅ Lưu trữ đầy đủ vào MongoDB
