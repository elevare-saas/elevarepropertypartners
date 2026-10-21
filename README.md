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
    content.ts    homepage copy (services, journey, ownership, FAQ) and figures derived from data.ts
    journey.ts    runs the real engine on the demo request for the Journey section
    photos.ts     real photos (public/photos, from Wikimedia Commons; credits in photos.json): areas + illustrative listing photos
    store.ts      app state (S), current step and back-trail, render/update signals
    actions.ts    everything a tap or input does, including the landing shortcuts into the flow
  components/
    ui.tsx        shared pieces: option card, chip, CTA, box, concierge bubble, property photo (Art)
    landing/      the Elevare homepage, full-bleed bands alternating dark and "paper" (ivory), composed in Landing.tsx:
                  Hero (photo, concierge search bar, example match, price ticker), Approach (statement, photo
                  collage, figures), Services, Journey (scroll story on a phone) + Experience ("want to try it?"),
                  FeaturedHomes (portfolio), AreaGuide (area photo reel + details, fair-price tab), Owners
                  (income view, yield estimator), Faq, Closing (sunset contact + footer with photo credits)
    Quiz.tsx      rent/buy → who → style → area → property → timing → budget → must-haves → confirm
    Results.tsx   matching animation, matches + compare table, viewing booking, send message
    LivePanel.tsx live matches (sticky sidebar ≥1000px, bottom sheet below)
    Typeahead.tsx word suggestions for the free-text boxes
  index.css       Tailwind theme tokens, breakpoints and the few global styles
```

The homepage is Elevare's brand site: services, the concierge journey, portfolio, market data and the owner view. Every section opens the concierge at the right point:
a persona card skips "who", an area or listing opens the matches, and the "Want to try it?" box parses free text into a brief.
Once a visitor starts, the quiz and results keep their focused, single-column layout.

Photos are openly licensed (CC BY / CC BY-SA / public domain) and credited in the footer. Area photos show the actual place;
listing photos are illustrative until real listing photos replace them (`LISTING` map in `photos.ts`).

To go live, fill in `CONFIG` in `src/concierge/data.ts` and replace the `LISTINGS` sample data with real rentals and sales.

Tailwind is loaded **without preflight** on purpose: the original page relies on browser default styles,
so the React version renders pixel-for-pixel the same. Breakpoints match the original exactly
(`upto480`, `upto520`, `upto560`, `upto600`, `upto999`, `from1000` variants in `index.css`).
