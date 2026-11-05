---
version: 1
slug: "design-rhodes-hub-pen"
primary_target: "design/rhodes-hub.pen"
related_targets: []
---

# Surface brief: Rhodes Hub app shell and Tool pages

Scope: the whole app UI (home, six Tool pages, command palette, Job states, Compare, audio preview, Not ready). Mode: Operate.
Audience and task: the author on his Mac, plus developers running the repo. Drop files, adjust a few settings, watch Jobs, download. Frequent, short sessions.
Constraints: Aurora palette (see PRODUCT.md). Avoid: HUD gamer/sci-fi glow, generic SaaS dashboard cards.
Design source: `design/rhodes-hub.pen` (pen.dev), one theme, Aurora. Implementation later in SvelteKit + Tailwind + bits-ui.
v1 scope notes: Home "Running now" and sidebar badges show only Jobs started from this browser (no Job list endpoint). Not ready pages tell the user to restart; there is no runtime re-check.
Unresolved: mobile layouts; whether Compare keeps a field.

## Direction contract

THESIS: A Swiss International Style grid on near-black where results are set as poster numerals. It refuses the tools-hub default of card grids, colored icon tiles, and pill badges.

OWN-WORLD: Near-black #0B0D10 ground, hairline rules #22282F, one dark field per screen (#0D1620 lit by a soft blue mesh glow) holding the primary action, fill blue #2878B5, accent blue #4A9FD8 reserved for the running Job. Darker Grotesque at strict weight steps, small text at 17px or larger, tabular numerals, flush-left, 4px corners on controls only, no shadows outside the palette overlay.

STORY: The visitor sees which Tool they are on, drops files into the lit field, watches Jobs in one ruled column, and sees each result as a large numeral before downloading.

FIRST VIEWPORT: Left rail 248px: name, search with ⌘K, Categories as lists, readiness status at the bottom. Tool page: title row across the top; below, left half is the drop field with settings along its bottom edge, right half is the Job column of ruled rows, done rows leading with a 68px numeral (−84%), running row in accent blue with a 2px progress line.

FORM: Swiss Grid in the Aurora rendition, candidate 6 of 7 on my list. seed:9585cd01471f1b12. Raises: orienteering (accent reserved for the active Job), high-density web (one hairline system, no whitespace inflation), acetate manual (fixed state vocabulary: queued, uploading, running, done, failed, canceled, not added), guide map (one work area dominates).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
