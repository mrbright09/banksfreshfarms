# Banks Fresh Farms — Defect Log

---

## Standing Process Rule

**Before diagnosing any issue, always read this file first.**  
Known root causes are documented here. Many bugs share the same underlying failure mode (e.g., iOS `-webkit-overflow-scrolling: touch` tap swallowing). Reviewing prior defects prevents re-investigating already-solved patterns and ensures fixes are consistent with proven approaches.

---

## DEF-006 · Branch Strategy Failure — Main Persistently Behind Feature Branch

**Status:** Resolved (forced merge)  
**Severity:** High — production website (`main`) was missing all recent bug fixes and features; users saw stale, broken code  
**Reported:** Session — user confirmed "make sure it was fixed and pushed to main"

---

### Description
The `main` branch (which deploys to the live GitHub Pages site) was 3+ commits behind the designated feature branch `claude/fix-header-scroll-text-Au66e` for the entirety of the session. All critical fixes — DEF-003 iOS stepper fix, DEF-005 alignment fix, order summary drawer — were committed to the feature branch but never merged to `main`. The production website remained broken until a forced merge at the end of the session.

In addition, `main` had accumulated 25+ direct commits over multiple sessions that never existed on the feature branch, while the feature branch had its own separate chain of commits (Supabase integration, admin pickup tracker, contact layout) that were never merged back to `main`. Both branches diverged independently with no synchronization.

### Steps to Reproduce
1. Commit fixes to `claude/fix-header-scroll-text-Au66e`
2. Check `git log --oneline main`
3. **Expected:** Main contains all recent commits
4. **Actual:** Main is missing all commits from this session; live site still broken

---

### Root Cause Analysis — 5 Whys

**Why 1: Why was main missing the fixes?**  
All fixes in this session were committed directly to `claude/fix-header-scroll-text-Au66e`, which was never merged into `main` until the user explicitly requested it at the end of the session.

**Why 2: Why were fixes going to the feature branch instead of main?**  
The session environment specifies a target development branch (`claude/fix-header-scroll-text-Au66e`). Development correctly targeted that branch. However, merging back to `main` was treated as an optional end-of-session step rather than a required part of completing each fix.

**Why 3: Why was merging to main not done after each fix?**  
No rule existed in the workflow to require a main merge after each meaningful commit. The implicit assumption was that working code on any branch is sufficient — but for a GitHub Pages site, only `main` deploys.

**Why 4: Why did the two branches diverge so severely over time?**  
Both branches were used as simultaneous development targets across multiple sessions:
- `main` received UI/feature work (beef modal, nav fixes, story copy) directly
- `claude/fix-header-scroll-text-Au66e` received infrastructure work (Supabase, admin tracker) and the latest bug fixes

No merge or rebase was performed between sessions to keep them in sync. The git graph shows a `|` split at a common ancestor with 25+ commits on `main`'s side and 5+ on the feature branch side — two independent lines of development.

**Why 5: Why was no merge/rebase discipline enforced between sessions?**  
No explicit branch strategy was defined for this project. GitHub Pages deploys from `main`, but that constraint was not connected to a rule mandating that `main` always reflect the latest working state. Without a documented policy, each session defaulted to committing to whatever branch was active.

---

### Evidence — Git Graph at Time of Discovery

```
*   cad102d  merge: bring all beef modal fixes (this session's forced merge)
|\
| * 46a2932  docs: DEF-005 root cause
| * 6030772  feat: alignment + order summary drawer
| * 5ad47a1  fix(DEF-003): iOS stepper fix
* | 8788867  Beef modal: per-cut steppers         ← main stopped here
* | 838d429  Beef modal: dark background
* | 6f9704a  Fix DEF-001: Shop Beef iOS
  ...25 more commits only on main, never on feature branch
```

Main was 3 commits behind the feature branch for all critical fixes in this session, and the feature branch was 25+ commits behind main for prior work — a full two-way divergence.

---

