// MDK Team Calendar — connection settings.
// API_URL is the Wix backend (wix-backend/http-functions.js) on mdkelectric.ca.
window.MDK_CALENDAR_CONFIG = {
  API_URL: 'https://www.mdkelectric.ca/_functions/mdkCalendar',
  FEED_URL: 'https://www.mdkelectric.ca/_functions/mdkCalendarFeed',
  POLL_SECONDS: 15
};
// Local testing: ?api=local points the app at the dev server (npm run dev).
if (/[?&]api=local\b/.test(location.search)) {
  window.MDK_CALENDAR_CONFIG.API_URL = location.origin + '/_functions/mdkCalendar';
  window.MDK_CALENDAR_CONFIG.FEED_URL = location.origin + '/_functions/mdkCalendarFeed';
  window.MDK_CALENDAR_CONFIG.POLL_SECONDS = 3;
}
