# Light Road Test and Stock Modals

## Objective
Align RoadTestForm and StockAutomotoras with the light Alerta Dealers interface while preserving their workflows and semantic accents.

## Problem and why
Both surfaces remain dark in current `main` and production. User screenshots confirmed that the light application still presents these internal views as a separate dark interface.

## Authorized scope
- `src/components/RoadTestForm.tsx`: light sheet, inputs, notes, photo cards, location-neutral surfaces, and footer while retaining amber test-drive semantics and dark controls over photographs.
- `src/components/StockAutomotoras.tsx`: light inventory sheet, filters, native select/options, search, empty state, vehicle cards, local Select, and publish panel while retaining emerald semantics.
- Focused real-component rendered regressions and safe computed-style/browser evidence.
- Neutralize any voseo in touched visible copy to standard tuteo without changing meaning (for example, `Usá` to `Usa`).

## Out of scope
- Other modals, Dashboard/feed/nav/global theme changes, Firebase/schema/handler/navigation changes, dependency installation, and production deployment.
- AlertConfirmationModal and PlateCameraCapture remain deliberate dark exceptions.
- Push, PR creation, merge, remote branch deletion, and production promotion require separate explicit authorization.

## Constraints and checks
- Strict TDD: enabled by project/session configuration. Observe assertion RED before each production edit, then GREEN and refactor.
- Runner: `node --test tests/light-modals.render.test.cjs`; focused tests may use `--test-name-pattern`.
- Use real component markup with only unavoidable browser-only external shims. Never mock the component under test.
- Preserve handlers, z-index, animations, accessibility labels, target sizes, photo/camera behavior, and all existing workflows.
- Independent gates: rendered tests, `npm run lint`, `npm run build`, diff check, and mobile/desktop computed-style evidence including settled hover/focus and text contrast.

## Route and delivery
- Route: delegated direct. Evidence: implementation touches two non-trivial production components plus tests; reuse prior exploration instead of repeating it.
- Branch/worktree: `feat/light-roadtest-stock` at `autored_coquimbo-light-operations`; base `ffa9a6675f190711805f75b08083a46c5186c053`.
- RDD: on globally but immutable review transport is unavailable under Hermes. Use high-tier writer self-verification plus an independent verifier; never claim a receipt.
- Forecast: likely above 400 authored lines across two slices. Cached delivery choice: `feature-branch-chain`; apply it only if remote delivery is later authorized. Do not shrink tests or code to fit a line target.

## Checklist
- [x] T00 — Reuse the prior modal map, confirm the two user-shown dark surfaces in current `main`, and bound this feature to RoadTestForm plus StockAutomotoras. Route: delegated mapping reused; branch created from updated `origin/main`. Initial tracking commit `85ac0ae`.
- [x] T01 — Migrate RoadTestForm through observed RED to GREEN, including light photo cards and preserved dark image overlays. Route: delegated writer. Verification: two assertion RED cycles; focused GREEN 2/2; full rendered tests 10/10; `git diff --check` exit 0. Local work-unit commit `01780042787c4dde021944199a21f76e67b27fc8` (`0178004`).
- [x] T02 — Migrate StockAutomotoras through its own observed RED to GREEN, including filters/select/options, empty state, cards, and publish panel. Route: same writer. Verification: focused assertion RED scenarios; focused GREEN 4/4; full rendered tests 14/14; `git diff --check` exit 0. Lint/build attempted independently and blocked by absent worktree dependencies; exact results below. Local work-unit commit evidence is recorded in branch history.
- [ ] T03 — Run final lint/build and independently verify mobile/desktop surfaces, hover/focus, contrast, scrolling, and target sizes without credentials or data submissions. Route: fresh independent verifier. Commit evidence pending.

## Acceptance criteria
- Both sheets and their neutral controls use coherent light surfaces and readable text.
- Amber test-drive and emerald inventory meanings remain clear; stolen/unknown/clean and destructive states remain distinct.
- Photo/camera overlays retain deliberate dark contrast, and behavior remains unchanged.
- Visible copy in touched surfaces follows tuteo.
- Every production edit has observed RED before implementation and GREEN afterward; final checks are reported independently.

## Progress and evidence
- 2026-10-25: user confirmed this combined block with `Si avance`. Base `ffa9a66` contains the already merged incident slice; RoadTestForm and StockAutomotoras still contain dark surface classes.
- Production still serves the previous incident bundle; promotion is a separate unresolved delivery task.
- Next step: T03 fresh independent verifier; no remote delivery is authorized by this work unit.
- T01 RED evidence: the sheet/fields/footer test failed on `Missing bg-white` because the real form still had `bg-slate-950`; the photo-card test then failed on `Missing text-slate-700` because the capture heading still had `text-slate-300`. Both were assertion failures from the real component, not harness errors.
- T01 GREEN evidence: with `NODE_PATH='C:/Users/EnderJavier/Documents/Proyectos WEB/autored/autored_coquimbo/node_modules'`, `node --test --test-name-pattern='RoadTestForm' tests/light-modals.render.test.cjs` passed 2/2; `node --test tests/light-modals.render.test.cjs` passed 10/10, preserving all eight incident/badge tests. `git diff --check` exited 0 with only the existing LF-to-CRLF advisory.
- T01 runtime boundary: the CommonJS harness rendered the real initial sheet plus seeded photo-preview and error markup; it did not exercise browser hydration, confirmation, GPS, file selection, or submission. Rollback boundary: `src/components/RoadTestForm.tsx`, its RoadTestForm assertions in `tests/light-modals.render.test.cjs`, and this feature document.
- T02 RED evidence: the initial sheet test failed on `Missing bg-white` while the real section retained `bg-slate-950`; the copy test failed on `Missing tuteo copy: Verifica tu conexión.` The vehicle-card test failed on `Missing bg-white` for the dark translucent article, and the seeded publish-panel test failed on `Missing bg-slate-50` for its `bg-slate-900/60` panel. After the light migration, a follow-up assertion RED exposed the unstyled native placeholder option (`Missing bg-white`); it was corrected in production. A card-heading locator was repaired test-only because React separators and an earlier aria-label made the visible text non-unique; no production behavior changed for that harness repair.
- T02 GREEN evidence: with the same dependency-matched `NODE_PATH`, `node --test --test-name-pattern='StockAutomotoras' tests/light-modals.render.test.cjs` passed 4/4 and `node --test tests/light-modals.render.test.cjs` passed 14/14, preserving the ten pre-existing incident/RoadTestForm/badge tests. `git diff --check` exited 0.
- T02 independent gates: `npm run lint` exited 2 because this worktree has no `node_modules`; the available `tsc` reported missing React/Firebase/other module and JSX type declarations across the repository. `npm run build` exited 1 because `vite` was not recognized. These are dependency-environment blockers, not lint/build passes; do not reinterpret them as source failures or as production-build evidence.
- T02 static presentation boundary: real StockAutomotoras markup was rendered with seeded loading-complete, three-vehicle/status, admin publish-open, dealership, and error states. The publish assertions cover the panel, fields, native select/options, status choices, submit-bar presence, and error surface. They do not exercise opening/closing, typing, filtering, selecting, deletion confirmation, Firebase writes, hydration, browser layout, or computed hover/focus/contrast; those remain independent T03 verification boundaries.
- T02 rollback boundary: `src/components/StockAutomotoras.tsx`, the StockAutomotoras assertions in `tests/light-modals.render.test.cjs`, and this feature document. T01 and all remote/deployment state remain untouched.
