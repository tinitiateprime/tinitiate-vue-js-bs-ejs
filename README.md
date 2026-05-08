# GitHub EJS Vue Template Engine

Modular Express + EJS template engine that fetches `data.json` and `theme.json` from GitHub at runtime, renders reusable EJS sections on the server, and uses Vue in the browser for page-builder state, nested subpages, cart actions, and forms.

## Flow

Browser UI:
Vue manages `+ add section`, nested page/subpage state, cart state, theme toggle, and form submissions in `public/js/app.js`.

Backend:
Express routes in `src/routes` call controllers in `src/controllers`, which use `src/services/githubContentService.js` to fetch GitHub JSON and render EJS views.

Rendering:
`views/shell.ejs` always renders header first, navbar second, dynamic middle sections next, and footer last. Components live in `views/components`.

Deployment:
Netlify routes every page request through `netlify/functions/render.js`, so GitHub content is fetched at runtime after deployment.

## Builder Architecture

The builder uses three user-facing states:

1. Skeleton selection:
   The first screen is neutral and unthemed. It shows five template engines only: Template Engine 1 through Template Engine 5. It does not show `data.json` content and does not show the final colored site.

2. Composition:
   After selecting a skeleton, the user sees Home in the center. The `+` button opens a right-side data panel populated from `data.json`, including cards like About and Our Products. Clicking a data card selects it into the Home tree. Selected cards can add nested cards with their own `+` button or be removed with `x`.

   The Home skeleton always keeps fixed layout regions in this order: Header first, Navbar second, selectable content in the middle, and Footer at the bottom. Only the middle content region can be changed by selecting data cards.

3. Preview:
   After clicking Preview, the real header, navbar, footer, selected cards, and `theme.json` colors are applied. This is the first point where the finished theme appears.

Template switching:
The Home builder includes a Switch Template dropdown. Each template engine keeps its own selected `data.json` cards in `sessionStorage`, so changing templates restores that template's saved cards during the same browser session. Closing the browser clears those template selections.

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

If port `3000` is already busy and you did not set `PORT`, the server will try the next available ports automatically. To force a specific port:

```bash
PORT=3001 npm start
```

## GitHub Data Settings

Defaults point to:

```text
tinitiateprime/tech-stack-data.json
branch: master
data: data.json
theme: theme.json
```

Override with environment variables:

```text
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH
GITHUB_DATA_PATH
GITHUB_THEME_PATH
GITHUB_TOKEN
CONTENT_CACHE_TTL_MS
```

## Netlify

Use the included `netlify.toml`. Build command:

```bash
npm run netlify:build
```

The function uses the same Express app as local development, and `included_files` ensures EJS views are bundled with the serverless function.
