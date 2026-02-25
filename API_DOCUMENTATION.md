# 🚀 Saif RMS POS Backend - Complete API Documentation

**Version:** 1.3  
**Base URL:** `http://localhost:3000` (Development)  
**Last Updated:** February 24, 2026

This comprehensive documentation covers all 45+ API endpoints for the Restaurant Management System backend. All APIs follow RESTful principles and return standardized JSON responses.

---

## 📋 Table of Contents

1. [Response Format](#response-format)
2. [Authentication & Users](#1-authentication--users)
3. [Roles & Permissions](#2-roles--permissions)
4. [Restaurant Management](#3-restaurant-management)
5. [Branch Management](#4-branch-management)
6. [Settings](#5-settings)
7. [Menu Management](#6-menu-management)
8. [Inventory Management](#7-inventory-management)
9. [Order Management](#8-order-management)
10. [Customer Management](#9-customer-management)
11. [Payment Management](#10-payment-management)
12. [Reservations](#11-reservations)
13. [Table Services](#12-table-services)
14. [Subscription Pricing](#13-subscription-pricing)
15. [CMS & Content](#14-cms--content)
16. [Marketing](#15-marketing)
17. [Delivery & Riders](#16-delivery--riders)
18. [Notifications](#17-notifications)
19. [Dashboard Analytics](#18-dashboard-analytics)
20. [Subscription Requests](#19-subscription-requests)
21. [Enums & Constants](#enums--constants)

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... } // Object or Array
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message or validation errors",
  "statusCode": 400
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `404` - Not Found
- `500` - Internal Server Error

---

## 1. Authentication & Users

### GET `/api/users`
Fetch all users (excluding passwords).

**Query Parameters:**
- `restaurantId` (optional) - Filter by restaurant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "John Doe",
      "email": "john@example.com",
      "roleId": "clxxx...",
      "role": { "name": "Manager", "permissions": [...] },
      "restaurantId": "clxxx...",
      "createdAt": "2026-02-12T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/users`
Create a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "roleId": "clxxx...",
  "restaurantId": "clxxx..."
}
```

**Validation:**
- `name`: Optional, min 2 characters
- `email`: Required, valid email format, unique
- `password`: Required, min 8 characters
- `roleId`: Required, valid role ID
- `restaurantId`: Optional

---

### GET `/api/users/[id]`
Get detailed user information.

**Response:** Single user object with role and restaurant details.

---

### PUT `/api/users/[id]`
Update user details or password.

**Request Body:**
```json
{
  "name": "John Updated",
  "email": "john.new@example.com",
  "password": "NewPassword123!", // Optional
  "roleId": "clxxx..."
}
```

---

### DELETE `/api/users/[id]`
Delete a user.

**Response:** Success message with 200 status.

---

### 🔐 Password Reset Flow (3 Steps)

The password reset is split into three separate steps for better security:

```
Step 1: POST /api/auth/forgot-password   → sends OTP to email
Step 2: POST /api/auth/verify-otp        → verifies OTP (no password yet)
Step 3: POST /api/auth/reset-password    → changes password (using verified session)
```

---

### POST `/api/auth/forgot-password`
**Step 1** — Request a 6-digit OTP to be sent to the user's email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Validation:**
- `email`: Required, valid email format

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP has been sent to your email.",
  "data": null
}
```

> **Note:** Even if the email does not exist in the system, a success response is returned to prevent user enumeration attacks.

**OTP is valid for 10 minutes.**

---

### POST `/api/auth/verify-otp`
**Step 2** — Verify the OTP received in email. Does **not** change the password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Validation:**
- `email`: Required, valid email format
- `otp`: Required, exactly 6 digits

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully. You can now reset your password.",
  "data": null
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| `400` | Validation failed |
| `400` | Invalid request or OTP not found |
| `400` | OTP has expired. Please request a new one. |
| `400` | Invalid OTP |
| `500` | Something went wrong |

> After successful verification, the OTP is cleared from the database and an internal `otpVerified` flag is set on the user. This flag is required for **Step 3**.

---

### POST `/api/auth/reset-password`
**Step 3** — Set a new password. **Only works after Step 2 is completed.**

**Request Body:**
```json
{
  "email": "user@example.com",
  "newPassword": "NewSecurePassword123!"
}
```

**Validation:**
- `email`: Required, valid email format
- `newPassword`: Required, minimum 6 characters

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password has been reset successfully.",
  "data": null
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| `400` | Validation failed |
| `400` | OTP has not been verified. Please verify your OTP first. |
| `404` | User not found |
| `500` | Something went wrong |

> After the password is reset, the `otpVerified` flag is cleared automatically.

---

## 2. Roles & Permissions

### GET `/api/roles`
List all roles with permissions and user counts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Manager",
      "permissions": [
        { "id": "clxxx...", "action": "menu:delete" }
      ],
      "_count": { "users": 5 },
      "createdAt": "2026-02-12T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/roles`
Create a new role with permissions.

**Request Body:**
```json
{
  "name": "Kitchen Manager",
  "permissionIds": ["clxxx...", "clxxx..."]
}
```

**Validation:**
- `name`: Required, unique, min 2 characters
- `permissionIds`: Optional array of permission IDs

---

### GET `/api/roles/[id]`
Get single role with all permissions.

---

### PUT `/api/roles/[id]`
Update role name or permissions.

**Request Body:**
```json
{
  "name": "Senior Manager",
  "permissionIds": ["clxxx...", "clxxx..."]
}
```

---

### DELETE `/api/roles/[id]`
Delete a role (fails if assigned to users).

---

### GET `/api/permissions`
List all available system permissions.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "clxxx...", "action": "menu:create" },
    { "id": "clxxx...", "action": "menu:delete" },
    { "id": "clxxx...", "action": "order:refund" }
  ]
}
```

---

### POST `/api/permissions`
Create a new permission action.

**Request Body:**
```json
{
  "action": "inventory:adjust"
}
```

---

## 3. Restaurant Management

### GET `/api/restaurants`
Get all restaurants with branch and user counts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Saif's Kitchen",
      "slug": "saifs-kitchen",
      "logo": "https://...",
      "status": "ACTIVE",
      "subscription": "PREMIUM",
      "facebookUrl": "https://facebook.com/...",
      "instagramUrl": "https://instagram.com/...",
      "metaPixelId": "123456789",
      "_count": { "branches": 3, "users": 12 }
    }
  ]
}
```

---

### POST `/api/restaurants`
Create a new restaurant.

**Request Body:**
```json
{
  "name": "Saif's Kitchen",
  "slug": "saifs-kitchen",
  "logo": "https://example.com/logo.png",
  "description": "Premium Pakistani cuisine",
  "status": "ACTIVE",
  "subscription": "PREMIUM",
  "facebookUrl": "https://facebook.com/...",
  "instagramUrl": "https://instagram.com/...",
  "tiktokUrl": "https://tiktok.com/@...",
  "metaPixelId": "123456789"
}
```

**Validation:**
- `name`: Required, min 2 characters
- `slug`: Required, min 2 characters, unique
- `status`: Enum - PENDING, ACTIVE, SUSPENDED (default: PENDING)
- `subscription`: Enum - FREE, BASIC, PREMIUM, ENTERPRISE (default: FREE)

---

### GET `/api/restaurants/[id]`
Get restaurant details with branches, settings, and categories.

---

### PUT `/api/restaurants/[id]`
Update restaurant details.

---

### DELETE `/api/restaurants/[id]`
Delete a restaurant.

---

## 4. Branch Management

### GET `/api/branches`
Get all branches with restaurant details.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Main Branch",
      "address": "123 Main Street, Lahore",
      "phone": "+92 300 1234567",
      "whatsappNumber": "+92 300 7654321",
      "isOpen": true,
      "timing": "9:00 AM - 11:00 PM",
      "deliveryRadius": 10.5,
      "freeDeliveryThreshold": 50,
      "deliveryCharge": 150,
      "deliveryOffTime": "23:00",
      "restaurantId": "clxxx...",
      "restaurant": { "name": "Saif's Kitchen" }
    }
  ]
}
```

---

### POST `/api/branches`
Create a new branch.

**Request Body:**
```json
{
  "name": "DHA Branch",
  "address": "Phase 5, DHA, Lahore",
  "phone": "+92 300 1234567",
  "whatsappNumber": "+92 300 7654321",
  "isOpen": true,
  "timing": "9:00 AM - 11:00 PM",
  "deliveryRadius": 8.0,
  "freeDeliveryThreshold": 50,
  "deliveryCharge": 200,
  "deliveryOffTime": "22:00",
  "restaurantId": "clxxx..."
}
```

**Validation:**
- `name`: Required, min 2 characters
- `address`: Required, min 5 characters
- `phone`: Optional
- `whatsappNumber`: Optional
- `isOpen`: Optional, boolean (default: true)
- `timing`: Optional, string
- `deliveryRadius`: Optional, number
- `freeDeliveryThreshold`: Optional, number
- `deliveryCharge`: Optional, number
- `deliveryOffTime`: Optional, string
- `restaurantId`: Required, valid restaurant ID

---

### GET `/api/branches/[id]`
Get branch details with restaurant.

---

### PUT `/api/branches/[id]`
Update branch information.

---

### DELETE `/api/branches/[id]`
Delete a branch.

---

## 5. Settings

### GET `/api/settings`
Get all settings.

**Query Parameters:**
- `restaurantId` (optional) - Filter by restaurant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "key": "currency",
      "value": "USD",
      "restaurantId": "clxxx..."
    },
    {
      "id": "clxxx...",
      "key": "timezone",
      "value": "Asia/Karachi",
      "restaurantId": "clxxx..."
    }
  ]
}
```

---

### POST `/api/settings`
Create a new setting.

**Request Body:**
```json
{
  "key": "tax_rate",
  "value": "16",
  "restaurantId": "clxxx..."
}
```

**Note:** Key must be unique per restaurant.

---

### GET `/api/settings/[id]`
Get single setting.

---

### PUT `/api/settings/[id]`
Update setting value.

---

### DELETE `/api/settings/[id]`
Delete a setting.

---

## 6. Menu Management

### GET `/api/categories`
Get all menu categories.

**Query Parameters:**
- `restaurantId` (optional) - Filter by restaurant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Main Course",
      "description": "Delicious main dishes",
      "restaurantId": "clxxx...",
      "_count": { "menuItems": 15 }
    }
  ]
}
```

---

### POST `/api/categories`
Create a new category.

**Request Body:**
```json
{
  "name": "Appetizers",
  "description": "Light starters",
  "restaurantId": "clxxx..."
}
```

---

### GET `/api/categories/[id]`
Get category with all menu items.

---

### PUT `/api/categories/[id]`
Update category.

---

### DELETE `/api/categories/[id]`
Delete category.

---

### GET `/api/menu-items`
Get all menu items with variations and addons.

**Query Parameters:**
- `categoryId` (optional) - Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Chicken Karahi",
      "description": "Traditional Pakistani dish",
      "price": 1200,
      "image": "https://...",
      "isAvailable": true,
      "categoryId": "clxxx...",
      "category": { "name": "Main Course" },
      "variations": [
        { "id": "clxxx...", "name": "Half", "price": 700 },
        { "id": "clxxx...", "name": "Full", "price": 1200 }
      ],
      "addons": [
        { "id": "clxxx...", "name": "Extra Raita", "price": 100 }
      ]
    }
  ]
}
```

---

### POST `/api/menu-items`
Create a new menu item with variations and addons.

**Request Body:**
```json
{
  "name": "Biryani",
  "description": "Aromatic rice dish",
  "price": 800,
  "image": "https://example.com/biryani.jpg",
  "isAvailable": true,
  "categoryId": "clxxx...",
  "variations": [
    { "name": "Small", "price": 600 },
    { "name": "Large", "price": 1000 }
  ],
  "addons": [
    { "name": "Extra Raita", "price": 80 },
    { "name": "Extra Salad", "price": 50 }
  ]
}
```

---

### GET `/api/menu-items/[id]`
Get menu item details with category, variations, addons, and reviews.

---

### PUT `/api/menu-items/[id]`
Update menu item (replaces variations and addons).

---

### DELETE `/api/menu-items/[id]`
Delete menu item.

---

## 7. Inventory Management

### GET `/api/ingredients`
Get all ingredients with stock and recipe counts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Chicken",
      "unit": "kg",
      "_count": { "stocks": 3, "recipes": 8 }
    }
  ]
}
```

---

### POST `/api/ingredients`
Create a new ingredient.

**Request Body:**
```json
{
  "name": "Tomatoes",
  "unit": "kg"
}
```

---

### GET `/api/ingredients/[id]`
Get ingredient with recipes and stocks.

---

### PUT `/api/ingredients/[id]`
Update ingredient.

---

### DELETE `/api/ingredients/[id]`
Delete ingredient.

---

### GET `/api/recipes`
Get all recipes (ingredient requirements for menu items).

**Query Parameters:**
- `menuItemId` (optional) - Filter by menu item

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "menuItemId": "clxxx...",
      "menuItem": { "name": "Chicken Karahi" },
      "ingredientId": "clxxx...",
      "ingredient": { "name": "Chicken", "unit": "kg" },
      "quantity": 0.5
    }
  ]
}
```

---

### POST `/api/recipes`
Create a recipe (ingredient requirement).

**Request Body:**
```json
{
  "menuItemId": "clxxx...",
  "ingredientId": "clxxx...",
  "quantity": 0.5
}
```

---

### GET `/api/recipes/[id]`
Get single recipe.

---

### PUT `/api/recipes/[id]`
Update recipe quantity.

---

### DELETE `/api/recipes/[id]`
Delete recipe.

---

### GET `/api/stocks`
Get stock levels across branches.

**Query Parameters:**
- `branchId` (optional) - Filter by branch
- `ingredientId` (optional) - Filter by ingredient

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "quantity": 25.5,
      "branchId": "clxxx...",
      "branch": { "name": "Main Branch" },
      "ingredientId": "clxxx...",
      "ingredient": { "name": "Chicken", "unit": "kg" },
      "updatedAt": "2026-02-12T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/stocks`
Create or update stock (upsert logic).

**Request Body:**
```json
{
  "branchId": "clxxx...",
  "ingredientId": "clxxx...",
  "quantity": 30.0
}
```

**Note:** If stock exists for this branch+ingredient, it updates the quantity. Otherwise, creates new.

---

## 8. Order Management

### GET `/api/orders`
Get all orders with filters.

**Query Parameters:**
- `branchId` (optional) - Filter by branch
- `status` (optional) - Filter by status (PENDING, CONFIRMED, etc.)
- `customerId` (optional) - Filter by customer
- `startDate` (optional) - Filter by start date (YYYY-MM-DD or ISO format)
- `endDate` (optional) - Filter by end date (YYYY-MM-DD or ISO format)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "orderNo": 1001,
      "status": "PREPARING",
      "type": "DINE_IN",
      "total": 2500,
      "branchId": "clxxx...",
      "branch": { "name": "Main Branch" },
      "customerId": "clxxx...",
      "customer": { "name": "Saif Abbas" },
      "items": [
        {
          "id": "clxxx...",
          "menuItemId": "clxxx...",
          "menuItem": { "name": "Biryani" },
          "quantity": 2,
          "price": 800
        }
      ],
      "payment": {
        "id": "clxxx...",
        "amount": 2500,
        "method": "CASH",
        "status": "PAID"
      },
      "createdAt": "2026-02-12T12:00:00Z"
    }
  ]
}
```

---

### POST `/api/orders`
Create a new order (creates order + items + payment in transaction).

**Request Body:**
```json
{
  "branchId": "clxxx...",
  "customerId": "clxxx...",
  "type": "DELIVERY",
  "total": 1800,
  "paymentMethod": "STRIPE",
  "items": [
    {
      "menuItemId": "clxxx...",
      "quantity": 2,
      "price": 800
    },
    {
      "menuItemId": "clxxx...",
      "quantity": 1,
      "price": 200
    }
  ]
}
```

**Validation:**
- `branchId`: Required
- `customerId`: Optional (for guest orders)
- `type`: Required - DINE_IN, DELIVERY, PICKUP
- `total`: Required, positive number
- `items`: Required, minimum 1 item

---

### GET `/api/orders/[id]`
Get order details with all relations.

---

### PUT `/api/orders/[id]`
Update order status or payment status.

**Request Body:**
```json
{
  "status": "KITCHEN_READY",
  "paymentStatus": "PAID"
}
```

**Order Status Flow:**
```
PENDING → CONFIRMED → KITCHEN_READY → PREPARING → OUT_FOR_DELIVERY → DELIVERED
```

See `docs/ORDER_STATUS_FLOW.md` for complete status documentation.

---

## 9. Customer Management

### GET `/api/customers`
Get all customers with order counts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Saif Abbas",
      "email": "saif@example.com",
      "phone": "+92 300 1234567",
      "loyaltyPoints": 150,
      "_count": { "orders": 12 },
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/customers`
Create a new customer.

**Request Body:**
```json
{
  "name": "Hassan Ali",
  "email": "hassan@example.com",
  "phone": "+92 321 9876543"
}
```

**Validation:**
- `name`: Required, min 2 characters
- `email`: Optional, unique if provided
- `phone`: Optional

---

### GET `/api/customers/[id]`
Get customer details with order history and loyalty transactions.

---

### PUT `/api/customers/[id]`
Update customer information.

**Request Body:**
```json
{
  "name": "Hassan Ali Updated",
  "email": "hassan.new@example.com",
  "phone": "+92 321 9876543",
  "loyaltyPoints": 200
}
```

---

### DELETE `/api/customers/[id]`
Delete a customer.

---

## 10. Payment Management

### GET `/api/payments`
Get all payments with order details.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "amount": 1500,
      "method": "STRIPE",
      "status": "PAID",
      "transactionId": "pi_xxxxx",
      "orderId": "clxxx...",
      "order": {
        "orderNo": 1001,
        "customer": { "name": "Saif Abbas" }
      },
      "createdAt": "2026-02-12T12:00:00Z"
    }
  ]
}
```

---

### POST `/api/payments`
Record a payment (usually created automatically with orders).

**Request Body:**
```json
{
  "amount": 1500,
  "method": "CASH",
  "status": "PAID",
  "transactionId": "TXN123456",
  "orderId": "clxxx..."
}
```

---

### GET `/api/payments/[id]`
Get payment details with full order information.

---

### PUT `/api/payments/[id]`
Update payment status or transaction ID.

---

### DELETE `/api/payments/[id]`
Delete a payment record.

---

## 11. Reservations

### GET `/api/reservations`
Get all reservations.

**Query Parameters:**
- `branchId` (optional) - Filter by branch
- `status` (optional) - Filter by status (BOOKED, ARRIVED, CANCELLED, COMPLETED)
- `tableId` (optional) - Filter by table

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "customerName": "Ahmed Khan",
      "phone": "+92 300 1234567",
      "guestCount": 6,
      "startTime": "2026-02-15T19:00:00Z",
      "status": "BOOKED",
      "branchId": "clxxx...",
      "branch": { "id": "clxxx...", "name": "Main Branch" },
      "tableId": "clxxx...",
      "table": { "id": "clxxx...", "number": 5, "capacity": 4, "status": "RESERVED" },
      "createdAt": "2026-02-12T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/reservations`
Create a new reservation. If `tableId` is provided, table status auto-changes to **RESERVED**.

**Request Body:**
```json
{
  "customerName": "Ahmed Khan",
  "phone": "+92 300 1234567",
  "guestCount": 6,
  "startTime": "2026-02-15T19:00:00Z",
  "branchId": "clxxx...",
  "tableId": "clxxx..."   // Optional — links a table and marks it RESERVED
}
```

**Business Logic:**
- If `tableId` provided: table must be `AVAILABLE`, else 409 error
- On create: table status → `RESERVED` automatically

**Reservation Status:**
- BOOKED - Reservation confirmed
- ARRIVED - Customer has arrived
- CANCELLED - Reservation cancelled
- COMPLETED - Reservation fulfilled

---

### GET `/api/reservations/[id]`
Get reservation details (includes branch and linked table).

---

### PUT `/api/reservations/[id]`
Update reservation. Smart table status management:
- Status → CANCELLED or COMPLETED: linked table auto-resets to `AVAILABLE`
- `tableId` changed to new table: old table → `AVAILABLE`, new table → `RESERVED`

**Request Body:** Same as POST.

---

### DELETE `/api/reservations/[id]`
Delete reservation. Linked table auto-resets to `AVAILABLE`.

---

## 12. Table Services

### GET `/api/tables`
Get all tables with branch info and reservation count.

**Query Parameters:**
- `branchId` (optional) - Filter by branch
- `status` (optional) - Filter by status: `AVAILABLE`, `OCCUPIED`, `RESERVED`
- `restaurantId` (optional, Super Admin only) - Filter by restaurant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "number": 5,
      "capacity": 4,
      "status": "AVAILABLE",
      "branchId": "clxxx...",
      "branch": { "id": "clxxx...", "name": "Main Branch" },
      "_count": { "reservations": 3 },
      "createdAt": "2026-02-12T10:00:00Z",
      "updatedAt": "2026-02-12T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/tables`
Create a new table.

**Request Body:**
```json
{
  "number": 5,
  "capacity": 4,
  "branchId": "clxxx...",
  "status": "AVAILABLE"   // Optional, default: AVAILABLE
}
```

**Validation:**
- `number`: Required, positive integer, unique per branch
- `capacity`: Required, positive integer
- `branchId`: Required
- `status`: Optional — AVAILABLE, OCCUPIED, RESERVED

**Error (409):** If table number already exists in this branch.

---

### GET `/api/tables/[id]`
Get table details with active reservations (BOOKED or ARRIVED only).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "number": 5,
    "capacity": 4,
    "status": "RESERVED",
    "branch": { "id": "clxxx...", "name": "Main Branch" },
    "reservations": [
      {
        "id": "clxxx...",
        "customerName": "Ahmed Khan",
        "guestCount": 4,
        "startTime": "2026-02-15T19:00:00Z",
        "status": "BOOKED"
      }
    ]
  }
}
```

---

### PUT `/api/tables/[id]`
Update table details or status.

**Request Body:**
```json
{
  "status": "OCCUPIED"     // Mark table as occupied (walk-in)
  // OR
  "number": 6,
  "capacity": 6
}
```

**Use cases:**
- Waiter manually marks table as `OCCUPIED` when walk-in customer sits
- Waiter marks table as `AVAILABLE` after customer leaves
- Update table number or capacity

---

### DELETE `/api/tables/[id]`
Delete a table.

---

## 13. Subscription Pricing

### GET `/api/subscription-prices`
Fetch all subscription prices. Super Admins see all, Restaurant Admins see their own.

**Query Parameters:**
- `restaurantId` (optional) - Filter by restaurant (Super Admin only)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "plan": "PREMIUM",
      "price": 49.99,
      "billingCycle": "MONTHLY",
      "isActive": true,
      "restaurantId": "clxxx...",
      "restaurant": { "name": "Pizza House", "slug": "pizza-house" },
      "createdAt": "2026-02-22T00:00:00Z"
    }
  ]
}
```

