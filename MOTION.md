# AKSI Motion System v1

**Principles:** restrained · meaningful · accessible · one rhythm

Live tokens: `/aksi-motion.css`

## Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--m-instant` | 90ms | active press |
| `--m-fast` | 160ms | color, border |
| `--m-base` | 240ms | hover lift |
| `--m-slow` | 420ms | phase UI |
| `--m-enter` | 640ms | page/section enter |
| `--m-loop` | 900ms | product phase (Seal Loop) |
| `--ease-out` | `.22,1,.36,1` | primary (enter, lift) |
| `--ease-in-out` | `.45,0,.55,1` | balanced loops |
| `--ease-soft` | `.25,.1,.25,1` | color/opacity |
| `--stagger` | 70ms | sequential enter |
| `--rise` | 16px | scroll/load offset |
| `--lift` | -2px | hover |

## Choreography

### Load
1. Page fade (`m-page`) 640ms
2. Hero children stagger 70ms (`m-load`)
3. No bounce, no spin

### Scroll
- `m-reveal` → +16px rise + fade
- Threshold ~12%, once only
- Optional `m-stagger` for card rows

### Product (Seal Loop)
| Phase | Motion meaning |
|-------|----------------|
| input | plaintext appears |
| evidence | rings brighten |
| seal | cipher + Z-depth |
| recall | pulse + text return |
Durations from `--m-loop` scale; respect `prefers-reduced-motion` (instant phases).

### Hover
- Lift 2px only on actionable surfaces
- Shadow/border follow `--m-base`
- Active: snap back `--m-instant`

### Cursor (desktop only)
- Dot = truth position
- Ring lags (~0.18 lerp) = calm tracking
- `hot` on controls, `seal` inside Loop
- Disabled on `pointer: coarse`

### Parallax
- Max ~6–8° tilt on orb, CSS only
- No scroll-jacking parallax
- Off on touch + reduced motion

### Page transitions
- Prefer same-origin links with soft fade when View Transitions available
- Fallback: instant navigation (no fake delay)

### Micro
- Focus-visible ring 2px accent
- Input focus: border + 3px soft glow
- Disabled: opacity .5, no lift

## Don’t
- Infinite decorative particles
- Parallax on body scroll
- Stagger > 6 items
- Motion that blocks reading
- Auto-playing long loops outside product demo

## A11y
Always honor `prefers-reduced-motion: reduce` → durations 0, transforms none.
