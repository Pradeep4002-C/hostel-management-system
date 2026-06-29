# HostelCare

HostelCare is a full-stack hostel maintenance platform for reporting, triaging, assigning, and resolving hostel room issues. Students can submit complaints with optional image proof, administrators can review and assign work, and maintenance staff can update progress with completion evidence.

## Features

- Role-based authentication for students, administrators, and workers
- Student registration and complaint submission
- Image upload validation for JPEG, PNG, and WebP evidence
- Admin complaint search, filtering, assignment, and priority override workflow
- Worker task dashboard with status updates and completion proof
- Notification center with unread counts, read state, and deletion
- ML-assisted complaint category and priority suggestions for admin triage
- Secure cookies, JWT authentication, rate limiting, input validation, and security headers
- Database audit and cleanup scripts for release checks
- GitHub Actions CI for backend tests, dependency audits, frontend linting, and production build

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router, Axios, Lucide React |
| Backend | Node.js, Express 5, Mongoose, Multer, Cloudinary |
| Database | MongoDB |
| Authentication | JWT access tokens, secure cookies, role-based authorization |
| Quality | Node test runner, ESLint, npm audit, GitHub Actions |

## Screenshots

Add screenshots before publishing the repository:

- Home and role selection
- Student complaint dashboard
- Admin complaint triage dashboard
- Worker task dashboard
- Notification center

## Installation

Prerequisites:

- Node.js 22 or newer
- npm
- MongoDB running locally or a MongoDB Atlas database
- Cloudinary account for production image uploads

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd HostelManagement

cd backend
npm ci

cd ../frontend
npm ci
```

Create environment files from the examples:

```bash
cd ../backend
cp .env.example .env

cd ../frontend
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | Runtime environment. Use `production` for deployed environments. |
| `PORT` | No | Backend port. Defaults to `5001`. |
| `MONGO_URI` | Yes | MongoDB connection URI. Do not hardcode credentials in source files. |
| `DB_NAME` | No | MongoDB database name. Defaults to `HostelManagement`. |
| `CORS_ORIGIN` | Yes in production | Comma-separated list of allowed frontend origins. |
| `ACCESS_TOKEN_SECRET` | Yes | JWT signing secret. Use at least 32 random characters in production. |
| `ACCESS_TOKEN_EXPIRY` | No | JWT lifetime. Defaults to `1d`. |
| `ADMIN_EMAIL` | Required for admin seed | Initial administrator email address. |
| `ADMIN_PASSWORD` | Required for admin seed | Initial administrator password. Use a strong unique value. |
| `CLOUDINARY_CLOUD_NAME` | Yes in production | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Yes in production | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Yes in production | Cloudinary API secret. |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Recommended | API base URL, for example `http://localhost:5001/api/v1`. |

Never commit real `.env` files. The example files contain placeholders only.

## Running the Project

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`
- Health check: `http://localhost:5001/health`

Run backend checks:

```bash
cd backend
npm test
npm run build
npm run db:audit
npm run ml:evaluate
npm audit --omit=dev
```

Run frontend checks:

```bash
cd frontend
npm run lint
npm run build
npm run preview
npm audit --omit=dev
```

## Folder Structure

```text
HostelManagement/
|-- .github/workflows/       # CI pipeline
|-- backend/
|   |-- public/              # Ignored local upload/temp runtime files
|   |-- src/
|   |   |-- config/          # Environment, cookies, and Cloudinary setup
|   |   |-- controllers/     # HTTP request handlers
|   |   |-- db/              # MongoDB connection
|   |   |-- middleware/      # Auth, upload, and security middleware
|   |   |-- ml/              # Complaint training data, inference, and evaluation
|   |   |-- models/          # Mongoose schemas and indexes
|   |   |-- routes/          # Express route definitions
|   |   |-- scripts/         # Database audit and cleanup commands
|   |   |-- seed/            # Admin account seeding
|   |   |-- services/        # Notification and ML triage services
|   |   |-- utils/           # API responses, errors, logging, async helpers
|   |   `-- validators/      # Shared request validation
|   `-- test/                # Backend tests
|-- frontend/
|   |-- public/              # Public static assets
|   `-- src/
|       |-- components/      # Auth, complaint, dashboard, navigation, routing UI
|       |-- pages/           # Route-level screens
|       |-- services/        # API clients
|       |-- styles/          # Component-specific styles
|       `-- utils/           # Session helpers
|-- LICENSE
|-- PROJECT_AUDIT_REPORT.md
|-- README.md
`-- SECURITY.md
```

## API Overview

All application endpoints use the `/api/v1` prefix, except `/health`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health check. |
| `POST` | `/api/v1/student/register` | Register a student account. |
| `POST` | `/api/v1/student/login` | Sign in as a student. |
| `POST` | `/api/v1/student/logout` | End a student session. |
| `GET` | `/api/v1/student/complaints` | List the signed-in student's complaints. |
| `POST` | `/api/v1/admin/login` | Sign in as an administrator. |
| `POST` | `/api/v1/admin/logout` | End an administrator session. |
| `GET` | `/api/v1/admin/workers` | List worker accounts. |
| `POST` | `/api/v1/admin/workers` | Create a worker account. |
| `GET` | `/api/v1/admin/complaints` | List complaints with triage suggestions. |
| `PATCH` | `/api/v1/admin/complaints/:id/status` | Advance complaint status. |
| `PATCH` | `/api/v1/admin/complaints/:id/priority` | Review or override suggested priority. |
| `POST` | `/api/v1/worker/login` | Sign in as a worker. |
| `POST` | `/api/v1/worker/logout` | End a worker session. |
| `GET` | `/api/v1/worker/complaints` | List assigned worker complaints. |
| `PATCH` | `/api/v1/worker/complaints/:id/status` | Start assigned work. |
| `PATCH` | `/api/v1/worker/complaints/:id/complete` | Resolve work with image proof. |
| `POST` | `/api/v1/complaint` | Create a complaint. |
| `PATCH` | `/api/v1/complaint/:id/assign` | Assign a worker to a complaint. |
| `GET` | `/api/v1/notifications` | List notifications for the signed-in user. |
| `DELETE` | `/api/v1/notifications` | Delete notifications for the signed-in user. |
| `GET` | `/api/v1/notifications/unread-count` | Get unread notification count. |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark one notification as read. |
| `PATCH` | `/api/v1/notifications/mark-all/read` | Mark all notifications as read. |

Protected endpoints require a valid session and enforce role or record ownership on the server.

## Future Improvements

- Redis-backed rate limiting for multi-instance deployments
- Private or authenticated Cloudinary delivery for sensitive room images
- Cursor pagination for high-volume complaint and notification lists
- Password reset, email verification, and account management workflows
- Larger labeled dataset before relying more heavily on ML priority suggestions
- Automated visual regression and accessibility testing

## License

This project is licensed under the [MIT License](LICENSE).

## Author

Pradeep Chavan

Contributions and responsible security reports are welcome. See [SECURITY.md](SECURITY.md).
