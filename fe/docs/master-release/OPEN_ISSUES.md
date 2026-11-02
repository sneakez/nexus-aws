# 21. OPEN ISSUES & FUTURE ROADMAP (V5.1 / V6)

## 1. Non-Blocking Technical Debt & Backlog Items

### 1.1 Direct Marketplace Open API Connectors (V5.1)
- **Status:** Architecture ready; currently relies on webhook ingestion and manual API credentials in `ChannelConnectionsPage`.
- **Target:** Implement OAuth 2.0 direct authorization callbacks for Shopee Open Platform and TikTok Shop Partner Center.

### 1.2 Hardware Barcode Scanner USB-HID Listeners (V5.1)
- **Status:** Functional via standard focused keyboard inputs in scan-to-pack.
- **Target:** Add global hardware scanner event listener capturing raw keystroke bursts regardless of active DOM input focus.

### 1.3 Offline PWA Mode for Warehouse Picking (V6)
- **Status:** Operates in browser online mode.
- **Target:** Service worker caching and IndexedDB queueing for continuous warehouse operation during transient WiFi dropouts.

---

## 2. Operational Recommendations
- Continue enforcing automated test execution in CI/CD pipeline (`.github/workflows/ci.yml`).
- Regularly execute `verify_inventory_consistency` via automated Supabase pg_cron jobs nightly.
