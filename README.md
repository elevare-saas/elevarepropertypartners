# Elevare Property Concierge

React + TypeScript + Tailwind CSS (v4) version of the Elevare Phuket property concierge.
The original single-file page is kept for reference at `src/demo/demo.html`.

## Workflows

```sh
bun install        # or npm install
bun run dev        # start the development server
bun run lint       # ESLint + TypeScript
bun run build      # production build
bun run start      # preview the production build
```

## Structure

```
src/
  concierge/
    data.ts       CONFIG (WhatsApp / SMS / email / lead endpoint), market figures, areas, personas, sample listings
    engine.ts     matching score, market comparison, free-text parser, concierge copy, message builder
    store.ts      app state (S), current step and back-trail, render/update signals
    actions.ts    everything a tap or input does
  components/
    ui.tsx        shared pieces: option card, chip, CTA, box, concierge bubble, property illustration
    Welcome.tsx   landing screen with the "describe what you need" box
    Quiz.tsx      rent/buy → who → style → area → property → timing → budget → must-haves → confirm
    Results.tsx   matching animation, matches + compare table, viewing booking, send message
    LivePanel.tsx live matches (sticky sidebar ≥1000px, bottom sheet below)
    Typeahead.tsx word suggestions for the free-text boxes
  index.css       Tailwind theme tokens, breakpoints and the few global styles
```

To go live, fill in `CONFIG` in `src/concierge/data.ts` and replace the `LISTINGS` sample data with real rentals and sales.

Tailwind is loaded **without preflight** on purpose: the original page relies on browser default styles,
so the React version renders pixel-for-pixel the same. Breakpoints match the original exactly
(`upto480`, `upto520`, `upto560`, `upto600`, `upto999`, `from1000` variants in `index.css`).
