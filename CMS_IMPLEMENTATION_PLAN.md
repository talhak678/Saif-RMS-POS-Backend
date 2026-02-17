# CMS Implementation Plan: Dynamic Content Management System

This document outlines the detailed plan to make the website dynamic using a CMS module in the dashboard, as specified in `documentation-cms.md`.

## 1. Backend Architecture (saif-rms-pos-backend)

### Database Schema Update (`prisma/schema.prisma`)
We will add a `WebsiteConfig` model to store the overall structure and visibility of website sections.

```prisma
model WebsiteConfig {
  id           String     @id @default(cuid())
  restaurantId String     @unique @map("restaurant_id")
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  
  // Theme Settings
  backgroundColor String?  @default("#ffffff") @map("background_color")
  primaryColor    String?  @default("#ff0000") @map("primary_color")
  
  // Page Configurations (Stored as JSON for maximum flexibility)
  // Format: { "home": { "sections": { "banner": true, "todaySpecial": false ... } }, "about": { ... } }
  configJson      Json       @map("config_json")
  
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@map("website_configs")
}
```

### API Endpoints
- **GET** `/api/cms/config`: Fetches the configuration for the current restaurant (authenticated).
- **PUT** `/api/cms/config`: Updates the configuration.
- **GET** `/api/cms/config/public/[restaurantSlug]`: Public endpoint for the website to fetch configuration without login.

---

## 2. Dashboard Integration (Saif-RMS-POS-Frontend-Dashboard)

### Sidebar Update
- Add **"CMS & Website"** menu item with sub-items:
  *   **Page Sections**: To manage toggles.
  *   **Promo Banners**: (Existing/New UI).
  *   **FAQs**: (Existing/New UI).

### CMS Management Page (`/app/(admin)/cms/page.tsx`)
- **Tabs Interface**: Home, Our Menu, Shop, Contact Us, About Us, Blogs, Specialties, FAQs.
- **Section Toggles**:
  *   **Required Sections**: Displayed with a locked state (checkbox checked and disabled).
  *   **Optional Sections**: Checkbox/Switch to toggle visibility.
- **Live Preview (Optional)**: A small preview window showing what's enabled.
- **Theme Settings**: Color picker for background and primary branding colors.

---

## 3. Website Integration (Saif-RMS-POS-Website)

### Logic Layer
- **Context/Hook**: Create a `useCmsConfig` hook to fetch and provide configuration globally.
- **Conditional Rendering**: In each page component, wrap sections with checks.

```tsx
// Example in Home.tsx
const { config } = useCmsConfig();

return (
  <>
    <Header /> {/* Required */}
    <Banner /> {/* Required */}
    {config.home.sections.todaysSpecial && <TodaysSpecial />}
    {config.home.sections.customerComments && <Testimonials />}
    <Footer /> {/* Required */}
  </>
);
```

### Style Layer
- Inject the `backgroundColor` and `primaryColor` from the config into the root CSS variables or Styled Components.

---

## 4. Implementation Steps

### Phase 1: Foundation (Backend)
1.  Update Prisma schema and run migrations.
2.  Create the CMS Config controller and routes.
3.  Add default seeding for the first-time setup for any restaurant.

### Phase 2: Interface (Dashboard)
1.  Update `AppSidebar.tsx` to include the CMS menu.
2.  Build the CMS Page with a responsive Tab-based layout.
3.  Implement the JSON state management for the checkboxes.

### Phase 3: Dynamic Website
1.  Add API service to fetch config by restaurant slug.
2.  Refactor `Home.tsx` and other pages to respect the toggles.
3.  Implement theme color injection.

---

## 5. Mapping documentation-cms.md to Fields
Based on your documentation, here is the mapping we will follow for the Toggles:

| Page | Section | Status |
| :--- | :--- | :--- |
| **Home** | Banner, Header, Our Menu, Footer | **Required** |
| | Browse Our Menu, Today's Special, Customer Comments, Copyright Bar | **Optional** |
| **Our Menu** | Menu Gallery, Footer | **Required** |
| | Banner Section, Copyright Bar | **Optional** |
| **About Us** | What we do, Footer | **Required** |
| | Banner, Video, Copyright Bar | **Optional** |
| **FAQs** | Faqs list, Footer | **Required** |
| | Banner section, Search Bar, Copyright Bar | **Optional** |

... and so on for all other pages mentioned.
