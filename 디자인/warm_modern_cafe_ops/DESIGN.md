---
name: Warm Modern Cafe Ops
colors:
  surface: '#fdf9f4'
  surface-dim: '#ddd9d5'
  surface-bright: '#fdf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ee'
  surface-container: '#f1ede8'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e6e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#50453e'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f4f0eb'
  outline: '#82746d'
  outline-variant: '#d4c3ba'
  surface-tint: '#79573f'
  primary: '#553722'
  on-primary: '#ffffff'
  primary-container: '#6f4e37'
  on-primary-container: '#eec1a4'
  inverse-primary: '#eabda0'
  secondary: '#7f552d'
  on-secondary: '#ffffff'
  secondary-container: '#ffc795'
  on-secondary-container: '#7a5129'
  tertiary: '#234438'
  on-tertiary: '#ffffff'
  tertiary-container: '#3b5c4e'
  on-tertiary-container: '#aed3c1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc6'
  primary-fixed-dim: '#eabda0'
  on-primary-fixed: '#2d1604'
  on-primary-fixed-variant: '#5f402a'
  secondary-fixed: '#ffdcc0'
  secondary-fixed-dim: '#f3bc8b'
  on-secondary-fixed: '#2d1600'
  on-secondary-fixed-variant: '#643e18'
  tertiary-fixed: '#c6ebd9'
  tertiary-fixed-dim: '#aacfbd'
  on-tertiary-fixed: '#002116'
  on-tertiary-fixed-variant: '#2c4d40'
  background: '#fdf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e6e2dd'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-numeric-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  label-numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
  label-badge:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system powers daily operational control, inventory logging, and financial reconciliation for specialty coffee operations. It balances the warm, sensorial craft of cafe hospitality with the rigorous, error-preventing precision required for fast-paced shift handovers and daily register closings.

The aesthetic fuses **Warm Editorial Modernism** with an ultra-clean **Data-Dense Operational Utility**:
- **Tone:** Grounded, calm, tactile, meticulous, and reassuringly functional during high-stress closing periods.
- **Audience:** Baristas, cafe managers, roastery leads, and independent cafe owners requiring rapid data input on mobile or tablet during closing shifts, alongside detailed desktop analysis.
- **Key Principles:**
  - *Calibrated Warmth:* Avoids sterile corporate grays by using oat, steamed-milk, and parchment undertones paired with deep espresso slate.
  - *Legibility First:* Financial figures, milk/bean tare weights, and inventory variances demand zero ambiguity through tabular numerical alignment.
  - *Glanceable Urgency:* Status tokens (e.g., shortages, discarded inventory, closing status) command instant visual priority without feeling alarmist.

## Colors
The palette evokes artisan cafe surfaces: steamed porcelain, roasted beans, toasted brioche, and unglazed ceramic tile.

- **Primary (`#6F4E37` - Roast Espresso):** Grounded warm brown used for primary interaction anchors, active navigational targets, and structural header emphases.
- **Secondary (`#C89567` - Warm Caramel):** Soft golden-amber accent for subtle selection states, highlighted metrics, and progress tracks.
- **Tertiary (`#2B4C3F` - Forest Matcha):** Rich organic deep green signifying positive reconciliation, balanced registers, and completed closing workflows (`마감완료`, `정상`).
- **Neutral (`#787672` - Oat Slate):** Balanced stone gray with warm undertones to preserve warmth across borders, secondary labels, and neutral canvas tiers without eye fatigue.

### Operational Semantic Roles
- **Canvas Base:** Soft warm parchment tint (`#FBF9F6`) contrasting delicately with white elevated cards (`#FFFFFF`).
- **Warning / Shortage (`부족 경고`):** Rich Ochre (`#B45309`) with soft flax background (`#FEF3C7`).
- **Critical / Waste (`폐기 / 결품`):** Terracotta Rose (`#BE123C`) with soft linen blush (`#FFE4E6`).
- **Log / Restock (`입고`):** Indigo Teal (`#0E7490`) with soft mist tint (`#CFFAFE`).
- **Tabular Figures & Amounts:** Rich Espresso Charcoal (`#1C1917`) to maximize contrast ratio (>11:1) on light surfaces.

## Typography
Typography is split purposefully between structural warmth, humanistic UI clarity, and tabular data rigor.

- **Headline Font (`Space Grotesk`):** Delivers clean architectural structure to dashboard headers and modal dialog titles. Its subtle geometric character complements clean cafe interior aesthetics.
- **Body Font (`Manrope`):** Warm, open, highly legible grotesque suited for Korean and Latin scripts across high-density lists, field labels, and instructional prompts.
- **Monospace & Numerical Figures (`JetBrains Mono`):** Dedicated to Korean Won amounts (`₩`, `KRW`), batch yields, bean dosage (g), and timecode stamps. Always rendered with OpenType `tnum` (tabular numbers) enabled to prevent column jittering when values fluctuate during register counts.

## Layout & Spacing
The layout uses an adaptive fluid-grid structure optimized for greasy, fast, two-thumb tablet interactions at the POS counter and wide desktop views in the back-office.

