Make The UI Look Unique (Shadcn + Tailwind)

This project already uses Shadcn components powered by Tailwind and CSS variables. You can quickly give the app a unique look by setting a theme class and (optionally) a shape preset.

How it works
- Colors, radii, and other tokens are controlled via CSS variables (e.g. `--primary`, `--background`, `--radius`).
- Shadcn components map these tokens to Tailwind utilities (e.g. `bg-background`, `text-foreground`).
- We provide preset themes you can toggle via a single class on `<html>` or `<body>`.

Theme presets
- Defined in `styles/themes/brand.css`:
  - `.theme-bamboo` (fresh green + warm reed) — default applied
  - `.theme-ocean` (cool blues)
  - `.theme-sunset` (warm orange/pink)
  - `.theme-neon` (bold cyan/purple)
- Shape presets (corner radius):
  - `.shape-soft`, `.shape-square`, `.shape-pill`

Enable a theme
1) Global (entire app)
   - `app/layout.tsx` includes `theme-bamboo shape-soft` on `<body>` by default.
   - To change: replace with any preset, e.g. `theme-ocean shape-square`.

2) Scoped (a route or subtree)
   - Wrap a section with a `div` and apply the theme class:
     `<div className="theme-sunset shape-square"> ... </div>`

Customize further
- Copy one of the theme blocks in `styles/themes/brand.css` and tweak the OKLCH values.
- Adjust `--radius` via the shape classes or define your own (e.g. `.shape-brand { --radius: 0.6rem }`).
- You can also create additional tokens for shadows or spacing and use them in custom utilities.

Notes
- `app/globals.css` has a base palette; theme classes in `styles/themes/brand.css` override it.
- No component code changes required; themes are data-driven via CSS variables.
