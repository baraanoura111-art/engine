# Oasis Outreach

The owner outreach app for The Oasis Specialist, at **outreach.baraanoura.com**.

The screens are the same as the tracker sidebar. Data stays in the Google Sheets tracker;
the Apps Script project bound to it is the engine (`doPost` API) that this app talks to.

## Files
- `index.html` – the app (built from the sidebar, plus login and home-screen settings)
- `app.js` – connects the screens to the engine and handles the name + PIN login
- `config.js` – the engine's web address (Apps Script web app URL, ends in `/exec`)
- `manifest.webmanifest`, `sw.js`, `icons/` – app name, icon and home-screen install

## Logins
Name + PIN, set in Apps Script → Project Settings → Script properties:
`PIN_BARAA`, `PIN_GHIDA`. Five wrong PINs lock that name for 15 minutes.
Logins last 30 days. To sign everyone out, delete the `TOKEN_SECRET` script property.

## Hosting
Render static site from this repo (publish directory: `.`), custom domain `outreach.baraanoura.com`.
