# RentaDrive — local demonstration journey

HTML5, CSS3 and vanilla JavaScript ES modules. The approved Home composition is retained. This is a **fictional, browser-local prototype** of the seven formal use cases in `Entrega 1.pdf`, not a production rental service. No use-case text was changed.

## Consolidated manual-review round

Favorites, shared current-profile/logout, action-specific staff forms, local media previews, source-linked tariff revisions, 10-row audit pages and the inspected reports screen are now available. **No visual approval or full business coverage is claimed.**

### Review the changes

1. Mark a catalog heart, open the header heart, then reload. Favorites reuse the catalog layout and selected marker; saved cars unavailable for the current city/period stay visible with reservation disabled. Toggle the header heart to return to all results; remove a saved heart to persist its removal.
2. Register only with an invented `@example.invalid` or `@rentadrive.invalid` email. Public registration remains client-only. Home, catalog, booking and staff show the current local profile and offer logout; this is not global authentication.
3. In staff, choose one action at a time. Switching the selector keeps entered values in the mounted forms. Select a fleet row, choose **Registrar / editar ficha**, then **Editar seleccionada** to prefill it. Daily tariffs hide kilometre inputs; kilometre calculation, license mapping and official transitions remain unimplemented.
4. Pick an optional PNG/JPEG/WebP image (≤2 MiB) or WebM/MP4 video (≤20 MiB) in the master editor. Previews use document-session object URLs through the centralized media seam, never LocalStorage. **Reload or navigation ends that preview session** and restores the original packaged paths; this tradeoff avoids invalid stored blob URLs and adds no server upload. Type/size validation is not file-content/security scanning.
5. Choose a published tariff in **Tarifa a editar**. Its values and validity dates prefill the form. Saving appends a new source-linked revision, preserving the old record. New quotes use effective revisions; an explicitly reviewed quote and existing reservation keep their monetary snapshot. Confirmation still rechecks vehicle availability. To change a reviewed choice, use **Cambiar póliza o moneda** and review again.
6. In **Roles y bitácora**, previous/next show at most ten events. Filtering resets and clamps the page; an empty explanatory row is not counted as an event.
7. In admin **Reportes**, inspect the fixed September 2026 Figma fixture: income, fleet mix, ratings and incidents. It is not operational analytics. Month changes, quarter/year and PDF export are disabled rather than reporting unsupported success. Chart labels and a revenue data table provide non-visual equivalents.

### Evidence and boundaries

