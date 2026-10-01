# EventFinder Frontend

React and Vite frontend for EventFinder.

## Docker Setup

The complete application is started from a folder that contains both repositories:

```text
EventFinder/
  Backend/
  Frontend/
  docker-compose.yml
```

The `docker-compose.yml` file is stored in the Backend repository for submission.
After cloning both repositories, move or copy it one folder up so it sits next to
`Backend/` and `Frontend/`, then run:

```bash
docker compose up
```

The frontend is served at:

```text
http://localhost:5173
```

In Docker, nginx serves the built frontend and forwards `/api/*` requests to the
backend container. No `.env` file is required.

## Local Development

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

By default, local development uses:

```text
http://localhost:5001/api
```

The API base URL is configured in `src/config.js`. The Docker build overrides it
with `/api` so browser requests go through the nginx proxy.

## Scripts

```bash
npm run dev      # start Vite dev server
npm run build    # create production build
npm run preview  # preview production build locally
```

## Structure

```text
public/
src/
  api/
  components/
  context/
  hooks/
  pages/
  styles/
  utils/
  App.jsx
  main.jsx
```
