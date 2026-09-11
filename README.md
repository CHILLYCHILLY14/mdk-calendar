# MDK Team Calendar

A shared crew calendar for MDK Electric. It's hosted on GitHub Pages and linked from the Wix site. Everyone who opens it from the staff page sees the same schedule, and changes show up on every phone and computer within about 15 seconds.

**Live app:** `https://chillychilly14.github.io/mdk-calendar/` (open it through the MDK staff page; the link there includes the access key)

## Features

- **Views:** Month, Week, Day (one column per person, or combined), Crew (everyone's week side by side), and List (upcoming entries).
- **People tabs:** tap a name to see just that person, tap more names to add them, or tap **All**. Each person has their own colour, and the colours are shared with the whole team.
- **Entry types:** Job, Service call, Quote / estimate, Inspection, Meeting, Training, Vacation, Day off, Other. Vacation and Day off show with stripes so time away stands out.
- **Repeating entries:** daily, weekdays, weekly, every 2 weeks, monthly, or yearly, with an optional end date. You can edit or delete just one occurrence or the whole series.
- **Heads-up warnings** when you book someone who's already busy or away.
- **Drag and drop** on a computer: move entries to another day, time, or person.
- **Themes:** Light, Dark, MDK Night, Hi-Vis, Blueprint, or Auto (follows the device).
- **Ontario holidays** are shown on the calendar. You can turn them off.
- **Works offline:** changes you make offline are saved on the device and upload when it's back online. If two people edit the same entry, the app asks whose version to keep.
- **Phone calendar feed:** subscribe once (read-only) and entries show up in the iPhone, Google, or Outlook calendar app.
- **Search**, keyboard shortcuts, print, and add-to-home-screen.

## How it works

```
GitHub Pages (this repo)  ──fetch──▶  mdkelectric.ca/_functions/mdkCalendar  ──▶  Wix CMS
index.html · app.js · styles.css      (wix-backend/http-functions.js)             CalendarEvents
                                                                                  CalendarConfig
```

- The app is plain HTML, CSS, and JavaScript with no build step and no dependencies.
- Entries are stored in the Wix site's CMS, in the **CalendarEvents** collection. Only the site admin can read or write it directly. The backend code checks the access key on every request.
- The access key and phone-feed key are stored in the **CalendarConfig** collection (row `main`) in the Wix CMS. They're never in this repo. To revoke everyone's access, change `accessKey` there and send people the new link.

## Files

| File | What it is |
|---|---|
| `index.html`, `app.js`, `styles.css` | The calendar app |
| `config.js` | Backend URL and sync interval |
| `wix-backend/http-functions.js` | Backend code to paste into Wix (see WIX_SETUP.md) |
| `assets/` | MDK logo and app icons |
| `dev/` | Local test server that runs the real backend code against a fake database |

## Local development

```bash
npm run dev                 # serves the app + fake backend on http://localhost:4180
python3 dev/seed.py         # optional: add sample entries
# open http://localhost:4180/?api=local#k=testkey123
```

Demo mode (sample data, nothing shared): add `#demo` to the URL.

## Useful links

- Open straight to a person: `…/mdk-calendar/#k=KEY&person=Dustin`
- Several people plus a view: `…/mdk-calendar/#k=KEY&person=Dustin,Cal&view=crew`
- Views: `month`, `week`, `day`, `crew`, `list`

The MDK name and logo belong to MDK Electric Ltd.
