# 🎵 Spotify Playlist Creator

This repository contains two different ways to create Spotify playlists from a simple text file:
1. **Web App (Browser-based)** — No installation required, runs entirely in the browser.
2. **CLI (Python)** — The original terminal script for local execution.

---

## 1. Web App (Recommended)

Create playlists right in your browser. No Python, no install, no backend. Just open the page, paste your songs, and go.

**🚀 Try It Online:** **[Open Spotify Playlist Creator →](https://YOUR-USERNAME.github.io/spotify-list-creator/)**  
*(Replace the URL above with your actual GitHub Pages URL after deploying).*

### How It Works
1. **Log in** with your Spotify account (OAuth — we never see your password).
2. **Paste** your song list or drop a `.txt` file.
3. **Click** "Create Playlist".
4. **Done** — your playlist appears in Spotify.

### Deploy Your Own Web App
*   **GitHub Pages:** Fork/clone this repo. Go to **Settings → Pages → Source: main branch**.
*   **Spotify App:** Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app. Add your GitHub Pages URL to **Redirect URIs** (e.g., `https://YOUR-USERNAME.github.io/REPO-NAME/`).
*   **Local Testing:** Run `python -m http.server 8888` and add `http://localhost:8888/` and `http://127.0.0.1:8888/callback` as Redirect URIs in your Spotify App.

---

## 2. CLI (Python)

The original script to create playlists from your terminal.

### Requirements
```bash
pip install spotipy
```

### Setup & Usage
1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add `http://127.0.0.1:8888/callback` to your Redirect URIs.
3. Export your credentials as environment variables:
   ```powershell
   $env:SPOTIPY_CLIENT_ID="your_client_id"
   $env:SPOTIPY_CLIENT_SECRET="your_client_secret"
   $env:SPOTIPY_REDIRECT_URI="http://127.0.0.1:8888/callback"
   ```
4. Run the script:
   ```bash
   python crear_playlist_spotify.py canciones.txt "My New Playlist"
   ```

---

## 📝 Song Format (Both Versions)

One song per line. Best results with `Artist - Title`:
```
Estopa - Vientos de tormenta
Bad Bunny - NUEVAYoL
Shakira - Waka Waka
Raphael - Mi gran noche
```
Lines starting with `#` are ignored (you can use them as comments).

## 📁 Files

| File | Description |
|------|-------------|
| **Web App** | |
| `index.html` | Web app (single page) |
| `style.css` | Styles (dark Spotify theme) |
| `app.js` | Logic (OAuth, search, playlist creation) |
| `callback/index.html` | Redirect handler for OAuth |
| **CLI App** | |
| `crear_playlist_spotify.py` | Original Python CLI version |
| **Data** | |
| `canciones.txt` | Example song list |
| `canciones_ciencia_medicina_limpia.txt` | Example: science & medicine songs |

## License
MIT