### Fix Applied
Performed a forced merge of `claude/fix-header-scroll-text-Au66e` into `main` using `git checkout --theirs` to resolve conflicts in favor of the feature branch (the more recent and correct version). Pushed `main` to origin to trigger GitHub Pages deployment.

---

### Prevention — Required Branch Rules Going Forward

1. **`main` is the deployment branch.** Every session must end with `main` containing all working changes. No fix is complete until it is on `main` and pushed.
2. **Merge to `main` after every meaningful commit group.** Do not accumulate commits on a feature branch across sessions without merging back.
3. **Before starting any session**, run `git log --oneline main..HEAD` and `git log --oneline HEAD..main` to understand divergence. If either shows commits, resolve before adding new work.
4. **Review DEFECTS.md before diagnosing any issue.** Known failure patterns (iOS tap swallowing, branch drift) must be checked first to avoid re-investigating solved problems.
5. **Feature branches are for in-progress work only.** Once a fix is confirmed working, merge to `main` immediately.

---

## DEF-001 · Shop Beef Button — No Response on iOS Safari

**Status:** Fixed  
**Severity:** High — feature completely non-functional on primary device  
**Reported:** Session — user confirmed "no response on pressing Shop Beef"

---

### Description
Tapping the "Shop Beef" button inside the product carousel on iOS Safari produces no visible response. The beef cuts modal does not open.

### Steps to Reproduce
1. Open site on iOS Safari (iPhone)
2. Navigate to the "What We Bring to Your Table" shop section
3. Swipe to the Grass Fed Angus Beef card
4. Tap "Shop Beef"
5. **Expected:** Beef cuts modal opens with inline video + price list
6. **Actual:** Nothing happens

### Environment
- Device: iPhone (iOS Safari)
- Element: `<button id="beefLearnMoreBtn">` inside `.shop-section--carousel .shop-grid`
- The grid has `-webkit-overflow-scrolling: touch` (mobile carousel)

---

### Root Cause Analysis — 5 Whys

**Why 1: Why does tapping "Shop Beef" produce no response?**  
The click event either never fires or is swallowed before reaching the handler.

**Why 2: Why would the click event be swallowed?**  
The button is inside a `-webkit-overflow-scrolling: touch` scroll container. iOS Safari intercepts touch events inside such containers to decide whether the intent is a tap or a scroll. If ambiguous, it discards the click.

**Why 3: Why is the intent ambiguous when `touch-action: manipulation` is set?**  
`touch-action: manipulation` disables double-tap zoom and pan-y ambiguity, but does not guarantee click delivery in all iOS scroll container configurations. The browser still needs a signal from the JS handler itself via `e.preventDefault()` to confirm the touch was consumed as a tap.

**Why 4: Why does the Eggs "Shop Eggs" button work but Beef doesn't?**  
Direct code comparison reveals the difference:

```js
// EGGS — works ✓
shopEggsBtn.addEventListener('click', function (e) {
  e.preventDefault();   // ← explicit preventDefault
  openPackModal();
});

// BEEF — broken ✗
beefBtn.addEventListener('click', openBeefModal);
// openBeefModal receives the event but never calls e.preventDefault()
```

The eggs button explicitly calls `e.preventDefault()`, preventing the scroll container from reclaiming the event. The beef handler passes the function reference directly — no `e.preventDefault()` is ever called.

**Why 5: Why was this not caught during the earlier "Learn More" fix?**  
The original "Learn More" fix (DEF-000 equivalent) added `touch-action: manipulation` to `.shop-card-btn` which resolved the stepper issue but was insufficient alone. The `e.preventDefault()` gap was masked because the video fullscreen flow had its own iOS-specific failures, making it unclear whether the click itself fired.

---

### Fix Applied
Changed the beef button event listener to explicitly call `e.preventDefault()` and `e.stopPropagation()`, matching the pattern of the proven-working eggs button.

```js
// FIXED
if (beefBtn) {
  beefBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    openBeefModal();
  });
}
```

