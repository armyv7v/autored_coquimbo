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
- Forecast/running count: 394 authored changed lines after T02. The advisory delivery threshold is exceeded; `ask-on-risk` was resolved by the user to chained delivery with `chain_strategy: feature-branch-chain`. This choice does not authorize push, PR creation, or deployment.
- No push, PR, merge, or production deploy is authorized in this block.

## Checklist
- [x] T00 — Map reachable internal modals, choose the bounded incident scope and deliberate dark exceptions. Route: delegated exploration. Evidence: delegation `deleg_5651eec1`; tracking commit `df42055`.
- [x] T01 — Add the focused rendered harness and migrate IncidentReportForm through observed RED to GREEN. Route: delegated writer. Verification: real-markup smoke passed; focused RED failed on missing `bg-white` with the sheet still at `bg-slate-950`; focused GREEN 2/2; full rendered GREEN 2/2; `git diff --check` passed. Commit evidence: `ea1855a`.
- [x] T02 — Migrate PlateVerificationBadge through its own observed RED to GREEN and preserve semantic result tones. Route: same delegated writer. Verification: focused RED failed on the dark manual `bg-slate-900` and stolen `bg-red-950/70` surfaces; focused GREEN 2/2; full rendered GREEN 4/4; `git diff --check` passed. Commit evidence: `e40e7e9`.
- [x] T02C — Correct the independent-review hover and contrast findings in one scoped correction. Route: delegated correction. Verification: browser computed-style RED/GREEN, four focused rendered RED/GREEN cycles, full rendered 8/8, lint, build, responsive geometry/internal-scroll gates, and diff check. Commit evidence pending.
- [ ] T03 — Run all applicable checks and verify mobile/desktop presentation without submitting data. Route: independent verifier `deleg_c56e2444` returned partial pending T02C; final recheck and commit evidence pending.

## Acceptance criteria
- The incident sheet, inputs, and nested neutral panels use coherent light surfaces and readable light-theme text.
- Plate lookup states remain distinguishable: stolen red, unknown amber, clear emerald, and manual actions accessible.
- Existing behavior and dark camera/emergency exceptions remain unchanged.
- Tests show observed RED before each production edit and GREEN afterward; final check results are recorded separately.

## Progress and evidence
- 2026-10-25: clean `main` at `69ac6a7`; branch created. Exploration found ten candidate UI files for the broader theme, deliberately reduced to this incident slice.
- T00 RDD: assessment reported high/unassessable for `df42055`; preflight STATUS returned `immutable_review_transport_unsupported`. No receipt was produced. Continue with high-tier writer self-verification plus an independent verifier; the reviewed boundary remains `69ac6a7`.
- T01 writer: the initial focused run rendered the real sheet and then failed only the light-surface assertion (`bg-white` absent; `bg-slate-950` present). The corrected focused and full rendered runs each passed 2/2 tests; the final whitespace check passed. T01 commit: `ea1855a`.
- T02 writer: both focused assertions failed on the current dark surfaces before the badge edit, then passed 2/2 afterward; the full rendered suite passed 4/4. `npm run lint` passed (`tsc --noEmit`); `npm run build` passed in 16.46s with a >500 kB chunk-size warning. T02 is included in this work-unit commit.
- T03 independent review (`deleg_c56e2444`): tests 4/4, lint, build, and diff check passed; safe browser evidence covered mobile/desktop light surfaces, semantic tones, geometry, and internal scrolling. It returned partial because both manual-action icons match their hover backgrounds (1:1), placeholders measure 2.63:1, and the stolen source line measures 4.35:1. The stolen status pill measures 3.81:1 and already existed at base. Evidence: `C:/Users/EnderJavier/AppData/Local/hermes/cache/scratch/t03-light-incident-verification/`.
- User selected `feature-branch-chain` after the 394-line delivery threshold; no remote delivery is authorized.
- T02C browser RED: from the evidence directory, `node render_evidence.cjs` regenerated the real-markup fixtures; `browser_exec` then ran visible-tab real-mouse `Input.dispatchMouseEvent` and computed-style/contrast probes against the `file:///C:/Users/EnderJavier/AppData/Local/hermes/cache/scratch/t03-light-incident-verification/` pages. Both SVGs exactly matched their hover backgrounds (1:1); input/textarea placeholders were 2.63:1, STOLEN source 4.35:1, and the stolen status pill 3.81:1. A hidden tab initially held transitions at time 0; `Page.bringToFront` repaired the probe infrastructure before the recorded RED without a production edit.
- T02C focused rendered RED → GREEN: `node --test --test-name-pattern="manual action icons" tests/light-modals.render.test.cjs` failed on `Unexpected text-red-600` then passed 1/1; `node --test --test-name-pattern="readable light-theme placeholders" tests/light-modals.render.test.cjs` failed on missing `placeholder:text-slate-500` then passed 1/1; `node --test --test-name-pattern="readable source text" tests/light-modals.render.test.cjs` failed on missing `text-slate-600` then passed 1/1; `node --test --test-name-pattern="readable stolen status pill" tests/light-modals.render.test.cjs` failed on missing `bg-red-600` then passed 1/1.
- T02C final local checks: `node --test tests/light-modals.render.test.cjs` passed 8/8; `npm run lint` exited 0; `npm run build` exited 0 in 14.06s with the existing >500 kB chunk warning; `git diff --check` exited 0. These are local source/build checks, not authenticated, hydration, or production verification.
- T02C browser GREEN after a fresh build and fixture regeneration: report/recovered icons inherit their normal button foreground and settle to `rgb(255, 255, 255)` on hover, distinct from red/emerald hover backgrounds. Input and textarea placeholders measure 4.76:1, STOLEN source 6.93:1, stolen status pill 4.77:1; CLEAN/PENDING source improved from 4.52:1 to 7.20:1. All other contrast probes stayed unchanged, and manual/loading/stolen/unknown/clean/pending surfaces and semantic tones remained intact. Mobile/desktop document-width, location-picker, 44 px refresh/close/photo controls, and internal-scroll/submit gates passed; mobile submit reached 296/296 scroll and remained visible and enabled. Evidence: `t02c-browser-evidence.json` in the T03 scratch directory.
- Next step: T03 independent recheck; no remote delivery is authorized.
