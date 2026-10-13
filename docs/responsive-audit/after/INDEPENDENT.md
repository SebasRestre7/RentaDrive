# Independent responsive reliability audit

## Result

PASS for the requested measured responsive surfaces; no introduced blocker found. This is an independent read-only product audit, not a native review receipt or full business/accessibility certification.

## Checks actually executed

- `node tests/responsive-all.cjs`: **64 distinct named states x 3 exact viewports = 192 required checks**, plus **5 additional checks**, all passed. Required viewports: 1280x832, 768x1024, 390x844. Extras: Home1000x832, Home1920x1080, login390x500 before/after native submit scrolling, exact approved Home1280 PNG comparison.
- Evidence-only supplemental replay: the same 197 measured checks passed again. `independent-extra/matrix.json` adds control/control overlap diagnostics, horizontal control containment inside owning panels, image/canvas dimensions and fit, table keyboard scrolling, and console/network diagnostics. No production files changed by this verifier.
- `node --test tests/*.test.mjs`: **27 passed, 0 failed**.
- `node tests/browser-smoke.cjs`: passed public/staff journey, actual QR PNG decode before/after reload, configuration and fleet state, favorites, sessions, local media, tariff revision/snapshot, roles/audit/report checks; no page errors.
- `node tests/catalog-responsive.cjs`: passed geometry, text/control containment, aspect-preserving vehicle images, filters/brand/sort/search, favorites and detail at 1280x832,390x844,1920x1080.

## Independent observations

- All four HTML entrypoints exercised. All ten Home overlay types exercised including register-details; role/reset use explicitly identified fixture buttons routed through the existing overlay handler. Login/register/location/calendar/promotions/help/recover use visible controls. Account/staff/reservation seed data is fictional and isolated in new browser contexts; subsequent interactions are visible UI except documented seed transitions.
- Admin fleet/config/roles/reports tabs and coordinator delivery/actions were measured at all three viewports, including768 tablet. No page-horizontal overflow, no uncontrolled control bounds, no overflow-hidden ancestor control clipping, no measured text overflow, and no owning-panel horizontal control cuts in the supplemental replay.
- Login actual index opener measures560px at1280 and768,366px at390. At390x500 its own native vertical scrollbar exposes every enabled control; Tab/Shift+Tab wrap and filtered-city Escape return to the real location opener passed at all three widths.
- Mobile fleet scroller:308px region with506px table; focusing it and pressing ArrowRight reaches scrollLeft198 (maximum). Every previously offscreen Select action then lies inside the region. Roles table reaches140px and audit table228px maximum. Focus remains on each named region with a solid visible focus outline; cue is visible whenever overflow exists. No columns hidden by responsive CSS. Tablet tables fit without a horizontal exception.
- No accidental visible control/control overlap in changed owning surfaces. Diagnostic overlaps are intentional existing catalog dual-range inputs (css/catalog.css25-29) and the existing raised sort popover over background card controls (css/catalog.css47-49); catalog production hashes are unchanged.
- Vehicle raster images use contain/cover and were visually reviewed. QR canvas is185x185 CSS pixels at all three widths with145x145 source pixels: ratio1 preserved. No broken image observed. Existing decorative SVG icons can have explicit square boxes; rotated Home arrow bounding box is not an intrinsic-ratio test. Those are not newly introduced image regressions.
- Supplemental replay: zero page errors, zero failed fetch/request events, zero HTTP response failures seen by the page observer; one Chromium console404 occurred. A separate fresh browser/server check proves it is **only /favicon.ico**, with console source URL and server request in `independent-resource-check.json`.
-21 representative viewport screenshots reviewed in `independent-contact-sheet.jpg`: Home, login, registration details, catalog detail, booking QR, staff reports, delivery form at each required width. Tall mobile surfaces use native document/dialog scrolling; a viewport screenshot showing only their upper/lower section is not content truncation.

## Scope and provenance

Comparing every baseline non-vendor production HTML/CSS/JS hash against the fresh current-source manifest gives exactly six changed paths:

- css/home.css
- css/overlays.css
- css/booking.css
- css/staff.css
- js/components/dialog.js
- js/staff.js

All catalog production and business-service code hashes match baseline. Home approved1280 before PNG and current full-page PNG are byte-identical, SHA256 `6297287c265fa0d0db8275fb396bf61d1c5025f48d4c82f156b56350264557a2`.

This verifier never ran the baseline generator and never wrote to before/. Baseline predates this verifier; its original-capture authenticity comes from the parent/baseline author provenance, not a reconstructed pre-change Git commit. Git is unborn, so no commit-based source comparison/native receipt is available. Parent reported one failed native start due to missing HEAD; this auditor did not start another native budget or certify a receipt.

## Coverage boundaries

The192 count is named render/interaction states, not every possible validation/result combination. Recovery success/reset success, successful public signup through every field, every help/pending notice combination, arbitrary long policy/agreement/maintenance text, native virtual keyboard, browser zoom, other engines, screen readers and real backend workflows are not exhaustively measured. All existing dialog TYPE surfaces are covered; same-surface outcome coverage is representative. There is no separate customer reservation listing/details page to certify: View reservation scrolls existing confirmation content.

Production unchanged by auditor. No commit/push/PR, no new native budget, no source fixes.

skill_resolution: paths-injected (verify-and-stop and investigate-first read before work).