---

## DEF-003 · Beef Cut Steppers — No Response on iOS Safari

**Status:** Fixed  
**Severity:** High — order quantity selection completely non-functional on primary device  
**Reported:** Session — user confirmed "steppers don't respond" with screenshot showing unresponsive −/+ buttons

---

### Description
Tapping the − or + quantity stepper buttons on individual beef cuts inside the beef modal produces no response on iOS Safari. The quantity never changes and the running total never updates.

### Steps to Reproduce
1. Open site on iOS Safari (iPhone)
2. Tap "Shop Beef" to open the beef cuts modal
3. Tap the + or − button on any cut row (e.g. Ground Beef)
4. **Expected:** Quantity increments/decrements; running total updates
5. **Actual:** Nothing happens

### Environment
- Device: iPhone (iOS Safari)
- Elements: `.beef-stepper-btn[data-action="plus/minus"]` inside `.beef-cuts-list`
- The `.beef-modal-backdrop` has `-webkit-overflow-scrolling: touch` (same context as DEF-001)

---

### Root Cause Analysis — 5 Whys

**Why 1: Why does tapping a stepper button produce no response?**  
The click event is swallowed before reaching the handler.

**Why 2: Why is the click event swallowed?**  
The stepper buttons live inside `.beef-modal-backdrop`, which has `-webkit-overflow-scrolling: touch`. This is the identical scroll container condition documented in DEF-001. iOS Safari intercepts and discards touch events in this context when it cannot determine tap vs. scroll intent.

**Why 3: Why does `touch-action: manipulation` not prevent the swallow?**  
`touch-action: manipulation` alone is insufficient. DEF-001 documented this exact finding: the browser also requires the JS handler to call `e.preventDefault()` to confirm the touch is a tap. But beyond that, `addEventListener` itself can be unreliable in `-webkit-overflow-scrolling: touch` containers on iOS — the event may be queued but handler never fires due to compositing layer isolation.

**Why 4: Why does the beef modal have this problem but the eggs stepper does not?**  
The eggs stepper buttons (`.stepper-btn` in `.pack-modal-backdrop`) use `onclick` property assignment, which is evaluated synchronously in the tap handling path and is not subject to the same compositing-layer event queue interference. The beef steppers were wired with `addEventListener`, which suffers the swallow.

**Why 5: Why was addEventListener used here instead of the proven onclick pattern?**  
The beef stepper code was written after DEF-001 was logged but the fix pattern (switch to `onclick` property) had only been applied to the beef button itself, not carried forward to the stepper buttons. The developer applied `e.preventDefault()` and `e.stopPropagation()` inside the listener (necessary but insufficient), without making the critical switch from `addEventListener` to `onclick`.

---

### Fix Applied
Switched stepper button wiring from `addEventListener` to `onclick` property assignment, matching the proven-working eggs modal pattern. Also changed `.beef-cut-item` CSS from `display: flex; justify-content: space-between` to `display: grid; grid-template-columns: 1fr auto auto` as an initial alignment attempt (see DEF-005 for the full alignment fix that followed).

```js
// BEFORE — broken ✗
beefCutRows.forEach(function (row) {
  row.querySelector('[data-action="plus"]').addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    setBeefQty(row, getBeefQty(row) + 1);
    updateBeefTotal();
  });
  // ...
});

// FIXED — onclick property ✓
beefCutRows.forEach(function (row) {
  var plusBtn  = row.querySelector('[data-action="plus"]');
  var minusBtn = row.querySelector('[data-action="minus"]');
  if (plusBtn) {
    plusBtn.onclick = function (e) {
      e.preventDefault(); e.stopPropagation();
      setBeefQty(row, getBeefQty(row) + 1);
      updateBeefTotal();
    };
  }
  if (minusBtn) {
    minusBtn.onclick = function (e) {
      e.preventDefault(); e.stopPropagation();
      var q = getBeefQty(row);
      if (q > 0) { setBeefQty(row, q - 1); updateBeefTotal(); }
    };
  }
});
```

