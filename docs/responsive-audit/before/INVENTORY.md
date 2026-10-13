# Responsive baseline inventory

Read-only production inspection; only evidence files written. All tests use separate Playwright contexts and an ephemeral loopback HTTP server. Fictional account, staff and booking-draft preparation is explicitly marked in matrix.json; navigation/actions thereafter use visible UI. Source-hashes.json contains 31 production HTML/CSS/nonvendor JS hashes. No actual user storage touched.

## Pages and existing state seams

- index.html: Home; city search/picker; calendar; login and error; signup step1 and step2; recovery; reset; promotions; help; role-information overlay. js/home.js:42–152 owns markup. Reset and role overlays measured through fixture buttons invoking the existing delegated click handler; no new feature.
- catalog.html: results, sort, search modification, brand dialog, favorites, detail. Unavailable favorites/detail and empty-results branches exist at js/catalog.js:58–60,114,123,165–168 but were not reproduced in this baseline. Individual type/price toggle variants not separately audited here; prior catalog-responsive harness covers them.
- booking.html: unauthorized redirects to index.html?auth=login; policy/quote selection, review, confirmation/QR, no-draft failure. js/booking.js:66,92,105,109. No customer reservation-list or separate reservation-details page exists; confirmation's View reservation button merely scrolls the existing success-car section.
- staff.html/admin: fleet and state; maintenance; vehicle create/edit; rate; policy; agreement; users/roles; role assignment; audit/filter form; reports. js/staff.js:53,63,71,154. Rate revision selector exists but a populated revision fixture was not separately reproduced; daily default form measured.
- staff.html/coordinator: lookup; selected reservation summary; delivery; reassignment; extension; photo evidence; expired-license rejection; successful acta/document. js/staff.js:83,93,154. Photo submitted through native file input; expired/restored license fixture marked. No distinct reassignment-result or extension-result screen; operations rerender same selected reservation surface.

## Matrix

matrix.json records 42 render states each at 1280×832, 768×1024 and 390×844, with geometry and route provenance; all runs have zero runtime errors.

- All stock Home/dialog/catalog/booking/coordinator states pass root-width, horizontal control bounds and text bounds at the three required sizes.
- All stock admin states pass at desktop/tablet. At390, fleet/state/maintenance/create/edit and roles/role-assignment show offscreen table action buttons INSIDE internal table scrollers, not root overflow. Fleet wrapper308px/content506px. Wrappers lack tabindex, accessible name and region role, so this is an undocumented/unlabelled internal-scroll accessibility defect rather than page-layout overflow.
- This is geometric horizontal pass/fail, not an exhaustive functional or pixel-overlap certification. Long-copy, every empty/error outcome and browser zoom are not exhaustively seeded.

## Confirmed mechanisms

1. Home1000×832: root scrollWidth1000 but login beginsx1030.7, signupx1162.9, submitx921→1139. All clipped by .home overflow:hidden. css/home.css:1 sets1280 max-width/832 height; :4 fixes header1280; :25 fixes search1129; :40 flow layout only activates≤900. Root-width-only checking misses this defect.
2. Home1920×1080: .home remains1280 wide, leaving320px gutters each side. No root overflow; product width-availability concern, not clipping. Preserve approved1280 appearance when adjusting fluid layouts.
3. Login baseline is intact, not clipped: desktop440×509.6, tablet440×509.6, phone366×497.6. js/home.js:152 sets width440; css/overlays.css:2 constrains viewport. At390×500 (keyboard-height surrogate), modal366×460, content498, native vertical scrolling exposes submit/footer. Perceived desktop small size is a design-cap issue, not reproduced truncation.
4. Booking css/booking.css:1 deliberately caps head/grid1184, fixed columns704/452 and image300; success cap1000. At tested sizes media rules preserve stock fit. Wider-width fluidization is a design scope decision, not an observed stock overflow at required widths.

## Evidence

- home-1280.png is approved-size invariant baseline.
- home-login-{1280,768,390}.png captures actual index login click.
- home-intermediate-1000-1280.png is actual1000 viewport (suffix names source loop width; matrix viewport is authoritative).
- home-wide-1920-1280.png is actual1920 viewport.
- home-login-shortheight-390.png is390×500.
- booking-selection/confirmed, admin-fleet/reports, coordinator-delivery-form/acta-done screenshots exist at all three required widths.
- inventory.cjs is replayable audit evidence, not production code. It can regenerate baseline artifacts; do not rerun into before/ after production changes unless intentionally replacing baseline.

skill_resolution: paths-injected (investigate-first and cavecrew SKILL.md read before inspection).
