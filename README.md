# Campus Cred

Campus Cred is a full-stack campus activity and credential management system.

## Structure

- `frontend/` - Next.js frontend
- `backend/` - Node.js/Express backend

## Features

- Student, faculty, proctor, HOD, and admin flows
- Activity/event management
- Document upload and verification
- PostgreSQL-backed backend APIs

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript

### Backend
- Node.js
- Express
- PostgreSQL

## Local Setup

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Notes

Environment variables are required for both frontend and backend. Do not commit `.env` files.