---

### POST `/api/subscription-prices`
Create a new subscription price entry.

**Request Body:**
```json
{
  "plan": "PREMIUM",
  "price": 49.99,
  "billingCycle": "MONTHLY",
  "restaurantId": "clxxx...",
  "isActive": true
}
```

---

### GET `/api/subscription-prices/[id]`
Get details of a specific pricing entry.

---

### PUT `/api/subscription-prices/[id]`
Update a pricing entry.

---

### DELETE `/api/subscription-prices/[id]`
Delete a pricing entry.

---

## 14. CMS & Content

### GET `/api/cms/faq`
Get FAQ items.

**Query Parameters:**
- `restaurantId` (optional) - Filter by restaurant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "question": "What are your opening hours?",
      "answer": "We are open from 11 AM to 11 PM daily.",
      "restaurantId": "clxxx..."
    }
  ]
}
```

---

### POST `/api/cms/faq`
Create a FAQ item.

**Request Body:**
```json
{
  "question": "Do you offer delivery?",
  "answer": "Yes, we deliver within 10km radius with free delivery above $ 50.",
  "restaurantId": "clxxx..."
}
```

---

### GET `/api/cms/faq/[id]`
Get single FAQ.

---

### PUT `/api/cms/faq/[id]`
Update FAQ.

---

### DELETE `/api/cms/faq/[id]`
Delete FAQ.

---

### GET `/api/cms/pages`
Get CMS pages.

**Query Parameters:**
- `restaurantId` (optional) - Filter by restaurant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "title": "About Us",
      "slug": "about-us",
      "content": "Rich text content here...",
      "restaurantId": "clxxx..."
    }
  ]
}
```

