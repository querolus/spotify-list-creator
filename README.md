# 🎵 Spotify Playlist Creator

Create Spotify playlists from a simple text file — right in your browser.  
No Python, no install, no backend. Just open the page, paste your songs, and go.

## 🚀 Try It Online

**[Open Spotify Playlist Creator →](https://YOUR-USERNAME.github.io/spotify-list-creator/)**

> Replace the URL above with your actual GitHub Pages URL after deploying.

## How It Works

1. **Log in** with your Spotify account (OAuth — we never see your password)
2. **Paste** your song list or drop a `.txt` file
3. **Click** "Create Playlist"
4. **Done** — your playlist appears in Spotify

### Song Format

One song per line. Best results with `Artist - Title`:

```
Estopa - Vientos de tormenta
Bad Bunny - NUEVAYoL
Shakira - Waka Waka
Raphael - Mi gran noche
```

Lines starting with `#` are ignored (you can use them as comments).

## 🛠 Deploy Your Own

### Option A: GitHub Pages (recommended)

1. Fork or clone this repo
2. Go to **Settings → Pages → Source: main branch**
3. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app (or use the existing one)
4. In your Spotify App **Settings → Redirect URIs**, add your GitHub Pages URL:  
   `https://YOUR-USERNAME.github.io/REPO-NAME/`
5. Push and visit your GitHub Pages URL — done!

### Option B: Any Static Host

Upload `index.html`, `style.css`, and `app.js` to any static hosting service (Netlify, Vercel, Cloudflare Pages, etc.). Add the hosted URL as a Redirect URI in your Spotify App.

### Option C: Run Locally

```bash
# Start a local server (Python)
python -m http.server 8888

# Or with Node.js
npx serve .
```

Then add `http://localhost:8888/` as a Redirect URI in your Spotify Developer App.

## 🔑 About the Client ID

The app comes with a default Spotify Client ID for quick use. However, Spotify apps in **Development Mode** are limited to **25 users**. If you hit this limit:

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add your page URL as a Redirect URI
4. Copy the Client ID
5. In the web app, expand **"Advanced: Use your own Spotify App"** and paste your Client ID

The Client ID is **not a secret** — Spotify's PKCE flow is designed for public clients.

## 📁 Files

| File | Description |
|------|-------------|
| `index.html` | Web app (single page) |
| `style.css` | Styles (dark Spotify theme) |
| `app.js` | Logic (OAuth, search, playlist creation) |
| `crear_playlist_spotify.py` | Original Python CLI version |
| `canciones.txt` | Example song list |
| `canciones_ciencia_medicina_limpia.txt` | Example: science & medicine songs |

## License

MIT
