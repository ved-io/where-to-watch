// ============================================================
//  Where to Watch – Konfigurationstemplate (TMDB API v3)
// ------------------------------------------------------------
//  Kopiere diese Datei nach `js/config.js` und trage deinen
//  eigenen TMDB API Read-Access Token ein.
//
//  Eigenen API Read Access Token erstellen:
//    1. Registriere dich auf https://www.themoviedb.org/
//    2. Gehe zu: Einstellungen -> API (https://www.themoviedb.org/account/api)
//    3. Erstelle einen "API Read Access Token" (v4 auth / Bearer Token)
//    4. Trage das generierte JWT unten bei `token` ein.
//
//  Hinweis: `js/config.js` wird durch .gitignore nicht auf GitHub
//  übertragen, um deinen Token privat zu halten.
// ============================================================

window.WW_CONFIG = {
  baseUrl: 'https://api.themoviedb.org/3',
  token: 'DEIN_TMDB_API_READ_ACCESS_TOKEN_HIER',
  country: 'DE',
  language: 'de-DE'
};
