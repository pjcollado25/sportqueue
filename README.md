# SportQueue

One queue. Every sport.

SportQueue is a phone-first court session app for recreational pickleball. Staff start a session, check players in, build balanced doubles, run an Up Next queue, assign courts, record results, and view rankings — all on one phone.

## This phone only

The queue is saved in this browser with `localStorage`. It stays after a refresh on that phone. It does **not** sync to another phone, browser, or account. There is no server, database, or login. Staff controls are a local prototype, not secure access control.

## Phone layout

The app is designed for a phone in the hand:

- Large type and buttons
- A bottom menu: Session, Players, Rankings, History, and More (Settings)
- The Session screen is the live hub during play
- Wider screens show the same sections in a side menu

## Run it

```bash
npm install
npm run dev
```

Open the local address Next.js prints. On a phone, use the same Wi-Fi and your computer's address, or resize the browser to a narrow width.

Other commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

`npm run test` runs unit and component tests. `npm run test:e2e` runs Playwright on a phone-sized browser and a desktop browser. Install Playwright browsers once with `npx playwright install chromium` if that command asks for them.

## What you can do

Staff start a pickleball session (court count and singles or doubles), manage a player list with estimated skill ratings, check players in, generate balanced doubles for review, send games to Up Next, call and assign courts, start play only when ready, and record winners with optional scores. Rankings and Game history are separate tabs. Settings covers venue name, sports, export, restore, and sample data.

Built-in sports are pickleball, tennis, badminton, volleyball, table tennis, and other. Basketball remains in history only and cannot be chosen for new play. Venues can edit sports or add their own. A sport with people still waiting or playing cannot be removed.

## Code map

- `src/lib/domain.ts` holds queue rules.
- `src/lib/repository.ts` is the storage boundary. Screens do not call `localStorage` directly.
- `src/lib/storage.ts` is the browser implementation.
- `src/lib/store.ts` connects the screens to those rules.

A later remote backend can replace the repository without rewriting the screens. That backend is not included.