---

### POST `/api/cms/pages`
Create a CMS page.

**Request Body:**
```json
{
  "title": "Privacy Policy",
  "slug": "privacy-policy",
  "content": "Full privacy policy content...",
  "restaurantId": "clxxx..."
}
```

**Note:** Slug must be unique per restaurant.

---

### GET `/api/cms/pages/[id]`
Get single page.

---

### PUT `/api/cms/pages/[id]`
Update page.

---

### DELETE `/api/cms/pages/[id]`
Delete page.

---

### GET `/api/cms/banners`
Get promo banners.

**Query Parameters:**
- `restaurantId` (optional) - Filter by restaurant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "title": "50% Off Weekend Special",
      "imageUrl": "https://example.com/banner.jpg",
      "linkUrl": "https://example.com/offers",
      "isActive": true,
      "restaurantId": "clxxx..."
    }
  ]
}
```

---

### POST `/api/cms/banners`
Create a promo banner.

**Request Body:**
```json
{
  "title": "Ramadan Special",
  "imageUrl": "https://example.com/ramadan-banner.jpg",
  "linkUrl": "https://example.com/ramadan-menu",
  "isActive": true,
  "restaurantId": "clxxx..."
}
```

---

### GET `/api/cms/banners/[id]`
Get single banner.

---

### PUT `/api/cms/banners/[id]`
Update banner.

---

### DELETE `/api/cms/banners/[id]`
Delete banner.

---

## 13. Marketing

### GET `/api/marketing/discounts`
Get discount codes.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "code": "SAVE20",
      "percentage": 20,
      "amount": null,
      "isActive": true,
      "expiresAt": "2026-12-31T23:59:59Z",
      "createdAt": "2026-02-01T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/marketing/discounts`
