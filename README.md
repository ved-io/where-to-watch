# Where to Watch 🎬

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success.svg)](./manifest.webmanifest)
[![JavaScript](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e.svg)](https://developer.mozilla.org/de/docs/Web/JavaScript)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8.svg)](https://tailwindcss.com/)

**Where to Watch** ist eine moderne, leichtgewichtige Streaming-Guide-Web-App (PWA): Wähle einen Film oder eine Serie aus und sieh sofort, **bei welchem Streamingdienst in Deutschland der Titel verfügbar ist** – im Flatrate-Abo, kostenlos in Mediatheken oder zum Kaufen/Leihen – inklusive Besetzung, Bewertung, Laufzeit und Synopsis.

Gebaut mit Fokus auf Performance, moderne Ästhetik (*Nocturne Cinema / Stitch UI*) und Offline-Fähigkeit – ganz ohne schwerfällige Frameworks oder Build-Schritte.

---

## ✨ Features

- 🔍 **Live-Suche & Filter**: Debounced Suche nach Titeln, Filter nach Streaming-Anbietern (Netflix, Prime Video, Disney+, Apple TV+, etc.) und Genres.
- 📱 **Progressive Web App (PWA)**: Installierbar auf Smartphones, Tablets und Desktop. Offline-Cache für App-Shell und zuvor geladene Filmdaten via Service Worker.
- ⭐ **Persistente Watchlist**: Speichere Lieblingstitel lokal im Browser (`localStorage`), auch ohne Login oder Cloud-Zwang.
- 🎨 **Adaptive Oberfläche**: Dunkles Apple-inspiriertes Designsystem mit flüssigen Übergängen (`cubic-bezier`), responsiver Grid-Architektur und barrierearmen Kontrasten.
- ⚡ **Zero-Build**: Reines HTML5, Tailwind CSS Tokens und Vanilla JavaScript.

---

## 🚀 Schnellstart

Da die App ohne Build-Tools (kein Webpack/Vite nötig) auskommt, kann sie direkt gestartet werden:

### 1. Repository klonen
```bash
git clone https://github.com/DEIN_BENUTZERNAME/where-to-watch.git
cd where-to-watch
```

### 2. Konfiguration einrichten
Kopiere das Konfigurationstemplate:
```bash
cp js/config.example.js js/config.js
```
Öffne `js/config.js` und trage deinen persönlichen **TMDB API Read-Access Token** ein:
1. Kostenlosen Account auf [themoviedb.org](https://www.themoviedb.org/) erstellen.
2. Unter [Einstellungen → API](https://www.themoviedb.org/account/api) einen **API Read Access Token** (v4 Bearer Token) generieren.
3. Den Token in `js/config.js` einfügen.

> 🔒 **Sicherheitshinweis**: `js/config.js` ist in `.gitignore` hinterlegt und wird niemals in das GitHub-Repository übertragen. Dein Token bleibt geschützt.

### 3. Lokal starten
Starte einen beliebigen lokalen Webserver (z. B. mit Python):
```bash
python3 -m http.server 8000
```
Öffne anschließend [http://localhost:8000](http://localhost:8000) im Browser.

---

## 🌐 Deployment

### Auf eigenem Webhost (Apache / Nginx / Shared Hosting)
1. Lade alle Dateien des Projekts auf deinen Webspace (z. B. per SFTP).
2. Stelle sicher, dass deine `js/config.js` mit deinem gültigen API-Token auf dem Server liegt.
3. Fertig! Die Seite ist sofort für alle Besucher einsatzbereit.

### Auf GitHub Pages
1. Aktiviere GitHub Pages in den Repository-Einstellungen (`Settings` → `Pages` → `Deploy from branch: main / root`).
2. Da `js/config.js` nicht im öffentlichen Git-Repository liegt, bietet die Web-App bei Aufruf auf GitHub Pages automatisch einen Dialog zur Eingabe eines individuellen TMDB-Tokens an. Dieser wird sicher im lokalen Speicher (`localStorage`) des jeweiligen Nutzers hinterlegt.

---

## 📁 Projektstruktur

```text
.
├── assets/                     # Logos, Marken-Grafiken & Favicons
│   ├── icons/                  # PWA-Icons in allen Auflösungen & Maskables
│   └── wtw-*.png / wtw-*.svg   # Nocturne Cinema Logos
├── css/
│   └── style.css               # Design-Tokens, Glasmorphismus & Animationen
├── js/
│   ├── app.js                  # Kern-Applikation (State, Caching, TMDB-API)
│   ├── config.example.js       # Konfigurations-Template für TMDB-Credentials
│   └── config.js               # Lokale Konfiguration (durch .gitignore geschützt)
├── .gitignore                  # Schützt private Keys & Betriebssystemdateien
├── favicon.ico                 # Standard-Favicon Fallback
├── index.html                  # Semantisches HTML5 Markup & App-Shell
├── LICENSE                     # MIT Lizenz
├── manifest.webmanifest        # PWA-Manifest (Theme-Farben, Shortcuts)
├── README.md                   # Projektdokumentation
└── sw.js                       # Service Worker (Offline-Cache & Strategien)
```

---

## 🛠️ Datenquellen & Attribution

- **Metadaten, Poster & Besetzung**: Bereitgestellt von [The Movie Database (TMDB)](https://www.themoviedb.org/).
- **Streaming-Verfügbarkeit**: Ermittelt über JustWatch (über die offizielle TMDB Watch-Providers API).
- Dieses Produkt nutzt die TMDB-API, wird jedoch nicht von TMDB oder JustWatch unterstützt oder zertifiziert.

---

## 📄 Lizenz

Dieses Projekt ist unter der [MIT-Lizenz](./LICENSE) lizenziert.
