# 🚀 Saif RMS POS Backend - API Documentation

This document provides details of the implemented APIs for the frontend team. All APIs return a standard response format.

## Standard Response Format
```json
{
  "success": true,
  "message": "Optional success/error message",
  "data": { ... }, // Can be an object or array
  "error": null // Validation errors (object) or string
}
```

---

## 1. Authentication & Users
**Base URL:** `/api/users`

### **GET /api/users**
Fetch all users.
- **Query Params:** `restaurantId` (optional)
- **Response:** Array of user objects (excluding passwords).

### **POST /api/users**
Create a new user.
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "roleId": "cl...",
    "restaurantId": "cl..." 
  }
  ```

### **GET /api/users/[id]**
Fetch detailed user profile.

### **PUT /api/users/[id]**
Update user details or password.

---

## 2. Roles & Permissions
**Base URL:** `/api/roles` & `/api/permissions`

### **GET /api/permissions**
List all available system permissions (e.g., `menu:delete`).

### **POST /api/permissions**
Create a new permission action.

### **GET /api/roles**
List all roles with their assigned permissions.

### **POST /api/roles**
Create a role with permission IDs.
- **Body:**
  ```json
  {
    "name": "Manager",
    "permissionIds": ["perm_id_1", "perm_id_2"]
  }
  ```

---

## 3. Customer Management
**Base URL:** `/api/customers`

### **GET /api/customers**
Fetch all customers with order counts.

### **POST /api/customers**
Register a new customer.
- **Body:**
  ```json
  {
    "name": "Saif Abbas",
    "email": "saif@example.com",
    "phone": "03001234567"
  }
  ```

### **GET /api/customers/[id]**
Detailed customer profile including order history and loyalty points.

---

## 4. Order Management (POS)
**Base URL:** `/api/orders`

### **GET /api/orders**
Fetch orders with filters.
- **Query Params:** `branchId`, `status` (PENDING, CONFIRMED, etc.), `customerId`.

### **POST /api/orders**
Place a new order (Internal/POS or Online).
- **Body:**
  ```json
  {
    "branchId": "cl...",
    "customerId": "cl...", 
    "type": "DINE_IN", // DINE_IN, DELIVERY, PICKUP
    "total": 1500.00,
    "paymentMethod": "CASH", // STRIPE, PAYPAL, COD, CASH
    "items": [
      { "menuItemId": "cl...", "quantity": 2, "price": 750.00 }
    ]
  }
  ```

### **PUT /api/orders/[id]**
Update order status or payment status.
- **Body:**
  ```json
  {
    "status": "PREPARING",
    "paymentStatus": "PAID"
  }
  ```

---

## 5. Dashboard (KPIs)
**Base URL:** `/api/dashboard`

### **GET /api/dashboard**
Fetch analytics for the last 30 days.
- **Query Params:** `restaurantId` or `branchId`.
- **Response Data:**
  - `totalRevenue`: Sum of paid orders.
  - `totalOrders`: Count of all orders.
  - `newCustomers`: Customer signups in the period.
  - `statusBreakdown`: Object showing counts per status.
  - `topItems`: Array of top 5 selling menu items.

---

## Status Enums
- **OrderStatus:** `PENDING`, `CONFIRMED`, `PREPARING`, `KITCHEN_READY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`
- **OrderType:** `DINE_IN`, `DELIVERY`, `PICKUP`
- **PaymentMethod:** `STRIPE`, `PAYPAL`, `COD`, `CASH`
- **PaymentStatus:** `PENDING`, `PAID`, `FAILED`, `REFUNDED`
