# collaborative-note-taking-application
Inspired by Notion, this is a full-stack productivity note-taking application that allows users to create nested pages, write rich-text documents, organize content into blocks, autosave changes, share pages, and collaborate in real-time.

In this project, there are 2 communication systems running side-by-side:
1. Express (HTTP): login, register, create workspace, create document page
2. Socket.IO (Real-time): join page, edit page, live collaboration

Developed by Phuong Khanh Tran (Jade Tran)

## Tech Stack
- JavaScript: main programming language
- React: frontend library that builds user interface
- Node.js: runtime that executes backend
- Express.js: backend framework that defines API routes
- MongoDB: database storage
- Mongoose:
- JWT authentication:
- Socket.IO:
- TipTap or EditorJS:
- Docker: 

## Features
### Authentication
- Register users
- Login users
- Hash passwords with bcrypt
- Generate JWT tokens
- Protect private routes

### Workspace and Pages
- Create and delete text blocks
- Update text block content
- Render heading, paragraph, checklist, and bullet blocks
- Save text blocks to MongoDB

### Autosave
- Detect auditor change
- Persist updates without manual save button
- Show saving/saved status

### Sharing and Permissions
- Add page owner and collaboraters
- Support viewer/editor permissions
- Restrict page access by role

### Real-time multi-user collaboration
- Connect users with Socket.IO
- Join document rooms
- Broadcast document page/block updates
- Show live updates across 2 browser windows
- Handle disconncet/reconnect behaviors

### Run Instructions