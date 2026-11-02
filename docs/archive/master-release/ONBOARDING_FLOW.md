# 15. INTERACTIVE ONBOARDING FLOW SPECIFICATION

## 1. Onboarding Objective
Enable a new business owner to transition from initial signup to processing operational orders in under three minutes.

---

## 2. Step-by-Step Configuration Steps

### Step 1: Enterprise Profile
- Input: Company Legal Name, Auto-generated Workspace URL Slug, Industry sector, Team head-count.
- Persistence: Generates tenant record in `tenants` table.

### Step 2: Primary Warehouse Setup
- Input: Primary Warehouse Name (e.g., "Kho Tổng Trung Tâm"), Warehouse Code (`WH-HCM-01`), City, Physical Address.
- Persistence: Inserts primary active warehouse in `warehouses` table.

### Step 3: Sales Channel Integration
- Selection: Shopee Mall, TikTok Shop, Lazada Open Platform, POS Retail.
- Persistence: Flags intended channels for sync monitor integration.

### Step 4: Catalog Seeding
- Option: Auto-generate eCommerce sample products (`NEXUS-WATER-PRO`, `NEXUS-TITAN-1L`) with initial stock levels.
- Persistence: Seeds rows in `products` and `inventory_items`.

### Step 5: Team Invitations & RBAC
- Input: Team member emails and role selection (`warehouse`, `manager`, `admin`).
- Persistence: Generates invitations ready for one-click activation.

### Step 6: Activation & Workspace Entry
- Review: Configuration summary card.
- Action: Sets `nexus_active_tenant` in `localStorage` and redirects directly to `/app`.
