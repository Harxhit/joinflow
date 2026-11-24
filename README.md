# JoinFlow

A role-based web app where students form groups and confirm assignment submissions, and professors post assignments and track group progress.

Built for the Joineazy Full Stack Intern task.

| | Link |
|---|---|
| GitHub | [`<repo link>`](https://github.com/Harxhit/joinflow) |
| Demo video | `<demo video link>` |
| Live platform | [`<platform link>`](https://joinflow-1.onrender.com) |

## Overview

**Students** can:
- Register and log in
- Create one group and add members by student ID
- See assignments given to their group, with the OneDrive submission link
- Confirm a submission in two steps ("Did you upload your work?" then "Confirm for group X, you can't undo this")
- Track the group's progress with progress bars, a completion ring and per assignment status

**Professors (Admin)** can:
- Create and edit assignments (title, description, due date, OneDrive link)
- Choose which groups receive an assignment
- See group wise and student wise submission status on the dashboard and the Submission details page
- Open an Analytics page with overall completion, per group and per student breakdowns

A submission is confirmed **once per group**. Whoever in the group confirms it is recorded as the confirmer.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, Axios, lucide-react |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Supabase), Prisma ORM |
| Auth | JWT with Student and Admin roles |

## Project structure

```
joinflow
├── backend
│   ├── prisma
│   │   ├── migrations
│   │   └── schema.prisma
│   ├── prisma.config.ts
│   └── src
│       ├── app.ts            Express app, middleware, route mounting
│       ├── server.ts         Entry point
│       ├── config            Database client and env config
│       ├── controllers       Request handlers
│       ├── middleware        JWT auth middleware
│       ├── routes            Route definitions
│       ├── services
│       ├── types
│       ├── utils             Prisma error handler
│       └── validators        Request validation
└── frontend
    └── src
        ├── App.tsx           Route table
        ├── context           AuthContext
        ├── lib               Mappers from API shapes to UI shapes
        ├── pages             Dashboard, GroupPage, SubmissionsPage, Analytics, forms
        ├── routes            ProtectedRoute
        ├── services          Axios instance
        └── types
```

## Setup and run

### Prerequisites
- Node.js 20+
- A PostgreSQL database (local or hosted)

### Backend

```bash
cd backend
npm install
cp .env.example .env     # then fill in the values below
npx prisma migrate dev
npx prisma generate
npm run dev
```

`backend/.env`

```
NODE_ENV=development
PORT=3000
DB_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRY=1d
```

The API runs at `http://localhost:3000/api`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

`frontend/.env`

```
VITE_API_URL=http://localhost:3000/api
```

The app runs at `http://localhost:5173`.

### Creating an admin

Users register as `STUDENT` by default. To make a professor account, register normally and then change the role in the database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'professor@example.com';
```

## Architecture

```
React (Vite)  --Axios + JWT-->  Express API  --Prisma-->  PostgreSQL
    |                              |
 AuthContext                 auth.middleware
 ProtectedRoute              (verifies JWT, loads user,
 role based views             checks tokenVersion)
```

1. The user logs in and receives a JWT. The frontend stores the session in `AuthContext` and sends the token with every request through the shared Axios instance.
2. `auth.middleware` verifies the token and attaches the user (id and role) to the request.
3. Controllers enforce role rules (for example, only `ADMIN` can create assignments or read the global analytics) and talk to PostgreSQL through Prisma.
4. The frontend maps API responses into UI types in `lib/mapper` and renders a student view or an admin view based on role.

## Database schema

```mermaid
erDiagram
    User ||--o{ Group : creates
    User ||--o| GroupMember : "belongs to"
    Group ||--o{ GroupMember : has
    User ||--o{ Assignment : creates
    Assignment ||--o{ AssignmentGroup : "given to"
    Group ||--o{ AssignmentGroup : receives
    Assignment ||--o{ Submission : has
    Group ||--o{ Submission : makes

    User {
        uuid id PK
        string name
        string email UK
        string studentId UK "nullable"
        string password "hashed"
        int tokenVersion
        enum role "STUDENT or ADMIN"
        datetime createdAt
        datetime updatedAt
    }
    Group {
        uuid id PK
        string name
        uuid createdById FK
        datetime createdAt
    }
    GroupMember {
        uuid id PK
        uuid userId FK "unique"
        uuid groupId FK
        datetime joinedAt
    }
    Assignment {
        uuid id PK
        string title
        string description
        datetime dueDate
        string oneDriveUrl
        uuid createdById FK
        datetime createdAt
        datetime updatedAt
    }
    AssignmentGroup {
        uuid id PK
        uuid assignmentId FK
        uuid groupId FK
    }
    Submission {
        uuid id PK
        uuid assignmentId FK
        uuid groupId FK
        enum status "PENDING or SUBMITTED"
        uuid confirmedById "nullable"
        datetime confirmedAt "nullable"
        datetime createdAt
    }
```

Key constraints:
- `GroupMember.userId` is unique, so a student can be in only one group.
- `AssignmentGroup (assignmentId, groupId)` is unique, so an assignment is given to a group once. It cascades on delete from both sides.
- `Submission (assignmentId, groupId)` is unique, so there is one submission record per group per assignment. No row means the group is still pending.

## API reference

Base URL: `/api`. All routes except register and login need `Authorization: Bearer <token>`.

### Auth (`/api/auth`)

> Fill in from `auth.routes.ts`. Typical shape:

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create an account (name, email, password, optional studentId) |
| POST | `/auth/login` | Log in, returns JWT |
| POST | `/auth/logout` | Invalidate the session (bumps `tokenVersion`) |
| GET | `/auth/me` | Current user |

### Groups (`/api/group`)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/group/create` | Student | Create a group. Body: `{ name }` |
| GET | `/group/me` | Student | The caller's group, 404 if none |
| GET | `/group/all` | Any | All groups |
| POST | `/group/:groupId/members` | Student | Add a member. Body: `{ studentId }` |
| GET | `/group/:groupId` | Any | Group with members |
| GET | `/group/details/:groupId` | Any | Group with its assignments and submission status |

### Assignments (`/api/assignment`)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/assignment/create` | Admin | Create an assignment and assign it to groups. Body: `{ title, description, dueDate, oneDriveUrl, groupIds }` |
| GET | `/assignment/all` | Any | List assignments |
| GET | `/assignment/:assignmentId` | Any | Assignment with its groups and submissions |
| PATCH | `/assignment/:assignmentId` | Admin | Edit an assignment |

### Submissions (`/api/submission`)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/submission/confirm` | Student | Confirm the group's submission. Body: `{ assignmentId }` |
| GET | `/submission/:assignmentId` | Admin | Submissions for an assignment |
| GET | `/submission/:groupId` | Admin | Submissions for a group |

### Analytics (`/api/analytic`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/analytic/overview` | Admin | Totals and overall completion rate |
| GET | `/analytic/groups` | Admin | Completion per group |
| GET | `/analytic/students` | Admin | Completion per student, with per assignment status |
| GET | `/analytic/group/:groupId` | Group member or Admin | Progress tracker data for one group |

Example response, `GET /api/analytic/overview`:

```json
{
  "success": true,
  "message": "Analytics overview fetched successfully",
  "data": {
    "totalStudents": 24,
    "totalGroups": 6,
    "totalAssignments": 4,
    "totalAssigned": 20,
    "totalSubmitted": 11,
    "pendingSubmissions": 9,
    "completionRate": 55
  }
}
```

## Design decisions

- **Group level confirmation.** Work is uploaded externally to OneDrive, so the app records one confirmation per group, plus who confirmed it and when. Individual member submissions are not tracked.
- **Two step confirmation.** Confirming cannot be undone, so the UI asks "Did you upload your work?" and then asks for a final confirm.
- **Assignments target groups.** `AssignmentGroup` is a join table, so a professor can give an assignment to all groups or a chosen few.
- **Pending is implicit.** A missing `Submission` row means pending, so nothing needs to be created when an assignment is assigned.
- **Server side authorization.** Every route is behind the auth middleware and role checks happen in controllers. The frontend hides links by role, but the API is the source of truth.
- **Separate student progress endpoint.** `/analytic/group/:groupId` lets group members see their own group's progress, while the other analytics routes stay admin only.
- **Prisma.** Typed queries, migrations and relations in one schema file.
- **Token versioning.** `User.tokenVersion` lets a logout or password change invalidate old JWTs.

## Known limitations

- Members are added to a group by student ID.
- A student can belong to only one group.
- Confirmation is per group, so there is no per member submission tracking.
- Group members cannot be removed and groups cannot be deleted from the UI.

## Deployment

| Part | Host | URL |
|---|---|---|
| Frontend | Render Web Service | https://joinflow-1.onrender.com |
| Backend API | Render Web Service | https://joinflow-ouov.onrender.com/api |
| Database | PostgreSQL on Supabase | managed |

Both services run on Render's free plan, so the first request after a period of inactivity can take about 30 seconds while the service wakes up.

### Backend (Render)

- Root directory: `backend`
- Build command: `npm install --include=dev && npx prisma generate`
- Pre-deploy command: `npx prisma migrate deploy`
- Start command: `npm start`

### Frontend (Render)

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Start command: `npm run preview -- --host 0.0.0.0 --port $PORT`
### Deployment notes

- The frontend and backend run on different domains, so the auth cookie is set with `SameSite=None` and `Secure` in production, and the backend trusts Render's proxy and allows credentialed requests from the frontend origin only.
- `VITE_API_URL` is read at build time, so changing it needs a redeploy of the frontend.
- The backend runs TypeScript directly with `tsx`, so there is no separate compile step.

| Live platform | https://joinflow-1.onrender.com |
