# Light Incident Modal

## Objective
Align the incident-reporting sheet and its nested plate-verification UI with the light Alerta Dealers interface without changing behavior.

## Problem and why
The application shell uses a light canvas, while the incident modal and plate badge introduce a separate dark visual system. On mobile the sheet occupies most of the viewport and reads as a different application.

## Authorized scope
- `src/components/IncidentReportForm.tsx`: sheet, form controls, nested location-picker chrome, and neutral surfaces.
- `src/components/PlateVerificationBadge.tsx`: neutral/loading/result surfaces used inside the incident flow.
- Focused rendered regression tests using the real components.
- A small literal shared class map only if it reduces duplication without dynamic Tailwind fragments.

## Out of scope
- Other mapped modals, including FlashReport, RoadTestForm, InspectionForm, StockAutomotoras, ExecutiveDigestModal, CommandPalette, Dashboard details, and AdminAccessRequests.
- AlertConfirmationModal and PlateCameraCapture remain deliberate dark exceptions.
- Global theme inversion, Dashboard/feed/nav restyling, behavior/copy/schema changes, dependency installation, pushes, PRs, and production deployment.

## Constraints and checks
- Strict TDD: enabled by project/session configuration. Every production change requires observed assertion RED before implementation, then GREEN.
- Runner: `node --test tests/light-modals.render.test.cjs`; focused tests may use `--test-name-pattern`.
- Use real component markup. Shim only browser-only external boundaries where unavoidable; never mock the component under test.
- Preserve handlers, draft/close behavior, alert tones, Spanish copy, accessibility labels, target sizes, and dark controls placed over photos/camera imagery.
- Independent gates: rendered tests, `npm run lint`, `npm run build`, and mobile/desktop browser evidence. A pass in one does not prove another.
- Local HDD can make lint/build slow; report timeouts honestly and do not claim production verification.

## Route and delivery
- Route: delegated direct. Evidence: exploration required 4+ files and implementation touches 2+ non-trivial files; one writer owns implementation.
- Branch: `feat/light-incident-modal`; branch point and initial reviewed boundary: `69ac6a7`.
- RDD: on (global). Assess every work-unit commit and follow native transitions when due.
- Forecast: approximately 300-380 authored changed lines. This is advisory, not a cap. Delivery strategy: `ask-on-risk`; stop before commit for a chain decision if the forecast is exceeded.
- No push, PR, merge, or production deploy is authorized in this block.

## Checklist
- [x] T00 — Map reachable internal modals, choose the bounded incident scope and deliberate dark exceptions. Route: delegated exploration. Evidence: delegation `deleg_5651eec1`; initial tracking commit pending.
- [ ] T01 — Add the focused rendered harness and migrate IncidentReportForm through observed RED to GREEN. Route: delegated writer. Verification: focused test, then full rendered test. Commit evidence pending.
- [ ] T02 — Migrate PlateVerificationBadge through its own observed RED to GREEN and preserve semantic result tones. Route: same delegated writer. Verification: focused test, then full rendered test. Commit evidence pending.
- [ ] T03 — Run all applicable checks and verify mobile/desktop presentation without submitting data. Record any unavailable authenticated browser checks explicitly. Route: delegated verification as needed. Commit evidence pending.

## Acceptance criteria
- The incident sheet, inputs, and nested neutral panels use coherent light surfaces and readable light-theme text.
- Plate lookup states remain distinguishable: stolen red, unknown amber, clear emerald, and manual actions accessible.
- Existing behavior and dark camera/emergency exceptions remain unchanged.
- Tests show observed RED before each production edit and GREEN afterward; final check results are recorded separately.

## Progress and evidence
- 2026-10-25: clean `main` at `69ac6a7`; branch created. Exploration found ten candidate UI files for the broader theme, deliberately reduced to this incident slice.
- Next step: T01 delegated writer.
