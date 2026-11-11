# Northstar flight radar

A Netherlands-focused, live aircraft radar built with React and Leaflet. Aircraft positions are provided by [adsb.lol](https://adsb.lol/); the map uses [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles.

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Open the address printed by Vite. For a production-style local server, run `npm run build` followed by `npm start`.

Run `npm test` to check the aircraft feed proxy.

## Deployment

The site is hosted on Azure Static Web Apps. A GitHub Actions workflow builds and deploys the site and its managed Azure Functions API on every push to `main`; it can also be started manually. The workflow uses the repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN` for deployment. The API proxies aircraft feed requests because the provider does not allow cross-origin browser requests.

Pan and zoom to explore another area. The aircraft feed refreshes every 15 seconds and the search matches callsigns, registrations, aircraft types, and ICAO identifiers. Select an aircraft on the map or in the list to inspect its available data. The list shows up to 100 matches; search narrows both the list and the map.

To change the default location, edit the `HOME` object near the top of `src/main.jsx`. The feed searches around the map center, up to the provider's 250 nautical mile radius limit; at wide zoom levels, aircraft outside that radius may not appear. Coverage depends on volunteer receivers and aircraft broadcasts. Feed errors are shown in the interface, and previously fetched positions may be stale.

This application is for informational purposes only and must not be used for navigation.
