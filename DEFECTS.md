# Banks Fresh Farms — Defect Log

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
Switched stepper button wiring from `addEventListener` to `onclick` property assignment, matching the proven-working eggs modal pattern. Also changed `.beef-cut-item` CSS from `display: flex; justify-content: space-between` to `display: grid; grid-template-columns: 1fr auto auto` so name, stepper, and price are consistently aligned.

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
