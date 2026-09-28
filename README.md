# Multi-Agent Helpdesk Ticketing System — Backend

A NestJS + MongoDB backend for a multi-agent customer support ticketing system.

The system allows customers to create support tickets and support agents to claim, work on, and resolve tickets while enforcing concurrent-claim protection, ghosted-ticket recovery, and a strict 24-hour SLA.

## Tech Stack

* Node.js
* NestJS
* TypeScript
* MongoDB
* Mongoose
* JWT Authentication
* bcrypt
* Role-Based Access Control (RBAC)
* Swagger / OpenAPI
* `@nestjs/schedule`
* class-validator
* class-transformer

## Features

### Authentication

* Customer and Agent registration
* JWT-based authentication
* Password hashing using bcrypt
* Protected APIs using JWT guards
* Role-based authorization

### Customer Features

* Create support tickets
* View tickets created by the logged-in customer
* Track ticket status
* Track urgency
* View SLA deadline
* View overdue tickets

### Agent Features

* View the open ticket queue
* Claim tickets
* View tickets currently assigned to the logged-in agent
* Send heartbeat requests while working
* Resolve assigned tickets
* View SLA information

## Ticket Lifecycle

```text
Open
  ↓
In Progress
  ↓
Resolved
```

Tickets cannot be resolved through an arbitrary status update. Resolution is handled through the dedicated resolve endpoint.

## Concurrency Protection

The system prevents two agents from claiming the same ticket simultaneously.

Ticket claiming is implemented using an atomic MongoDB update with conditions that require the ticket to still be available.

```text
Agent 1 ──────┐
              ├──> Atomic database update ──> One succeeds
Agent 2 ──────┘                              One receives 409
```

If two agents attempt to claim the same Open ticket:

* One request successfully claims the ticket.
* The other receives `409 Conflict`.
* Only one agent is stored as the assigned agent.

This protection is enforced by the backend and does not depend on frontend visibility.

## Ghosted Ticket Recovery

When an agent claims a ticket, the backend creates a 3-minute lock.

The ticket stores:

* `lockedAt`
* `lockExpiresAt`
* `assignedAgent`

The agent dashboard sends heartbeat requests while the agent is working.

Each successful heartbeat extends the lock by another 3 minutes.

If the agent disconnects or stops sending heartbeats:

```text
Agent claims ticket
       ↓
3-minute lock starts
       ↓
Heartbeat keeps extending lock
       ↓
Agent disappears
       ↓
Lock expires
       ↓
Scheduler detects expired lock
       ↓
Ticket returns to Open queue
```

A scheduled backend job checks expired locks every 10 seconds.

When the lock expires, the ticket is returned to the Open queue and the active lock assignment is removed.

## 24-Hour SLA

Every ticket receives a 24-hour SLA deadline from its creation time.

The backend automatically checks SLA deadlines every 10 seconds.

When the deadline is reached:

```text
isOverdue = true
```

This happens system-wide without requiring a user to refresh the browser.

The frontend also calculates the remaining time locally so that the countdown can update every second.

## API Endpoints

### Authentication

| Method | Endpoint         | Access |
| ------ | ---------------- | ------ |
| POST   | `/auth/register` | Public |
| POST   | `/auth/login`    | Public |

### Tickets

| Method | Endpoint                       | Access           |
| ------ | ------------------------------ | ---------------- |
| POST   | `/tickets`                     | Customer         |
| GET    | `/tickets/my`                  | Customer         |
| GET    | `/tickets/queue`               | Agent            |
| GET    | `/tickets/assigned`            | Agent            |
| POST   | `/tickets/:ticketId/claim`     | Agent            |
| POST   | `/tickets/:ticketId/heartbeat` | Assigned Agent   |
| POST   | `/tickets/:ticketId/resolve`   | Assigned Agent   |
| GET    | `/tickets/:ticketId`           | Customer / Agent |
| PATCH  | `/tickets/:ticketId`           | Agent            |

## Authorization Rules

Customers cannot access agent-only operations.

For example:

```text
Customer → GET /tickets/queue
            ↓
          403
```

Similarly:

```text
Customer → POST /tickets/:ticketId/claim
            ↓
          403
```

Agents are also prevented from modifying tickets assigned to another agent.

## Error Handling

Important API responses include:

* `401 Unauthorized` — missing or invalid authentication
* `403 Forbidden` — authenticated user does not have permission
* `404 Not Found` — requested ticket/resource does not exist
* `409 Conflict` — ticket cannot be claimed or requested state transition is invalid
* `400 Bad Request` — invalid request data

## Environment Variables

Create a `.env` file in the backend project:

```env
PORT=5000
MONGODB_URI=YOUR_MONGODB_ATLAS_CONNECTION_STRING
JWT_SECRET=YOUR_SECRET_KEY
JWT_EXPIRES_IN=1d
```

Do not commit `.env` files or database credentials to GitHub.

## Installation

Clone the repository:

```bash
git clone https://github.com/Navyasripuvvada/task3.git
cd task3/backend
```

Install dependencies:

```bash
npm install
```

Create the `.env` file with the required environment variables.

## Run Locally

Development:

```bash
npm run start:dev
```

The API will be available at:

```text
http://localhost:5000
```

Swagger documentation:

```text
http://localhost:5000/api
```

Production build:

```bash
npm run build
npm run start:prod
```

## Database

The application uses MongoDB Atlas.

The main collections are:

* Users
* Tickets

MongoDB is used for atomic ticket claiming so concurrent requests are handled safely.

## Seed Data

The project contains a seed script for development and testing.

Run:

```bash
npm run seed
```

Seed data can be used to test ticket lifecycle behavior, SLA handling, and agent workflows.

## Security Testing Performed

The following scenarios were tested:

### Unauthorized Queue Access

Customer attempts:

```text
GET /tickets/queue
```

Result:

```text
403 Forbidden
```

### Unauthorized Claim

Customer attempts:

```text
POST /tickets/:ticketId/claim
```

Result:

```text
403 Forbidden
```

### Cross-Agent Ticket Modification

Agent 2 attempts to modify a ticket assigned to Agent 1.

Result:

```text
403 Forbidden
```

### Concurrent Claim

Two agents attempt to claim the same Open ticket.

Result:

```text
One request succeeds
Second request receives 409 Conflict
```

### Ghosted Agent

An agent claims a ticket and stops sending heartbeats.

Result:

```text
Ticket returns to Open queue after approximately 3 minutes
```

### SLA

A ticket passes its 24-hour deadline.

Result:

```text
Ticket is automatically marked overdue
```

## Project Structure

```text
backend/
├── src/
│   ├── auth/
│   ├── database/
│   ├── tickets/
│   │   ├── schemas/
│   │   ├── tickets.controller.ts
│   │   ├── tickets.service.ts
│   │   └── tickets.module.ts
│   ├── users/
│   │   ├── schemas/
│   │   └── users.module.ts
│   ├── app.module.ts
│   └── main.ts
├── .env
├── package.json
├── package-lock.json
└── README.md
```

## Repository

GitHub:

https://github.com/Navyasripuvvada/task3

