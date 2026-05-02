# TaskFlow — Team Task Manager

A full-stack team task management app built with **React + Flask + SQLite + JWT auth**.

---

## 📁 Project Structure

```
team-task-manager/
├── backend/
│   ├── app.py              ← Flask entry point (run this!)
│   ├── config.py           ← App configuration
│   ├── models.py           ← SQLAlchemy models (User, Project, Task)
│   ├── requirements.txt    ← Python dependencies
│   └── routes/
│       ├── __init__.py
│       ├── auth.py         ← /api/auth/* (login, signup, me, users)
│       ├── projects.py     ← /api/projects/*
│       └── tasks.py        ← /api/tasks/*
│
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js        ← React entry point
        ├── index.css       ← Global styles
        ├── App.jsx         ← Routes
        ├── context/
        │   └── AuthContext.jsx   ← Global auth state
        ├── services/
        │   └── api.js            ← Axios API calls
        ├── components/
        │   ├── Layout.jsx
        │   ├── Sidebar.jsx
        │   ├── ProtectedRoute.jsx
        │   └── StatusBadge.jsx
        └── pages/
            ├── Login.jsx
            ├── Signup.jsx
            ├── Dashboard.jsx
            ├── Projects.jsx
            └── Tasks.jsx
```

---

## 🚀 Setup & Run (Step by Step)

### Prerequisites
- Python 3.9+ (check: `python --version`)
- Node.js 16+ (check: `node --version`)
- npm (comes with Node.js)

---

### 1. Backend

```bash
# Open a terminal in VS Code (Ctrl+`)
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the Flask server
python app.py
```

✅ Backend runs at **http://localhost:5000**

On first start, sample data is seeded automatically:
| Email | Password | Role |
|---|---|---|
| admin@demo.com | admin123 | Admin |
| alice@demo.com | alice123 | Member |
| bob@demo.com   | bob123   | Member |

---

### 2. Frontend

```bash
# Open a SECOND terminal in VS Code
cd frontend

# Install Node packages (first time only, takes ~1 min)
npm install

# Start the React dev server
npm start
```

✅ Frontend runs at **http://localhost:3000**
The browser will open automatically.

---

## 🔑 Features by Role

### Admin (admin@demo.com)
- Create / delete projects
- Assign members to projects
- Create / edit / delete tasks
- Assign tasks to users
- View all projects and tasks

### Member (alice@demo.com or bob@demo.com)
- View projects they're assigned to
- View tasks in their projects
- Update status of tasks assigned to them

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Description | Auth? |
|--------|----------|-------------|-------|
| POST | `/api/auth/signup` | Register new user | No |
| POST | `/api/auth/login` | Login, get JWT | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/auth/users` | List all users | Yes |

### Projects
| Method | Endpoint | Description | Auth? |
|--------|----------|-------------|-------|
| GET | `/api/projects/` | List projects | Yes |
| POST | `/api/projects/` | Create project | Admin |
| GET | `/api/projects/:id` | Get project | Yes |
| PUT | `/api/projects/:id` | Update project | Admin |
| DELETE | `/api/projects/:id` | Delete project | Admin |
| POST | `/api/projects/:id/members` | Add member | Admin |
| DELETE | `/api/projects/:id/members/:uid` | Remove member | Admin |

### Tasks
| Method | Endpoint | Description | Auth? |
|--------|----------|-------------|-------|
| GET | `/api/tasks/` | List tasks (filterable) | Yes |
| POST | `/api/tasks/` | Create task | Admin |
| GET | `/api/tasks/:id` | Get task | Yes |
| PUT | `/api/tasks/:id` | Update task | Yes* |
| DELETE | `/api/tasks/:id` | Delete task | Admin |
| GET | `/api/tasks/dashboard` | Dashboard stats | Yes |

Query params for `GET /api/tasks/`:
- `?status=pending|in_progress|completed`
- `?project_id=<id>`
- `?overdue=true`

---

## 🧪 Test the API (curl examples)

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}'

# Save the token from the response, then:
TOKEN="<paste_your_token_here>"

# Get dashboard stats
curl http://localhost:5000/api/tasks/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Get all tasks
curl http://localhost:5000/api/tasks/ \
  -H "Authorization: Bearer $TOKEN"

# Create a task
curl -X POST http://localhost:5000/api/tasks/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My new task","project_id":1,"status":"pending"}'
```

---

## 🔧 Common Issues

**Port already in use?**
```bash
# Kill the process using port 5000 (Mac/Linux)
lsof -ti:5000 | xargs kill
# Windows
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

**pip not found?** Try `pip3 install -r requirements.txt`

**Database issues?** Delete `backend/taskmanager.db` and restart to reseed fresh data.

**CORS errors?** Make sure the backend is running on port 5000 and the frontend on port 3000.