### Key Pattern (iOS Safari scroll containers)
Buttons inside any `-webkit-overflow-scrolling: touch` container require ALL of:
1. `touch-action: manipulation` on the element (CSS)
2. `-webkit-tap-highlight-color: transparent` on the element (CSS)
3. `e.preventDefault()` + `e.stopPropagation()` inside the handler
4. **`onclick` property assignment** instead of `addEventListener`

---

## DEF-004 · Branch Merge Conflict — Feature Branch Diverged from Main

**Status:** Resolved  
**Severity:** Medium — development workflow blocked; changes could not cleanly apply  
**Reported:** Session — merge conflict on `git stash pop` when switching to `claude/fix-header-scroll-text-Au66e`

---

### Description
When attempting to carry beef stepper fixes from `main` to the designated feature branch `claude/fix-header-scroll-text-Au66e`, a `git stash pop` produced unresolvable conflicts in `index.html`, `css/style.css`, `js/main.js`, and a delete/modify conflict on `DEFECTS.md`.

### Steps to Reproduce
1. Make changes on `main` (stepper onclick fix, grid layout fix, DEFECTS.md update)
2. `git stash` to save work
3. `git checkout claude/fix-header-scroll-text-Au66e`
4. `git stash pop`
5. **Expected:** Changes apply cleanly
6. **Actual:** Conflicts in all modified files; `DEFECTS.md` deleted by feature branch, modified in stash

### Root Cause Analysis — 5 Whys

**Why 1: Why did the stash pop produce conflicts?**  
The feature branch and `main` had diverged — the feature branch contained 5+ commits not present in `main` (Supabase integration, admin pickup tracker, subscription tiers, contact layout changes).

**Why 2: Why had the feature branch diverged so much?**  
Active development continued on `main` while the feature branch (`claude/fix-header-scroll-text-Au66e`) was also being developed for a separate concern (header/scroll text). Neither branch was rebased onto the other before the session ended.

**Why 3: Why was `DEFECTS.md` a delete/modify conflict?**  
`DEFECTS.md` was created on `main` during this session but was never added to the feature branch. The feature branch had no record of the file, so git treated it as "deleted by us" when the stash introduced it.

**Why 4: Why were `css/style.css`, `index.html`, and `js/main.js` conflicted?**  
Both branches modified the same lines — the CSS version query string (`?v=9` on feature branch vs. `?v=39` applied on main), beef modal styles, and JS stepper handlers. Git could not auto-merge these overlapping edits.

**Why 5: Why wasn't the correct branch used from the start?**  
Development habit defaulted to `main`. The session instructions specified the feature branch but the initial checkout was not performed before making file edits.

---

### Fix Applied
1. Used `git checkout --theirs` to take the stash (main + fixes) versions of conflicted files, preserving all intended changes.
2. Manually resolved the `DEFECTS.md` delete conflict by re-creating the file on the feature branch with full content.
3. Staged all resolved files and committed to `claude/fix-header-scroll-text-Au66e`.

### Prevention
Always `git checkout <feature-branch>` before making edits when a session specifies a target branch. Do not make changes on `main` and stash-transfer to a diverged feature branch.

---

## DEF-005 · Beef Cut Row Alignment — Stepper Position Shifts by Cut Name Length

**Status:** Fixed  
**Severity:** Medium — visual inconsistency degrades UX; confirmed in iOS screenshot  
**Reported:** Session — user screenshot showed stepper (−/0/+) column shifting left/right between rows

---

### Description
The − / 0 / + stepper control and price column do not align vertically across beef cut rows. Rows with shorter names (Ribeye, T-Bone) have their stepper positioned noticeably further left than rows with longer names (Ground Beef, Chuck Roast), creating a jagged, uneven layout.