Create a discount code.

**Request Body:**
```json
{
  "code": "NEWUSER50",
  "percentage": 50,
  "isActive": true,
  "expiresAt": "2026-03-31T23:59:59Z"
}
```

**OR** (Fixed amount discount):
```json
{
  "code": "FLAT200",
  "amount": 200,
  "isActive": true,
  "expiresAt": "2026-03-31T23:59:59Z"
}
```

**Note:** Must provide either `percentage` OR `amount`, not both.

---

### GET `/api/marketing/discounts/[id]`
Get single discount code.

---

### PUT `/api/marketing/discounts/[id]`
Update discount code.

---

### DELETE `/api/marketing/discounts/[id]`
Delete discount code.

---

### GET `/api/marketing/reviews`
Get customer reviews.

**Query Parameters:**
- `orderId` (optional) - Filter by order
- `menuItemId` (optional) - Filter by menu item

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "rating": 5,
      "comment": "Excellent food and service!",
      "aiEnhanced": false,
      "orderId": "clxxx...",
      "order": {
        "orderNo": 1001,
        "customer": { "name": "Saif Abbas" }
      },
      "menuItemId": "clxxx...",
      "menuItem": { "name": "Biryani" },
      "createdAt": "2026-02-12T14:00:00Z"
    }
  ]
}
```

---

### POST `/api/marketing/reviews`
Create a review.

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Amazing taste!",
  "orderId": "clxxx...",
  "menuItemId": "clxxx..."
}
```