### Grid Rhythm
- **Desktop (>= 1024px):** 12-column fluid grid, `2.5rem` outer margins, `1.5rem` gutters. Layout accommodates a persistent 280px left navigation rail for shift quick-switches.
- **Tablet (768px - 1023px):** 8-column layout, `1.5rem` outer margins, `1rem` gutters. Ideal for horizontal counter iPad devices.
- **Mobile (< 768px):** 4-column layout, `1rem` outer margins, `1rem` gutters. Stacks numerical summary cards vertically and pins rapid closing entry buttons to a fixed bottom drawer.

### Density & Touch Targets
Input rows within daily logs enforce a minimum vertical height of 48px to accommodate rapid physical finger taps, while data display grids maintain compact 36px line item densities for inventory audit views.

## Elevation & Depth
Depth relies on **Tonal Layering** supplemented with subtle, **Warm Ambient Tint Shadows**, deliberately steering clear of heavy synthetic drop shadows or cold glassmorphism.

- **Level 0 (Canvas):** Warm base tone `#FBF9F6`. Grounded, non-reflective.
- **Level 1 (Surface Cards & Panels):** Pure solid white (`#FFFFFF`) with a hairline border of `#EAE6E1` (low-contrast warm gray). Casts a faint, diffused ambient shadow: `0 2px 8px -2px rgba(111, 78, 55, 0.04)`.
- **Level 2 (Hovered Cards & Interactive Dropdowns):** `#FFFFFF` paired with an elevated warm shadow: `0 8px 20px -4px rgba(111, 78, 55, 0.08)`.
- **Level 3 (Modal Dialogs & Fast-Input Sheets):** Centered surfaces floating over a 40% opacity espresso-tinted backdrop (`rgba(28, 25, 23, 0.40)`). Shadow: `0 16px 36px -8px rgba(111, 78, 55, 0.16)`.

## Shapes
A consistent `roundedness: 2` (0.5rem base radius) grounds the design system, reflecting smooth ceramic cups and polished wood espresso counters.

- **Base Radius (`0.5rem`):** Applied to buttons, input fields, operational status tags, and segmented tab items.
- **Large Radius (`1rem`):** Encloses operational cards, KPI statistic blocks, and data tables.
- **Extra Large Radius (`1.5rem`):** Reserved for modal overlays, closing drawers, and mobile slide-up sheets.
- **Pill Shape (`9999px`):** Strictly reserved for numerical status badges (`정상`, `부족`, `실사완료`) to provide clear visual delineation from rectangular input containers.

## Components

### Buttons
- **Primary:** Background `#6F4E37`, text `#FFFFFF`, border none, height 44px (48px on mobile). Warm hover shift to `#593E2B`.
- **Secondary / Soft:** Background `#F5EBE1`, text `#6F4E37`, border 1px solid `#E8D5C4`.
- **Ghost:** Background transparent, text `#787672`, hover background `#F5F2ED`.
- **Danger (e.g., 폐기 확정 / Register Discrepancy):** Background `#BE123C`, text `#FFFFFF`.

### Status Badges & Pills
Pill-shaped containers (`border-radius: 9999px`) featuring high-contrast color pairs and uppercase micro-typography:
- **Normal / Balanced (`정상`):** Text `#166534`, background `#DCFCE7`, border 1px solid `#BBF7D0`.
- **Shortage Warning (`부족 경고`):** Text `#92400E`, background `#FEF3C7`, border 1px solid `#FDE68A`.
- **Shift Closed (`마감완료`):** Text `#1E293B`, background `#E2E8F0`, border 1px solid `#CBD5E1`.
- **Stock Movement (`입고` / `폐기` / `실사`):**
  - *입고 (Received):* `#0E7490` on `#CFFAFE`.
  - *폐기 (Wasted):* `#9F1239` on `#FFE4E6`.
  - *실사 (Audited):* `#5B21B6` on `#EDE9FE`.

### Data Cards & Metric Panels
- Clean white background (`#FFFFFF`), 1rem corner radius, hairline 1px border `#EAE6E1`.
- Top-aligned categorical label in `label-caps` (`#787672`), followed by heavy tabular metric (`JetBrains Mono`, `headline-lg`), and bottom contextual delta pill (`+₩142,000 vs 어제`).

### Form Controls & Monetary Inputs
- **Input Fields:** 1px border `#D7D2CB`, background `#FCFBFA`. Focused ring of 2px `#6F4E37` with 0px blur offset.
- **Currency Entry:** JetBrains Mono font right-aligned, prepended with a permanently fixed KRW (`₩`) prefix icon in `#A8A29E`.
- **Checkboxes & Segmented Radios:** Custom check containers with warm espresso fill and white checkmark icon.

### Responsive Operational Tabs
- Segmented pill container background `#F0ECE7` with a sliding active tab in pure `#FFFFFF` featuring subtle elevation `0 2px 6px rgba(0,0,0,0.06)` and dark slate text.

### Closing & Record Entry Modal Dialogs
- Max width 540px, centered on desktop, bottom-sheet docked on mobile.
- Headers with bold `Space Grotesk` title and step indicator (`1/3 마감 정산`).
- Sticky bottom footer containing distinct side-by-side action buttons: secondary `임시 저장` (Save Draft) and full-width primary `마감 완료 확정` (Finalize Closing).