# Connect the calendar to mdkelectric.ca

The database tables are already created in the Wix CMS (**CalendarEvents**, **CalendarItems** and **CalendarConfig**). You need to do two things: add the backend code, then add the calendar page.

## 1. Add the backend code (one time, about 3 minutes)

1. Open the **MDK Electric Ltd.** site in the Wix Editor.
2. Make sure **Dev Mode** is on (top menu **Dev Mode → Turn on Dev Mode**). It's already enabled on this site.
3. In the code sidebar, go to **Backend & Public → Backend**.
4. If a file called **http-functions.js** is already there, open it and scroll to the bottom. If it isn't, click the **+** next to **Backend** and choose **Expose site API**. That creates `http-functions.js` with some sample code, which you can delete or leave in place.
5. Copy **everything** from [`wix-backend/http-functions.js`](wix-backend/http-functions.js) and paste it in. If the file already had code, paste this below the existing code. It won't clash.
6. Click **Publish**. The backend only goes live on the published site.
7. Check it: open `https://www.mdkelectric.ca/_functions/mdkCalendar` in a browser. You should see `{"ok":true,"service":"mdk-calendar",…}`.

## 2. Add the calendar page

1. Add a new page (for example **Team Calendar**) and hide it from the menu if you want.
2. Protect it with a password the same way as the timesheet page: **Page settings → Permissions → Password holders**, then set the PIN.
3. Add a button **Open Team Calendar** that links to the **access link** (the GitHub URL with `#k=…` on the end, which Claude sent you). Set it to open in a new tab. This works best on phones.
4. For desktop, you can also embed it: **Add Elements → Embed Code → Embed a Site**, paste the same access link, make it full width and about 850px tall. On mobile, give it a fixed height (about 760–900px) and turn off auto height.

Because the access key is only on the PIN-protected page, only people who know the PIN can open the calendar. Once someone has opened it, their device remembers it, so they can add it to their home screen.

### Optional: per-person buttons

Add `&person=Name` to the access link to open straight to one person's schedule, for example `…#k=KEY&person=Dustin&view=week`.

## Changing things later

| To… | Do this |
|---|---|
| Change who can get in | Change the page password on Wix. To lock out devices that already have it, change `accessKey` in **CMS → Calendar Config → main**, then update the button link. |
| Reset phone subscriptions | Change `feedKey` in the same row. Everyone will need to re-subscribe. |
| Add or hide people, change colours | In the calendar: **Settings → Team** (shared with everyone) |
| See or export the raw data | **CMS → Calendar Events** in the Wix dashboard |