**Validation:**
- `rating`: Required, 1-5
- `comment`: Optional
- `orderId`: Required, unique (one review per order)
- `menuItemId`: Optional

---

### GET `/api/marketing/reviews/[id]`
Get single review.

---

### PUT `/api/marketing/reviews/[id]`
Update review.

---

### DELETE `/api/marketing/reviews/[id]`
Delete review.

---

### GET `/api/loyalty-transactions`
Get loyalty point transactions.

**Query Parameters:**
- `customerId` (optional) - Filter by customer

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "points": 50,
      "type": "EARNED",
      "customerId": "clxxx...",
      "customer": { "name": "Saif Abbas", "loyaltyPoints": 150 },
      "createdAt": "2026-02-12T12:00:00Z"
    }
  ]
}
```

---

### POST `/api/loyalty-transactions`
Create loyalty transaction (automatically updates customer points).

**Request Body:**
```json
{
  "points": 50,
  "type": "EARNED",
  "customerId": "clxxx..."
}
```

**Types:**
- `EARNED` - Adds points to customer
- `REDEEMED` - Subtracts points from customer

---

### GET `/api/loyalty-transactions/[id]`
Get single transaction.

---

### DELETE `/api/loyalty-transactions/[id]`
Delete transaction (reverses points automatically).

---

## 14. Delivery & Riders

### GET `/api/riders`
Get all riders.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Ali Raza",
      "phone": "+92 300 1234567",
      "status": "AVAILABLE",
      "createdAt": "2026-02-01T10:00:00Z"
    }
  ]
}
```

**Rider Status:**
- AVAILABLE - Ready for delivery
- BUSY - Currently on delivery
- OFFLINE - Not available

---

### POST `/api/riders`
Create a new rider.

**Request Body:**
```json
{
  "name": "Hassan Ali",
  "phone": "+92 321 9876543",
  "status": "AVAILABLE"
}
```

---

### GET `/api/riders/[id]`
Get rider details.

---

### PUT `/api/riders/[id]`
Update rider information or status.

---

### DELETE `/api/riders/[id]`
Delete rider.

---

## 15. Notifications

### GET `/api/notifications`
Get notifications.

**Query Parameters:**
- `userId` (optional) - Filter by user

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "userId": "clxxx...",
      "message": "New order #1001 received",
      "isRead": false,
      "createdAt": "2026-02-12T12:00:00Z"
    }
  ]
}
```

---

### POST `/api/notifications`
Create a notification.

**Request Body:**
```json
{
  "userId": "clxxx...",
  "message": "Your order is ready for pickup",
  "isRead": false
}
```

---

### GET `/api/notifications/[id]`
Get single notification.

---

### PUT `/api/notifications/[id]`
Update notification (mark as read).

**Request Body:**
```json
{
  "isRead": true
}
```

---

### DELETE `/api/notifications/[id]`
Delete notification.

---

## 16. Dashboard Analytics

### GET `/api/dashboard`
Get analytics and KPIs. Defaults to the last 30 days if no range is specified.

**Query Parameters:**
- `restaurantId` (optional) - Filter by restaurant
- `branchId` (optional) - Filter by branch
- `startDate` (optional) - Filter by start date (YYYY-MM-DD or ISO format)
- `endDate` (optional) - Filter by end date (YYYY-MM-DD or ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 125000,
    "totalOrders": 450,
    "newCustomers": 35,
    "statusBreakdown": {
      "PENDING": 5,
      "CONFIRMED": 8,
      "PREPARING": 12,
      "DELIVERED": 380,
      "CANCELLED": 10
    },
    "topItems": [
      {
        "menuItemId": "clxxx...",
        "name": "Biryani",
        "totalSold": 85,
        "revenue": 68000
      },
      {
        "menuItemId": "clxxx...",
        "name": "Chicken Karahi",
        "totalSold": 62,
        "revenue": 74400
      }
    ]
  }
}
```

