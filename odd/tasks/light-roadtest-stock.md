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
- [x] T00 — Reuse the prior modal map, confirm the two user-shown dark surfaces in current `main`, and bound this feature to RoadTestForm plus StockAutomotoras. Route: delegated mapping reused; branch created from updated `origin/main`. Initial tracking commit pending.
- [ ] T01 — Migrate RoadTestForm through observed RED to GREEN, including light photo cards and preserved dark image overlays. Route: delegated writer. Verification: focused and full rendered tests plus diff check. Commit evidence pending.
- [ ] T02 — Migrate StockAutomotoras through its own observed RED to GREEN, including filters/select/options, empty state, cards, and publish panel. Route: same writer. Verification: focused and full rendered tests plus diff check. Commit evidence pending.
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
- Next step: T01 delegated writer.
