# Plan file format — `house-plan/1`

A plan is one JSON document. All coordinates are **metres** in a plan coordinate system:
**x = east, y = south** (north is −y, i.e. "up" in the 2D view). Heights (z) are metres
above the main floor. Use compass directions in notes, never left/right.

```jsonc
{
  "meta":     { ... },
  "base":     { "walls": [...], "openings": [...], "floors": [...], "roof": { ... } },
  "variants": [ { ... }, ... ]
}
```

## meta

| field           | meaning |
|-----------------|---------|
| `format`        | `"house-plan/1"` (checked on load) |
| `units`         | `"meters"` |
| `axes`          | human/agent reminder of the coordinate convention |
| `wallHeight`    | default wall height in m (e.g. 2.5) |
| `activeVariant` | id of the variant shown when the plan loads |
| `site`          | `{name, lat, lon}` — drives the sun simulator; `null` if unset |
| `notes`         | free text for humans/agents |

## base — the house as it exists ("nutid" / as-is, ground truth)

Base geometry may only be edited while the `nutid` variant is active. Ideas can never
mutate it (the tool enforces this).

### walls
`{id, from:[x,y], to:[x,y], t, notes}` plus optional:
- `h` — wall height override (m)
- `floor` — bottom of the wall (z, m) for split-level parts

`id`s are stable references — openings and demolish lists point at them.

### openings
`{id, wall, at, width, type}` where `type` is `"door"` or `"window"`, and `at` is the
distance in metres of the opening **centre** from the wall's `from` end (or the string
`"center"`). Optional: `sill` (window bottom, m), `top` (top edge, m), `flipH`/`flipV`
(door hinge/swing side).

### floors
Slab rectangles `{id, rect:[x1,y1,x2,y2], z, notes}` for split levels; optional
`noCeiling: true`.

### roof
Optional. Either or both of:
- `pitched`: `{x1, x2, yN, yS, pitch, eave, top, spacing, gableEave}` — a gable roof
  with W-trusses; ridge runs east–west between `x1..x2`, slopes face north/south from the
  facade lines `yN`/`yS`. `top` = ceiling height, `spacing` = truss spacing.
  Optional `extensions`: extra slope rectangles.
- `flat`: array of `{rect:[x1,y1,x2,y2], top}` — flat decks; optional `topHigh`/`topLow`
  + `slopeDir` for a slightly sloping deck.

The 🏠 dialog in the tool generates both kinds from the walls' bounding box.

## variants — as-is plus renovation ideas

Each variant:

| field            | meaning |
|------------------|---------|
| `id`, `name`, `notes` | identity; `notes` are shown to agents in Describe |
| `demolish`       | base wall ids removed in this idea (drawn dashed red) |
| `removeOpenings` | base opening ids closed **only in this idea** |
| `hideDemolished` | `true` = don't draw the dashed demolished walls (clean slate) |
| `walls`          | new walls in this idea (same shape as base walls). Optional `partial: "<baseWallId>"` marks a wall that is the *kept part* of a partially demolished base wall — it renders as existing, not new |
| `openings`       | new doors/windows; `wall` may reference base or variant walls |
| `labels`         | `{id, at:[x,y], text}` room names — also used for room-area flood fill |
| `furniture`      | `{id, kind, at:[x,y], angle, w, d, h}` — `at` is the **centre**; kinds: underskab, overskab, koekkenoe, komfur, vask, koeleskab, opvasker, spisebord, sofa, seng, toilet, brus, badekar, garderobeskab, skrivebord. Kind `model` = user-imported .glb: extra fields `model` (library id) and `name`; the .glb bytes live in the browser's IndexedDB, **not** in this file — on a machine without that model the instance renders as a plain box of w×d×h |
| `sketch`         | freehand intent strokes `{id, points:[[x,y]...], note}` — a human draws these for an agent to convert into geometry |
| `roofWindows`    | velux: `[{x, side:"N"\|"S", w, len, sOff}]` — `len` up the slope, `sOff` from the eave |
| `skylights`      | glass strips through both slopes: `[{x, w}]` (ceiling opens beneath) |
| `glassGables`    | `["west"]`, `["east"]` or both — gable triangles in glass |
| `ceilingOpen`    | `[{x1, x2}]` — ceiling opened to the ridge in that x-range (truss ties stay) |

### Merge semantics (what a variant "shows")

```
walls    = base.walls − demolish + variant.walls
openings = base.openings − (openings on demolished walls) − removeOpenings + variant.openings
```

By convention the variant with id `nutid` has empty demolish/walls/openings and represents
reality; every idea is expressed as a delta against base.
