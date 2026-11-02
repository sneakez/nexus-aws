# 20. MASTER IMPLEMENTATION CHANGELOG — V3 TO V5

## Version 5.0.0-release (Current Release)
- **Public SaaS Marketing Website:**
  - Added modern responsive landing page (`LandingPage.tsx`) with Enterprise Hero, interactive architecture flow, value pillars, and FAQ.
  - Added dedicated solution pages for D2C brands, retail chains, and 3PL fulfillment hubs (`SolutionsPage.tsx`).
  - Added in-depth feature breakdown pages (`OrdersFeaturePage.tsx`, `InventoryFeaturePage.tsx`, `FulfillmentFeaturePage.tsx`, `FinanceFeaturePage.tsx`).
  - Added transparent tiered pricing plans (`PricingPage.tsx`).
  - Added company mission and astrological foundation page (`AboutPage.tsx`).
  - Added technical consultation request form (`ContactPage.tsx`).
  - Added standalone in-memory interactive sandbox (`DemoSandboxPage.tsx`) with Flash Sale simulation and zero database mutation.
- **Brand Identity & Astrological Theme (Tử Vi - Tuyền Trung Thủy):**
  - Updated Tailwind palette with Deep Ocean (`#081B2C`), Midnight Blue (`#123A52`), Ocean Teal (`#1E647F`), Cerulean (`#2D82B7`), Silver Mist (`#D9E3E8`), Pearl White (`#F4F8FA`), and Jade Aqua (`#27B4A0`).
  - Integrated custom glassmorphism, animations, and high-contrast buttons in `src/index.css`.
- **Authentication & Onboarding Lifecycle:**
  - Expanded auth pages: Register (`RegisterPage.tsx`), Forgot Password (`ForgotPasswordPage.tsx`), Reset Password (`ResetPasswordPage.tsx`), Verify Email (`VerifyEmailPage.tsx`), Accept Invite (`AcceptInvitePage.tsx`).
  - Implemented 6-step interactive onboarding wizard (`OnboardingWizard.tsx`).
- **Operational Hardening:**
  - Added in-app inventory consistency verification tool in `InventoryPage.tsx`.
  - Upgraded `AuthProvider.tsx` with signup, password reset, and organization creation methods.
- **Testing & Verification:**
  - Expanded Vitest automated test suite from 34 tests to 48 passing tests across 10 test files.
  - 100% clean TypeScript compilation (`tsc --noEmit`) and zero ESLint errors/warnings.

---

## Version 4.1.0 (Commit c8eca74)
- Removed all unsafe client-side fallback mutation loops in `OrderFormModal.tsx`, `OrderDetailDrawer.tsx`, and `LedgerPage.tsx`.
- Enforced strict `tenant_id` scoping across queries and mutations in `OrdersPage`, `CustomersPage`, `ProductsPage`, and `InventoryPage`.
- Added key-based state reset in `App.tsx` keyed by active tenant ID.
- Protected final owner from demotion or suspension via migration `20261028090000_v4_1_security_rbac_inventory_hardening.sql`.
- Added check constraint `products_stock_non_negative` and RPC `verify_inventory_consistency`.

---

## Version 4.0.0 (Commit 39a5a58)
- Resolved blank screen startup error by configuring `.env` with Supabase credentials.
- Created migration `20261028080000_v4_p0_multitenant_transactions_and_security.sql`:
  - Dropped static default UUID across 25+ business tables.
  - Implemented atomic server-side RPCs (`place_order_atomic`, `cancel_order_atomic`, `delete_order_atomic`, `post_journal_entry_atomic`).
  - Revoked `UPDATE` and `DELETE` on `audit_logs`.
  - Added unique index on `orders(tenant_id, idempotency_key)`.
