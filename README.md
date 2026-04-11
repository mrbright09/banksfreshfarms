# Banks Fresh Farms

**From Our Land To Your Table**
*A Georgia Grown Heritage — Black-Owned · Family Operated*

A complete, production-ready static website for Banks Fresh Farms (BFF). Deployable to GitHub Pages with zero backend required.

---

## Running Locally

No build tools or server required. Simply open `index.html` in any modern browser:

```bash
# Option 1: Open directly
open index.html

# Option 2: Use a simple local server (recommended to avoid font CORS issues)
npx serve .
# or
python3 -m http.server 8080
# then visit http://localhost:8080
```

---

## Folder Structure

```
banksfreshfarms/
├── index.html          # Main site — all sections in one file
├── css/
│   └── style.css       # All styles (no inline CSS, no frameworks)
├── js/
│   └── main.js         # Smooth scroll, mobile nav, fade-in, active links
├── images/
│   ├── logo.png        # → swap placeholder in nav
│   ├── family-photo.jpg# → swap placeholder in Our Story section
│   └── farm-land.jpg   # → swap placeholder in Hero section
├── CNAME               # Custom domain for GitHub Pages (add when ready)
└── README.md
```

---

## Swapping Image Placeholders

Every placeholder is marked with an HTML comment directly above it. When real images are ready:

### Logo (`images/logo.png`)
In `index.html`, find this block in the `<nav>` section (~line 22):
```html
<!-- PLACEHOLDER: replace with <img src="images/logo.png" alt="Banks Fresh Farms Logo"> when logo is ready -->
<div class="img-placeholder img-logo">
  <span>BFF Logo</span>
</div>
```
Replace the entire `<div class="img-placeholder ...">` block with:
```html
<img src="images/logo.png" alt="Banks Fresh Farms Logo" width="46" height="46">
```

### Family Photo (`images/family-photo.jpg`)
In `index.html`, find this block in the `#story` section (~line 102):
```html
<!-- PLACEHOLDER: replace with <img src="images/family-photo.jpg" alt="The Banks Family"> when photo is ready -->
<div class="img-placeholder img-family">
  <span>[ Family Photo — replace images/family-photo.jpg ]</span>
</div>
```
Replace with:
```html
<img src="images/family-photo.jpg" alt="The Banks Family" style="width:100%;height:320px;object-fit:cover;border-radius:8px;">
```

### Farm Photo (`images/farm-land.jpg`)
In `index.html`, find this block inside `.hero-circle` (~line 74):
```html
<!-- PLACEHOLDER: replace with <img src="images/farm-land.jpg" alt="Banks Fresh Farms land"> when photo is ready -->
<div class="img-placeholder img-farm">
  <span>Farm Photo</span>
</div>
```
Replace with:
```html
<img src="images/farm-land.jpg" alt="Banks Fresh Farms land" style="width:100%;height:100%;object-fit:cover;">
```

---

## Adding Square Payment Links

Every "Order Now" and "Add to Cart" button is marked with a `<!-- SQUARE PAYMENT LINK -->` comment. Search `index.html` for this string to find all locations.

| Product / Item       | Comment to find                                                                      |
|----------------------|--------------------------------------------------------------------------------------|
| General Order (Nav)  | `SQUARE PAYMENT LINK: Replace href="#" with Square payment link for general orders`  |
| Premium Poultry      | `SQUARE PAYMENT LINK: Replace href="#" with Square payment link for Premium Poultry` |
| Fresh Eggs           | `SQUARE PAYMENT LINK: Replace href="#" with Square payment link for Fresh Eggs`      |
| Herbal Products      | `SQUARE PAYMENT LINK: Replace href="#" with Square payment link for Herbal Products` |
| BFF Seasonings       | `SQUARE PAYMENT LINK: Replace href="#" with Square payment link for BFF Seasonings`  |
| BFF Work Shirt       | `SQUARE PAYMENT LINK: Replace href="#" with Square payment link for BFF Work Shirt`  |
| BFF Trucker Hat      | `SQUARE PAYMENT LINK: Replace href="#" with Square payment link for BFF Trucker Hat` |

For each, change `href="#"` to the Square payment link, e.g.:
```html
<a href="https://square.link/u/YOURLINK" class="btn-product" target="_blank">Order Now</a>
```

---

## GitHub Pages Deployment

1. Push this repo to GitHub (public repository)
2. Go to **Settings → Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose **branch: main**, folder: **/ (root)**
5. Click **Save** — the site will be live at `https://yourusername.github.io/banksfreshfarms/`

### Custom Domain (GoDaddy)

1. Add a file named `CNAME` to the repo root with contents:
   ```
   banksfreshfarms.com
   ```
2. In GoDaddy DNS settings, add an **A record** pointing to GitHub Pages IPs:
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```
3. Add a **CNAME record**: `www` → `yourusername.github.io`
4. Back in GitHub Pages settings, enter your custom domain and enable **Enforce HTTPS**

---

## Brand Colors Reference

| Variable        | Hex       | Usage                                |
|-----------------|-----------|--------------------------------------|
| `--cream`       | `#F2EDE3` | Page background                      |
| `--green`       | `#1C4A2E` | Nav, headers, primary color          |
| `--brown`       | `#5C3A1E` | Trust bar, contact section           |
| `--gold`        | `#C8922A` | Accents, buttons, CTAs, prices       |
| `--charcoal`    | `#1A1A1A` | Body text, footer                    |
| `--light-green` | `#E8F0EA` | Card backgrounds, tag pills          |
| `--mid-green`   | `#2D6B45` | Hero gradient mid-stop               |

---

## Typography

- **Playfair Display** — headings, hero title, product names (loaded from Google Fonts)
- **Lato** (300, 400, 700) — body text, nav links, buttons, labels

---

*Banks Fresh Farms · banksfreshfarms@gmail.com · Georgia Grown · Black-Owned Family Farm*
