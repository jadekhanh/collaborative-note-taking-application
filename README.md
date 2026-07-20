# collaborative-note-taking-application

Inspired by Notion, this is a full-stack collaborative note-taking application where multiple users can create workspaces, organize nested pages, edit block-based documents in real time, and collaborate through comments, file uploads, sharing, version history, and live presence.

Developed by Phuong Khanh Tran (Jade Tran)

## Tech Stack

### Frontend

- **React 19 + Vite** — single-page application (SPA) with fast dev/build tooling (`npm run dev` on port 5173)
- **React Router** — protected and public routes for login, dashboard, workspaces, and shared pages
- **React Context API** — global auth state and shared Socket.IO connection
- **Axios** — REST API client with JWT attached to requests
- **Socket.IO Client** — real-time collaboration events (presence, typing, cursors, live edits)
- **@dnd-kit** — drag-and-drop block reordering in the editor

### Backend

- **Node.js + Express 5** — REST API server
- **MongoDB + Mongoose** — persistent storage for users, workspaces, pages, blocks, comments, attachments, permissions, and versions
- **JWT + bcryptjs** — authentication and password hashing
- **Socket.IO** — WebSocket server for live page-room collaboration
- **Multer** — local file uploads (stored under `/uploads`, 10 MB limit)

## Project Architecture

The app uses a client-server split: **REST APIs persist application state, while Socket.IO broadcasts live collaboration events to connected collaborators.**

- **REST API** — authentication, CRUD, permissions, comments, attachments, search, and version snapshots are saved to MongoDB through Express routes
- **Socket.IO** — presence, typing indicators, remote cursors, live title/block updates, OT text operations, block create/update/delete/reorder, and live sync for comments, attachments, and permissions are pushed to everyone in the same page room
- **Optimistic UI** — the editor updates React state immediately on typing, drag-and-drop reorder, and block changes, then confirms or rolls back after the REST autosave/API response (live socket events keep other collaborators in sync before persistence completes)

Data models include `User`, `Workspace`, `Page`, `Block`, `PagePermission`, `CommentThread`, `Attachment`, and `PageVersion`

## Features

### Authentication & Dashboard

- User registration and login with JWT; sessions persist via stored token
- Protected routes redirect unauthenticated users to login
- Dashboard lists workspaces and a **Shared with me** section for pages shared directly by email
- Direct page route (`/pages/:pageId`) for opening shared pages without entering the full workspace

### Workspaces

- Create, rename, and delete workspaces from the dashboard
- Invite collaborators by email and assign **Owner**, **Editor**, or **Viewer** roles
- Workspace owners can update member roles and remove members
- Role-based access controls what users can edit, create, archive, or share

### Sidebar & Page Organization

- Workspace switcher and nested page tree (recursive parent/child hierarchy)
- **Favorites** section at the top (star/unstar pages; synced to the server)
- **Recent** section below favorites (last opened pages, stored locally per user/workspace)
- Search button opens workspace-wide search modal
- Create top-level or nested child pages from the sidebar
- Archive pages and restore them from the archived pages panel

### Real-Time Collaboration

- Socket.IO page rooms with live presence panel showing who is online
- Typing indicators and remote carets with colored user initials above each cursor
- Optimistic local edits with live socket broadcasts before debounced REST autosave
- Live page title updates before autosave
- Live block metadata updates (type changes, checklist state, indentation, uploads)
- **Operational Transformation (OT)** for same-block concurrent text editing (`insert`/`delete` ops)
- Real-time block create, update, delete, and reorder across collaborators
- Live sync for comments, attachments, and page permissions

### Page Editor

- Editable page title with debounced autosave and save status indicator
- Notion-style block editor with toolbar actions for comments, attachments, versions, sharing, archive, and delete
- **Block types:** paragraph, heading, subheading, bullet, numbered, checklist, quote, code, image, and file
- Slash shortcuts to convert blocks (e.g. `/heading`, `/checklist`, `/code`)
- Create blocks with Enter; delete empty blocks with Backspace; indent/unindent with Tab / Shift+Tab
- Drag-and-drop block reordering; duplicate, delete, and change block type from the block menu
- **Collapsible heading sections** — hide/show content under headings and subheadings
- Upload images and files into blocks via the attachments API
- Block comment badges show unresolved thread count per block
- Debounced autosave for blocks and title with per-block save status

### Editing Experience

- Local **undo/redo** history stack (up to 50 states) with **Cmd/Ctrl+Z** and **Cmd/Ctrl+Shift+Z**
- Keyboard shortcuts: Enter (new block), Backspace on empty block (delete block), Tab / Shift+Tab (indent), undo/redo
- Viewers are read-only: no editing, dragging, block creation, archiving, or sharing

### Comments

- Page-level and block-level comment threads
- Add, edit, and delete replies; resolve threads
- Open from the editor toolbar or block menu
- Real-time thread sync across collaborators

### Attachments

- Page-level attachments panel: upload, preview, download, and delete files
- Block-linked uploads for image and file blocks
- Real-time attachment list sync

### Search

- Debounced workspace search across page titles and block text content
- Jump directly to a matching page from results
- Respects user access (workspace membership or direct page share)

### Sharing & Permissions

- Share pages by email with **Owner**, **Editor**, or **Viewer** page-level roles
- Page permission can override workspace role for that specific page
- Share modal to invite, update roles, and revoke access
- Real-time permission updates for active collaborators
- **Owners** — full control including share, archive, and delete
- **Editors** — can edit content but cannot manage sharing or delete the page
- **Viewers** — read-only access

### Version History

- Manual snapshots from the version modal
- Automatic snapshots after 2 minutes of inactivity (page owner only)
- List versions with timestamp, author, and manual/auto label
- Diff view comparing a snapshot to the current page (title and block changes)
- Restore a previous version

## Run Instructions

### Prerequisites

- **Node.js** (v18 or later) and **npm**
- **MongoDB** running locally

### Install Dependencies

**Client**

```bash
cd client
npm install
```

**Server**

```bash
cd server
npm install
```

### Environment Variables

Copy `.env.example` to `server/.env` and fill in the values:

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/collaborative-notes
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### Run

**Backend** (default port 5001)

```bash
cd server
npm run dev
```

**Frontend** (default port 5173)

```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser. Make sure MongoDB is running before starting the server
