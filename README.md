# MocsCode

<div align="center">

**🔗 Code Together, Create Together**

A real-time collaborative code editor platform for students and developers.

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Backend Services](#backend-services)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Authors](#authors)

---

## Overview

MocsCode is a full-featured collaborative code editor that enables multiple users to work on code projects simultaneously in real-time. Built for Florida Southern College, it provides a seamless coding experience with features like live collaboration, code execution, project management, and team chat.

**Live Site:** [https://mocscode.com](https://mocscode.com)

---

## Features

### 🖥️ Code Editor
- **CodeMirror 6** powered editor with advanced features
- **Multi-language support**: Java, Python, JavaScript, C, C++, C#, HTML, and more
- Syntax highlighting with multiple themes (Dracula, GitHub)
- Intelligent autocomplete
- Configurable tab size and editor preferences
- Undo/Redo controls

### 👥 Real-Time Collaboration
- **Yjs CRDT** for conflict-free real-time editing
- Live cursor positions and selections
- See collaborators working in real-time
- Presence awareness with active user indicators

### 💬 Team Communication
- Real-time chat within projects via Socket.IO
- Typing indicators
- User join/leave notifications
- Persistent chat history

### 🚀 Code Execution
- **Judge0** integration for secure code execution
- Support for multiple programming languages
- Compile and run code with custom input
- View stdout, stderr, and compile output
- Configurable CPU time and memory limits

### 📁 Project Management
- Create and manage multiple projects
- File and folder organization with drag-and-drop
- Import/export projects as ZIP archives
- Project templates for quick starts
- Version control with commit history

### 🔗 Sharing & Collaboration
- Generate shareable invite links
- Email invitations with customizable messages
- Role-based permissions (Viewer/Editor)
- Expiring share links
- Member management

### 🔐 Authentication
- Email/password authentication
- Google OAuth integration
- Password reset via email
- Session management

### ⚙️ User Preferences
- Light/Dark theme toggle
- Customizable editor settings
- Notification preferences
- Profile management with avatar upload

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **TailwindCSS** | Styling |
| **shadcn/ui** | UI component library |
| **Radix UI** | Accessible primitives |
| **CodeMirror 6** | Code editor |
| **Yjs** | CRDT for real-time sync |
| **React Query** | Server state management |
| **React Router** | Client-side routing |
| **Socket.IO Client** | Real-time chat |
| **Lucide React** | Icons |

### Backend Services
| Service | Technology | Port | Purpose |
|---------|------------|------|---------|
| **Yjs WebSocket** | Node.js + yjs-server | 5000 | Real-time document sync |
| **Chat Service** | Express + Socket.IO | 3001 | Real-time messaging |
| **Judge0** | Docker (judge0/judge0) | 2358 | Code execution engine |

### Database & Auth
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database, authentication, storage |
| **Supabase Edge Functions** | Serverless functions (email invitations, password reset) |
| **Supabase Realtime** | Database change subscriptions |

### External Services
| Service | Purpose |
|---------|---------|
| **Resend** | Transactional email delivery |
| **Google OAuth** | Social authentication |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React UI  │  │  CodeMirror │  │     Socket.IO Client    │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│    Supabase     │ │  Yjs WebSocket  │ │     Chat Service        │
│  (Database/Auth)│ │   (Port 5000)   │ │     (Port 3001)         │
│                 │ │                 │ │                         │
│  • PostgreSQL   │ │  • Real-time    │ │  • Socket.IO Server     │
│  • Auth         │ │    document     │ │  • Room management      │
│  • Storage      │ │    sync         │ │  • Typing indicators    │
│  • Edge Funcs   │ │  • CRDT ops     │ │  • User presence        │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Judge0 (Docker)                          │
│                         (Port 2358)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Server    │  │   Workers   │  │  PostgreSQL │  │   Redis   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
mocscode/
├── public/                    # Static assets
├── src/
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── auth/            # Authentication components
│   │   ├── editor/          # Editor-specific components
│   │   ├── ChatPanel.tsx    # Real-time chat
│   │   ├── CodeEditor.tsx   # Main editor component
│   │   ├── Dashboard.tsx    # Project dashboard
│   │   ├── FileExplorer.tsx # File tree navigation
│   │   ├── OutputPanel.tsx  # Code execution output
│   │   └── ShareDialog.tsx  # Sharing/invitation UI
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx  # Authentication state
│   │   └── ApiContext.tsx   # API client provider
│   ├── editor/              # CodeMirror configuration
│   │   ├── CodeMirrorEditor.tsx
│   │   ├── editor.mjs       # Editor setup & extensions
│   │   └── auto-language.mjs
│   ├── hooks/               # Custom React hooks
│   ├── lib/
│   │   ├── api/            # API client modules
│   │   │   ├── auth.ts
│   │   │   ├── chat.ts
│   │   │   ├── collaboration.ts
│   │   │   ├── judge0.ts    # Code execution
│   │   │   ├── projects.ts
│   │   │   └── project-files.ts
│   │   ├── presence/       # User presence tracking
│   │   └── supabase.ts     # Supabase client
│   ├── pages/              # Route pages
│   │   ├── Landing.tsx
│   │   ├── Dashboard.tsx
│   │   ├── EditorPage.tsx
│   │   ├── Profile.tsx
│   │   ├── SignIn.tsx
│   │   ├── Register.tsx
│   │   └── JoinProject.tsx
│   ├── App.tsx             # Root component & routes
│   └── main.tsx            # Entry point
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── send-invitation-email/
│   │   └── send-password-reset/
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase configuration
├── server/                  # Local dev server files
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Backend Services (Located in `/srv`)

```
/srv/
├── judge0/                   # Code execution engine
│   ├── docker-compose.yaml   # Judge0 Docker setup
│   └── judge0.conf          # Configuration
├── socketio/                 # Chat service
│   └── MocsCode-backend-socket.io/
│       ├── index.js         # Express + Socket.IO server
│       ├── chat-socket.js   # Chat event handlers
│       ├── users.js         # User/room management
│       ├── config.js        # CORS & Socket.IO options
│       └── package.json
└── yjs/                      # Real-time collaboration
    ├── server.js            # Yjs WebSocket server
    ├── package.json
    └── ecosystem.config.cjs # PM2 configuration
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **bun**
- **Docker** & **Docker Compose** (for Judge0)
- **PM2** (for production process management)

### Frontend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mocscode
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8080`

### Full Development Stack

To run all services locally:

```bash
npm run dev-full
```

This starts:
- Vite dev server (port 8080)
- Y-WebSocket server (port 4500)

---

## Backend Services

### 1. Yjs WebSocket Server (Real-time Collaboration)

**Location:** `/srv/yjs/`

Handles real-time document synchronization using Yjs CRDTs.

```bash
# Start with PM2
cd /srv/yjs
pm2 start ecosystem.config.cjs

# Or run directly
node server.js
```

**Configuration:**
- Port: 5000 (configurable via `PORT` env var)
- WebSocket endpoint: `wss://yjs.mocscode.com`

### 2. Chat Service (Socket.IO)

**Location:** `/srv/socketio/MocsCode-backend-socket.io/`

Real-time chat functionality with room-based messaging.

```bash
cd /srv/socketio/MocsCode-backend-socket.io
npm install
npm start
```

**Features:**
- Room-based chat (per project)
- Typing indicators
- User presence tracking
- Message delivery confirmation

**Configuration:**
- Port: 3001 (default)
- CORS origins configured in `config.js`

### 3. Judge0 (Code Execution)

**Location:** `/srv/judge0/`

Secure code execution sandbox using Docker.

```bash
cd /srv/judge0
docker-compose up -d
```

**Services:**
- **Server**: API endpoint (port 2358)
- **Workers**: Code execution workers
- **PostgreSQL**: Submission storage
- **Redis**: Queue management

**API Endpoint:** `https://judge.mocscode.com`

---

## Database Schema

MocsCode uses Supabase (PostgreSQL) with the following tables:

| Table | Description |
|-------|-------------|
| `users` | User profiles (id, email, name, avatar_url) |
| `projects` | Code projects with metadata |
| `project_files` | Files and folders within projects |
| `project_members` | Project membership and roles |
| `project_versions` | Version control / commit history |
| `file_versions` | File-level version tracking |
| `file_operations` | Yjs operation log |
| `active_sessions` | Current editing sessions |
| `chat_rooms` | Project chat rooms |
| `chat_messages` | Chat message history |
| `sharing_permissions` | Share links and permissions |
| `email_invitations` | Email invitation tracking |
| `user_preferences` | User settings and preferences |

---

## Environment Variables

### Frontend (`.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Edge Functions

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
APP_URL=https://mocscode.com
EMAIL_FROM=MocsCode <no-reply@mocscode.com>
```

### Judge0 (`judge0.conf`)

```env
POSTGRES_HOST=db
POSTGRES_DB=judge0
POSTGRES_USER=judge0
POSTGRES_PASSWORD=your-password
REDIS_PASSWORD=your-redis-password
```

---

## Deployment

### Frontend

The frontend is built with Vite and can be deployed to any static hosting:

```bash
npm run build
```

Output is in the `dist/` directory.

### Backend Services

**Recommended setup:**
- **PM2** for Node.js process management (Yjs, Socket.IO)
- **Docker Compose** for Judge0
- **Nginx** as reverse proxy with SSL

**Example Nginx configuration:**

```nginx
# Frontend
server {
    listen 443 ssl;
    server_name mocscode.com;
    root /var/www/mocscode/dist;
    # ...
}

# Yjs WebSocket
server {
    listen 443 ssl;
    server_name yjs.mocscode.com;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Judge0 API
server {
    listen 443 ssl;
    server_name judge.mocscode.com;
    location / {
        proxy_pass http://127.0.0.1:2358;
    }
}
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run dev-full` | Start all services (dev mode) |

---

## Authors

**Michael Durden & Riley Sweeting**

Florida Southern College

---

## License

ISC License

---

<div align="center">

**🔗 MocsCode** — Empowering collaborative development.

</div>
