# Site Location Dashboard — Setup Guide

## Quick Start

1. **Open the app:**
   - Open `dashboard/index.html` in your web browser

2. **Set up Google Maps API (first time only):**
   - A modal will appear asking for your API key
   - Follow the instructions in the modal to get a free key from Google Cloud Console
   - Paste your key and click "Save & Continue"
   - The key is saved to your browser's local storage

3. **Upload your Excel file:**
   - Click the "Upload" button
   - Drag and drop your Excel file or click to select
   - The app will automatically geocode all addresses and display them on the map

4. **Explore the map:**
   - Click "Map View" to see all your sites
   - Click on markers or items in the sidebar to see details
   - Use the search box to filter sites
   - Click "Directions →" to get navigation to a site

---

## Getting a Google Maps API Key

**Free option (up to 200$ credit/month):**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. In the top search bar, find and enable:
   - **Maps JavaScript API**
   - **Geocoding API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the key and paste it into the dashboard modal

**Note:** Google provides free usage up to $200/month, which covers most use cases.

---

## Supported Excel Columns

The app automatically detects columns named:
- **Branch Name** (or Site Name)
- **Address**
- **Phone** (or H/Phone PC)
- **Contact** (or Pengurus)
- **Installation Date**
- Plus any other columns you want to display

All columns from your Excel file will appear in the site detail panel.

---

## Features

✅ **Drag-and-drop Excel upload** — No complex setup needed
✅ **Automatic geocoding** — Converts addresses to map locations
✅ **Interactive map** — Click markers to see details
✅ **Search & filter** — Find sites by name or address
✅ **Responsive design** — Works on desktop and mobile
✅ **Local storage** — Your API key is saved securely in your browser

---

## Troubleshooting

**Map isn't showing?**
- Make sure you've entered a valid Google Maps API key
- Check that both "Maps JavaScript API" and "Geocoding API" are enabled in your Google Cloud project

**Addresses not appearing on the map?**
- Some addresses may not geocode if they're incomplete
- Check the status in the sidebar ("Geocoded" count)
- Make sure addresses are in a standard format (e.g., "123 Main St, City, Country")

**Want to change your API key?**
- Right-click → Inspect → Application tab → Local Storage
- Delete the "googleMapsApiKey" entry
- Refresh the page to set a new key

---

## Support

For issues or feedback, check the browser console for error messages (F12 → Console tab).
