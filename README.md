# GitHub EJS Vue Template Engine

A modular Node.js application that renders an EJS website from JSON files stored in GitHub. Express handles the server, EJS renders the HTML, and Vue 3 from a CDN powers the browser-side page builder, preview mode, cart, theme toggle, and forms.

The project is useful when you want website content to live in GitHub as `data.json` and `theme.json`, while the app renders that content dynamically at runtime.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [What This Project Does](#what-this-project-does)
3. [Quick Start](#quick-start)
4. [Project Structure](#project-structure)
5. [A to Z Runtime Flow](#a-to-z-runtime-flow)
6. [Builder Workflow](#builder-workflow)
7. [Routes](#routes)
8. [API Endpoints](#api-endpoints)
9. [GitHub Content Settings](#github-content-settings)
10. [Expected data.json Shape](#expected-datajson-shape)
11. [Expected theme.json Shape](#expected-themejson-shape)
12. [How to Customize](#how-to-customize)
13. [Netlify Deployment](#netlify-deployment)
14. [Troubleshooting](#troubleshooting)

## Tech Stack

- Node.js 18.17 or newer
- Express 4
- EJS 3
- Vue 3 loaded in the browser from `https://unpkg.com/vue@3/dist/vue.global.prod.js`
- Netlify Functions with `serverless-http`
- GitHub raw JSON as the runtime CMS

There is no Vue build pipeline in this project. Vue is used directly in the browser to manage interactive state after the server renders the page.

## What This Project Does

This application:

- Fetches website content from GitHub at runtime.
- Fetches theme tokens from GitHub at runtime.
- Converts theme tokens into CSS variables.
- Renders header, navbar, page sections, and footer with EJS.
- Exposes API endpoints for content, forms, auth demos, and cart quote demos.
- Provides a browser-side builder where users can choose a template engine, add `data.json` cards, create subpages, and preview the final themed page.
- Keeps selected builder state per template in `sessionStorage`.
- Keeps cart and theme preference in `localStorage`.
- Runs locally with Express and deploys to Netlify as a serverless function.

## Quick Start

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

For development, this project uses the same command:

```bash
npm run dev
```

If port `3000` is busy and `PORT` is not set, the server automatically tries the next available ports. To force a specific port:

PowerShell:

```powershell
$env:PORT=3001
npm start
```

macOS or Linux:

```bash
PORT=3001 npm start
```

## Available Scripts

```bash
npm start
```

Starts the Express server from `src/server.js`.

```bash
npm run dev
```

Also starts the Express server. This is currently the same as `npm start`.

```bash
npm run build
```

Runs `scripts/netlify-build.js`. This validates that Node 18 or newer is being used and prints a Netlify readiness message.

```bash
npm run netlify:build
```

Same as `npm run build`. Netlify uses this command from `netlify.toml`.

## Project Structure

```text
.
|-- package.json
|-- package-lock.json
|-- netlify.toml
|-- scripts/
|   `-- netlify-build.js
|-- netlify/
|   `-- functions/
|       `-- render.js
|-- public/
|   |-- css/
|   |   `-- styles.css
|   `-- js/
|       `-- app.js
|-- src/
|   |-- app.js
|   |-- server.js
|   |-- config/
|   |   `-- github.js
|   |-- controllers/
|   |   |-- apiController.js
|   |   `-- pageController.js
|   |-- routes/
|   |   |-- apiRoutes.js
|   |   `-- pageRoutes.js
|   `-- services/
|       |-- githubContentService.js
|       |-- pageService.js
|       `-- themeService.js
`-- views/
    |-- shell.ejs
    |-- error.ejs
    |-- partials/
    |   |-- head.ejs
    |   |-- header.ejs
    |   |-- navbar.ejs
    |   |-- builder.ejs
    |   `-- footer.ejs
    `-- components/
        |-- section-renderer.ejs
        |-- about.ejs
        |-- services.ejs
        |-- catalog.ejs
        |-- comparison.ejs
        |-- calendar.ejs
        |-- dashboard.ejs
        |-- contact.ejs
        |-- login.ejs
        |-- signup.ejs
        `-- cart.ejs
```

## A to Z Runtime Flow

1. A browser requests a page such as `/`, `/products`, `/pricing`, or `/contact`.
2. `src/server.js` starts the Express app created in `src/app.js`.
3. `src/app.js` registers JSON/body middleware, static files from `public`, `/api` routes, and page routes.
4. Page requests are handled by `src/routes/pageRoutes.js`.
5. `pageRoutes.js` sends every page request to `renderPage` in `src/controllers/pageController.js`.
6. `renderPage` calls `getSitePayload()` from `src/services/githubContentService.js`.
7. `githubContentService.js` builds GitHub raw URLs from `src/config/github.js`.
8. The app fetches `data.json` and `theme.json` from GitHub.
9. The app caches the payload for `CONTENT_CACHE_TTL_MS`, which defaults to `60000` milliseconds.
10. `themeService.js` converts theme JSON into CSS variables.
11. `pageService.js` builds the component catalog, page tree, dashboard metrics, and current route sections.
12. Express renders `views/shell.ejs`.
13. `shell.ejs` includes the head, header, navbar, builder area, server-rendered sections, and footer.
14. `shell.ejs` also serializes the runtime payload into `window.SiteTemplatePayload`.
15. The browser loads Vue from the CDN and then loads `public/js/app.js`.
16. `public/js/app.js` mounts Vue on `#builder-app`.
17. Vue manages template selection, selected cards, subpages, preview mode, cart state, forms, and theme switching.
18. If the app is deployed to Netlify, `netlify/functions/render.js` wraps the same Express app with `serverless-http`.

## Builder Workflow

The builder has three main states.

### 1. Template Selection

The first screen shows five skeleton choices:

- Template Engine 1
- Template Engine 2
- Template Engine 3
- Template Engine 4
- Template Engine 5

At this stage, the app shows neutral skeletons only. It does not show the final themed website yet.

### 2. Composition Mode

After selecting a template:

- The Home canvas appears.
- Header, Navbar, and Footer are fixed regions.
- Only the middle content area is editable.
- Clicking `+` opens the right-side `data.json` card panel.
- Available cards are generated from the fetched JSON content.
- Cards can be added to Home or to nested sections.
- Subpages can be created from the builder.
- Each template engine stores its own selected cards in `sessionStorage`.

### 3. Preview Mode

After clicking Preview:

- The selected cards render as real website sections.
- Header, navbar, footer, and selected content use the runtime GitHub data.
- Colors come from `theme.json`.
- The user can switch between light and dark themes.
- Cart and form behavior stay interactive.

## Routes

All non-API page routes are handled by one wildcard route:

```text
GET *
```

The route resolver maps friendly slugs to section groups.

| Route | Rendered sections |
| --- | --- |
| `/` or `/home` | services, about, catalog, comparison, calendar, dashboard, contact |
| `/pricing` | comparison |
| `/products` | catalog |
| `/shop` | catalog, cart |
| `/events` | calendar |
| `/signin` | login |
| `/register` | signup |
| Any component key such as `/about` | matching component if available |
| Unknown route | 404 status with dashboard fallback |

Navbar links come from `data.json` at `site.navbar.links`.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/content` | Returns the current runtime payload. |
| `GET` | `/api/content?refresh=1` | Forces a fresh GitHub content fetch. |
| `POST` | `/api/forms/contact` | Demo contact form endpoint. |
| `POST` | `/api/auth/login` | Demo login endpoint. |
| `POST` | `/api/auth/signup` | Demo signup endpoint. |
| `POST` | `/api/cart/quote` | Returns quoted cart totals based on catalog item IDs and quantities. |

Example cart quote request:

```json
{
  "quantities": {
    "starter": 1,
    "pro": 2
  }
}
```

Example response:

```json
{
  "ok": true,
  "items": [
    {
      "id": "starter",
      "name": "Starter",
      "quantity": 1,
      "price": 49,
      "total": 49,
      "currency": "$"
    }
  ],
  "total": 49
}
```

The form and auth endpoints are demo endpoints. They return JSON success responses and do not save to a database.

## GitHub Content Settings

By default, the app loads:

```text
owner: tinitiateprime
repo: tech-stack-data.json
branch: master
data file: data.json
theme file: theme.json
```

You can override those values with environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `GITHUB_OWNER` | GitHub username or organization | `tinitiateprime` |
| `GITHUB_REPO` | Repository containing JSON files | `tech-stack-data.json` |
| `GITHUB_BRANCH` | Branch name | `master` |
| `GITHUB_DATA_PATH` | Path to site content JSON | `data.json` |
| `GITHUB_THEME_PATH` | Path to theme JSON | `theme.json` |
| `GITHUB_TOKEN` | Optional GitHub token for private repos or higher rate limits | empty |
| `CONTENT_CACHE_TTL_MS` | Runtime cache duration in milliseconds | `60000` |
| `PORT` | Local server port | `3000` |
| `PORT_SCAN_ATTEMPTS` | Number of fallback ports to try when `PORT` is not explicit | `10` |

Create a local `.env` file if you want custom values:

```env
GITHUB_OWNER=your-github-user
GITHUB_REPO=your-content-repo
GITHUB_BRANCH=main
GITHUB_DATA_PATH=data.json
GITHUB_THEME_PATH=theme.json
CONTENT_CACHE_TTL_MS=60000
```

For a private GitHub repo, add:

```env
GITHUB_TOKEN=your_token_here
```

Do not commit real tokens.

## Expected data.json Shape

The app expects a top-level object with keys that match the reusable sections.

```json
{
  "header": {
    "title": "Template Engine",
    "subtitle": "Build pages from GitHub JSON.",
    "buttons": [
      {
        "label": "View Products",
        "path": "/products",
        "variant": "primary"
      }
    ],
    "stats": [
      {
        "value": "10+",
        "label": "Sections"
      }
    ]
  },
  "navbar": {
    "brand": "Template Engine",
    "tagline": "GitHub powered",
    "links": [
      {
        "name": "Home",
        "path": "/"
      },
      {
        "name": "Products",
        "path": "/products"
      }
    ],
    "cta": {
      "label": "Contact",
      "path": "/contact"
    }
  },
  "about": {
    "label": "About",
    "title": "About us",
    "description": "Short description.",
    "mission": "Mission statement.",
    "values": [
      {
        "icon": "+",
        "title": "Fast",
        "description": "Useful value description."
      }
    ]
  },
  "services": {
    "label": "Services",
    "title": "What we do",
    "subtitle": "Service subtitle.",
    "items": [
      {
        "id": "design",
        "icon": "D",
        "title": "Design",
        "description": "Service description.",
        "tags": ["UI", "UX"]
      }
    ]
  },
  "catalog": {
    "label": "Catalog",
    "title": "Products",
    "subtitle": "Product subtitle.",
    "items": [
      {
        "id": "starter",
        "name": "Starter",
        "description": "Starter package.",
        "currency": "$",
        "price": 49,
        "billing": "/mo",
        "badge": "Popular",
        "tags": ["Basic"],
        "features": ["Feature one", "Feature two"]
      }
    ]
  },
  "comparison": {
    "label": "Pricing",
    "title": "Compare plans",
    "subtitle": "Choose a plan.",
    "plans": ["Starter", "Pro"],
    "recommended": "Pro",
    "features": [
      {
        "name": "Support",
        "values": ["Email", "Priority"]
      }
    ]
  },
  "calendar": {
    "label": "Events",
    "title": "Upcoming events",
    "subtitle": "Join live sessions.",
    "events": [
      {
        "id": "launch",
        "date": "2026-05-08",
        "time": "10:00",
        "timezone": "IST",
        "title": "Launch",
        "description": "Event description.",
        "location": "Online"
      }
    ]
  },
  "contact": {
    "label": "Contact",
    "title": "Talk to us",
    "subtitle": "Send a message.",
    "email": "hello@example.com",
    "phone": "+1 555 0100",
    "address": "Remote",
    "socials": [
      {
        "platform": "GitHub",
        "url": "https://github.com"
      }
    ],
    "form": {
      "submit": "Send",
      "fields": [
        {
          "label": "Email",
          "name": "email",
          "type": "email",
          "required": true
        },
        {
          "label": "Message",
          "name": "message",
          "type": "textarea",
          "required": true
        }
      ]
    }
  },
  "footer": {
    "brand": "Template Engine",
    "tagline": "Runtime rendered from GitHub.",
    "copyright": "Copyright 2026",
    "links": [
      {
        "group": "Company",
        "items": [
          {
            "label": "About",
            "path": "/about"
          }
        ]
      }
    ]
  }
}
```

Available reusable content components:

- `about`
- `services`
- `catalog`
- `comparison`
- `calendar`
- `dashboard`
- `contact`
- `login`
- `signup`
- `cart`

`dashboard`, `login`, `signup`, and `cart` can render even if they are not fully defined in `data.json`. The dashboard is generated from content counts. Login and signup use built-in demo forms. Cart uses `catalog.items`.

## Expected theme.json Shape

The theme file should contain `light` and optionally `dark` objects. Each key becomes a CSS variable.

```json
{
  "light": {
    "background": "0 0% 100%",
    "foreground": "220 20% 10%",
    "surface": "0 0% 98%",
    "muted": "220 12% 45%",
    "primary": "220 90% 56%",
    "primaryForeground": "0 0% 100%",
    "border": "220 12% 88%",
    "radius": "8px"
  },
  "dark": {
    "background": "220 20% 8%",
    "foreground": "0 0% 96%",
    "surface": "220 18% 12%",
    "muted": "220 10% 70%",
    "primary": "200 90% 60%",
    "primaryForeground": "220 20% 8%",
    "border": "220 14% 24%",
    "radius": "8px"
  }
}
```

Theme values that look like HSL channels, for example `220 90% 56%`, are converted to `hsl(220 90% 56%)`. Other CSS values pass through as-is.

Examples:

| Theme key | CSS variable |
| --- | --- |
| `background` | `--color-background` |
| `foreground` | `--color-foreground` |
| `primaryForeground` | `--color-primary-foreground` |
| `radius` | `--radius` |

If `dark` is missing, the app reuses the `light` theme.

## How to Customize

### Change Website Content

1. Update `data.json` in your GitHub content repository.
2. Commit and push the JSON file.
3. Restart the local app or call:

```text
/api/content?refresh=1
```

The app will fetch the latest content and rebuild the payload.

### Change Colors

1. Update `theme.json` in your GitHub content repository.
2. Keep the `light` and `dark` objects consistent.
3. Push the file.
4. Refresh content with `/api/content?refresh=1`.

### Add a New EJS Section

1. Create a new component file in `views/components`, for example `testimonials.ejs`.
2. Add the new key to `BASE_COMPONENTS` in `src/services/pageService.js`.
3. Add an include branch in `views/components/section-renderer.ejs`.
4. Add matching Vue preview support in `public/js/app.js` if the section should work inside the builder preview.
5. Add the matching content key to `data.json`.

### Add a New Route Alias

Update `ROUTE_ALIASES` in `src/services/pageService.js`.

Example:

```js
const ROUTE_ALIASES = {
  home: ['services', 'about', 'catalog'],
  testimonials: ['testimonials']
};
```

### Change Layout or Styling

Use:

```text
public/css/styles.css
```

The CSS controls:

- Server-rendered sections
- Builder skeleton screen
- Composition canvas
- Preview mode
- Cart drawer
- Forms
- Theme variable usage

## Netlify Deployment

Netlify is already configured with `netlify.toml`.

Build command:

```bash
npm run netlify:build
```

Publish directory:

```text
public
```

Functions directory:

```text
netlify/functions
```

The redirect rule sends every page request to the serverless renderer:

```toml
[[redirects]]
from = "/*"
to = "/.netlify/functions/render/:splat"
status = 200
```

`netlify/functions/render.js` loads the same Express app used locally:

```js
const serverless = require('serverless-http');
const { createApp } = require('../../src/app');

module.exports.handler = serverless(createApp());
```

Set the GitHub environment variables in Netlify if you do not want to use the defaults.

## Troubleshooting

### The app shows a runtime content error

Check that:

- The GitHub repo exists.
- The branch name is correct.
- `data.json` and `theme.json` paths are correct.
- The JSON files are valid JSON.
- A private repo has a valid `GITHUB_TOKEN`.

### GitHub rate limits are hit

Set `GITHUB_TOKEN` to a GitHub token with read access to the content repo.

### Content changes are not visible

The runtime payload is cached for `CONTENT_CACHE_TTL_MS`. Use:

```text
/api/content?refresh=1
```

or lower the cache value in `.env`.

### Port 3000 is busy

If `PORT` is not set, the app tries the next available ports automatically. You can also set the port manually:

```powershell
$env:PORT=3001
npm start
```

### Vue interactions do not work

Check that the browser can load:

```text
https://unpkg.com/vue@3/dist/vue.global.prod.js
```

If that CDN is blocked, the server-rendered EJS sections still render, but the builder, cart drawer, and form enhancements will not run.

## End-to-End Summary

The project works like this:

```text
Browser request
  -> Express route
  -> GitHub data/theme fetch
  -> Payload build and cache
  -> EJS server render
  -> Browser receives HTML
  -> Vue mounts builder
  -> User selects template/cards/subpages
  -> Preview renders final selected content
  -> Netlify uses the same Express app through a serverless function
```

That is the full path from content in GitHub to a rendered, interactive website.
