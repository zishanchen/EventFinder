# EventFinder Backend

Node.js, Express, MongoDB, and Mongoose backend for EventFinder.

## Docker Setup

The application is intended to run with Docker Compose from a folder containing
both repositories:

```text
EventFinder/
  Backend/
  Frontend/
  docker-compose.yml
```

For submission, `docker-compose.yml` is included in this Backend repository.
After cloning both repositories, move or copy it one folder up so it sits next to
`Backend/` and `Frontend/`, then run:

```bash
docker compose up
```

Docker Compose starts:

```text
mongo     local MongoDB database
backend   Express API on port 5001
seed      one-time demo data import
frontend  nginx-served frontend on port 5173
```

The app is available at:

```text
http://localhost:5173
```

The backend API is available at:

```text
http://localhost:5001
```

No `.env` file is required for the Docker setup. The backend receives
`MONGO_URI=mongodb://mongo:27017/EventFinder` from `docker-compose.yml`.

## Demo Data

The `seed` service runs automatically during `docker compose up`. It creates
fixed tags, host and participant accounts, events, registrations, ratings,
invoices, payouts, boost options, and an admin account.

The seed container exits after completion. This is expected.

Useful seeded accounts include:

```text
Admin:       test.admin@gmail.com / Admin@EventFinder!
Host:        minga.minds@gmail.com / Host@EventFinder!
Participant: alex.mueller@tum.de / Participant@EventFinder!
```

## Local Development

Install dependencies and start the backend locally:

```bash
npm install
npm run dev
```

Local development uses the `MONGO_URI` value from `src/config/appConfig.js`
unless an environment variable overrides it:

```bash
MONGO_URI=mongodb://localhost:27017/EventFinder npm run dev
```

To seed the configured database manually:

```bash
npm run seed
```

## Scripts

```bash
npm run dev    # start backend with nodemon
npm start      # start backend with node
npm run seed   # reset and insert demo data
```

## Structure

```text
src/
  config/
  controllers/
  jobs/
  middleware/
  models/
  routes/
  seed/
  services/
  utils/
  server.js
```
