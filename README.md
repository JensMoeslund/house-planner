# 🏠 House Planner

**Plan your house — and every idea you have for it.**

Draw your home as it is today, then try out renovation ideas on top: knock down a wall,
open up the kitchen, add a roof window — and instantly see each idea in 3D, walk through
it, check where the sunlight lands, and get photorealistic pictures.

It's **one HTML file**. No installation, no account, no server. Open `index.html` in
Chrome or Edge and start drawing. It's also **agent-native**: an AI assistant can work on
your plan with you (more below).

## How it works

1. **Draw your house as it is today.** Draw walls directly (they snap to straight
   angles — hold Shift for odd ones), or load a photo of your floor plan and trace over
   it. Add doors, windows, room names.
2. **Copy it into an idea.** Press **+** and give the idea a name.
3. **Change things — safely.** In an idea, the real house is protected: deleting a door
   only closes it *in that idea*, and dragging a wall's end inward demolishes just that
   part (shown dashed red). You can never accidentally mess up the "today" plan, and a
   badge always shows which one you're editing.
4. **Compare and decide.** Flip between ideas, look at them in 3D, walk around inside
   (WASD + mouse), turn on the sun for any date and time, and render pretty pictures.

Also fine for **new builds**: start from the empty plan and just draw — and each idea has
a "clean slate" switch that hides the demolition markings entirely.

## Nice things it does

- Live 3D view + walk-through mode
- Sunlight simulation for your exact location, any date and time
- Roofs in two clicks: classic gable roof with trusses, or flat roof — plus roof windows,
  skylight strips and glass gables per idea
- Photorealistic pictures, three ways (⚙ Settings): right **in the browser** (default,
  zero setup), via a **downloaded script for Blender** on your own computer, or on a
  self-hosted **render server**
- Automatic version history with one-click restore — experiments are always undoable
- Room areas, measuring tool, furniture (kitchen, bath, bedroom), PNG and 3D (.glb) export
- English and Danish

## Saving

Your plan lives in the browser automatically. Click **🔗** to also save it as a
`house-plan.json` file on disk — a small, human-readable file you can back up, share, or
let an AI assistant edit.

## Agent-native

The plan file is designed so AI assistants can read and edit it directly: you sketch an
intention or write a note, the assistant does the geometry, the tool picks up the change
within a second — and everything the assistant does is protected by the same rules and
version history as your own edits.

- File format: [docs/SPEC.md](docs/SPEC.md)
- Guide for agents: [docs/AGENTS.md](docs/AGENTS.md)

## Try it

Open `index.html`, click **🔗 Link plan file**, and pick
[demo/demo-plan.json](demo/demo-plan.json) — a small example house with a "today" plan
and an open-kitchen idea.

## Roadmap

**Beginner-friendliness (next up)**
- Room tool: drag a rectangle → four walls + a room name (no wall-chain drawing needed)
- Visible Undo/Redo buttons
- Live wall length at the cursor while drawing; type a number to make it exact
- "Try the example house" button on the empty-plan screen
- Touch support: pinch zoom, two-finger pan, bigger grab handles
- "Saved automatically in this browser" reassurance in the File menu

**Deciding between ideas**
- Compare two ideas: overlay with color-coded differences, side-by-side view, and a
  plain-language difference summary

**Later**
- Furniture styles: pick the *look* of each piece (round vs. rectangular dining table,
  corner sofa vs. two-seater, freestanding vs. built-in tub …) so the model matches what
  you would actually put in your house
- Fully-offline bundle (no CDN needed for 3D/rendering)
- Ready-to-run render server (Python + Blender, Docker)
- Printable drawings with measurements (for contractor quotes)

## License

MIT — see [LICENSE](LICENSE).
