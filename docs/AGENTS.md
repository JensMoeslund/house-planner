# Driving the planner as an AI agent

The plan file **is** the API. The human links the tool to a `house-plan.json`
(🔗 Link plan file); you edit that file; the tool hot-reloads within ~1.2 s and the human
sees your change live. No SDK, no endpoints.

## Workflow

1. **Read the file** and `meta.axes` first. Coordinates are metres, x = east, y = south.
   Talk compass ("the north facade"), never left/right.
2. **Edit as a delta.** Never restructure wholesale. Respect the invariants below.
3. **Write the file** (pretty-printed JSON). The tool reloads it automatically and
   snapshots the previous state to its version history first, so mistakes are recoverable.
4. **Verify visually** if you can (e.g. drive the browser via CDP and screenshot), or ask
   the human to look. The tool's **Describe** button produces the same text digest +
   validation an agent would want: wall list with lengths/directions, openings with
   positions, and issues (openings that don't fit, dangling references, free wall ends).

## Invariants — do not break these

- **`base` is ground truth** (the house as it exists). Only correct base when the human
  says reality is wrong. Design work goes in variants.
- Express ideas as deltas: `demolish` (base wall ids), `removeOpenings` (base opening
  ids), plus new `walls`/`openings`/`labels`/`furniture`.
- Ids are references: never rename a base wall without updating every `demolish`,
  `removeOpenings`-adjacent structure and every opening's `wall` field across **all**
  variants.
- Openings: `at` is the **centre** distance (m) from the wall's `from` end and must fit:
  `at ± width/2` inside `[0, wallLength]`.
- Furniture `at` is the piece's **centre**, angle in degrees.
- A variant wall with `partial: "<baseId>"` is the kept part of a partially demolished
  base wall — keep its `t`/`h`/`floor` equal to the base wall's.
- Keep `notes` fields updated — they are the shared memory between humans and agents.

## Sync warning (important)

If the tool is **not linked** to the file, the human's edits live only in the browser's
localStorage and the file may be stale. Never assume the file is current — ask, or have
the human link the file. The tool detects file/browser divergence on link and asks the
human which side wins (snapshotting both first), but the polite agent confirms before
overwriting.

## Sketch strokes = human intent for you

Humans can draw freehand strokes with a note (✏ Sketch). Convert them into proper
geometry, then delete the stroke.

## Rendering hand-off

`Export → .glb` embeds the current camera + sun as `userData.render` extras
(`{camera:{pos,target,fov}, sun:{day,min,on,az,elev}}`, three.js y-up coordinates) —
enough to reproduce the exact view in Blender or any external renderer.