---

### GET `/api/reports`
Detailed multi-dimensional reports including trends, customer behavior, inventory consumption, and category performance.

**Query Parameters:**
- `restaurantId` (optional) - Filter by restaurant
- `branchId` (optional) - Filter by branch
- `startDate` (optional) - Filter by start date (YYYY-MM-DD)
- `endDate` (optional) - Filter by end date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "salesTrend": {
      "daily": [{ "date": "Oct 24", "sales": 1200, "orders": 5 }, ...],
      "weekly": [{ "date": "Week 1", "sales": 8400, "orders": 35 }, ...],
      "monthly": [{ "date": "Oct", "sales": 36000, "orders": 150 }, ...]
    },
    "summary": {
      "payments": { "total": 125000, "change": 15, "count": 450 },
      "revenue": { "total": 125000, "change": 15, "netProfit": 50000 },
      "tips": { "total": 0, "change": 0, "averagePerOrder": 0 }
    },
    "ordersCustomers": {
      "orderSource": [{ "name": "POS", "value": 300, "color": "#3B82F6" }, ...],
      "customerType": [
        { "name": "Returning", "value": 120, "color": "#3B82F6" },
        { "name": "New", "value": 80, "color": "#6366F1" }
      ],
      "customerLocations": [{ "area": "DHA", "orders": 45 }, ...]
    },
    "inventory": {
      "stockConsumption": [{ "ingredient": "Chicken", "consumed": 150, "unit": "kg" }, ...],
      "recipePopularity": [{ "recipe": "Biryani", "orders": 85, "revenue": 68000 }, ...]
    },
    "branches": {
      "salesPerBranch": [{ "branch": "Main Branch", "sales": 85000, "orders": 300, "growth": 12 }, ...]
    },
    "menuCategories": {
      "salesByCategory": [{ "category": "Fast Food", "sales": 45000, "value": 36, "color": "#3B82F6" }, ...],
      "topSellingItems": [{ "item": "Zinger Burger", "sales": 15000, "orders": 120 }, ...]
    }
  }
}
```

---

## Enums & Constants

### OrderStatus
```typescript
enum OrderStatus {
  PENDING           // Order placed, not confirmed
  CONFIRMED         // Restaurant confirmed
  KITCHEN_READY     // Sent to kitchen
  PREPARING         // Being cooked
  OUT_FOR_DELIVERY  // With rider
  DELIVERED         // Complete
  CANCELLED         // Cancelled
}
```

### OrderType
```typescript
enum OrderType {
  DINE_IN   // Eating at restaurant
  DELIVERY  // Home delivery
  PICKUP    // Customer pickup
}
```

### PaymentMethod
```typescript
enum PaymentMethod {
  STRIPE   // Online payment
  PAYPAL   // Online payment
  COD      // Cash on delivery
  CASH     // Cash payment
}
```

### PaymentStatus
```typescript
enum PaymentStatus {
  PENDING   // Payment pending
  PAID      // Payment received
  FAILED    // Payment failed
  REFUNDED  // Payment refunded
}
```

### RestaurantStatus
```typescript
enum RestStatus {
  PENDING    // Awaiting approval
  ACTIVE     // Operating
  SUSPENDED  // Temporarily disabled
}
```

### SubscriptionType
```typescript
enum SubType {
  FREE        // Free tier
  BASIC       // Basic features
  PREMIUM     // Premium features
  ENTERPRISE  // Enterprise features
}
```

### RiderStatus
```typescript
enum RiderStatus {
  AVAILABLE  // Ready for delivery
  BUSY       // On delivery
  OFFLINE    // Not available
}
```

### ReservationStatus
```typescript
enum ResStatus {
  BOOKED     // Reservation confirmed
  ARRIVED    // Customer arrived
  CANCELLED  // Reservation cancelled
  COMPLETED  // Service completed
}
```

### TableStatus
```typescript
enum TableStatus {
  AVAILABLE  // Table is free
  OCCUPIED   // Table is currently in use
  RESERVED   // Table is reserved for a booking
}
```

### OrderSource
```typescript
enum OrderSource {
  WEBSITE  // Order from website
  POS      // Order from POS system
  MOBILE   // Order from mobile app
}
```

---

## Error Handling Examples

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "name": ["Name must be at least 2 characters"],
    "email": ["Invalid email format"]
  },
  "statusCode": 400
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Customer not found",
  "error": null,
  "statusCode": 404
}
```

### Duplicate Entry Error
```json
{
  "success": false,
  "message": "Email already exists",
  "error": null,
  "statusCode": 400
}
```

---

## 19. Subscription Requests

> Subscription Requests allow restaurants to request a plan upgrade. Super Admins review and approve/reject these requests. Notifications are automatically sent to relevant users.

### 🔐 Access Control Summary

| Action | Super Admin | Restaurant User |
|--------|:-----------:|:---------------:|
| GET all requests | ✅ (all restaurants) | ✅ (own restaurant only) |
| GET single request | ✅ | ✅ (own restaurant only) |
| POST create request | ✅ | ✅ (own restaurant only) |
| PUT approve/reject | ✅ | ❌ |
| DELETE request | ✅ | ✅ (only PENDING, own restaurant) |

---

### GET `/api/subscription-requests`
Get all subscription upgrade requests.

