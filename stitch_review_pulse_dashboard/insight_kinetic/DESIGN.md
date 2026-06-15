---
name: Insight Kinetic
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#464554'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#006b2d'
  on-tertiary: '#ffffff'
  tertiary-container: '#00873b'
  on-tertiary-container: '#f7fff3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  display-3xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-2xl:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-xl:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  label-xs:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

The design system is engineered for "Review Pulse," focusing on high-speed data synthesis and clarity. The brand personality is **analytical, proactive, and precise**. It prioritizes high recognition through a clean, modular aesthetic that minimizes cognitive load for users processing large volumes of feedback.

The style is **Corporate Modern with a Modular Card-Based approach**. It utilizes a neutral foundation to allow data visualizations and status indicators to remain the focal point. By employing progressive disclosure, the UI hides secondary actions until needed, maintaining a lean and focused workspace. The emotional response is one of organized control—transforming chaotic public sentiment into structured, actionable intelligence.

## Colors

The color strategy centers on an **Indigo (#6366F1)** primary accent to signify intelligence and automation. The background palette is highly restrained, using off-whites and cool greys to create a layered "app-shell" effect. 

Source-specific colors (App Store Blue and Play Store Green) are reserved strictly for platform identification to ensure high recognition of data origins. Semantic colors for sentiment (Positive/Negative) are calibrated for high legibility against both light and dark backgrounds. Use the `bg-elevated` token for sidebar navigation or secondary utility panels to distinguish them from the main workspace `bg-primary`.

## Typography

This design system uses **Inter** exclusively to maintain a modular, systematic feel. The type hierarchy is built on a tight scale to ensure information density without sacrificing readability.

- **Headings:** Utilize a semi-bold (600) to bold (700) weight with slight negative tracking (-0.01em) to create a compact, authoritative look for data titles.
- **Body:** The base size is 16px to ensure accessibility. For secondary data or metadata within cards, the 14px (sm) size is preferred.
- **Labels:** Use 12px (xs) for uppercase tags or small button labels, typically with a slightly increased medium weight (500) for clarity.

## Layout & Spacing

The layout follows a **4px base grid system**. Content is housed in a fluid-width main container that maintains safe margins of 24px on desktop.

- **Grid:** Use a 12-column grid for the main dashboard. Statistical widgets typically span 3 or 4 columns, while the main "Review Feed" spans 8 or 12.
- **Responsive Behavior:** On tablet, the 12-column grid transitions to 6 columns. On mobile, all columns stack vertically. 
- **Rhythm:** Use `md` (16px) for internal card padding and `lg` (24px) for spacing between distinct card modules to create a clear visual hierarchy of grouped information.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layering**. 

- **Surface 0 (Background):** Uses `--bg-primary`.
- **Surface 1 (Cards):** Uses `--bg-card` with a subtle, highly diffused shadow (e.g., `0px 1px 3px rgba(0,0,0,0.05), 0px 10px 15px -3px rgba(0,0,0,0.05)`).
- **Surface 2 (Elevated/Modals):** Uses `--bg-elevated` or white with a more pronounced shadow to indicate temporal focus.

In dark mode, depth is achieved by increasing the lightness of the background color rather than relying on shadows, ensuring the UI remains crisp and high-contrast.

## Shapes

The design system adopts a **Rounded** shape language to soften the analytical nature of the data. 

- **Standard Elements:** 8px (0.5rem) radius for buttons, input fields, and small widgets.
- **Containers:** 16px (1rem) radius for primary cards and dashboard modules to create distinct sections.
- **Interactive States:** Use a 4px focus ring offset by 2px when navigating via keyboard, utilizing the primary indigo color.

## Components

### Buttons & Targets
Buttons must have a minimum height of 44px to ensure **large click targets**. The primary action button uses the indigo background with white text, while ghost buttons use a subtle border and no fill until hover.

### Cards
The primary vehicle for data. Cards should include a header area for titles and actions, a body for content/charts, and an optional footer for metadata. Use a staggered entrance animation (50ms delay per card) when the dashboard initializes.

### Chips & Tags
Used for sentiment (Positive/Negative) and platform (App Store/Play Store). Chips should be low-profile, using a light tint of the semantic color for the background and a dark shade for the text (e.g., Light Green BG / Dark Green Text).

### Input Fields
Inputs should use the `--bg-card` background with a `--border-subtle` stroke. On focus, the border transitions to the primary indigo with a 150ms duration.

### Lists & Feeds
Review feeds use a "Z-pattern" layout: Rating/Source on the top-left, Date on the top-right, Content in the middle, and AI-generated insights in a subtly tinted sub-section at the bottom of the list item.

### Motion
- **Interaction:** All hover and active states use a 150ms "Fast" transition.
- **Entrance:** Use a 250ms "Normal" transition with `cubic-bezier(0.4, 0, 0.2, 1)` for expanding or collapsing card details.