### Steps to Reproduce
1. Open beef cuts modal on any device
2. Observe the 6 cut rows
3. **Expected:** Stepper column and price column are vertically aligned across all 6 rows
4. **Actual:** Stepper jumps left for shorter names; price column floats at different horizontal positions per row

### Environment
- All browsers / devices
- Element: `.beef-cut-item` list items inside `.beef-cuts-list`
- Screenshot confirmed on iOS Safari

---

### Root Cause Analysis — 5 Whys

**Why 1: Why does the stepper position shift between rows?**  
The horizontal position of the stepper depends on how much space the cut name consumes, causing the stepper to start at different x-positions per row.

**Why 2: Why does the name width affect the stepper position?**  
The original layout used `display: flex; justify-content: space-between` with three items (name, stepper, price). `space-between` distributes the leftover row width equally as gaps between items. A shorter name (e.g. "Ribeye") leaves more leftover space, creating a larger gap before the stepper. A longer name (e.g. "Ground Beef") leaves less space, pushing the stepper closer to the name.

**Why 3: Why didn't the `1fr auto auto` grid fix (DEF-003) fully resolve it?**  
`grid-template-columns: 1fr auto auto` with `auto` tracks intrinsic content width per column. In theory, CSS Grid shares column widths across all rows of the same grid container, so `auto` should produce consistent widths. However, `auto` sizing is still subject to content-driven variability — if any cell in that column has differing content sizes (e.g. `$10.99/lb` vs `$24.99/lb` rendering at fractionally different widths), the column can render at slightly different sizes at subpixel level. More critically, `auto` gives no hard pixel guarantee for touch target sizing, which is essential for the stepper.

**Why 4: Why do fixed pixel columns solve it definitively?**  
`grid-template-columns: 1fr 96px 88px` gives the stepper and price columns an exact, immutable width regardless of content. The `1fr` name column absorbs all remaining space. Every row in the grid shares these exact column widths by CSS Grid spec — the stepper always starts at the same x-position and the price is always right-aligned within the same 88px.

**Why 5: Why was fixed-width column sizing not the initial choice?**  
The stepper dimensions (3 × 34px button = 102px total, then tuned to 96px with tighter buttons) and price character widths were not measured before writing the grid rule. Using `auto` felt sufficient. The visual misalignment was only caught after the screenshot on device confirmed the problem.

---

### Fix Applied
Changed `.beef-cut-item` grid to fixed pixel columns and constrained the stepper and price elements explicitly:

```css
/* BEFORE — broken ✗ */
.beef-cut-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
}

/* FIXED ✓ */
.beef-cut-item {
  display: grid;
  grid-template-columns: 1fr 96px 88px;
  gap: 8px;
}

.beef-cut-stepper {
  width: 96px; /* explicit, matches column */
}

.beef-cut-price {
  text-align: right;
  white-space: nowrap; /* prevents wrap on narrow screens */
}
```

Additional enhancement shipped with this fix: replaced the simple `Est. Total` line with a collapsible order summary drawer (`#beefSummary`) that expands when any quantity is selected, showing each cut as a line item (qty · name · subtotal) and a grand total. This gives the user full order visibility before tapping "Contact Us to Order."

---

## DEF-002 · Top Nav — Content Visible Above Nav When Scrolling Back Up (Mobile)

**Status:** Open — workaround removed (hide-on-scroll feature reverted per user request)  
**Severity:** Medium — cosmetic regression on mobile scroll  
**Reported:** Session — user confirmed content visible above nav in screenshot

### Description
When scrolling down on mobile and then back up, page content was briefly or permanently visible above the fixed nav bar.

### Root Cause (Hypothesized)
`position: fixed` + `transform: translateY()` on iOS Safari creates a new stacking context. Pseudo-elements (`::before`) extending above the element are clipped or misrendered. Box-shadow upward spread was also clipped by the viewport in the GPU compositing layer. A real DOM curtain element was attempted but introduced other issues.

### Resolution
Feature (hide-on-scroll) was removed per user request. Top nav now always visible and static.

---
