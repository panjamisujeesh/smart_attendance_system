# Smart Attendance System

A full-stack attendance management system built with Node.js, Express, PostgreSQL, and React.

## Features

- **Multi-role authentication** — Admin, Teacher, Student with JWT
- **Course management** — Create courses, enroll students
- **Live attendance sessions** — Generate 6-character session codes
- **Geolocation verification** — Optional GPS-based attendance validation
- **Real-time attendance marking** — Students enter session codes
- **Attendance reports** — Per-student analytics with status indicators
- **Responsive design** — Works on desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Frontend | React (CRA) |
| Auth | JWT + bcrypt |

## Setup Instructions (Ubuntu)

### 1. Install prerequisites

```bash
sudo apt update
sudo apt install -y curl postgresql postgresql-contrib
```

### 2. Install Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Setup PostgreSQL

```bash
sudo systemctl start postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
sudo -u postgres psql -c "CREATE DATABASE attendance_db;"
sudo -u postgres psql -d attendance_db -f backend/schema.sql
```

### 4. Start Backend

```bash
cd backend
npm install
node server.js
```

Backend runs on **http://localhost:5000**

### 5. Start Frontend (new terminal)

```bash
cd frontend
npm install
npm start
```

Frontend runs on **http://localhost:3000**

## Demo Accounts

All accounts use password: `admin123`

| Email | Role |
|-------|------|
| admin@school.edu | Admin |
| teacher@school.edu | Teacher |
| alice@school.edu | Student (STU001) |
| bob@school.edu | Student (STU002) |

## Environment Variables (optional)

Create `backend/.env` to override defaults:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=attendance_db
DB_PASSWORD=password
DB_PORT=5432
JWT_SECRET=smart_attendance_secret_2024
PORT=5000
```

## Project Structure

```
sse/
├── backend/
│   ├── config/db.js         # PostgreSQL pool
│   ├── middleware/auth.js    # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js           # Login, /me
│   │   ├── users.js          # User CRUD
│   │   ├── courses.js        # Course CRUD + enrollment
│   │   ├── sessions.js       # Session lifecycle
│   │   ├── attendance.js     # Mark + manual attendance
│   │   └── reports.js        # Analytics + dashboard
│   ├── schema.sql            # DB schema + seed data
│   ├── server.js             # Express app
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api.js            # Axios instance
│   │   ├── context/AuthContext.js
│   │   ├── components/Layout.js
│   │   ├── pages/            # 8 page components
│   │   ├── App.js            # Router
│   │   └── index.css         # Complete styles
│   └── package.json
└── README.md
```
