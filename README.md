# 🏠 House Planner

**Plan your house — and every idea you have for it.**

Draw your home as it is today, then try out renovation ideas on top: knock down a wall,
open up the kitchen, add a roof window — and instantly see each idea in 3D, walk through
it, check where the sunlight lands, and get photorealistic pictures.

It's **one HTML file**. No installation, no account, no server. Open `index.html` in
Chrome or Edge and start drawing. It's also **agent-native**: an AI assistant can work on
your plan with you (more below).

**Run it as its own app (Windows):** double-click **`House Planner.cmd`** — it opens in
its own window (no browser tabs or address bar), the built-in furniture catalog works
without any setup, and 📷 Render can drive a locally installed Blender with one click.
Run `launcher\Install shortcut.cmd` once to get a House Planner icon on the Desktop and
in the Start Menu.

## How it works

The Office-style ribbon walks you through it — the two numbered tabs *are* the workflow:

1. **Draw your house as it is today** on the **1 · The house today** tab. Draw walls
   directly (they snap to straight angles — hold Shift for odd ones), or load a photo of
   your floor plan, set the scale and trace over it with the ⬛ Room tool. Add doors,
   windows, room names. Everything you draw here is the real house — the ground truth
   every idea builds on.
2. **Switch to the 2 · Ideas tab.** Press **+** to copy the house into a named idea.
3. **Change things — safely.** On the Ideas tab, everything you draw belongs to the
   selected idea and the real house is protected: deleting a door only closes it *in that
   idea*, and dragging a wall's end inward demolishes just that part (shown dashed red).
   Switching tabs switches what you're editing — no mode to forget — and a badge always
   shows which one is active.
4. **Compare and decide.** Flip between ideas, look at them in 3D, walk around inside
   (WASD + mouse), turn on the sun for any date and time, and render pretty pictures.

Also fine for **new builds**: start from the empty plan and just draw — and each idea has
a "clean slate" switch that hides the demolition markings entirely.

## Nice things it does

- Word/Excel-style ribbon: **File · 1 The house today · 2 Ideas · View · Export** —
  grouped, captioned tools instead of nested menus
- Live 3D view + walk-through mode
- Import any **.glb 3D model** as furniture — one file, several at once, or a whole
  folder. IKEA's product pages serve real .glb models (community browser scripts add a
  download button), and libraries like furnimesh.com or sketchfab.com have thousands of
  free ones. Real-world size is read from the file
- **Built-in catalog of 149 free furniture models** shipping in `catalog/`: the Kenney
  Furniture Kit (140 pieces, CC0) plus Danish design classics — Wegner's Wishbone chair,
  Jacobsen's Swan and Ant, PH5 and Artichoke pendants, an Eames lounge and monstera
  plants (CC-BY, credits in `catalog/ATTRIBUTION.txt`) — all with curated real-world
  sizes; one click in the furniture bar imports a piece
- Sunlight simulation for your exact location, any date and time — plus a **weather**
  switch (sunny / partly cloudy / overcast) that carries through to every render
- **Garden tool**: place trees, pines, bushes and hedges around the house — drawn
  procedurally in 3D and included in renders; plus 26 CC0 nature models (Kenney Nature
  Kit) under the 🌳 Garden & outdoor tab in the furniture bar
- Roofs in two clicks: classic gable roof with trusses, or flat roof — plus roof windows,
  skylight strips and glass gables per idea. Roof windows are placed with the mouse and
  snap into the free bays between the trusses (with an opt-out if you're happy to cut one)
- Photorealistic pictures, three ways (⚙ Settings): right **in the browser** (default,
  zero setup), with **your own Blender** — one click when started via `House
  Planner.cmd` (the launcher finds Blender, renders in the background and shows the
  picture in the app; otherwise you get a self-contained script to run) — or on a
  self-hosted **render server**. The exported scene has named, editable objects
  (walls by id, roof, trusses, windows, furniture, trees), so it's also a real starting
  point for working in Blender yourself
- Automatic version history with one-click restore — experiments are always undoable
- Room areas, measuring tool, furniture (kitchen, bath, bedroom), PNG and 3D (.glb) export
- English and Danish

## Saving

Your plan lives in the browser automatically. Use **File → 📂 Open house plan…** to also
link it to a `house-plan.json` file on disk — a small, human-readable file you can back up, share, or
let an AI assistant edit.

## Agent-native

The plan file is designed so AI assistants can read and edit it directly: you sketch an
intention or write a note, the assistant does the geometry, the tool picks up the change
within a second — and everything the assistant does is protected by the same rules and
version history as your own edits.

- File format: [docs/SPEC.md](docs/SPEC.md)
- Guide for agents: [docs/AGENTS.md](docs/AGENTS.md)

## Try it

**Online, nothing to install:** [jensmoeslund.github.io/house-planner](https://jensmoeslund.github.io/house-planner/)
— runs entirely in your browser; your plan never leaves your machine. Want it as an app
with its own icon that works offline? Click **File → 📲 Install app** on that page.

**Windows installer:** download
[HousePlannerSetup.exe](https://github.com/JensMoeslund/house-planner/releases/latest/download/HousePlannerSetup.exe)
from the [releases page](https://github.com/JensMoeslund/house-planner/releases) — a
normal next-next-finish install (no admin needed) with Start-menu and desktop icons,
plus the extras the web version can't do, like one-click Blender rendering. (Windows
may show a SmartScreen notice because the
installer is unsigned — choose "More info → Run anyway".) Developers can also just
clone the repo and double-click `House Planner.cmd`.

Open `index.html`, click **File → 📂 Open house plan…**, and pick
[demo/demo-plan.json](demo/demo-plan.json) — a small example house with a "today" plan
and an open-kitchen idea.

## Roadmap

**Beginner-friendliness (next up)**
- "Try the example house" button on the empty-plan screen
- Touch support: pinch zoom, two-finger pan, bigger grab handles
- ✨ Find walls (auto-trace a floor-plan photo) — built and benchmarked
  (`tests/trace-bench.js`), hidden behind `?dev` until it's reliable enough to ship

**Deciding between ideas**
- Compare two ideas: overlay with color-coded differences, side-by-side view, and a
  plain-language difference summary

**Later**
- 3D modelling of the landscape: terrain around the house (slopes, height contours),
  so the garden, driveway and the house's placement on the plot read correctly in 3D
  and in renders
- Furniture styles: pick the *look* of each piece (round vs. rectangular dining table,
  corner sofa vs. two-seater, freestanding vs. built-in tub …) so the model matches what
  you would actually put in your house
- Fully-offline bundle (no CDN needed for 3D/rendering)
- Ready-to-run render server (Python + Blender, Docker)
- Printable drawings with measurements (for contractor quotes)

## License

MIT — see [LICENSE](LICENSE).
