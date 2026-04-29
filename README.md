# BackSpace — Unlimited Cloud Storage

React 18 + Flask backend. Dark green UI. Original logo. All MySQL columns fixed.

## 🚨 MySQL Fix (Root Cause)
The original `users` table uses `user_id` as primary key (NOT `id`).
All foreign keys now correctly reference `users(user_id)`.

## ⚡ Quick Setup

### 1. Database
```bash
mysql -u root -p < backend/schema.sql
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt

# Set env vars (optional — defaults work for local dev)
export DB_HOST=localhost
export DB_USER=root
export DB_PASS=
export DB_NAME=backspace_db

python app.py
# Runs on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000 (proxied to :5000)
```

## 🏗️ Production Build
```bash
cd frontend && npm run build
# Serve build/ with nginx, or copy into Flask static folder
```

## 📁 Project Structure
```
backspace/
├── backend/
│   ├── app.py            # Flask API (50+ routes)
│   ├── schema.sql        # Corrected MySQL schema
│   ├── requirements.txt
│   └── uploads/          # Auto-created on first upload
└── frontend/
    ├── public/
    │   ├── index.html
    │   └── assets/
    │       └── logo_icon.png   # Original logo from bs.zip
    └── src/
        ├── App.jsx
        ├── index.css         # Design system (dark green + white)
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Toast.jsx
        │   └── FileIcon.jsx
        └── pages/
            ├── LandingPage.jsx      # 3D hero + particle canvas
            ├── LoginPage.jsx        # BG: tech abstract
            ├── RegisterPage.jsx     # BG: network
            ├── DashboardPage.jsx    # BG: circuit board
            ├── FileManagementPage.jsx # BG: workspace
            ├── FileSharingPage.jsx  # BG: space/network
            ├── TrashPage.jsx        # BG: abstract
            ├── UserProfilePage.jsx  # BG: office
            └── SharePage.jsx        # BG: data center
```

## 🎨 Design System
- **Primary color**: Dark green `#2D5A4F` / `#1e3c34`
- **Background**: White `#ffffff`  
- **Font**: Outfit (headings) + Inter (body)
- **Logo**: Same `logo_icon.png` in every page navbar
- **Backgrounds**: Unique Unsplash image per page with dark overlay

## ✅ Features
- Register / Login / Logout (bcrypt + Flask sessions)
- Dashboard with storage stats and file breakdown chart
- File upload (drag & drop, multi-file, up to 5GB)
- Folder creation and navigation with breadcrumbs
- File rename, delete (to trash), download
- Trash with restore / permanent delete / bulk ops / empty
- Share links with expiry, access limit, download toggle
- Public share page (no auth required)
- User profile editor, password change, preferences
- Toast notifications, loading states, responsive layout
