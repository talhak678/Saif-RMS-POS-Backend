# Saif RMS & POS - Prisma Schema Documentation

Welcome to the comprehensive database schema documentation for the **Saif Restaurant Management System (RMS) & POS**. This document outlines the structural foundation of our backend, including all models, fields, and relationships.

**Base URL:** [https://saif-rms-pos-backend.vercel.app/](https://saif-rms-pos-backend.vercel.app/)

---

## 🏗️ Schema Overview

The database is built using **PostgreSQL** and managed via **Prisma ORM**. The architecture is designed to support multi-tenancy (multiple restaurants), real-time inventory tracking, and complex order management.

---

## 1. User Roles & Permissions
This section handles authentication and authorization across the system.

### `Role`
Defines the different access levels available in the system.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String (CUID)` | Primary Key |
| `name` | `String` | Unique name of the role (e.g., ADMIN, CASHIER) |
| `permissions` | `Permission[]` | List of associated permissions |
| `users` | `User[]` | Users assigned to this role |

### `Permission`
Individual granular actions that can be performed.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String (CUID)` | Primary Key |
| `action` | `String` | Unique action string (e.g., `menu:delete`) |

### `User`
The core identity model for staff and administrators.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String (CUID)` | Primary Key |
| `name` | `String?` | Full name of the user |
| `email` | `String` | Unique email for login |
| `password` | `String` | Hashed password |
| `role` | `Role` | Associated role for permissions |
| `restaurant`| `Restaurant?` | The restaurant the user belongs to |

---

## 2. System Settings & Multi-Tenancy
Enables the platform to host multiple restaurants, each with its own branches and settings.

### `Restaurant`
The main tenant entity.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String (CUID)` | Primary Key |
| `name` | `String` | Business name |
| `slug` | `String` | Unique URL-friendly identifier |
| `status` | `RestStatus` | Operational status (PENDING, ACTIVE, etc.) |
| `subscription`| `SubType` | Tier (FREE, BASIC, PREMIUM, ENTERPRISE) |
| `facebookUrl` | `String?` | Social link |
| `metaPixelId` | `String?` | For marketing tracking |

### `Branch`
Specific physical locations of a restaurant.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String (CUID)` | Primary Key |
| `name` | `String` | Branch name |
| `address` | `String` | Physical address |
| `deliveryRadius`| `Float?` | Coverage area in KM |
| `deliveryCharge`| `Decimal?` | Fixed delivery cost |

### `Setting`
Key-value pairs for restaurant-specific configurations (e.g., currency, timezone).

---

## 3. Menu & Category Management
Structures how food items are presented and organized.

### `Category`
Groups related menu items (e.g., "Main Course", "Beverages").

### `MenuItem`
The individual dishes or items for sale.
| Field | Type | Description |
| :--- | :--- | :--- |
| `price` | `Decimal` | Base price |
| `isAvailable` | `Boolean` | Availability toggle |
| `variations` | `Variation[]` | Sizes or versions (e.g., Small, Large) |
| `addons` | `Addon[]` | Optional extras (e.g., Extra Cheese) |

---

## 4. Inventory Management
Tracks ingredients and stock levels across different branches.

### `Ingredient`
Base components (e.g., Flour, Milk, Tomato).

### `Recipe`
Maps `MenuItem` to specific amounts of `Ingredient`.

### `Stock`
Real-time quantity of an ingredient available at a specific `Branch`.

---

## 5. Order Management & POS
Handles the lifecycle of a sale.

### `Order`
| Field | Type | Description |
| :--- | :--- | :--- |
| `status` | `OrderStatus` | Lifecycle: PENDING -> PREPARING -> DELIVERED |
| `type` | `OrderType` | DINE_IN, DELIVERY, or PICKUP |
| `total` | `Decimal` | Final calculated amount |
| `items` | `OrderItem[]` | Snapshot of items bought |

### `OrderItem`
Records the specific quantity and price of an item at the moment of sale.

---

## 6. Payment Management
Tracks financial transactions.

### `Payment`
| Field | Type | Description |
| :--- | :--- | :--- |
| `method` | `PaymentMethod` | STRIPE, PAYPAL, COD, or CASH |
| `status` | `PaymentStatus` | PENDING, PAID, FAILED, REFUNDED |
| `transactionId`| `String?` | Gateway reference ID |

---

## 7. Customer & Marketing
Manages customer relationships and loyalty.

### `Customer`
Stores contact info and tracks **Loyalty Points**.

### `LoyaltyTrx`
Records every point earned or redeemed by a customer.

### `DiscountCode`
Manages promotional codes and expiration logic.

---

## 8. Rider & Notifications
Handles logistics for delivery and system alerts.

### `Rider`
Delivery personnel profiles and their current status (AVAILABLE, BUSY, OFFLINE).

### `Notification`
In-app alerts for users (e.g., "New Order Received").

---

## 9. CMS & Support
Content management for the customer-facing frontend.

### `FaqItem` & `CmsPage`
Manage dynamic content like "Privacy Policy", "About Us", and "Common Questions".

### `Review`
Customer ratings and comments for orders/items.

### `Reservation`
Table booking management for Dine-In customers.

---

## 🗂️ Data Relationships Summary
- **One Restaurant** has **Many Branches**.
- **One User** belongs to **One Restaurant** and has **One Role**.
- **One Category** contains **Many MenuItems**.
- **One MenuItem** can have **Many Variations** and **Addons**.
- **One Order** belongs to **One Branch** and optionally **One Customer**.
- **One Stock** item is unique to a **Branch + Ingredient** combination.

---

