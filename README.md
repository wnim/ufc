# UFC Recent Finishes (plain JS)

Simple app that fetches recent UFC events (last 6 months), lists main-card fights that did not end by draw or decision, and provides toggles to hide non-numbered events and women's fights.

**Current mode:** Demo with hardcoded sample data. Can be easily adapted to scrape live UFC data from your preferred source (UFC.com, Liquipedia, etc.).

## Features

- Lists recent UFC events (last 6 months)
- Toggle to hide non-numbered events
- Toggle to hide women's fights
- Click to view main-card finishes for each event (KO/TKO/Submission only, no decisions/draws)

## Setup

1. Install dependencies:

```bash
cd /home/nimw/experiments/ufc
npm install
```

2. Start the server:

```bash
npm start
```

Server runs on http://localhost:3000 (or PORT=4000 npm start for port 4000).

3. Open http://localhost:3000 (or 4000) in your browser.

## Architecture

- **server.js** — Express server with `/api/events` and `/api/event?slug=...` endpoints
- **public/main.js** — Frontend logic (fetch, render, toggle filtering)
- **public/index.html** — UI with toggle controls
- **public/styles.css** — Minimal styling

## Customization

To use live data instead of demo mode, replace the `DEMO_EVENTS` and `DEMO_FIGHTS` objects in `server.js` with actual scraping logic for your data source (UFC.com, Liquipedia MMA, Sherdog, etc.).
