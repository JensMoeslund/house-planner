# 🏠 Renovation Planner

A single-file, agent-friendly floor-plan tool for planning house renovations — and new builds.
Trace your house as it is today, then sketch any number of renovation *ideas* on top of it,
compare them in 2D and live 3D, simulate sunlight, and render photorealistic previews.

**One HTML file. No build step, no account, no backend required.** Open `index.html` in
Chrome/Edge and start drawing. The 2D editor works fully offline; 3D and rendering fetch
three.js from a CDN on first load.

## The core idea: *as-is* vs *ideas*

Every plan has a **Nutid (as-is)** variant — the ground truth of how the house is today —
plus any number of **idea** variants. While an idea is active, existing walls, doors and
windows are **locked**:

- Deleting an existing door/window closes it *only in that idea*.
- Dragging an existing wall's endpoint *outward* draws a new extension wall; dragging it
  *inward along the wall* performs a **partial demolition** (the removed span shows dashed
  red, the kept part stays, doors on the kept part are carried over).
- 🔨 marks a whole wall as demolished in that idea. Nothing you do in an idea can ever
  corrupt the as-is plan — a mode badge (🏠 AS-IS / 💡 IDEA) always shows where you are.

For gut renovations or new builds, each idea has a **clean-slate** toggle that hides the
red demolished-wall markers entirely.

## Features

- 2D editor with 45°/90° angle snapping (hold **Shift** for free angles), corner magnets,
  measuring tool, room areas, text labels, furniture (kitchen, bath, bedroom)
- Trace from a photo/scan: load a floor-plan image as underlay, two-click scale calibration
- Live 3D view with walk-through mode (WASD + mouse)
- Sun simulation for any location/date/time (set lat/lon in ⚙ Settings)
- Roof presets: gable roof with W-trusses, or flat roof — plus per-idea roof windows
  (velux), skylight strips and glass gables (☀ dialog)
- Photorealistic rendering, three ways (⚙ Settings → Render):
  1. **In the browser** (default) — progressive GPU path tracing, no setup
  2. **Local Blender** — downloads a single self-contained Python script; run
     `blender --background --python render-<idea>.py` and get a Cycles render, no server
  3. **Render server** — POST the scene to a self-hosted Blender/Cycles HTTP service
     (endpoints: `POST /render`, `GET /status?id=`, `GET /result?id=`)
- Version history: automatic snapshots (every 5 min, on variant switch, before file
  reloads/resets) with one-click restore — plus divergence detection between the browser
  copy and a linked plan file
- Exports: PNG plan, .glb 3D model, Blender render script
- English + Danish UI (auto-detected, switchable in ⚙)

## Working with files

By default the plan lives in the browser (localStorage). Click **🔗 Link plan file** to
bind it to a `house-plan.json` on disk — the tool then saves your edits there and
hot-reloads external edits (from a text editor, a script, or an AI agent) within ~1 s.

The file format is a small, human-readable JSON schema — see [docs/SPEC.md](docs/SPEC.md).

## For AI agents

This tool is designed to be co-driven by AI agents: the plan file is the API.
An agent edits `house-plan.json`; the tool hot-reloads; the human sees the change
instantly and can push back by hand. See [docs/AGENTS.md](docs/AGENTS.md).

## Demo

Load [demo/demo-plan.json](demo/demo-plan.json) via **🔗 Link plan file** for a small
example house with an as-is plan and a renovation idea.

## Roadmap

- Bundled fully-offline build (vendored three.js/path tracer)
- Publishable reference implementation of the render server (Python + Blender, Docker)
- Dimensioned drawing export (SVG/PDF with measurements) for contractor quotes
- Variant comparison overlay
- Typed wall lengths while drawing, live validation badges, touch support

## License

MIT — see [LICENSE](LICENSE).