**Authentication:** Required (Bearer Token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `restaurantId` | string | Optional | Filter by restaurant ID. Super Admins can pass any ID; regular users can only filter by their own restaurant. |

**Authorization Rules:**
- **Super Admin:** Can view requests from ALL restaurants. Can optionally filter by `restaurantId`.
- **Restaurant User:** Can only view their own restaurant's requests. Passing another restaurant's ID returns `403`.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": [
    {
      "id": "clxxx...",
      "restaurantId": "clxxx...",
      "restaurant": {
        "id": "clxxx...",
        "name": "Saif's Kitchen",
        "slug": "saifs-kitchen"
      },
      "plan": "PREMIUM",
      "billingCycle": "MONTHLY",
      "description": "We need more features for our growing business.",
      "status": "PENDING",
      "createdAt": "2026-02-24T10:00:00.000Z",
      "updatedAt": "2026-02-24T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| `403` | Unauthorized to view other restaurant requests |
| `500` | Failed to fetch subscription requests |

---

### POST `/api/subscription-requests`
Submit a new subscription upgrade request.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "restaurantId": "clxxx...",
  "plan": "PREMIUM",
  "billingCycle": "MONTHLY",
  "description": "We need more features for our growing business."
}
```

**Field Validation:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `restaurantId` | string | ✅ Yes | Must be a valid restaurant ID |
| `plan` | enum | ✅ Yes | One of: `FREE`, `BASIC`, `PREMIUM`, `ENTERPRISE` |
| `billingCycle` | enum | ✅ Yes | One of: `MONTHLY`, `YEARLY` |
| `description` | string | ❌ Optional | Additional notes about the request |

**Authorization Rules:**
- **Super Admin:** Can submit on behalf of any restaurant.
- **Restaurant User:** Can only submit for their own restaurant. Passing a different `restaurantId` returns `403`.

**Side Effect — Notifications:**
After a request is created, a notification is automatically sent to **all Super Admin users** with the message:
> `New subscription upgrade request from "[Restaurant Name]" for [PLAN] plan ([BILLING_CYCLE]).`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Subscription request submitted successfully",
  "data": {
    "id": "clxxx...",
    "restaurantId": "clxxx...",
    "restaurant": {
      "id": "clxxx...",
      "name": "Saif's Kitchen"
    },
    "plan": "PREMIUM",
    "billingCycle": "MONTHLY",
    "description": "We need more features for our growing business.",
    "status": "PENDING",
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| `400` | Validation failed (with field-level errors) |
| `403` | Unauthorized to create request for this restaurant |
| `500` | Failed to submit subscription request |

**Validation Error Example (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "plan": ["Invalid enum value. Expected 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'"],
    "billingCycle": ["Invalid enum value. Expected 'MONTHLY' | 'YEARLY'"]
  },
  "statusCode": 400
}
```

---

### GET `/api/subscription-requests/[id]`
Get a single subscription request by its ID.

**Authentication:** Required (Bearer Token)

**URL Parameters:**
- `id` — The subscription request ID (string, required)

**Authorization Rules:**
- **Super Admin:** Can view any request.
- **Restaurant User:** Can only view requests belonging to their own restaurant.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": "clxxx...",
    "restaurantId": "clxxx...",
    "restaurant": {
      "id": "clxxx...",
      "name": "Saif's Kitchen",
      "slug": "saifs-kitchen"
    },
    "plan": "ENTERPRISE",
    "billingCycle": "YEARLY",
    "description": "Expanding to 5 branches next quarter.",
    "status": "APPROVED",
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T12:30:00.000Z"
  }
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| `403` | Unauthorized to view this request |
| `404` | Subscription request not found |
| `500` | Failed to fetch subscription request |

---

### PUT `/api/subscription-requests/[id]`
Approve or reject a subscription request. **Only Super Admin can perform this action.**

**Authentication:** Required (Bearer Token — Super Admin only)

**URL Parameters:**
- `id` — The subscription request ID (string, required)

**Request Body:**
```json
{
  "status": "APPROVED"
}
```

**Field Validation:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `status` | enum | ✅ Yes | One of: `PENDING`, `APPROVED`, `REJECTED` |

**Side Effect — Notifications:**
After status is updated, a notification is automatically sent to **all users of the restaurant** with the message:
> `Your subscription request for the [PLAN] plan has been [approved/rejected].`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription request approved successfully",
  "data": {
    "id": "clxxx...",
    "restaurantId": "clxxx...",
    "restaurant": {
      "id": "clxxx...",
      "name": "Saif's Kitchen"
    },
    "plan": "PREMIUM",
    "billingCycle": "MONTHLY",
    "description": "We need more features for our growing business.",
    "status": "APPROVED",
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T12:30:00.000Z"
  }
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| `400` | Validation failed |
| `403` | Unauthorized to update request status |
| `404` | Subscription request not found |
| `500` | Failed to update subscription request |

---

### DELETE `/api/subscription-requests/[id]`
Delete a subscription request.

**Authentication:** Required (Bearer Token)

**URL Parameters:**
- `id` — The subscription request ID (string, required)

**Authorization Rules:**
- **Super Admin:** Can delete any request regardless of status.
- **Restaurant User:** Can only delete their **own restaurant's** requests that are still in **`PENDING`** status. Attempting to delete an `APPROVED` or `REJECTED` request returns `403`.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription request deleted successfully",
  "data": null
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| `403` | Unauthorized to delete this request |
| `404` | Subscription request not found |
| `500` | Failed to delete subscription request |

---

### Subscription Request Enums

**Plan:**
```typescript
enum SubscriptionPlan {
  FREE        // Default free tier
  BASIC       // Basic features
  PREMIUM     // Premium features
  ENTERPRISE  // Full enterprise access
}
```

**Billing Cycle:**
```typescript
enum BillingCycle {
  MONTHLY  // Billed every month
  YEARLY   // Billed annually (usually discounted)
}
```

**Request Status:**
```typescript
enum SubscriptionRequestStatus {
  PENDING   // Awaiting Super Admin review
  APPROVED  // Approved by Super Admin
  REJECTED  // Rejected by Super Admin
}
```

---

### Complete Workflow Example

```
1. Restaurant User  →  POST /api/subscription-requests
                        (Submits upgrade request, status = PENDING)
                        ↓
                    Super Admins receive notifications

2. Super Admin      →  GET /api/subscription-requests
                        (Reviews all pending requests)
                        ↓
                    PUT /api/subscription-requests/[id]
                        { "status": "APPROVED" }  or  { "status": "REJECTED" }
                        ↓
                    Restaurant Users receive notification

3. If APPROVED      →  Super Admin manually updates Restaurant subscription plan
                        via PUT /api/restaurants/[id] { "subscription": "PREMIUM" }
```

