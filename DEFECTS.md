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
