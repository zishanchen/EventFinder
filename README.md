# 🎉 EventFinder

EventFinder is a full-stack event discovery and management platform for students in Munich. It brings participants, event hosts, and platform administrators together in one application for discovering events, managing registrations, running events, handling payments, and maintaining platform trust.

## ✨ Features

### 👥 Participants
- Discover events through searchable event listings and an interactive map
- Filter events by date, price, category, and event type
- View event details, locations, host information, attendees, and pricing
- Register for events and manage upcoming registrations
- Save events for later
- Manage a personal profile and profile picture
- Track attended events, interests, achievements, and ratings
- Review hosts after completed events
- View payment and invoice information

### 🧑‍💼 Hosts
- Create and publish events
- Edit event details after publication
- Manage event capacity and registered participants
- View upcoming and completed events
- Receive participant ratings and written feedback
- Rate participants after events
- Configure payout information
- Promote events through paid boost packages
- Schedule event boosts
- Complete payments through Stripe
- Complete host verification before fully participating as an event organizer

### 🛡️ Administrators
- View platform statistics and marketplace activity
- Manage users, roles, and account status
- Review host verification requests
- Moderate and override events
- Configure operational platform settings
- Monitor billing, transactions, payment status, refunds, and fees

## 🧰 Tech Stack

### 🎨 Frontend
- React
- Vite
- nginx

### ⚙️ Backend
- Node.js
- Express
- MongoDB
- Mongoose

### 🐳 Infrastructure
- Docker
- Docker Compose

### 🔌 Integrations
- Stripe for payment-related functionality
- Interactive maps for event discovery and event locations

## 📁 Repository Structure

```text
EventFinder/
├── README.md
│
├── Backend/
│   ├── .idea/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── data/
│   │   ├── jobs/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── seed/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── .dockerignore
│   ├── .gitignore
│   ├── Dockerfile
│   ├── README.md
│   ├── docker-compose.yml
│   ├── package-lock.json
│   └── package.json
│
└── Frontend/
    ├── .idea/
    ├── public/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── context/
    │   ├── data/
    │   ├── hooks/
    │   ├── pages/
    │   ├── styles/
    │   ├── utils/
    │   ├── App.jsx
    │   ├── config.js
    │   └── main.jsx
    ├── .dockerignore
    ├── .gitignore
    ├── Dockerfile
    ├── README.md
    ├── index.html
    ├── nginx.conf
    ├── package-lock.json
    └── package.json
```

## 🚀 Running the Full Application with Docker

The recommended way to run EventFinder is with Docker Compose.

The Compose configuration is located in the `Backend` directory.

From the repository root:

```bash
cd Backend
docker compose up
```

Docker Compose starts the application services:

```text
mongo      Local MongoDB database
backend    Express API on port 5001
seed       One-time demo data import
frontend   nginx-served frontend on port 5173
```

Once the services are running, open:

```text
http://localhost:5173
```

The backend API is available at:

```text
http://localhost:5001
```

The Docker setup uses the local MongoDB service:

```text
mongodb://mongo:27017/EventFinder
```

The `seed` service automatically imports demo data when the application starts. It exits after the import is complete; this is expected behavior.

## 👤 Demo Accounts

The seeded database includes accounts for each application role.

```text
Admin
Email: test.admin@gmail.com
Password: Admin@EventFinder!

Host
Email: minga.minds@gmail.com
Password: Host@EventFinder!

Participant
Email: alex.mueller@tum.de
Password: Participant@EventFinder!
```

These credentials are intended for local demonstration and development only.

## 💻 Local Development

### ⚙️ Backend

From the repository root:

```bash
cd Backend
npm install
npm run dev
```

The backend runs on:

```text
http://localhost:5001
```

To use a local MongoDB instance:

```bash
MONGO_URI=mongodb://localhost:27017/EventFinder npm run dev
```

To seed the configured database manually:

```bash
npm run seed
```

Available backend scripts:

```bash
npm run dev
npm start
npm run seed
```

### 🎨 Frontend

From the repository root:

```bash
cd Frontend
npm install
npm run dev
```

The frontend uses the backend API at:

```text
http://localhost:5001/api
```

The API base URL is configured in:

```text
Frontend/src/config.js
```

Available frontend scripts:

```bash
npm run dev
npm run build
npm run preview
```

## 🏗️ Application Architecture

```text
                   ┌──────────────────────┐
                   │      Frontend        │
                   │    React + Vite      │
                   └──────────┬───────────┘
                              │
                              │ HTTP / API
                              ▼
                   ┌──────────────────────┐
                   │       Backend        │
                   │   Node.js + Express  │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │       MongoDB        │
                   └──────────────────────┘
```

When running with Docker, nginx serves the production frontend and forwards `/api/*` requests to the backend container.

## 🧭 Main Application Areas

### 🔎 Event Discovery

EventFinder provides event cards with useful information such as title, date, location, price, tags, ratings, and attendance information. Users can browse events directly or explore event locations through an interactive map.

### 🙋 Participant Profile

Participant profiles combine event management and personalized information in one place. Users can manage upcoming registrations, review attended and saved events, track achievements and interests, and access rating and payment information.

### 📊 Host Dashboard

The host dashboard provides an overview of event activity, completed and upcoming events, ratings, financial information, and payout details. Hosts can create new events and manage existing events from the same workflow.

### 🗓️ Event Management

Hosts can update event information such as title, description, date, time, price, capacity, tags, image, and location. Registered participants can also be reviewed and managed directly from the event-management interface.

### 📣 Event Boosting

Hosts can promote events using configurable boost packages. EventFinder supports multiple boost durations, scheduled start times, payment processing, and boost status tracking.

### ⭐ Ratings and Trust

EventFinder uses a mutual reputation system. Participants can review hosts after attending events, while hosts can rate participants after completed events. Host verification further supports trust within the platform.

### 🛠️ Administration

The admin area provides tools for platform monitoring and governance, including user management, host verification, event moderation, platform configuration, and billing management.

## 🔐 Security

Sensitive credentials must not be committed to this repository.

Do not commit:

```text
Stripe secret keys
MongoDB credentials
API keys
access tokens
private keys
.env files containing secrets
```

Use environment variables or another secure configuration mechanism for secrets.

If a credential has previously been committed or exposed, revoke or rotate it before continuing to use the application.

