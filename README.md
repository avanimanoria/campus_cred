# Campus Cred

A role-based full-stack platform for managing college events, student registrations, and academic/activity-credit workflows.

Campus Cred is designed to reduce spreadsheet-driven administrative work by providing separate workflows for students, faculty, proctors, Heads of Department (HODs), and administrators.

> **Project status:** Active development  
> **Repository:** This repository contains separate `frontend` and `backend` applications.

---

## Problem

College activity and event-management processes are often handled through forms, spreadsheets, manual approvals, and disconnected communication channels. This makes it difficult to:

- Track student registrations and participation consistently
- Manage role-specific approval workflows
- Maintain activity-credit records
- Give students visibility into their events and progress
- Give faculty and administrators a structured way to review and manage records

Campus Cred centralizes these workflows in one role-aware platform.

---

## Key Features

- Role-based access for students, faculty, proctors, HODs, and administrators
- Student-facing event discovery and registration workflows
- Administrative event-management workflows
- Activity-credit and participation tracking
- Faculty, proctor, and HOD review workflows
- Google/Firebase-based authentication integration
- REST API-based frontend-backend communication
- PostgreSQL/MySQL-compatible relational database schema and migration support
- Separate frontend and backend codebases for maintainability

> Features listed above should reflect the modules currently implemented in the repository. Update this section as the project evolves.

---

## User Roles

| Role | Primary Responsibilities |
|---|---|
| Student | View events, register for activities, and track participation or activity-credit status |
| Faculty | Review student- or event-related workflows assigned to faculty |
| Proctor | Support student validation and approval-related workflows |
| HOD | Review department-level academic/activity workflows |
| Admin | Manage platform-level event, user, and operational workflows |

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js, JavaScript |
| Database | SQL relational database, schema scripts, migration support |
| Authentication | Firebase / Google Sign-In integration |
| API | REST APIs |
| Tooling | npm, ESLint, Git, GitHub |

---

## Architecture

```text
┌─────────────────────────────────────────────┐
│                Next.js Frontend              │
│  Student / Faculty / Proctor / HOD / Admin   │
└──────────────────────┬──────────────────────┘
                       │
                       │ REST API requests
                       ▼
┌─────────────────────────────────────────────┐
│              Node.js / Express Backend       │
│  Routes · Controllers · Middleware · Config  │
└──────────────────────┬──────────────────────┘
                       │
                       │ SQL queries / migrations
                       ▼
┌─────────────────────────────────────────────┐
│              Relational Database             │
│  Users · Roles · Events · Registrations      │
│  Credits · Approval / Workflow Records       │
└─────────────────────────────────────────────┘
```

---

## Repository Structure

```text
campus_cred/
├── frontend/                  # Next.js frontend
│   ├── app/                   # Application routes/pages
│   ├── components/            # Reusable UI components
│   ├── firebase/              # Firebase configuration/integration
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Shared utilities
│   └── package.json
│
├── backend/                   # Node.js / Express backend
│   ├── config/                # Application configuration
│   ├── controllers/           # Request handling and business logic
│   ├── db/                    # Database utilities
│   ├── middlewares/           # Authentication/authorization middleware
│   ├── routes/                # API route modules
│   ├── db_sql.sql             # Database schema / SQL definitions
│   ├── migrate.js             # Database migration script
│   ├── server.js              # Backend entry point
│   └── package.json
│
└── README.md
```

The backend includes separate route modules for authentication, events, students, faculty, proctors, HODs, and administrators.

---

## Local Setup

### Prerequisites

Install the following before running the project:

- Node.js 18 or later
- npm
- A relational SQL database instance
- Firebase project credentials if using Google/Firebase authentication

### 1. Clone the repository

```bash
git clone https://github.com/avanimanoria/campus_cred.git
cd campus_cred
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file using the provided example:

```bash
cp .env.example .env
```

Update `.env` with your local database and authentication configuration.

> Never commit `.env` files or private Firebase/database credentials.

### 3. Initialize the database

Review the SQL schema before executing it:

```bash
# Run this command according to your local database configuration
# Example only — update database name, user, and command as required:
psql -U <username> -d <database_name> -f db_sql.sql
```

If the project uses the included migration script, run:

```bash
node migrate.js
```

### 4. Start the backend

```bash
npm run dev
```

If `npm run dev` is not configured in your local version, use:

```bash
node server.js
```

The backend should run on the port configured in your `.env` file.

### 5. Configure and run the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Next.js, typically:

```text
http://localhost:3000
```

---

## Environment Variables

Use `backend/.env.example` as the source of truth for backend variables.

Typical backend configuration may include:

```env
PORT=<backend_port>
DATABASE_URL=<database_connection_string>
DB_HOST=<database_host>
DB_PORT=<database_port>
DB_NAME=<database_name>
DB_USER=<database_user>
DB_PASSWORD=<database_password>
JWT_SECRET=<strong_secret>
```

If Firebase is configured in the frontend, create the required client-side environment variables based on your Firebase project configuration.

> Variable names can differ across environments. Follow the repository's `.env.example` file instead of copying placeholder values directly.

---

## API Modules

The backend is organized into modules for:

| Module | Responsibility |
|---|---|
| Authentication | User login and authentication-related operations |
| Events | Event creation, retrieval, and event-management workflows |
| Students | Student-facing actions and records |
| Faculty | Faculty review and workflow actions |
| Proctors | Proctor-related student workflows |
| HOD | Department-level review and approval workflows |
| Admin | Platform and administrative operations |

For the exact endpoints, inspect the route files under `backend/routes/` or add API documentation using Swagger/OpenAPI in a future iteration.

---

## Screenshots

Add 3–5 screenshots here before pinning this repository on GitHub.

Recommended screenshots:

1. Student dashboard
2. Event listing or registration page
3. Admin event-management page
4. Activity-credit or participation tracking page
5. Role-specific approval/review page

Example format:

```md


```

---

## Engineering Decisions

- **Role-based design:** Different users require different permissions and workflows; the application separates access by role rather than using a single generic dashboard.
- **Separate frontend and backend:** Next.js handles the user experience while Node.js/Express exposes server-side REST APIs and business logic.
- **Relational data model:** Events, users, registrations, credits, and approvals have clear relationships, making a SQL database appropriate.
- **Environment-based configuration:** Sensitive values are intended to stay outside source control through `.env` configuration.

---

## Future Improvements

- Add OpenAPI/Swagger API documentation
- Add automated backend unit and integration tests
- Add end-to-end tests for critical workflows such as login, registration, and approvals
- Add Docker Compose for one-command local setup
- Add CI checks using GitHub Actions
- Add audit logs for approval and credit changes
- Add deployment documentation and a hosted demo
- Add role-permission matrix documentation
- Add screenshots and a short product demo video

---

## Resume Description

**Campus Cred — Role-Based College Activity and Event Management Platform**  
Built a full-stack platform for college event registration, activity-credit tracking, and administrative workflows using Next.js, Node.js, SQL, Firebase authentication, and REST APIs. Designed role-specific workflows for students, faculty, proctors, HODs, and administrators.

---

## Author

**Avani Manoria**  
GitHub: [@avanimanoria](https://github.com/avanimanoria)

If you found the project useful, consider starring the repository.
