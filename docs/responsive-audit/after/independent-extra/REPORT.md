# Responsive verification

64 unique render/interaction states × 3 required viewports = 192 required checks. Additional intermediate/wide, short-height, and approved Home PNG checks are separate below.

Production changed: css/booking.css, css/home.css, css/overlays.css, css/staff.css, js/components/dialog.js, js/staff.js.

Separate browser contexts, fictional account/staff/draft fixtures. Screenshots are exact viewport captures (not full-page); matrix viewport metadata is authoritative. Table cells may extend inside named keyboard-focusable internal scrollers; page/control clipping elsewhere fails. This is geometry/runtime evidence, not full accessibility or business acceptance.

| State | 1280×832 | 768×1024 | 390×844 |
|---|---|---|---|
| home | passed | passed | passed |
| home-login | passed | passed | passed |
| home-location | passed | passed | passed |
| home-calendar | passed | passed | passed |
| home-register | passed | passed | passed |
| home-promotions | passed | passed | passed |
| home-help | passed | passed | passed |
| home-recover | passed | passed | passed |
| home-role | passed | passed | passed |
| home-reset | passed | passed | passed |
| home-login-error | passed | passed | passed |
| home-recovery-error | passed | passed | passed |
| home-reset-error | passed | passed | passed |
| home-register-details | passed | passed | passed |
| home-city-empty | passed | passed | passed |
| home-city-filter-keyboard | passed | passed | passed |
| home-city-selected | passed | passed | passed |
| home-calendar-next-month | passed | passed | passed |
| home-calendar-error | passed | passed | passed |
| home-register-error | passed | passed | passed |
| catalog-results | passed | passed | passed |
| catalog-sort | passed | passed | passed |
| catalog-search | passed | passed | passed |
| catalog-brand | passed | passed | passed |
| catalog-favorites | passed | passed | passed |
| catalog-detail | passed | passed | passed |
| catalog-unavailable-favorite | passed | passed | passed |
| catalog-unavailable-detail | passed | passed | passed |
| catalog-empty | passed | passed | passed |
| booking-unauthorized | passed | passed | passed |
| booking-selection | passed | passed | passed |
| booking-review | passed | passed | passed |
| booking-confirmed | passed | passed | passed |
| booking-confirmed-qr | passed | passed | passed |
| booking-view-reservation | passed | passed | passed |
| booking-no-draft | passed | passed | passed |
| home-long-profile | passed | passed | passed |
| catalog-long-name | passed | passed | passed |
| catalog-long-detail | passed | passed | passed |
| booking-long-profile-and-vehicle | passed | passed | passed |
| admin-fleet | passed | passed | passed |
| admin-fleet-state-form | passed | passed | passed |
| admin-maintenance-form | passed | passed | passed |
| admin-vehicle-form | passed | passed | passed |
| admin-vehicle-edit | passed | passed | passed |
| admin-rate-form | passed | passed | passed |
| admin-kilometre-rate | passed | passed | passed |
| admin-rate-published | passed | passed | passed |
| admin-rate-revision | passed | passed | passed |
| admin-policy-form | passed | passed | passed |
| admin-agreement-form | passed | passed | passed |
| admin-roles-audit | passed | passed | passed |
| admin-role-assignment | passed | passed | passed |
| admin-reports | passed | passed | passed |
| coordinator-lookup | passed | passed | passed |
| coordinator-reservation | passed | passed | passed |
| coordinator-delivery-form | passed | passed | passed |
| coordinator-reassign-form | passed | passed | passed |
| coordinator-extend-form | passed | passed | passed |
| coordinator-reassign-result | passed | passed | passed |
| coordinator-extend-result | passed | passed | passed |
| coordinator-evidence | passed | passed | passed |
| coordinator-license-error | passed | passed | passed |
| coordinator-acta-done | passed | passed | passed |

## Additional checks

- Approved Home 1280 exact PNG-byte comparison: passed
- home-intermediate-1000 1000×832: passed
- home-wide-1920 1920×1080: passed
- home-login-shortheight 390×500: passed
- home-login-shortheight-submit-scrolled 390×500: passed

## Limits

- Modal checks scroll each visible enabled control into reach and verify Tab/Shift+Tab wrap; filtered city additionally checks Escape return to the actual opener.
- Short-height 390×500 uses native dialog scrolling; no full mobile virtual-keyboard claim.
- No new customer reservation page exists: View reservation scrolls the confirmation surface.
- No native review receipt: existing unborn Git HEAD blocks that tool. No commit or bypass.
- Further visual acceptance, all browser engines, zoom, screen reader testing, and real backend workflows are not certified.