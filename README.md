# 🎵 Spotify Playlist Creator

This repository contains two different ways to create Spotify playlists from a simple text file:
1. **Web App (Browser-based)** — No installation required, runs entirely in the browser.
2. **CLI (Python)** — The original terminal script for local execution.

---

## 1. Web App (Recommended)

Create playlists right in your browser. No Python, no install, no backend. Just open the page, paste your songs, and go.

**🚀 Try It Online:** **[Open Spotify Playlist Creator →](https://querolus.github.io/spotify-list-creator/)**  
*(Replace the URL above with your actual GitHub Pages URL after deploying).*

### How It Works
1. **Log in** with your Spotify account (OAuth — we never see your password).
2. **Paste** your song list or drop a `.txt` file.
3. **Click** "Create Playlist".
4. **Done** — your playlist appears in Spotify.

### Run It Locally
> ⚠️ **Do not open `index.html` by double-clicking it.** Pages opened as `file://` cannot log in to Spotify (you'll get `redirect_uri: Not matching configuration`).

1. Make sure `http://127.0.0.1:8888/callback` is listed under **Redirect URIs** in your app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) (exact match, no trailing slash).
2. Start the local server:
   - **Windows:** double-click `iniciar.bat`, **or**
   - **Any OS:** open a terminal in this folder and run:
     ```bash
     python -m http.server 8888 --bind 127.0.0.1
     ```
3. Open **http://127.0.0.1:8888/** in your browser (`iniciar.bat` does this for you).
4. Keep the terminal window open while you use the app. Close it (or press `Ctrl+C`) to stop the server.

*Requires Python 3. Use `127.0.0.1`, not `localhost`: Spotify no longer accepts `localhost` redirect URIs.*

### Deploy Your Own Web App
*   **GitHub Pages:** Fork/clone this repo. Go to **Settings → Pages → Source: main branch**.
*   **Spotify App:** Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app. Add your GitHub Pages URL to **Redirect URIs** (e.g., `https://YOUR-USERNAME.github.io/REPO-NAME/`).
*   **Local Testing:** Double-click `iniciar.bat` (or run `python -m http.server 8888`) and open `http://127.0.0.1:8888/`. Add `http://127.0.0.1:8888/callback` as a Redirect URI in your Spotify App. Do **not** open `index.html` directly (`file://` is rejected by Spotify), and note Spotify no longer accepts `localhost` redirect URIs.

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
| `iniciar.bat` | Starts the local server and opens the app (Windows) |
| **CLI App** | |
| `crear_playlist_spotify.py` | Original Python CLI version |
| **Data** | |
| `canciones.txt` | Example song list |
| `canciones_ciencia_medicina_limpia.txt` | Example: science & medicine songs |

## License
MIT