- `node --test tests/*.test.mjs`: **27 passing tests**, including unauthorized master/config/delivery APIs, source-linked history, old/new quote and immutable reservation snapshots, legacy QR lookup, media validation and durable fallback.
- `node tests/browser-smoke.cjs`: public/staff CU journey plus favorites persist/remove/unavailable, shared session, action retention, valid/invalid file previews and reload fallback, tariff edit/preserved reviewed quote, >20 actual journey audit events with ten-row pagination, exact QR **PNG pixel decoding** before/after reload, and desktop/mobile overflow and staff navigation Tab-focus geometry checks (including Roles and Reports), without a horizontal navigation scroller.
- Screenshots: `docs/review/{favorites,reports,vehicle-form}-{desktop,mobile}.png`. They are review evidence, not pixel-diff approval. Webcam/phone scans, a complete keyboard/accessibility review and formal CU acceptance remain outside this automated proof.
- Inspected Figma references: [Favorites 157:825](https://www.figma.com/design/usu9taezeE0V2N1lT00Mep?node-id=157-825), [Reports 212:1495](https://www.figma.com/design/usu9taezeE0V2N1lT00Mep?node-id=212-1495), [Dashboard 233:1304](https://www.figma.com/design/usu9taezeE0V2N1lT00Mep?node-id=233-1304). No source Figma frame was edited in this round; responsive layouts are implementation adaptations.
- Rollback boundary: remove the manual-round session/report/media components, reviewed-quote/revision handling, favorites navigation, action/pagination wiring, their CSS/HTML hooks, corresponding tests and review screenshots together. Keep pre-existing CU services and packaged assets; do not revert user storage or the approved Home composition.

## Seven-use-case review path

| CU | Browser path | Evidence and unresolved rule |
| --- | --- | --- |
| CU-001 | Home → register/login/recovery | Public registration creates clients only; recovery is local and not emailed. |
| CU-002 | Home/catalog → policy → quote → confirm → QR | Confirmed reservation persists locally; QR is scannable; advance is pending, not paid. |
| CU-003 | Coordinator login → `staff.html` → Entregas → QR/code/document → evidence → simulated acta | Automatic expiry block, manual category check pending official mapping; simulated signature, anticipo and copy. Reassignment only when quote is unchanged; extension uses demo 24-hour-block pricing. |
| CU-006 | Catalog → city/date/hour, gama/cost/brand → detail/video | Reads fleet state and confirmed reservation overlap for `[inicio, fin)`; cost range expands to current published demo prices, including values above COP 500,000; local inventory only. |
| CU-007 | Admin login → `staff.html` → Vehículos y estados / Tarifas y convenios | Publishes validated demo vehicle/rate/policy/agreement records; current daily rates/policies affect new quotes, old reservation snapshots stay unchanged. Kilometre modality and agreement identity need approved rules before automatic application. |
| CU-008 | Admin → Vehículos y estados → reason/state/maintenance | Public catalog updates from local fleet state; contingency is excluded. Official transition graph and authorization for assigning contingency are not specified, so assignment is not offered. |
| CU-014 | Admin → Roles y bitácora → allowed role / audit filter | Three RN-004 roles only; audit is read-only in UI, not immutable in LocalStorage. |

These are **demonstration paths, not approval or full formal coverage**. Missing category mapping, transition policy, kilometre-price formula, agreement identification, anticipo terms, real signing and external delivery prevent asserting some formal guarantees. They require approved rules and production services; no rule was invented silently.

## Run and review

1. Serve this directory with a static HTTP server (for example, VS Code Live Server) and open `index.html`. ES modules are not supported through `file://`.
2. Select a city and **future** dates on Home. Its calendar now opens at the next available dates and can move between months; its appearance/layout is otherwise preserved. Previously selected future dates survive in the browser session. The catalog's **Modificar búsqueda** dialog also lets you select explicit start/end hours (default 10:00).
3. Register a **client** with invented RF-001 information only. Example: `Cliente Ficticia`, `cliente@example.invalid`, document `DEMO-1001`, license `LIC-DEMO-1`, category `B1`, expiry next year, and two invented phone numbers. Use a unique **fictional** password of at least eight characters. Do not enter a real identity, address, phone, email or password.
4. Log in with that client account. Search in Medellín, choose an available vehicle, select a policy and currency, review the demo quote, and confirm once. The resulting QR encodes exactly the visible `RD-XXXXXXXX` reservation code and can be scanned; the reservation persists in this browser's LocalStorage.
5. Inspect the confirmation: **total quoted, not paid**, advance/deposit pending until delivery, and email/SMS **simulated, not sent**. Repeat the confirmation/reload to see the same reservation rather than a duplicate. Search an overlapping period to see that vehicle excluded; a new period may start exactly at the earlier period's end.

The three original Figma example vehicles remain in Medellín. Additional fictitious vehicles demonstrate Bogotá, Cali and Cartagena. Maintenance and contingency fixtures are excluded from public results. There is no live inventory.

## Accounts and recovery

Public signup always creates a `client`; it never offers a role selector. Coordinator/admin fixtures are prepared **only through a developer/test action outside the public UI**. In the browser DevTools console on this local static prototype, run `console.table(await (await import('./js/services/auth.js')).prepareDemoStaff())`. Copy the generated random passwords **once**; running the command again replaces those fixture credentials. Never run this on a public deployment. These accounts open `staff.html` after local login and cannot reserve as clients. Passwords are stored as salted PBKDF2-SHA-256 hashes, not plaintext. This is **local demonstration authentication**, not production-grade identity or authorization.

## Staff demonstration and fictional media

1. Log in as `administrador@rentadrive.invalid` and use `staff.html` to mark a vehicle **Contingencia** with a reason. In `catalog.html`, it disappears; return it to **Disponible** to restore it. Opening/closing fictitious maintenance also controls the transition. Confirmed future reservations block removing a unit.
2. Publish a fictional daily rate or policy with valid dates. A new quote uses it; an already confirmed reservation retains its quote snapshot. Create or edit a fictional vehicle using packaged image/video paths; optional local files preview during the current page only. Reload/navigation restores packaged assets. No server upload or live TRM exists.
3. In **Roles y bitácora**, assign only client/coordinator/admin to a fictional account, then filter the audit table. Critical events have no delete button; browser storage is still mutable outside the interface.
4. With a confirmed fictional client reservation, log in as `coordinador@rentadrive.invalid` and search by decoded QR payload, reservation code or invented document. Supply invented kilometer/fuel values, up to two small test photos, a manually checked license category, simulated signer and fictional advance amount. The local acta can be downloaded as text; no legally valid signature, payment or email occurs.

Three local `.webm` demonstration clips were generated from the existing fictional car photographs and are labeled as fictitious in catalog detail. They are **not** Figma originals or real footage.

**Recuperación simulada** creates a 15-minute one-use link shown on screen in the same browser. It does not send email; anyone with local browser access can use it. No real personal data or password should be entered. To reset the entire demo, clear this site's LocalStorage and SessionStorage.

## Demonstration calculation and availability

| Topic | Prototype behavior |
| --- | --- |
| Period | Local date/time strings `YYYY-MM-DDTHH:mm`; **[start, end)**, so the end instant is excluded. Overlap means `a.start < b.end && b.start < a.end`. |
| Availability | Recomputed from fictional fleet location/state and confirmed reservations for that period. Draft selections do not occupy inventory. Confirmation reads reservations again and checks availability. |
| Pricing | **Fictional**, started 24-hour blocks: exactly 24 h = one block; any additional fraction starts another. Daily vehicle examples: Hilux COP 200,000; CX-5 COP 180,000; Sandero COP 80,000. |
| Policies | Fictional daily prices: basic COP 25,000 (mandatory minimum), intermediate COP 45,000, premium COP 70,000. The intermediate third-party limit and premium coverage wording follow RN-008, but contract details remain undefined. |
| Conversion | **Demonstration rates only:** 1 USD = COP 4,000; 1 EUR = COP 4,400. Not current TRM. An admin may publish a fictional corporate agreement, but its discount is not applied without an approved client-company binding. The Home promotions overlay is explicitly illustrative, not an active offer. |
| Payment | No real payment or deposit collection. The advance remains pending before delivery per RF-013/RN-016; at simulated delivery, a fictional amount may be recorded as **not collected**. |
| Communications | Confirmation and recovery are local previews; no email or SMS is actually sent. |

LocalStorage is centralized through `js/core/storage.js`, but it is **not transactional**. Immediate revalidation, request IDs and collision-checked public codes reduce duplicate confirmations in one browser; simultaneous tabs can still race, and different devices do not share availability. No global, real-time or production safety guarantee is made. A local demonstration audit records operations by fictitious account ID; it is not tamper-proof. Browser-local data can be modified or erased by the user. Actual multi-user booking, secure authentication, real delivery/payment/signature, live tariffs/TRM, notifications and category-to-vehicle license validation require a backend and additional approved rules.

## Automated checks

Run `node --test tests/*.test.mjs`. Coverage includes the first journey plus staff service paths, forbidden roles, configuration validity/expiry, fleet-state/maintenance linkage, vehicle-ID conflict protection, QR/code/document lookup, reassignment/extension, license-expiry block, evidence and single delivery. Run `node tests/browser-smoke.cjs` for a headless Chrome **1280 × 832** journey: admin vehicle/state/maintenance open–close/rate/policy/agreement UI → public registration/login → city/period/gama/brand/cost filters → detail → published rate and policy in a new quote → reservation/QR → admin role/audit UI → coordinator QR lookup/photo/acta with a fictitious COP 50,000 advance. The browser checks that maintenance excludes the vehicle until closed and released, and that a published agreement is listed but does not apply without approved client-company binding. Validity/expiry is verified by service tests, not by time travel through the UI. Staff fixture preparation remains a developer-only action; no account or reservation is seeded by services in that browser journey. Run `node --check` for all non-vendor JavaScript files. The browser test decodes a PNG generated from the actual confirmation canvas into image pixels using the test-only MIT `@nuintun/qrcode` 5.0.3 decoder (with 0BSD `tslib` 2.8.1), before and after reload, and compares its payload to the visible code. These vendored test dependencies and licenses are under `tests/vendor/`; application pages never import them. A nonempty canvas alone is not scan evidence.

The browser smoke checks page errors and horizontal overflow at 1280 × 832 and 390 × 844, but is **not** a pixel comparison with Figma or a complete keyboard/focus/accessibility pass. These and the user's acceptance review remain pending. **Do not mark any CU approved solely because its screen exists.** Home composition was retained through scoped changes; previous user approval does not extend automatically to the calendar/session changes or this manual-review round, and no immutable historical baseline is claimed. The responsive staff layout is an implementation adaptation, not a separately approved Figma design.

## Scope and files

- Original Figma frames remain intact. This frontend reuses their visual language; the copied/adapted Figma frames and links are delivered separately.
- Existing Home `171:1157`, catalog `146:319`, detail `156:819`/`156:898`/`156:977`, registration `173:1203` + `441:1578`, login `173:1182`, recovery `441:1637`, booking review `182:1157`, and confirmation `182:1205` inform this block.
- Manual-review round: `js/components/{session,reports}.js`, `js/core/media.js`, `js/{home,catalog,booking,staff}.js`, `js/services/{fleet,configuration,reservations,delivery}.js`, `css/{base,catalog,staff}.css`, `index.html`, `catalog.html`, `booking.html`, `staff.html`, `tests/review-corrections.test.mjs`, `tests/browser-smoke.cjs`, `tests/{catalog-interactions,journey}.test.mjs`, `tests/vendor/`, and `docs/review/`.
- Review infrastructure limitation: native Git review could not start because this repository has no `HEAD` (unborn history); no commit or receipt was created and no bypass was attempted. Passing runtime tests are separate evidence, not a native review receipt.
- First journey: `booking.html`, `css/booking.css`, `js/booking.js`, `js/services/{audit,auth,availability,demo-data,periods,quote,reservations}.js`, `js/vendor/qrcode.js`, `tests/journey.test.mjs`.
- Remaining use cases: `staff.html`, `css/staff.css`, `js/staff.js`, `js/services/{fleet,configuration,delivery}.js`, `tests/remaining-cases.test.mjs`, `tests/browser-smoke.cjs`, `tests/generate-demo-video.cjs`, `assets/catalog/*-demo.webm`; updates to Home login routing, catalog/detail, booking and shared services.
- Out of scope: cancellation, return/devolución, production payment, live communications, real TRM, globally shared inventory, and any Entregable 2 architecture artifacts. No use-case document was modified and no commit was created.

The vendor QR generator is copyright Kazuhiko Arase, MIT licensed (license header retained in `js/vendor/qrcode.js`).




## Responsive verification

Home now flows at intermediate widths and uses wider screens without page scaling; its approved 1280 × 832 screenshot remains byte-identical to the captured baseline. Only login receives the larger 560px desktop/tablet cap. Booking uses additional width above 1280; existing catalog layout remains unchanged. Staff tables deliberately keep readable columns inside named, keyboard-focusable horizontal scroll regions with a visible overflow cue. Filtered city options no longer break the shared dialog focus boundary.

| Evidence | Result |
|---|---|
| [State matrix and limits](docs/responsive-audit/after/REPORT.md) | 64 states × 1280 × 832, 768 × 1024, 390 × 844: 192 passed; 5 additional checks passed; no runtime errors |
| [Machine-readable geometry](docs/responsive-audit/after/matrix.json) | Root/control/text bounds, ancestor clipping, modal control reachability and Tab/Shift+Tab boundaries |
| [Before inventory](docs/responsive-audit/before/INVENTORY.md) | Baseline retained; source hashes and approved-size Home image preserved |
| Existing gates | 27 unit tests; browser smoke/decoded QR; catalog responsiveness; non-vendor JavaScript syntax: passed |

Reproduce with `node tests/responsive-all.cjs`; it writes **only after evidence**, uses isolated fictional browser fixtures, and never touches actual user browser storage. Run the existing checks in Automated checks above for functional regression evidence. Images in `docs/responsive-audit/after/` are exact viewport captures; `home-invariant-1280.png` alone is the matching full-page PNG used for baseline comparison.

Production files changed in this responsive round: `css/home.css`, `css/overlays.css`, `css/booking.css`, `css/staff.css`, `js/staff.js`, `js/components/dialog.js`. Added `tests/responsive-all.cjs` and `docs/responsive-audit/after/`; this README documents evidence. No business rules, storage model, Figma files, or use-case documents changed. No customer reservation-list page exists: the confirmation action scrolls the existing reservation summary. This is not full accessibility, browser-engine, zoom, or business acceptance certification; native Git review remains blocked by unborn HEAD, with no commit, receipt, or bypass.