---

## 20. Subscription Prices

> Subscription Prices define the pricing tiers (FREE, BASIC, PREMIUM, ENTERPRISE) for restaurants. Each price entry includes a `features` array that lists the features included in that plan — useful for displaying plan comparison cards in the frontend.

### 🔐 Access Control Summary

| Action | Super Admin | Restaurant User |
|--------|:-----------:|:---------------:|
| GET all prices | ✅ (all restaurants) | ✅ (own restaurant only) |
| GET single price | ✅ | ❌ |
| POST create price | ✅ | ❌ |
| PUT update price | ✅ | ❌ |
| DELETE price | ✅ | ❌ |

---

### GET `/api/subscription-prices`
Get all subscription price entries.

**Authentication:** Required (Bearer Token)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `restaurantId` | string | Optional | Filter by restaurant ID. Super Admins can pass any ID; regular users see their own restaurant only. |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": [
    {
      "id": "clxxx...",
      "plan": "PREMIUM",
      "price": "2999.00",
      "billingCycle": "MONTHLY",
      "isActive": true,
      "features": [
        "Unlimited Orders",
        "Custom Domain",
        "Priority Support",
        "Advanced Analytics"
      ],
      "restaurantId": "clxxx...",
      "restaurant": {
        "id": "clxxx...",
        "name": "Saif's Kitchen",
        "slug": "saifs-kitchen"
      },
      "createdAt": "2026-02-25T10:00:00.000Z",
      "updatedAt": "2026-02-25T10:00:00.000Z"
    }
  ]
}
```

---

### POST `/api/subscription-prices`
Create a new subscription price entry. **Super Admin only.**

**Authentication:** Required (Bearer Token — Super Admin only)

**Request Body:**
```json
{
  "plan": "PREMIUM",
  "price": 2999,
  "billingCycle": "MONTHLY",
  "isActive": true,
  "features": [
    "Unlimited Orders",
    "Custom Domain",
    "Priority Support",
    "Advanced Analytics"
  ],
  "restaurantId": "clxxx..."
}
```

**Field Validation:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `plan` | enum | ✅ Yes | One of: `FREE`, `BASIC`, `PREMIUM`, `ENTERPRISE` |
| `price` | number | ✅ Yes | Non-negative number |
| `billingCycle` | string | ✅ Yes | e.g. `MONTHLY`, `YEARLY`. Defaults to `MONTHLY` |
| `isActive` | boolean | ❌ Optional | Defaults to `true` |
| `features` | string[] | ❌ Optional | Array of feature strings. Defaults to `[]` |
| `restaurantId` | string | ✅ Yes | Valid restaurant ID |

**Side Effect:**  
After creating a price entry, the restaurant's `subscription`, `subStartDate`, and `subEndDate` fields are automatically updated.

**Success Response (201):**
```json
{
  "success": true,
  "message": "Subscription price created successfully",
  "data": {
    "id": "clxxx...",
    "plan": "PREMIUM",
    "price": "2999.00",
    "billingCycle": "MONTHLY",
    "isActive": true,
    "features": ["Unlimited Orders", "Custom Domain", "Priority Support"],
    "restaurantId": "clxxx...",
    "restaurant": {
      "id": "clxxx...",
      "name": "Saif's Kitchen",
      "slug": "saifs-kitchen"
    },
    "createdAt": "2026-02-25T10:00:00.000Z",
    "updatedAt": "2026-02-25T10:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| `400` | Validation failed (with field-level errors) |
| `403` | Unauthorized to create pricing for this restaurant |
| `409` | A pricing entry for this plan and billing cycle already exists for this restaurant |
| `500` | Failed to create subscription price |

---

### GET `/api/subscription-prices/[id]`
Get a single subscription price entry by ID. **Super Admin only.**

**Authentication:** Required (Bearer Token — Super Admin only)

**Success Response (200):** Single subscription price object (same shape as GET list items).

**Error Responses:**
| Status | Message |
|--------|---------|
| `403` | Unauthorized to view this pricing |
| `404` | Subscription price not found |
| `500` | Failed to fetch subscription price |

---

### PUT `/api/subscription-prices/[id]`
Update a subscription price entry. **Super Admin only.**

**Authentication:** Required (Bearer Token — Super Admin only)

**Request Body (all fields optional):**
```json
{
  "plan": "ENTERPRISE",
  "price": 5999,
  "billingCycle": "YEARLY",
  "isActive": true,
  "features": [
    "Unlimited Orders",
    "Custom Domain",
    "24/7 Dedicated Support",
    "White-label App",
    "Advanced Analytics"
  ]
}
```

**Field Validation:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `plan` | enum | ❌ Optional | One of: `FREE`, `BASIC`, `PREMIUM`, `ENTERPRISE` |
| `price` | number | ❌ Optional | Non-negative number |
| `billingCycle` | string | ❌ Optional | e.g. `MONTHLY`, `YEARLY` |
| `isActive` | boolean | ❌ Optional | — |
| `features` | string[] | ❌ Optional | Array of feature strings. Passing this field **replaces** the existing features list. |

**Side Effect:**  
After updating, the restaurant's `subscription`, `subStartDate`, and `subEndDate` fields are automatically synced.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription price updated successfully",
  "data": { ... }
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| `400` | Validation failed |
| `403` | Unauthorized to update this pricing |
| `404` | Subscription price not found |
| `409` | A pricing entry for this plan and billing cycle already exists for this restaurant |
| `500` | Failed to update subscription price |

---

### DELETE `/api/subscription-prices/[id]`
Delete a subscription price entry. **Super Admin only.**

**Authentication:** Required (Bearer Token — Super Admin only)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription price deleted successfully",
  "data": null
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| `403` | Unauthorized to delete this pricing |
| `404` | Subscription price not found |
| `500` | Failed to delete subscription price |

---

## Additional Resources

- **Order Status Flow:** See `docs/ORDER_STATUS_FLOW.md`
- **Schema Documentation:** See `PRISMA_SCHEMA_DOCUMENTATION.md`
- **API Summary:** See `API_IMPLEMENTATION_SUMMARY.md`

---

## Support & Contact

For questions or issues, contact the development team or refer to the project repository.

**Last Updated:** February 24, 2026  
**Version:** 1.3  
**Total Endpoints:** 60+
