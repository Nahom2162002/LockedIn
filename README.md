# 🔒 LockedIn

LockedIn is a Chrome browser extension that helps you stay focused by blocking distracting websites during times you set. Add any website to your restriction list, set a date and time range, and LockedIn will automatically block it during that period.

---

## Prerequisites

Before using LockedIn, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Nahom2162002/LockedIn.git
cd lockedin
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Extension

```bash
npm run build
```

### 4. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** in the top right corner
3. Click **Load unpacked**
4. Select the `build` folder from the project directory

The LockedIn extension icon should now appear in your Chrome toolbar.

---

## How to Use

### Opening the Extension

Click the LockedIn icon in your Chrome toolbar to open the popup.

### Adding a Website to Your Restriction List

1. Click **"Click here to get started"** to open the full extension page
2. Click **"Add Website"** to open the website form
3. Fill in the following fields:
   - **URL** — the full URL of the website you want to block (e.g. `https://www.youtube.com`)
   - **Date** — the date you want the restriction to apply (cannot be before today)
   - **Start Time** — the time the restriction should begin
   - **End Time** — the time the restriction should end (must be after start time)
4. Click **"Add"** to save the website to your list

### Viewing Your Restricted Websites

Your restricted websites will appear as cards on the main page, each showing:
- The website URL
- The restriction date
- The start and end times

### Editing a Website

1. Find the website card you want to edit
2. Click the **"Edit"** button
3. Update the fields as needed
4. Click **"Save"** to apply the changes

### Deleting a Website

1. Find the website card you want to remove
2. Click the **"Delete"** button
3. The website will be removed from your list immediately

### How Blocking Works

- When you navigate to a restricted website during the set date and time range, you will automatically be redirected to a **blocked page**
- Once the end time has passed, refreshing the blocked page will automatically redirect you back to the original website

---

## Rebuilding After Changes

Whenever you make changes to the extension code, rebuild and reload it:

```bash
npm run build
```

Then go to `chrome://extensions` and click the **refresh icon** on the LockedIn card.

---

## Backend

The backend is hosted on Render at:
```
https://lockedin-jovk.onrender.com
```

> **Note:** The backend is hosted on Render's free tier and may take up to 30 seconds to respond on the first request after a period of inactivity. Subsequent requests will be fast.

---

## Troubleshooting

**Websites aren't being blocked**
- Open the extension popup to sync your website list to the extension
- Go to `chrome://extensions`, find LockedIn, and click **"Service Worker"** to check for errors

**Changes to the website list aren't showing**
- Try refreshing the extension page

**Extension not loading**
- Make sure you selected the `build` folder and not the root project folder
- Check that `manifest.json` is present in the `build` folder

**First request is slow**
- This is expected on Render's free tier — the server spins down after 15 minutes of inactivity and takes up to 30 seconds to wake up on the first request

---

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas, Mongoose
- **Extension:** Chrome Manifest V3
- **Hosting:** Render