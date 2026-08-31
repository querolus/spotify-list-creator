#!/usr/bin/env python3
"""
Crea una playlist en Spotify a partir de una lista de canciones en texto plano.

REQUISITOS
----------
  pip install spotipy

CONFIGURACION (una sola vez)
----------------------------
1. Entra en https://developer.spotify.com/dashboard y crea una app.
2. En "Settings" -> "Redirect URIs" anade exactamente:
       http://127.0.0.1:8888/callback
3. Copia el Client ID y el Client Secret y exportalos como variables de entorno en el directorio donde vayas a ejecutar el script:

       $env:SPOTIPY_CLIENT_ID="b89adc3cb03b4cb2bed4d841cbe79030"
       $env:SPOTIPY_CLIENT_SECRET="bc336adca4c74ed3a6521ddcc5dec09a"
       $env:SPOTIPY_REDIRECT_URI="http://127.0.0.1:8888/callback"

USO
---
       python3 crear_playlist_spotify.py canciones.txt "Verano Campeones del Mundo"

La primera vez se abrira el navegador para autorizar la app. Despues queda
cacheado en .cache y ya no vuelve a pedirlo.

FORMATO DEL FICHERO
-------------------
Una cancion por linea, idealmente "Artista - Titulo". Tambien vale solo el
titulo (la busqueda sera menos precisa). Las lineas vacias y las que empiezan
por # se ignoran.
"""

import sys
import os
import time

try:
    import spotipy
    from spotipy.oauth2 import SpotifyOAuth
except ImportError:
    sys.exit("Falta spotipy. Instala con:  pip install spotipy")

SCOPE = "playlist-modify-public playlist-modify-private"


def leer_canciones(ruta):
    with open(ruta, encoding="utf-8") as f:
        return [l.strip() for l in f if l.strip() and not l.startswith("#")]


def construir_query(linea):
    """Convierte 'Artista - Titulo' en una query con campos de Spotify."""
    if " - " in linea:
        artista, titulo = linea.split(" - ", 1)
        return f'track:"{titulo.strip()}" artist:"{artista.strip()}"', linea
    return linea, linea


def buscar(sp, linea):
    """Intenta busqueda estructurada; si falla, busqueda libre."""
    query, original = construir_query(linea)
    for q in (query, original):
        try:
            res = sp.search(q=q, type="track", limit=1, market="ES")
        except spotipy.SpotifyException as e:
            print(f"   ! Error de API en '{linea}': {e}")
            return None
        items = res.get("tracks", {}).get("items", [])
        if items:
            return items[0]
        time.sleep(0.1)
    return None


def main():
    if len(sys.argv) < 2:
        sys.exit(f"Uso: python3 {sys.argv[0]} <fichero.txt> [nombre playlist]")

    ruta = sys.argv[1]
    nombre = sys.argv[2] if len(sys.argv) > 2 else "Playlist importada"

    for var in ("SPOTIPY_CLIENT_ID", "SPOTIPY_CLIENT_SECRET", "SPOTIPY_REDIRECT_URI"):
        if not os.environ.get(var):
            sys.exit(f"Falta la variable de entorno {var}. Lee la cabecera del script.")

    canciones = leer_canciones(ruta)
    print(f"Leidas {len(canciones)} lineas de {ruta}\n")

    sp = spotipy.Spotify(auth_manager=SpotifyOAuth(scope=SCOPE))
    user_id = sp.me()["id"]
    print(f"Autenticado como: {user_id}\n")

    uris, no_encontradas, vistos = [], [], set()

    for i, linea in enumerate(canciones, 1):
        track = buscar(sp, linea)
        if track is None:
            print(f"{i:>3}. NO ENCONTRADA  -> {linea}")
            no_encontradas.append(linea)
            continue
        if track["uri"] in vistos:
            print(f"{i:>3}. duplicada      -> {linea}")
            continue
        vistos.add(track["uri"])
        uris.append(track["uri"])
        artistas = ", ".join(a["name"] for a in track["artists"])
        print(f"{i:>3}. OK  {artistas} - {track['name']}")
        time.sleep(0.15)  # cortesia con el rate limit

    if not uris:
        sys.exit("\nNo se encontro ninguna cancion. Revisa el fichero.")

    # NOTA: sp.user_playlist_create() usa POST /users/{id}/playlists, que
    # Spotify retiro en la migracion de febrero de 2026 y ahora devuelve 403
    # en las apps en modo Development. El endpoint valido es POST /me/playlists.
    playlist = sp._post(
        "me/playlists",
        payload={
            "name": nombre,
            "public": False,
            "description": "Creada automaticamente desde un fichero de texto",
        },
    )

    # La API acepta un maximo de 100 tracks por peticion
    for j in range(0, len(uris), 100):
        sp.playlist_add_items(playlist["id"], uris[j:j + 100])

    print(f"\nPlaylist creada: {playlist['external_urls']['spotify']}")
    print(f"Anadidas {len(uris)} canciones.")

    if no_encontradas:
        print(f"\nNo se encontraron {len(no_encontradas)}:")
        for c in no_encontradas:
            print(f"  - {c}")
        print("Anade el artista o corrige el titulo en el .txt y vuelve a ejecutar.")


if __name__ == "__main__":
    main()
