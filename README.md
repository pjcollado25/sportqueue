# SportQueue

One queue. Every sport.

SportQueue is a phone-first queue board for recreational courts. Players join a sport, see their place, and staff on the same phone call the next group, assign a court, and finish the game.

## This phone only

The queue is saved in this browser with `localStorage`. It stays after a refresh on that phone. It does **not** sync to another phone, browser, or account. There is no server, database, or login. Staff controls are a local prototype, not secure access control.

## Phone layout

The app is designed for a phone in the hand:

- Large type and buttons
- A bottom menu: Home, Join, Queue, Courts, and More
- More opens Match history, Settings, and the Staff dashboard
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

Players can pick a sport, choose singles, doubles, or team play when that sport allows it, enter a name, optionally add teammates, pick a court preference, and join. They can see their place and leave while they are waiting or have been called. They can only leave a spot joined on that phone.

Staff on that phone can call the next group, skip, mark a no-show, assign a court, start, finish, send a group back, add someone manually, and remove an entry. Settings covers the venue name, sports, export, restore, and sample data. Courts shows what is open, reserved, or in play.

Built-in sports are pickleball, tennis, badminton, basketball, volleyball, table tennis, and other. Venues can edit them or add their own. A sport with people still waiting or playing cannot be removed.

## Code map

- `src/lib/domain.ts` holds queue rules.
- `src/lib/repository.ts` is the storage boundary. Screens do not call `localStorage` directly.
- `src/lib/storage.ts` is the browser implementation.
- `src/lib/store.ts` connects the screens to those rules.

A later remote backend can replace the repository without rewriting the screens. That backend is not included.
