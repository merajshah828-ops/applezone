# Apple Zone — Backend + Admin Panel

A custom Node.js/Express backend for the Apple Zone website, with a real admin panel
(login, add/edit/delete device listings, multi-photo upload) so you can manage inventory
without touching code.

## What's in here

```
apple-zone-backend/
├── server.js              # main Express server
├── setup-admin.js         # run once to create your admin login
├── db/
│   └── store.js           # JSON-file data store (devices + admin account)
├── middleware/
│   ├── auth.js             # login-required check for admin routes
│   └── upload.js            # photo upload handling (multer)
├── routes/
│   ├── auth.js              # login/logout/session API
│   └── devices.js            # device CRUD API (public read, admin write)
├── public/
│   ├── index.html           # your live Apple Zone website
│   └── admin/
│       ├── login.html        # admin login page
│       ├── dashboard.html      # admin dashboard (add/edit/delete devices)
│       └── dashboard.js         # dashboard logic
└── uploads/                # uploaded device photos get stored here
```

## Running it locally

**1. Install dependencies** (needs [Node.js](https://nodejs.org) installed — version 18+):
```bash
cd apple-zone-backend
npm install
```

**2. Set up your environment file:**
```bash
cp .env.example .env
```
Then open `.env` and replace `SESSION_SECRET` with a real random string. Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**3. Create your admin login** (pick your own username/password — minimum 8 characters):
```bash
node setup-admin.js youradminname YourStrongPassword123
```
This is a one-time step. Run it again anytime to change your username/password.

**4. Start the server:**
```bash
npm start
```

**5. Open it:**
- Your live website: **http://localhost:3000/**
- Admin login: **http://localhost:3000/admin/login.html**

## How the admin panel works

- Log in at `/admin/login.html` with the username/password you set in step 3.
- **Add Device** — opens a form: name, type, storage/spec, condition, battery %, price,
  status (Available/Reserved/Sold), optional notes, and a drag-and-drop area for photos
  (up to 10 per device, JPG/PNG/WEBP/GIF, 8MB each).
- **Edit** (pencil icon) — same form, pre-filled. You can remove existing photos and/or
  add new ones in the same edit.
- **Delete** (trash icon) — asks for confirmation, then permanently removes the listing
  and its photos from disk.
- Changes show up on the live website **immediately** — the device grid on your homepage
  fetches the current listings from the backend every time someone loads the page.

## Where your data lives

- **Device listings** — `db/data/devices.json` (created automatically on first run)
- **Admin account** — `db/data/admin.json` (created by `setup-admin.js`)
- **Uploaded photos** — `uploads/` folder, served at `yoursite.com/uploads/filename.jpg`

Back up your site by copying the `db/data/` and `uploads/` folders — that's everything.

## Deploying this for real (so it's live on the internet)

Right now this only runs on your own computer. To make it live at your domain, you need
to run it on a server that's online 24/7. A few solid, beginner-friendly options:

- **[Railway](https://railway.app)** or **[Render](https://render.com)** — both have free/cheap
  tiers, deploy directly from a GitHub repo, and handle HTTPS automatically. Easiest path
  if you've never managed a server before.
- **A VPS** (DigitalOcean, Hetzner, etc.) — more control, more setup (you'd install Node.js,
  set up a process manager like `pm2`, and a reverse proxy like nginx for HTTPS).

Whichever you choose, remember to:
1. Set a real `SESSION_SECRET` in production (never reuse the local dev one).
2. Uncomment `secure: true` on the session cookie in `server.js` once you're running behind HTTPS.
3. Make sure the `uploads/` and `db/data/` folders persist between deploys (some platforms
   wipe the filesystem on every deploy — check your host's docs for persistent storage/volumes).

## Notes on the data store

Device and admin data live in plain JSON files rather than a full database (like
PostgreSQL/MySQL). For a single shop's inventory — tens to a few hundred listings — this
is genuinely sufficient and keeps things simple: no database server to install, easy to
back up, easy to inspect by hand if needed. If Apple Zone ever grows into needing multiple
staff accounts, high traffic, or thousands of listings, `db/store.js` is the one file
you'd swap out for a real database — nothing else in the app needs to change.

## Credits

Built for **Apple Zone**, Kukatpally, Hyderabad.
Site & system by **Meraj Mohi Uddin** — [@meraj_yaps](https://www.instagram.com/meraj_yaps?igsh=MXcxZDc0d2hwbDFhMg==)
