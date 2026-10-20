// ============================================================
//  Where to Watch – App Logik (Nocturne Cinema / Stitch UI)
// ------------------------------------------------------------
//  Startbildschirm & Gescrollte Ansicht · TMDB API v3 & JustWatch
//  Suche mit Debounce · Filter nach Kategorie & Genre ·
//  Detail-Modal mit Besetzung & Streaming-Links · Watchlist
// ============================================================
(function () {
  'use strict';

  const DEFAULT_CONFIG = {
    baseUrl: 'https://api.themoviedb.org/3',
    country: 'DE',
    language: 'de-DE'
  };
  const CONFIG = Object.assign({}, DEFAULT_CONFIG, window.WW_CONFIG || {});

  function getEffectiveToken() {
    const raw = (CONFIG.token || '').trim();
    if (raw && !raw.includes('DEIN_TMDB_API_READ_ACCESS_TOKEN')) {
      return raw;
    }
    return (localStorage.getItem('ww_tmdb_token') || '').trim();
  }

  let isPrompting = false;
  function promptForApiKey(customMessage) {
    if (isPrompting) return;
    isPrompting = true;
    setTimeout(() => {
      const msg = customMessage || 
        'Where to Watch benötigt einen TMDB API Read-Access Token (v4 auth Bearer Token).\n\n' +
        'Erstelle einen kostenlosen Token unter https://www.themoviedb.org/account/api\n\n' +
        'Bitte Token eingeben (wird sicher im Browser gespeichert):';
      const entered = window.prompt(msg);
      if (entered && entered.trim()) {
        localStorage.setItem('ww_tmdb_token', entered.trim());
        window.location.reload();
      }
      isPrompting = false;
    }, 150);
  }

  const IMG_BASE = 'https://image.tmdb.org/t/p/';
  const LOGO_BASE = 'https://image.tmdb.org/t/p/original';
  const POSTER_W = 'w342';
  const POSTER_S = 'w185';
  const BACKDROP_W = 'w780';
  const PROVIDERS_TTL = 48 * 60 * 60 * 1000; // 48 Stunden TTL (2 Tage)

  /* ============================================================
     TMDB Genre Mappings (DE)
     ============================================================ */
  const GENRE_MAP = {
    28: 'Action',
    12: 'Abenteuer',
    16: 'Animation',
    35: 'Komödie',
    80: 'Krimi',
    99: 'Doku',
    18: 'Drama',
    10751: 'Familie',
    14: 'Fantasy',
    36: 'Historie',
    27: 'Horror',
    10402: 'Musik',
    9648: 'Mystery',
    10749: 'Romantik',
    878: 'Sci-Fi',
    10770: 'TV-Film',
    53: 'Thriller',
    10752: 'Krieg',
    37: 'Western'
  };

  /* ============================================================
     Streaming-Dienste & Provider-Metadaten
     ============================================================ */
  const CANONICAL_SERVICES = {
    netflix: {
      key: 'netflix',
      label: 'Netflix',
      tmdbId: '8|1796',
      logo: '/rK1KljqmbvO9HQa1PBFLILWah72.png',
      color: '#E50914',
      badgeText: 'N',
      url: 'https://www.netflix.com/de-de',
      aliases: ['netflix', 'netflix standard with ads', 'netflix basic with ads', 'netflix kids']
    },
    prime: {
      key: 'prime',
      label: 'Prime Video',
      tmdbId: '9|2100|613',
      logo: '/gMZdpavHmxFNnLpMHwVxfqeux2g.png',
      color: '#00A8E1',
      badgeText: 'P',
      url: 'https://www.primevideo.de/',
      aliases: ['amazon prime video', 'prime video', 'amazon video', 'amazon prime video with ads', 'amazon prime video free with ads']
    },
    disney: {
      key: 'disney',
      label: 'Disney+',
      tmdbId: '337',
      logo: '/5eZ872CghnHFLB1j8grszbrx0dx.png',
      color: '#113CCF',
      badgeText: 'D+',
      url: 'https://www.disneyplus.com/de-de',
      aliases: ['disney plus', 'disney+']
    },
    hbomax: {
      key: 'hbomax',
      label: 'HBO Max',
      tmdbId: '1899|1825',
      logo: '/64fLWeSyZ1KQZhIdvTdy4QHeWty.png',
      color: '#7422FF',
      badgeText: 'MAX',
      url: 'https://www.max.com/',
      aliases: ['hbo max', 'hbomax', 'max', 'hbo max amazon channel', 'hbo']
    },
    joyn: {
      key: 'joyn',
      label: 'Joyn',
      tmdbId: '304',
      logo: '/fXtgvU410LTT6NjQ4ERdUzoUHQC.png',
      color: '#FF7A14',
      badgeText: 'Joyn',
      url: 'https://www.joyn.de/',
      isFree: true,
      aliases: ['joyn']
    },
    joynplus: {
      key: 'joynplus',
      label: 'Joyn PLUS+',
      tmdbId: '421',
      logo: '/mjkfHoWsOku18fGjmYF5O1VXUrm.png',
      color: '#FF5500',
      badgeText: 'Joyn+',
      url: 'https://www.joyn.de/',
      isFree: false,
      aliases: ['joyn plus', 'joyn plus+', 'joynplus']
    },
    zdf: {
      key: 'zdf',
      label: 'ZDF Mediathek',
      tmdbId: '537',
      logo: '/sQsgEUFPgsuJaBf68OJ7s6ht6ta.png',
      color: '#FA7D00',
      badgeText: 'ZDF',
      url: 'https://www.zdf.de/',
      isFree: true,
      aliases: ['zdf', 'zdfmediathek', 'zdf mediathek', 'zdf info', 'zdf neo']
    },
    ard: {
      key: 'ard',
      label: 'ARD Mediathek',
      tmdbId: '219',
      logo: '/t3BatjPEMio5Y6uNZ2OpUifOrEK.png',
      color: '#003666',
      badgeText: 'ARD',
      url: 'https://www.ardmediathek.de/',
      isFree: true,
      aliases: ['ard mediathek', 'ard', 'das erste']
    },
    ardplus: {
      key: 'ardplus',
      label: 'ARD Plus',
      tmdbId: '1902|2065|2037',
      logo: '/iwv2QRXX0bke0kK3b1v6P1uT4u6.png',
      color: '#004F9F',
      badgeText: 'ARD+',
      url: 'https://www.ardplus.de/',
      isFree: false,
      aliases: ['ard plus', 'ard plus amazon channel', 'ard plus apple tv channel', 'ardplus']
    },
    arte: {
      key: 'arte',
      label: 'Arte',
      tmdbId: '234',
      logo: '/ieo2l4zOaljYqJNGxWY8jWryld5.png',
      color: '#FA4616',
      badgeText: 'Arte',
      url: 'https://www.arte.tv/de/',
      isFree: true,
      aliases: ['arte', 'arte mediathek']
    },
    pluto: {
      key: 'pluto',
      label: 'Pluto TV',
      tmdbId: '300',
      logo: '/fN4czqaMQNLeF6sSSIjGbAWzvwK.png',
      color: '#E5A914',
      badgeText: 'Pluto',
      url: 'https://pluto.tv/',
      isFree: true,
      aliases: ['pluto', 'pluto tv']
    },
    netzkino: {
      key: 'netzkino',
      label: 'Netzkino',
      tmdbId: '28|2263',
      logo: '/sFttgm39WC1HxP2qZvlDzh2Gk9O.png',
      color: '#E50000',
      badgeText: 'Netz',
      url: 'https://www.netzkino.de/',
      isFree: true,
      aliases: ['netzkino', 'netzkino select amazon channel']
    },
    paramount: {
      key: 'paramount',
      label: 'Paramount+',
      tmdbId: '531|582',
      logo: '/pkx3klJlwW5JdtaulvDx6hDNtch.png',
      color: '#002659',
      badgeText: 'P+',
      url: 'https://www.paramountplus.com/de-de',
      aliases: ['paramount plus', 'paramount+', 'paramount', 'paramount+ amazon channel']
    },
    wow: {
      key: 'wow',
      label: 'WOW / Sky',
      tmdbId: '30|29',
      logo: '/2o26YwA7tXQ7I6CSrMvO9Rj4oNi.png',
      color: '#00E396',
      badgeText: 'WOW',
      url: 'https://www.wowtv.de/',
      aliases: ['wow', 'sky go', 'sky ticket', 'wow fiction amazon channel', 'sky']
    },
    rtlplus: {
      key: 'rtlplus',
      label: 'RTL+',
      tmdbId: '2750|2578',
      logo: '/er0P3HwuVruKgnOqF8CoNdAAPPD.png',
      color: '#E4002B',
      badgeText: 'RTL+',
      url: 'https://www.rtlplus.de/',
      aliases: ['rtl+', 'rtl plus', 'rtl', 'rtl+ max amazon channel']
    },
    apple: {
      key: 'apple',
      label: 'Apple TV+',
      tmdbId: '350',
      logo: '/9icYBfYFcwgCbky5VdGUIKJ4C5i.png',
      color: '#000000',
      badgeText: 'tv+',
      url: 'https://tv.apple.com/de-de',
      aliases: ['apple tv+', 'apple tv', 'apple tv amazon channel']
    },
    freevee: {
      key: 'freevee',
      label: 'Freevee',
      tmdbId: '613',
      logo: '/46U3TOB3PhVDjA7qaFOuYSaGMiq.png',
      color: '#FFD814',
      badgeText: 'Free',
      url: 'https://www.amazon.de/freevee',
      isFree: true,
      aliases: ['freevee', 'amazon freevee']
    }
  };

  // Lookup-Helper für kanonischen Provider
  function getCanonical(rawName) {
    const low = String(rawName || '').trim().toLowerCase();
    // 1. Exakter Match
    for (const conf of Object.values(CANONICAL_SERVICES)) {
      if (conf.aliases.some((a) => low === a)) {
        return conf;
      }
    }
    // 2. Präfix-Match: Längere Aliase zuerst prüfen (z.B. 'ard plus' vor 'ard', 'joyn plus' vor 'joyn')
    const sortedConfs = Object.values(CANONICAL_SERVICES)
      .map((conf) => ({ conf, maxLen: Math.max(...conf.aliases.map((a) => a.length)) }))
      .sort((a, b) => b.maxLen - a.maxLen);

    for (const { conf } of sortedConfs) {
      if (conf.aliases.some((a) => low.startsWith(a))) {
        return conf;
      }
    }
    return {
      key: low,
      label: rawName || 'Streaming',
      color: '#475569',
      badgeText: (rawName || '?').charAt(0).toUpperCase(),
      url: null,
      isFree: false
    };
  }

  // TMDB Provider IDs in Deutschland für /discover/movie
  // Baut die Map automatisch aus CANONICAL_SERVICES auf (Single Source of Truth)
  const PROVIDER_IDS_MAP = {
    free: Object.values(CANONICAL_SERVICES)
      .filter((c) => c.isFree && c.tmdbId)
      .map((c) => c.tmdbId)
      .join('|'),
    flatrate: null,
    all: null
  };
  for (const [k, conf] of Object.entries(CANONICAL_SERVICES)) {
    if (conf.tmdbId) {
      PROVIDER_IDS_MAP[k] = conf.tmdbId;
    }
  }

  // Provider-Aliasse für den Client-Filter
  // Baut die Aliasse automatisch aus CANONICAL_SERVICES auf (Single Source of Truth)
  const SERVICE_ALIASES = {
    free: Object.values(CANONICAL_SERVICES)
      .filter((c) => c.isFree && c.aliases)
      .flatMap((c) => c.aliases)
  };
  for (const [k, conf] of Object.entries(CANONICAL_SERVICES)) {
    if (conf.aliases) {
      SERVICE_ALIASES[k] = conf.aliases;
    }
  }

  /* ============================================================
     DOM-Referenzen
     ============================================================ */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const gridEl = $('#grid');
  const viewTitleEl = $('#view-title');
  const loadMoreBtn = $('#load-more');
  const statusEl = $('#status');
  const heroSearchInput = $('#heroSearchInput');
  const headerSearchInput = $('#headerSearchInput');
  const catalogSortWrap = $('#catalog-sort-wrap');
  const sortToggleGroup = $('#sortToggleGroup');
  const modalEl = $('#modal');
  const modalBodyEl = $('#modal-body');
  const modalCloseBtn = $('#modal-close');
  const modalWlBtn = $('#modal-watchlist-btn');
  const toastEl = $('#toast');
  const wlToggle = $('#watchlist-toggle');
  const wlCountEl = $('#wl-count');
  const wlPanelEl = $('#watchlist-panel');
  const genreDropdownBtn = $('#genreDropdownBtn');
  const genreDropdownMenu = $('#genreDropdownMenu');
  const genreDropdownLabel = $('#genreDropdownLabel');
  const genreDropdownChevron = $('#genreDropdownChevron');
  const moreProvidersBtn = $('#moreProvidersBtn');
  const moreProviderMenu = $('#moreProviderMenu');
  const moreProviderLabel = $('#moreProviderLabel');
  const moreProviderChevron = $('#moreProviderChevron');
  const clearProvidersBtn = $('#clearProvidersBtn');
  const mobileSearchToggle = $('#mobile-search-toggle');
  const mobileSearchIcon = $('#mobile-search-icon');

  // Mobile Modal Bottom Sheets (< 768px)
  const mobileProviderSheet = $('#mobileProviderSheet');
  const mobileProviderCloseBtn = $('#mobileProviderCloseBtn');
  const mobileClearProvidersBtn = $('#mobileClearProvidersBtn');
  const mobileProviderApplyBtn = $('#mobileProviderApplyBtn');
  const mobileProviderFooterStatus = $('#mobileProviderFooterStatus');
  const mobileProviderSheetSubtitle = $('#mobileProviderSheetSubtitle');
  const mobileProviderDragZone = $('#mobileProviderDragZone');

  const mobileGenreSheet = $('#mobileGenreSheet');
  const mobileGenreCloseBtn = $('#mobileGenreCloseBtn');
  const mobileGenreSearchInput = $('#mobileGenreSearchInput');
  const mobileGenreSearchClear = $('#mobileGenreSearchClear');
  const mobileGenreSheetSubtitle = $('#mobileGenreSheetSubtitle');
  const mobileGenreDragZone = $('#mobileGenreDragZone');

  const PRESET_PROVIDERS = new Set(['all', 'free', 'flatrate']);

  /* ============================================================
     Anbieter-Präferenzen (localStorage)
     ============================================================ */
  const SAVED_PROVIDERS_KEY = 'ww_saved_providers';

  function loadSavedProviders() {
    try {
      const raw = localStorage.getItem(SAVED_PROVIDERS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const provs = Array.isArray(parsed.providers)
          ? parsed.providers.filter((p) => typeof p === 'string' && CANONICAL_SERVICES[p])
          : [];
        let srv = parsed.service;
        if (provs.length > 0) {
          srv = null;
        } else if (!PRESET_PROVIDERS.has(srv)) {
          srv = 'all';
        }
        return { providers: provs, service: srv };
      }
      if (Array.isArray(parsed)) {
        const provs = parsed.filter((p) => typeof p === 'string' && CANONICAL_SERVICES[p]);
        return {
          providers: provs,
          service: provs.length > 0 ? null : 'all'
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function saveSavedProviders() {
    try {
      const data = {
        providers: Array.from(state.selectedProviders),
        service: state.service
      };
      localStorage.setItem(SAVED_PROVIDERS_KEY, JSON.stringify(data));
    } catch (e) { }
  }

  function restoreSavedProviders() {
    const saved = loadSavedProviders();
    if (saved) {
      state.selectedProviders = new Set(saved.providers);
      state.service = saved.service;
    } else {
      state.selectedProviders = new Set();
      state.service = 'all';
    }
  }

  const savedInitialProviders = loadSavedProviders();

  /* ============================================================
     App State
     ============================================================ */
  const state = {
    view: 'popular',          // 'popular' | 'search'
    query: '',                // Suchtext
    page: 0,                  // geladene TMDB Seite
    hasMore: true,
    loading: false,
    genreId: null,            // Genre-ID oder null
    sortBy: 'popularity.desc', // 'popularity.desc' | 'primary_release_date.desc'
    service: savedInitialProviders ? savedInitialProviders.service : 'all',
    selectedProviders: savedInitialProviders ? new Set(savedInitialProviders.providers) : new Set(),
    movies: [],              // Akkumulierte Filme
    seen: new Set(),         // Bereits geladene Film-IDs
    cardEls: new Map(),      // ID -> DOM Element
    providerInFlight: 0,
    modalOpenId: null
  };

  /* ============================================================
     Hilfsfunktionen
     ============================================================ */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function fmtRating(v) {
    if (v == null || isNaN(v)) return '';
    const r = Math.round(v * 10) / 10;
    return String(r).replace('.', ',');
  }

  function logoUrl(p) {
    return p ? LOGO_BASE + p : null;
  }

  function displayProvider(name) {
    return getCanonical(name);
  }

  /* ============================================================
     Cache (localStorage)
     ============================================================ */
  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const c = JSON.parse(raw);
      return (c && c.ts) ? c : null;
    } catch (e) {
      return null;
    }
  }

  function cacheSet(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch (e) { }
  }

  /* ============================================================
     TMDB Fetch Wrapper (Rate Limit 429 & Token Fallback Handling)
     ============================================================ */
  async function tmdb(path) {
    const token = getEffectiveToken();
    if (!token) {
      promptForApiKey();
      throw new Error('Kein TMDB API-Token hinterlegt.');
    }
    const url = CONFIG.baseUrl + path;
    let lastErr;
    for (let i = 0; i < 5; i++) {
      try {
        const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
        if (res.status === 429) throw Object.assign(new Error('Rate limit'), { status: 429 });
        if (res.status === 401) {
          promptForApiKey('Der TMDB API-Token ist ungültig oder abgelaufen.\n\nBitte überprüfe deinen Token oder gib einen neuen ein:');
          throw new Error('HTTP 401 Unauthorized');
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (err) {
        lastErr = err;
        if (err && (err.status === 401 || !token)) break;
        const wait = (err && err.status === 429) ? Math.max(1500 * (i + 1), 3000) : 700 * (i + 1);
        await sleep(wait);
      }
    }
    throw lastErr || new Error('offline');
  }

  /* ============================================================
     Concurrency Limit für Provider-Fetches
     ============================================================ */
  let poolRunning = 0;
  async function limited(fn) {
    while (poolRunning >= 3) await sleep(10);
    poolRunning++;
    try {
      return await fn();
    } finally {
      poolRunning--;
    }
  }

  /* ============================================================
     IMDb-Bewertung abrufen (Offizieller IMDb-Endpunkt + Fallback)
     ============================================================ */
  const imdbCallbacks = new Map();

  window.imdb = window.imdb || {};
  window.imdb.rating = window.imdb.rating || {};
  window.imdb.rating.run = function (data) {
    try {
      const res = data && data.resource;
      if (!res || !res.id) return;
      const match = String(res.id).match(/tt\d+/);
      if (!match) return;
      const imdbId = match[0];
      const rating = (typeof res.rating === 'number' && !isNaN(res.rating)) ? res.rating : null;
      const votes = (typeof res.ratingCount === 'number') ? res.ratingCount : null;
      const cbs = imdbCallbacks.get(imdbId);
      if (cbs) {
        imdbCallbacks.delete(imdbId);
        for (const cb of cbs) cb({ rating, votes, imdbId });
      }
    } catch (e) { }
  };

  function fetchImdbOfficialJsonp(imdbId) {
    return new Promise((resolve) => {
      if (!imdbId) return resolve({ rating: null, votes: null, imdbId: null });

      let list = imdbCallbacks.get(imdbId);
      if (list) {
        list.push(resolve);
        return;
      }
      list = [resolve];
      imdbCallbacks.set(imdbId, list);

      const script = document.createElement('script');
      const timer = setTimeout(() => {
        cleanup();
        flush({ rating: null, votes: null, imdbId });
      }, 4500);

      function cleanup() {
        clearTimeout(timer);
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      function flush(val) {
        const cbs = imdbCallbacks.get(imdbId);
        if (cbs) {
          imdbCallbacks.delete(imdbId);
          for (const cb of cbs) cb(val);
        }
      }

      script.src = 'https://p.media-imdb.com/static-content/documents/v1/title/' + imdbId + '/ratings%3Fjsonp=imdb.rating.run:imdb.api.title.ratings/data.json';
      script.async = true;
      script.onload = () => {
        cleanup();
        flush({ rating: null, votes: null, imdbId });
      };
      script.onerror = () => {
        cleanup();
        flush({ rating: null, votes: null, imdbId });
      };
      document.head.appendChild(script);
    });
  }

  async function getImdbRating(m) {
    const key = 'ww_imdb_v2_' + m.id;
    const cached = cacheGet(key);
    if (cached && cached.data && cached.data.rating != null) {
      return cached.data;
    }

    try {
      let imdbId = m.imdb_id || (m.external_ids && m.external_ids.imdb_id);
      if (!imdbId) {
        const ext = await tmdb('/movie/' + m.id + '/external_ids');
        imdbId = ext && ext.imdb_id;
      }
      if (!imdbId) {
        return { rating: null, votes: null, imdbId: null };
      }

      // 1. Primärquelle: Offizieller IMDb Live-Rating-Endpunkt (sprachunabhängig via imdb_id)
      const official = await fetchImdbOfficialJsonp(imdbId);
      if (official && official.rating != null && official.rating > 0) {
        cacheSet(key, official);
        return official;
      }

      // 2. Fallback: Cinemeta API (falls Browser-Blocker media-imdb.com blockiert)
      const cinRes = await fetch('https://v3-cinemeta.strem.io/meta/movie/' + imdbId + '.json');
      if (cinRes.ok) {
        const cin = await cinRes.json();
        const rawRating = cin && cin.meta && cin.meta.imdbRating;
        const rating = (rawRating && String(rawRating).trim() !== '' && !isNaN(Number(rawRating))) ? Number(rawRating) : null;
        if (rating != null && rating > 0) {
          const resData = { rating, votes: null, imdbId };
          cacheSet(key, resData);
          return resData;
        }
      }

      return { rating: null, votes: null, imdbId };
    } catch (e) {
      return { rating: null, votes: null, imdbId: m.imdb_id || null };
    }
  }

  /* ============================================================
     Watch Provider Daten (Nur echtes Streaming: Flatrate & Gratis)
     ============================================================ */
  function normProviders(arr) {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const out = [];
    for (const x of arr) {
      const raw = String(x.provider_name || '').trim();
      if (!raw) continue;
      const can = getCanonical(raw);
      if (seen.has(can.key)) continue;
      seen.add(can.key);
      out.push({
        name: can.label,
        key: can.key,
        logo: x.logo_path || null,
        rawName: raw,
        url: can.url || null,
        color: can.color,
        badgeText: can.badgeText,
        isFree: Boolean(can.isFree)
      });
    }
    return out;
  }

  async function getProviders(id) {
    const key = 'ww_prov_v4_' + id;
    const cached = cacheGet(key);
    if (cached && (Date.now() - cached.ts < PROVIDERS_TTL)) return cached.data;

    const res = await tmdb('/movie/' + id + '/watch/providers?country=' + CONFIG.country + '&language=' + CONFIG.language);
    const de = ((res.results || {})[CONFIG.country]) || {};

    // Ausschließlich Streaming ohne Zusatzkosten (Flatrate, Free, Ads)
    const rawFlat = normProviders(de.flatrate || []);
    const rawFree = normProviders([...(de.free || []), ...(de.ads || [])]);

    // Saubere Trennung & Deduplizierung:
    // Kostenlose Dienste (isFree === true) gehören in cleanFree,
    // Flatrate-Abos (isFree === false) gehören in cleanFlat.
    const seenFree = new Set();
    const cleanFree = [];
    for (const p of [...rawFree, ...rawFlat]) {
      if (p.isFree && !seenFree.has(p.key)) {
        seenFree.add(p.key);
        cleanFree.push(p);
      }
    }

    const seenFlat = new Set();
    const cleanFlat = [];
    for (const p of [...rawFlat, ...rawFree]) {
      if (!p.isFree && !seenFlat.has(p.key)) {
        seenFlat.add(p.key);
        cleanFlat.push(p);
      }
    }

    const data = {
      link: de.link || null,
      flatrate: cleanFlat,
      free: cleanFree
    };
    cacheSet(key, data);
    return data;
  }

  function queueProviders(m) {
    limited(async () => {
      try {
        const [prov, imdbData] = await Promise.all([
          getProviders(m.id).catch(() => ({ link: null, flatrate: [], free: [] })),
          getImdbRating(m).catch(() => ({ rating: null, votes: null, imdbId: null }))
        ]);
        m._providers = prov;
        m._imdb = imdbData;
      } catch (e) {
        m._providers = { link: null, flatrate: [], free: [] };
        m._imdb = { rating: null, votes: null, imdbId: null };
      } finally {
        const names = new Set();
        for (const pr of allProviders(m)) {
          names.add(pr.key);
          names.add(pr.name.toLowerCase());
        }
        m._names = names;
        onProviderResolved(m);
      }
    });
  }

  function onProviderResolved(m) {
    if (state.providerInFlight > 0) state.providerInFlight--;
    m._providersPending = false;
    if (!state.seen.has(m.id)) return;

    const hasProviderFilter = (state.selectedProviders.size > 0) || (state.service !== 'all');
    let el = state.cardEls.get(m.id);
    if (!el && matchesProviderFilter(m)) {
      renderGrid();
      el = state.cardEls.get(m.id);
    }
    if (el) {
      fillCardProviders(el, m);
      updateCardRating(el, m);
    }

    if (hasProviderFilter && state.view === 'search') {
      renderGrid();
    }
    updateStatus();
  }

  function updateCardRating(cardEl, m) {
    const titleRow = cardEl.querySelector('.card-title-row');
    let pill = cardEl.querySelector('.card-rating-pill');
    if (m._imdb && m._imdb.rating != null && m._imdb.rating > 0) {
      if (!pill && titleRow) {
        pill = document.createElement('span');
        titleRow.appendChild(pill);
      }
      if (pill) {
        pill.className = 'card-rating-pill is-imdb';
        pill.innerHTML = `<span class="imdb-badge-label">IMDb</span> ${fmtRating(m._imdb.rating)}`;
        const votesTxt = m._imdb.votes ? ` (${m._imdb.votes.toLocaleString('de-DE')} Stimmen)` : '';
        pill.title = `IMDb-Bewertung: ${fmtRating(m._imdb.rating)}${votesTxt}`;
      }
    } else if (m.vote_average != null && m.vote_average > 0 && pill) {
      pill.className = 'card-rating-pill';
      pill.innerHTML = `★ ${fmtRating(m.vote_average)}`;
      pill.title = `TMDB-Bewertung: ${fmtRating(m.vote_average)}`;
    }
  }

  function allProviders(m) {
    if (!m._providers) return [];
    const seen = new Set();
    const out = [];
    for (const pr of [...(m._providers.free || []), ...(m._providers.flatrate || [])]) {
      if (!seen.has(pr.key)) {
        seen.add(pr.key);
        out.push(pr);
      }
    }
    return out;
  }

  /* ============================================================
     Filter-Logik
     ============================================================ */
  function matchesSingleProvider(m, key) {
    if (!m._providers) return false;
    const aliases = SERVICE_ALIASES[key];
    if (aliases) {
      for (const n of (m._names || [])) {
        if (aliases.includes(n) || n === key) return true;
      }
    }
    return !!(m._names && m._names.has(key));
  }

  function matchesProviderFilter(m, filter) {
    if (state.selectedProviders.size > 0) {
      if (!m._providers) return false;
      for (const provKey of state.selectedProviders) {
        if (matchesSingleProvider(m, provKey)) return true;
      }
      return false;
    }

    const f = filter !== undefined ? filter : state.service;
    if (!f || f === 'all') return true;
    if (!m._providers) return false;

    if (f === 'flatrate') {
      return (m._providers.flatrate && m._providers.flatrate.length > 0);
    }
    if (f === 'free') {
      return (m._providers.free && m._providers.free.length > 0) ||
        allProviders(m).some(p => p.isFree);
    }

    return matchesSingleProvider(m, f);
  }

  function currentFiltered() {
    if (state.view === 'search') {
      // Gezielte Suche: Alle Suchergebnisse direkt anzeigen.
      // Der Nutzer sucht gezielt nach einem Titel und möchte sehen, wo er überall läuft.
      return state.movies;
    }

    const out = [];
    const hasProviderFilter = (state.selectedProviders.size > 0) || (state.service !== 'all');
    for (const m of state.movies) {
      if (state.genreId && !(m.genre_ids || []).includes(state.genreId)) continue;
      if (hasProviderFilter) {
        if (m._providers && !matchesProviderFilter(m)) continue;
      }
      out.push(m);
    }
    return out;
  }

  /* ============================================================
     Grid Rendering
     ============================================================ */
  function renderGrid() {
    const wanted = currentFiltered();
    const wantedIds = new Set(wanted.map((m) => m.id));

    // Entferne Karten, die nicht mehr zutreffen
    for (const [id, el] of state.cardEls) {
      if (!wantedIds.has(id)) {
        el.remove();
        state.cardEls.delete(id);
      }
    }

    let newIdx = 0;
    for (const m of wanted) {
      let el = state.cardEls.get(m.id);
      if (!el) {
        el = renderCard(m, Math.min(newIdx, 8));
        gridEl.appendChild(el);
        state.cardEls.set(m.id, el);
        newIdx++;
      }
      if (m._providers && !m._providersPending) {
        fillCardProviders(el, m);
        updateCardRating(el, m);
      }
    }

    // Leerer Zustand
    const showEmpty = wanted.length === 0 && !state.loading && state.providerInFlight === 0;
    let emptyEl = gridEl.querySelector('.empty-state-wrap');
    if (showEmpty && !emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'empty-state-wrap col-span-full py-16 text-center text-[#8B93B5]';
      emptyEl.innerHTML = `
        <i class="ti ti-movie-off text-4xl text-[#8B93B5] mb-2 inline-block"></i>
        <strong class="block text-lg text-white mb-1">Keine Filme gefunden</strong>
        <span class="text-sm">Passe deine Filter an oder lade weitere Seiten.</span>
      `;
      gridEl.appendChild(emptyEl);
    } else if (!showEmpty && emptyEl) {
      emptyEl.remove();
    }
  }

  function renderCard(m, stagger) {
    const card = document.createElement('article');
    card.className = 'movie-card group';
    card.style.setProperty('--d', (stagger * 25) + 'ms');
    card.dataset.id = m.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${m.title || 'Film'}, Details öffnen`);

    // 1. Poster Media Wrap
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'card-media-wrap';

    if (m.poster_path) {
      const img = document.createElement('img');
      img.className = 'card-poster';
      img.loading = 'lazy';
      img.alt = m.title || 'Film-Poster';
      img.src = IMG_BASE + POSTER_W + m.poster_path;
      img.onerror = () => { img.replaceWith(createFallbackPoster(m)); };
      mediaWrap.appendChild(img);
    } else {
      mediaWrap.appendChild(createFallbackPoster(m));
    }

    const scrim = document.createElement('div');
    scrim.className = 'card-media-scrim';
    mediaWrap.appendChild(scrim);

    // Watchlist Bookmark Button (per Tab fokussierbar nach Cover oder per Hover sichtbar)
    const isWl = inWatchlist(m.id);
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.type = 'button';
    bookmarkBtn.className = 'card-bookmark-btn' + (isWl ? ' is-bookmarked' : '');
    bookmarkBtn.tabIndex = 0;
    bookmarkBtn.setAttribute('aria-label', isWl ? `${m.title || 'Film'} aus Watchlist entfernen` : `${m.title || 'Film'} in Watchlist merken`);
    bookmarkBtn.innerHTML = `<i class="ti ti-bookmark text-[16px]" aria-hidden="true"></i>`;
    bookmarkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWatchlist(m);
    });
    bookmarkBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation();
      }
    });
    mediaWrap.appendChild(bookmarkBtn);

    card.appendChild(mediaWrap);

    // 2. Content Block
    const content = document.createElement('div');
    content.className = 'card-content';

    // Top Meta (Genre & Year)
    const topMeta = document.createElement('div');
    topMeta.className = 'card-top-meta';
    const primaryGenre = (m.genre_ids && m.genre_ids[0] && GENRE_MAP[m.genre_ids[0]]) || '';
    const yr = (m.release_date || '').slice(0, 4);
    topMeta.innerHTML = `<span>${primaryGenre}</span><span>${yr}</span>`;
    content.appendChild(topMeta);

    // Title & Rating Badge
    const titleRow = document.createElement('div');
    titleRow.className = 'card-title-row';

    const titleEl = document.createElement('h3');
    titleEl.className = 'card-movie-title';
    titleEl.textContent = m.title || 'Unbekannt';
    titleEl.title = m.title || '';
    titleRow.appendChild(titleEl);

    // Initial Rating: Cached IMDb or TMDB fallback
    const cachedImdb = cacheGet('ww_imdb_v2_' + m.id);
    if (cachedImdb && cachedImdb.data && cachedImdb.data.rating != null && cachedImdb.data.rating > 0) {
      const ratingPill = document.createElement('span');
      ratingPill.className = 'card-rating-pill is-imdb';
      ratingPill.innerHTML = `<span class="imdb-badge-label">IMDb</span> ${fmtRating(cachedImdb.data.rating)}`;
      const votesTxt = cachedImdb.data.votes ? ` (${cachedImdb.data.votes.toLocaleString('de-DE')} Stimmen)` : '';
      ratingPill.title = `IMDb-Bewertung: ${fmtRating(cachedImdb.data.rating)}${votesTxt}`;
      titleRow.appendChild(ratingPill);
    } else if (m.vote_average != null && m.vote_average > 0) {
      const ratingPill = document.createElement('span');
      ratingPill.className = 'card-rating-pill';
      ratingPill.innerHTML = `★ ${fmtRating(m.vote_average)}`;
      ratingPill.title = `TMDB-Bewertung: ${fmtRating(m.vote_average)}`;
      titleRow.appendChild(ratingPill);
    }
    content.appendChild(titleRow);

    // Provider Row (Initial Skeleton/Laden)
    const providerRow = document.createElement('div');
    providerRow.className = 'card-provider-row';
    providerRow.innerHTML = `<span class="text-[11px] text-white/60">Lade Stream …</span>`;
    content.appendChild(providerRow);

    card.appendChild(content);

    // Modal öffnen bei Klick oder Tastatur (Enter / Leertaste auf der Karte)
    card.addEventListener('click', () => openModal(m));
    card.addEventListener('keydown', (e) => {
      if (e.target !== card) return; // Verhindert Auslösen beim Bedienen von Kind-Elementen (z. B. Bookmark-Button)
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(m);
      }
    });

    return card;
  }

  function createFallbackPoster(m) {
    const div = document.createElement('div');
    div.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1b202c] to-[#0e1118] text-white/50 font-bold text-4xl select-none';
    div.textContent = (m.title || '?').trim().charAt(0).toUpperCase();
    return div;
  }

  function fillCardProviders(cardEl, m) {
    const row = cardEl.querySelector('.card-provider-row');
    if (!row) return;

    const all = allProviders(m);
    if (!all.length) {
      row.innerHTML = `<span class="text-[11px] text-white/60 truncate">Nicht im Stream</span>`;
      return;
    }

    // Gemäß Nutzeranforderung: Bei den Postern NUR das Logo des Streaminganbieters anzeigen
    const maxLogos = 4;
    const shown = all.slice(0, maxLogos);
    const remaining = all.length - maxLogos;

    const logosHtml = shown.map((pr) => {
      const d = displayProvider(pr.name);
      if (pr.logo) {
        return `<span class="provider-micro-icon" title="${d.label}"><img src="${logoUrl(pr.logo)}" alt="${d.label}" loading="lazy"/></span>`;
      }
      return `<span class="provider-micro-icon" style="background:${d.color}" title="${d.label}">${d.badgeText}</span>`;
    }).join('');

    const moreHtml = remaining > 0 ? `<span class="provider-more-count">+${remaining}</span>` : '';

    row.innerHTML = `
      <div class="provider-logos-wrap">
        ${logosHtml}
      </div>
      ${moreHtml}
    `;
  }

  /* ============================================================
     TMDB Daten abrufen & Paginierung
     ============================================================ */
  let activeFetchId = 0;

  async function loadNextPage() {
    if (state.loading || !state.hasMore) return;
    state.loading = true;
    updateLoadMore();
    updateStatus();

    const fetchId = activeFetchId;
    const page = state.page + 1;
    try {
      let res;
      if (state.view === 'search' && state.query) {
        res = await tmdb('/search/movie?query=' + encodeURIComponent(state.query) + '&language=' + CONFIG.language + '&sort_by=popularity.desc&page=' + page);
      } else {
        // TMDB Discover: Ausschließlich Filme mit Flatrate, Free oder Ads in Deutschland
        let path = '/discover/movie?watch_region=' + CONFIG.country + '&language=' + CONFIG.language + '&page=' + page;
        if (state.sortBy === 'primary_release_date.desc') {
          const today = new Date().toISOString().split('T')[0];
          path += '&sort_by=primary_release_date.desc&primary_release_date.lte=' + today + '&vote_count.gte=1';
        } else {
          path += '&sort_by=popularity.desc';
        }

        if (state.service === 'flatrate') {
          path += '&with_watch_monetization_types=flatrate';
        } else {
          path += '&with_watch_monetization_types=flatrate|free|ads';
        }
        if (state.selectedProviders.size > 0) {
          const idList = [];
          for (const provKey of state.selectedProviders) {
            const pId = PROVIDER_IDS_MAP[provKey];
            if (pId) idList.push(pId);
          }
          if (idList.length > 0) {
            path += '&with_watch_providers=' + encodeURIComponent(idList.join('|'));
          } else {
            console.warn('[WTW] Keine TMDB Provider-IDs für ausgewählte Anbieter gefunden:', Array.from(state.selectedProviders));
            res = { results: [], total_pages: 0, total_results: 0 };
          }
        } else if (state.service) {
          const pId = PROVIDER_IDS_MAP[state.service];
          if (pId) {
            path += '&with_watch_providers=' + encodeURIComponent(pId);
          }
        }
        if (state.genreId) {
          path += '&with_genres=' + state.genreId;
        }
        if (!res) {
          res = await tmdb(path);
        }
      }

      // Veraltete Anfragen verwerfen (z.B. wenn Nutzer zwischendurch Sortierung/Filter geändert hat)
      if (fetchId !== activeFetchId) return;

      const results = res.results || [];
      const newMovies = [];
      for (const m of results) {
        if (state.seen.has(m.id)) continue;
        state.seen.add(m.id);
        m._providersPending = true;
        state.movies.push(m);
        newMovies.push(m);
      }

      state.page = page;
      state.hasMore = results.length === 20;

      renderGrid();

      if (newMovies.length) {
        state.providerInFlight += newMovies.length;
        for (const m of newMovies) queueProviders(m);
      }
      updateStatus();

      // Automatisches Nachladen, falls Filter zu Beginn weniger als 8 Filme anzeigt
      if (currentFiltered().length < 8 && state.hasMore && page < 4 && fetchId === activeFetchId) {
        await loadNextPage();
      }
    } catch (e) {
      if (fetchId === activeFetchId) {
        toast('Filme konnten nicht geladen werden.');
        statusEl.textContent = 'Fehler beim Laden – bitte später erneut versuchen.';
      }
    } finally {
      if (fetchId === activeFetchId) {
        state.loading = false;
        updateLoadMore();
        updateStatus();
      }
    }
  }

  function resetAndLoad() {
    activeFetchId++;
    state.loading = false;
    state.page = 0;
    state.hasMore = true;
    state.movies = [];
    state.seen = new Set();
    state.cardEls.forEach((el) => el.remove());
    state.cardEls.clear();
    gridEl.innerHTML = '';
    updateViewTitle();
    renderGrid();
    loadNextPage();
  }

  /* ============================================================
     View-Titel & Status
     ============================================================ */
  function updateViewTitle() {
    if (!viewTitleEl) return;

    if (state.view === 'search' && state.query) {
      viewTitleEl.textContent = `Ergebnisse für „${state.query}“`;
      if (catalogSortWrap) catalogSortWrap.classList.add('hidden');
      return;
    }
    if (catalogSortWrap) catalogSortWrap.classList.remove('hidden');

    if (state.selectedProviders.size > 0) {
      const names = [];
      for (const key of state.selectedProviders) {
        const conf = CANONICAL_SERVICES[key];
        names.push(conf ? conf.label : key);
      }
      if (names.length === 1) {
        viewTitleEl.textContent = names[0];
        viewTitleEl.removeAttribute('title');
      } else {
        const fullNames = names.join(', ');
        const countLabel = `${names.length} Anbieter`;

        // 1. Zuerst die vollständigen Anbieternamen setzen (für Desktop / Tablet mit genug Platz)
        viewTitleEl.textContent = fullNames;
        viewTitleEl.title = fullNames;

        // 2. Messen, ob der Text überläuft (scrollWidth > clientWidth) oder mit dem Switch kollidieren würde
        const checkCollision = () => {
          if (!viewTitleEl) return;
          const isOverflowing = viewTitleEl.clientWidth > 0
            ? (viewTitleEl.scrollWidth > viewTitleEl.clientWidth)
            : (window.innerWidth < 768 || fullNames.length > 25);

          if (isOverflowing) {
            viewTitleEl.textContent = countLabel;
          }
        };

        checkCollision();
        // Falls das Element noch nicht gerendert war (clientWidth === 0), im nächsten Frame nachmessen:
        if (viewTitleEl.clientWidth === 0) {
          requestAnimationFrame(checkCollision);
        }
      }
      return;
    }

    viewTitleEl.removeAttribute('title');

    const SERVICE_TITLES = {
      all: 'Katalog',
      free: 'Kostenlos & Mediatheken',
      flatrate: 'Flatrate-Abo',
      hbomax: 'HBO Max',
      joyn: 'Joyn (Gratis)',
      joynplus: 'Joyn PLUS+',
      zdf: 'ZDF Mediathek',
      ard: 'ARD Mediathek',
      ardplus: 'ARD Plus',
      arte: 'Arte Mediathek',
      pluto: 'Pluto TV',
      netzkino: 'Netzkino',
      netflix: 'Netflix',
      prime: 'Prime Video',
      disney: 'Disney+',
      paramount: 'Paramount+',
      wow: 'WOW / Sky',
      rtlplus: 'RTL+',
      apple: 'Apple TV+'
    };
    if (SERVICE_TITLES[state.service]) {
      viewTitleEl.textContent = SERVICE_TITLES[state.service];
    } else if (CANONICAL_SERVICES[state.service]) {
      const conf = CANONICAL_SERVICES[state.service];
      viewTitleEl.textContent = conf.label;
    } else {
      viewTitleEl.textContent = 'Katalog';
    }
  }

  function updateStatus() {
    const hasProviderFilter = (state.selectedProviders.size > 0) || (state.service !== 'all');
    if (state.providerInFlight > 0 && hasProviderFilter) {
      statusEl.textContent = 'Lade Verfügbarkeit …';
    } else if (state.loading) {
      statusEl.textContent = 'Lade Titel …';
    } else {
      statusEl.textContent = '';
    }
  }

  function updateLoadMore() {
    if (!state.hasMore) {
      loadMoreBtn.style.display = 'none';
      return;
    }
    loadMoreBtn.style.display = '';
    loadMoreBtn.disabled = state.loading;
  }

  function isMobileLayout() {
    return window.innerWidth < 768;
  }

  function openMobileProviderSheet() {
    closeAllMenus();
    if (!mobileProviderSheet) return;
    mobileProviderSheet.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      mobileProviderSheet.classList.add('is-open');
      if (moreProviderChevron) moreProviderChevron.classList.add('rotate-180');
    });
  }

  function closeMobileProviderSheet() {
    if (!mobileProviderSheet || !mobileProviderSheet.classList.contains('is-open')) return;
    mobileProviderSheet.classList.remove('is-open');
    if (moreProviderChevron) moreProviderChevron.classList.remove('rotate-180');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!mobileProviderSheet.classList.contains('is-open')) {
        mobileProviderSheet.hidden = true;
      }
    }, 320);
  }

  function openMobileGenreSheet() {
    closeAllMenus();
    if (!mobileGenreSheet) return;
    mobileGenreSheet.hidden = false;
    document.body.style.overflow = 'hidden';
    if (mobileGenreSearchInput) {
      mobileGenreSearchInput.value = '';
      filterMobileGenres('');
    }
    requestAnimationFrame(() => {
      mobileGenreSheet.classList.add('is-open');
      if (genreDropdownChevron) genreDropdownChevron.classList.add('rotate-180');
    });
  }

  function closeMobileGenreSheet() {
    if (!mobileGenreSheet || !mobileGenreSheet.classList.contains('is-open')) return;
    mobileGenreSheet.classList.remove('is-open');
    if (genreDropdownChevron) genreDropdownChevron.classList.remove('rotate-180');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!mobileGenreSheet.classList.contains('is-open')) {
        mobileGenreSheet.hidden = true;
      }
    }, 320);
  }

  function closeAllMobileSheets() {
    closeMobileProviderSheet();
    closeMobileGenreSheet();
  }

  function filterMobileGenres(query) {
    const q = (query || '').trim().toLowerCase();
    const cells = $$('.sheet-genre-option');
    cells.forEach((cell) => {
      if (cell.classList.contains('is-all')) {
        cell.style.display = q ? 'none' : '';
        return;
      }
      const txt = (cell.textContent || '').trim().toLowerCase();
      cell.style.display = (!q || txt.includes(q)) ? '' : 'none';
    });
    if (mobileGenreSearchClear) {
      mobileGenreSearchClear.classList.toggle('hidden', !q);
    }
  }

  function setupDragToDismiss(dragEl, sheetEl, closeFn) {
    if (!dragEl || !sheetEl) return;
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    const panel = sheetEl.querySelector('.bottom-sheet-panel');
    if (!panel) return;

    dragEl.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      currentY = startY;
      isDragging = true;
      panel.style.transition = 'none';
    }, { passive: true });

    dragEl.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        panel.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    dragEl.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = currentY - startY;
      panel.style.transition = '';
      if (deltaY > 70) {
        closeFn();
      } else {
        panel.style.transform = '';
      }
    });
  }

  function closeAllMenus() {
    if (genreDropdownMenu && !genreDropdownMenu.classList.contains('hidden')) {
      genreDropdownMenu.classList.add('hidden');
      if (genreDropdownChevron) genreDropdownChevron.classList.remove('rotate-180');
    }
    if (moreProviderMenu && !moreProviderMenu.classList.contains('hidden')) {
      moreProviderMenu.classList.add('hidden');
      if (moreProviderChevron) moreProviderChevron.classList.remove('rotate-180');
    }
    closeAllMobileSheets();
  }

  function setSort(sortValue) {
    if (state.sortBy === sortValue) return;
    state.sortBy = sortValue;

    $$('.sort-toggle-btn').forEach((btn) => {
      const isActive = btn.dataset.sort === sortValue;
      btn.classList.toggle('is-active', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('bg-[#222736]', isActive);
      btn.classList.toggle('shadow-sm', isActive);
      btn.classList.toggle('font-semibold', isActive);
      btn.classList.toggle('font-medium', !isActive);
      btn.classList.toggle('text-white/60', !isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    closeAllMenus();
    updateViewTitle();
    resetAndLoad();
  }

  /* ============================================================
     Filter-Pills: Provider & Genre Handler (Multi-Select & Reset)
     ============================================================ */
  function updateFilterModeState() {
    const isFilterSelected = (state.selectedProviders.size > 0) || (state.service !== 'all') || (state.genreId !== null);
    if (isFilterSelected && !state.query) {
      document.body.classList.add('is-filter-mode');
    } else if (!isFilterSelected && !state.query) {
      document.body.classList.remove('is-filter-mode');
    }
  }

  function syncProviderUI() {
    // 1. Alle Provider Buttons aktualisieren
    $$('[data-provider]').forEach((btn) => {
      const p = btn.dataset.provider;
      if (PRESET_PROVIDERS.has(p)) {
        const isPresetActive = state.service === p;
        btn.classList.toggle('is-active', isPresetActive);
        if (btn.getAttribute('role') === 'tab') {
          btn.setAttribute('aria-selected', isPresetActive ? 'true' : 'false');
        }
      } else {
        const isActive = state.selectedProviders.has(p);
        btn.classList.toggle('is-active', isActive);
        if (btn.hasAttribute('aria-checked')) {
          btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
        }

        const checkIcon = btn.querySelector('.prov-check');
        if (checkIcon) {
          checkIcon.classList.toggle('opacity-0', !isActive);
        }
      }
    });

    // 2. Dropdown Trigger für "Streaming-Dienste" (Mobile) / "Weitere Anbieter" (Desktop) aktualisieren
    const isDesktop = window.innerWidth >= 768;
    const isXl = window.innerWidth >= 1280;
    const desktopProminent = isXl ? new Set(['netflix', 'prime', 'disney']) : new Set(['netflix', 'prime']);
    const dropdownSelected = isDesktop
      ? [...state.selectedProviders].filter((k) => !desktopProminent.has(k))
      : [...state.selectedProviders];

    const extraCount = dropdownSelected.length;
    if (moreProvidersBtn && moreProviderLabel) {
      if (extraCount > 0) {
        moreProvidersBtn.classList.add('is-active');
        if (extraCount === 1) {
          const singleKey = dropdownSelected[0];
          const conf = CANONICAL_SERVICES[singleKey];
          moreProviderLabel.textContent = conf ? conf.label : '1 Dienst';
        } else if (extraCount === 2) {
          const [k1, k2] = dropdownSelected;
          const c1 = CANONICAL_SERVICES[k1];
          const c2 = CANONICAL_SERVICES[k2];
          const l1 = (c1?.label || k1).replace(' Mediathek', '').replace(' Video', '');
          const l2 = (c2?.label || k2).replace(' Mediathek', '').replace(' Video', '');
          moreProviderLabel.textContent = `${l1}, ${l2}`;
        } else {
          moreProviderLabel.textContent = isDesktop ? `Weitere (${extraCount})` : `Dienste (${extraCount})`;
        }
      } else {
        moreProvidersBtn.classList.remove('is-active');
        moreProviderLabel.innerHTML = '<span class="md:hidden">Streaming-Dienste</span><span class="hidden md:inline xl:hidden">Weitere</span><span class="hidden xl:inline">Weitere Anbieter</span>';
      }
    }
    if (clearProvidersBtn) {
      clearProvidersBtn.classList.toggle('hidden', state.selectedProviders.size === 0);
    }

    // 3. Mobile Bottom Sheet Provider-Status & Reset Button synchronisieren
    if (mobileProviderFooterStatus) {
      if (state.selectedProviders.size === 0) {
        mobileProviderFooterStatus.textContent = state.service === 'free' ? 'Kostenlos / Mediatheken' : (state.service === 'flatrate' ? 'Flatrate-Abo' : 'Alle Streams aktiv');
      } else if (state.selectedProviders.size === 1) {
        const singleKey = [...state.selectedProviders][0];
        const conf = CANONICAL_SERVICES[singleKey];
        mobileProviderFooterStatus.textContent = conf ? `${conf.label} aktiv` : '1 Dienst ausgewählt';
      } else {
        mobileProviderFooterStatus.textContent = `${state.selectedProviders.size} Dienste ausgewählt`;
      }
    }
    if (mobileClearProvidersBtn) {
      mobileClearProvidersBtn.classList.toggle('hidden', state.selectedProviders.size === 0);
    }
    if (mobileProviderSheetSubtitle) {
      if (state.selectedProviders.size > 0) {
        mobileProviderSheetSubtitle.textContent = `${state.selectedProviders.size} ${state.selectedProviders.size === 1 ? 'Dienst' : 'Dienste'} ausgewählt`;
      } else {
        mobileProviderSheetSubtitle.textContent = 'Flatrates & Mediatheken filtern';
      }
    }
  }

  function setProviderFilter(key) {
    if (PRESET_PROVIDERS.has(key)) {
      // Nutzer wählt eins der 3 Presets: Alle Einzelanbieter abwählen
      state.selectedProviders.clear();
      state.service = key;
    } else {
      // Einzelner Anbieter gewählt: Presets abwählen und Anbieter an/abwählen
      state.service = null;
      if (state.selectedProviders.has(key)) {
        state.selectedProviders.delete(key);
      } else {
        state.selectedProviders.add(key);
      }
      // Falls alle Einzelanbieter abgewählt wurden: Fallback auf 'all'
      if (state.selectedProviders.size === 0) {
        state.service = 'all';
      }
    }

    saveSavedProviders();

    syncProviderUI();
    updateFilterModeState();

    if (state.view === 'search') {
      renderGrid();
    } else {
      resetAndLoad();
    }
  }

  function isProminentGenre(genreId) {
    if (!genreId) return false;
    const gId = Number(genreId);
    const isXl = window.innerWidth >= 1280;
    if (isXl) {
      return gId === 28 || gId === 35 || gId === 18 || gId === 53 || gId === 878 || gId === 27 || gId === 16;
    }
    const isMd = window.innerWidth >= 768;
    if (isMd) {
      return gId === 28 || gId === 35 || gId === 18 || gId === 53 || gId === 878;
    }
    return false;
  }

  function syncGenreUI() {
    const gId = state.genreId ? Number(state.genreId) : null;

    // 1. Alle data-genre Buttons aktualisieren (Chips in der Leiste + Items im Dropdown)
    $$('[data-genre]').forEach((btn) => {
      const raw = btn.dataset.genre;
      const btnG = raw ? Number(raw) : null;
      const isAct = (gId === null && btnG === null) || (gId !== null && gId === btnG);
      btn.classList.toggle('is-active', isAct);
      const chk = btn.querySelector('.genre-check');
      if (chk) chk.classList.toggle('opacity-0', !isAct);
    });

    // 2. Dropdown Trigger (#genreDropdownBtn) & Label aktualisieren
    if (genreDropdownBtn && genreDropdownLabel) {
      if (!gId) {
        // "Alle Genres" gewählt
        genreDropdownBtn.classList.remove('is-active', 'is-mobile-only-active');
        genreDropdownLabel.innerHTML = '<span class="md:hidden">Alle Genres</span><span class="hidden md:inline xl:hidden">Weitere</span><span class="hidden xl:inline">Weitere Genres</span>';
      } else {
        const name = GENRE_MAP[gId] || 'Genre';
        const isProminent = isProminentGenre(gId);

        if (isProminent) {
          // Genre ist auf Desktop bereits als eigener Chip in der Leiste sichtbar (z.B. Action)
          // -> Auf Desktop bleibt "Weitere Genres" unselektiert im Ruhezustand (keine doppelte Beschriftung!)
          // -> Auf Mobile (wo der Chip fehlt) wird der Button aktiv hervorgehoben
          genreDropdownBtn.classList.remove('is-active');
          genreDropdownBtn.classList.add('is-mobile-only-active');
          genreDropdownLabel.innerHTML = `<span class="md:hidden">${name}</span><span class="hidden md:inline xl:hidden">Weitere</span><span class="hidden xl:inline">Weitere Genres</span>`;
        } else {
          // Genre existiert nur im Dropdown (z.B. Krimi, Doku, Western)
          // -> Sowohl auf Mobile als auch auf Desktop aktiv und zeigt den gewählten Namen
          genreDropdownBtn.classList.remove('is-mobile-only-active');
          genreDropdownBtn.classList.add('is-active');
          genreDropdownLabel.textContent = name;
        }
      }
    }

    // 3. Mobile Bottom Sheet Genre-Status synchronisieren
    if (mobileGenreSheetSubtitle) {
      if (gId && GENRE_MAP[gId]) {
        mobileGenreSheetSubtitle.textContent = `Aktiv: ${GENRE_MAP[gId]}`;
      } else {
        mobileGenreSheetSubtitle.textContent = 'Filme & Serien filtern';
      }
    }
  }

  function setGenreFilter(genreId) {
    state.genreId = genreId ? Number(genreId) : null;
    syncGenreUI();
    updateFilterModeState();
    if (state.view === 'search') {
      renderGrid();
    } else {
      resetAndLoad();
    }
  }

  /* ============================================================
     Detail-Modal
     ============================================================ */
  let lastFocusedElement = null;

  async function openModal(m) {
    closeAllMenus();
    lastFocusedElement = document.activeElement;
    const id = m.id;
    state.modalOpenId = id;
    if (modalWlBtn) modalWlBtn.classList.add('hidden');
    modalBodyEl.innerHTML = '<div class="py-16 text-center text-[#8B93B5]"><i class="ti ti-loader-2 text-3xl animate-spin mb-3 inline-block text-[#E8ECF8]"></i><p class="text-sm font-medium">Lade Details &amp; Verfügbarkeit …</p></div>';
    modalEl.hidden = false;
    const panel = modalEl.querySelector('.modal-panel');
    if (panel) panel.scrollTop = 0;
    modalEl.scrollTop = 0;
    requestAnimationFrame(() => {
      modalEl.classList.add('is-open');
      if (modalCloseBtn) modalCloseBtn.focus();
    });
    document.body.style.overflow = 'hidden';

    let detail, prov, imdbData;
    try {
      [detail, prov] = await Promise.all([
        tmdb('/movie/' + id + '?language=' + CONFIG.language + '&append_to_response=credits,external_ids'),
        m._providers || getProviders(id)
      ]);
      imdbData = (m._imdb && m._imdb.rating != null) ? m._imdb : await getImdbRating(detail);
      if (imdbData && imdbData.rating != null) {
        m._imdb = imdbData;
        const cardEl = gridEl.querySelector(`.movie-card[data-id="${id}"]`);
        if (cardEl) updateCardRating(cardEl, m);
      }
    } catch (e) {
      closeModal();
      toast('Details konnten nicht geladen werden.');
      state.modalOpenId = null;
      return;
    }

    if (state.modalOpenId !== id) return;
    buildModal(detail, prov, imdbData);
  }

  function buildModal(m, prov, imdbData) {
    modalBodyEl.innerHTML = '';

    // 1. Cinematic TMDB Backdrop Banner (oben platziert mit sanftem Verlauf)
    const backdropPath = m.backdrop_path;
    const banner = document.createElement('div');
    banner.className = 'modal-backdrop-banner';

    if (backdropPath) {
      const bgImg = document.createElement('img');
      bgImg.className = 'modal-backdrop-img';
      bgImg.src = IMG_BASE + BACKDROP_W + backdropPath;
      bgImg.alt = m.title || 'Film-Banner';
      bgImg.loading = 'eager';
      banner.appendChild(bgImg);
    } else if (m.poster_path) {
      // Fallback: Wenn kein Backdrop existiert, weich gezeichnetes Poster im Banner
      const bgImg = document.createElement('img');
      bgImg.className = 'modal-backdrop-img is-fallback';
      bgImg.src = IMG_BASE + POSTER_W + m.poster_path;
      bgImg.alt = m.title || 'Film-Banner';
      banner.appendChild(bgImg);
    } else {
      const emptyBg = document.createElement('div');
      emptyBg.className = 'modal-backdrop-placeholder';
      emptyBg.innerHTML = '<i class="ti ti-movie text-5xl text-[#8B93B5]/40"></i>';
      banner.appendChild(emptyBg);
    }

    const fade = document.createElement('div');
    fade.className = 'modal-backdrop-fade';
    banner.appendChild(fade);

    modalBodyEl.appendChild(banner);

    // 2. Neuer Hauptinhalts-Bereich unterhalb des Banners
    const content = document.createElement('div');
    content.className = 'modal-main-content';

    // Floating Watchlist Button auf dem Banner aktualisieren
    const updateModalWlState = () => {
      if (!modalWlBtn) return;
      modalWlBtn.classList.remove('hidden');
      const isWl = inWatchlist(m.id);
      modalWlBtn.classList.toggle('is-in', isWl);
      modalWlBtn.setAttribute('aria-label', isWl ? 'Aus Watchlist entfernen' : 'Zur Watchlist hinzufügen');
      modalWlBtn.title = isWl ? 'In deiner Watchlist (Klicken zum Entfernen)' : 'Zur Watchlist hinzufügen';
      const label = modalWlBtn.querySelector('.modal-banner-wl-label');
      if (label) label.textContent = isWl ? 'In Watchlist' : 'Merken';
      const icon = modalWlBtn.querySelector('i');
      if (icon) {
        icon.className = isWl ? 'ti ti-bookmark-filled text-[18px]' : 'ti ti-bookmark text-[18px]';
      }
    };
    if (modalWlBtn) {
      updateModalWlState();
      modalWlBtn.onclick = (e) => {
        e.stopPropagation();
        toggleWatchlist(m);
        updateModalWlState();
      };
    }

    // 1. Titelzeile: Filmtitel links, IMDb-Wertung rechts auf exakt gleicher Höhe
    const titleRow = document.createElement('div');
    titleRow.className = 'modal-title-row';

    const h1 = document.createElement('h1');
    h1.id = 'modal-title';
    h1.className = 'modal-main-title';
    h1.textContent = m.title || 'Unbekannt';
    titleRow.appendChild(h1);

    const titleBadges = document.createElement('div');
    titleBadges.className = 'modal-title-badges';

    if (imdbData && imdbData.rating != null && imdbData.rating > 0) {
      const imdbPill = document.createElement('a');
      imdbPill.className = 'modal-pill is-imdb';
      imdbPill.href = imdbData.imdbId ? `https://www.imdb.com/title/${imdbData.imdbId}/` : 'https://www.imdb.com/';
      imdbPill.target = '_blank';
      imdbPill.rel = 'noopener';
      const votesText = imdbData.votes ? ` (${imdbData.votes.toLocaleString('de-DE')} Stimmen)` : '';
      imdbPill.title = `IMDb-Bewertung: ${fmtRating(imdbData.rating)}/10${votesText} – Auf IMDb öffnen`;
      imdbPill.innerHTML = `<span class="imdb-logo-tag">IMDb</span> <strong>${fmtRating(imdbData.rating)}</strong> <i class="ti ti-external-link text-[12px] ml-0.5 opacity-60"></i>`;
      titleBadges.appendChild(imdbPill);
    } else if (m.vote_average != null && m.vote_average > 0) {
      const tmdbPill = addModalPill(titleBadges, `★ ${fmtRating(m.vote_average)}`);
      tmdbPill.title = 'TMDB Community-Bewertung (Fallback)';
    }

    if (titleBadges.children.length > 0) {
      titleRow.appendChild(titleBadges);
    }
    content.appendChild(titleRow);

    // 2. Fakten & Meta-Pills (Jahr, Dauer, Genres) – sauber darunter in einer Reihe
    const facts = document.createElement('div');
    facts.className = 'modal-facts-pills';

    const yr = (m.release_date || '').slice(0, 4);
    if (yr) addModalPill(facts, yr);
    if (m.runtime) addModalPill(facts, `${m.runtime} Min.`);

    if (m.genres && m.genres.length) {
      m.genres.slice(0, 3).forEach((g) => {
        addModalPill(facts, g.name);
      });
    }
    content.appendChild(facts);

    // 3. Handlung (Synopsis)
    if (m.overview && m.overview.trim()) {
      addModalSectionTitle(content, 'Handlung');
      const overviewText = m.overview.trim();

      if (overviewText.length > 150) {
        const synWrap = document.createElement('div');
        synWrap.className = 'modal-synopsis-wrap is-collapsed';
        synWrap.setAttribute('role', 'button');
        synWrap.setAttribute('tabindex', '0');
        synWrap.setAttribute('aria-expanded', 'false');
        synWrap.setAttribute('aria-label', 'Handlung vollständig anzeigen');

        const p = document.createElement('p');
        p.className = 'modal-synopsis';
        p.textContent = overviewText;
        synWrap.appendChild(p);

        const fade = document.createElement('div');
        fade.className = 'modal-synopsis-fade';
        fade.innerHTML = `
          <span class="modal-synopsis-corner-arrow" aria-hidden="true">
            <i class="ti ti-chevron-down text-[16px]"></i>
          </span>
        `;
        synWrap.appendChild(fade);

        const collapseRow = document.createElement('div');
        collapseRow.className = 'modal-synopsis-collapse-row hidden';
        const collapseBtn = document.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.className = 'modal-synopsis-collapse-btn';
        collapseBtn.setAttribute('aria-label', 'Handlung einklappen');
        collapseBtn.title = 'Handlung einklappen';
        collapseBtn.innerHTML = `<i class="ti ti-chevron-up text-[16px]"></i>`;
        collapseRow.appendChild(collapseBtn);

        const toggleSynopsis = (e) => {
          if (e) e.stopPropagation();
          const isCollapsed = synWrap.classList.contains('is-collapsed');
          if (isCollapsed) {
            synWrap.classList.remove('is-collapsed');
            synWrap.setAttribute('aria-expanded', 'true');
            synWrap.setAttribute('aria-label', 'Handlung einklappen');
            collapseRow.classList.remove('hidden');
          } else {
            synWrap.classList.add('is-collapsed');
            synWrap.setAttribute('aria-expanded', 'false');
            synWrap.setAttribute('aria-label', 'Handlung vollständig anzeigen');
            collapseRow.classList.add('hidden');
          }
        };

        synWrap.addEventListener('click', toggleSynopsis);
        synWrap.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSynopsis();
          }
        });
        collapseBtn.addEventListener('click', toggleSynopsis);

        content.appendChild(synWrap);
        content.appendChild(collapseRow);
      } else {
        const p = document.createElement('p');
        p.className = 'modal-synopsis';
        p.textContent = overviewText;
        content.appendChild(p);
      }
    }

    // 4. Besetzung (Als Chips nebeneinander, harmonisch zur Handlung)
    const cast = (m.credits && m.credits.cast) || [];
    if (cast.length) {
      addModalSectionTitle(content, 'Besetzung');
      const castWrap = document.createElement('div');
      castWrap.className = 'cast-chip-list';

      const initialCount = 5;
      const initialCast = cast.slice(0, initialCount);
      const extraCast = cast.slice(initialCount, 15);

      initialCast.forEach((c) => {
        const chip = document.createElement('span');
        chip.className = 'cast-chip';
        chip.textContent = c.name;
        castWrap.appendChild(chip);
      });

      if (extraCast.length) {
        const extraWrap = document.createElement('span');
        extraWrap.className = 'cast-extra-wrap hidden';
        extraCast.forEach((c) => {
          const chip = document.createElement('span');
          chip.className = 'cast-chip';
          chip.textContent = c.name;
          extraWrap.appendChild(chip);
        });
        castWrap.appendChild(extraWrap);

        const moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'cast-more-btn';
        moreBtn.setAttribute('aria-expanded', 'false');
        moreBtn.innerHTML = `<span>+ weitere anzeigen</span> <i class="ti ti-chevron-down text-[13px]"></i>`;
        moreBtn.addEventListener('click', () => {
          const isHidden = extraWrap.classList.contains('hidden');
          extraWrap.classList.toggle('hidden', !isHidden);
          moreBtn.setAttribute('aria-expanded', String(isHidden));
          moreBtn.innerHTML = isHidden
            ? `<span>Weniger</span> <i class="ti ti-chevron-up text-[13px]"></i>`
            : `<span>+ weitere anzeigen</span> <i class="ti ti-chevron-down text-[13px]"></i>`;
        });
        castWrap.appendChild(moreBtn);
      }

      content.appendChild(castWrap);
    }

    // Verfügbarkeit bei Anbietern in DE
    addModalSectionTitle(content, 'Verfügbar bei');
    const provWrap = document.createElement('div');
    provWrap.className = 'space-y-4';

    const flatrate = prov.flatrate || [];
    const free = prov.free || [];

    if (free.length) addProviderGroup(provWrap, 'Kostenlos & Mediatheken', free, prov.link);
    if (flatrate.length) addProviderGroup(provWrap, 'Im Abo (Flatrate)', flatrate, prov.link);

    if (!flatrate.length && !free.length) {
      const noneP = document.createElement('p');
      noneP.className = 'text-xs text-on-surface-variant';
      noneP.textContent = 'Aktuell bei keinem Streamingdienst ohne Aufpreis im Angebot.';
      provWrap.appendChild(noneP);
    }
    content.appendChild(provWrap);

    // CTA: alle Anbieter auf JustWatch / TMDB ansehen
    if (prov.link) {
      const cta = document.createElement('a');
      cta.className = 'modal-all-providers-btn';
      cta.href = prov.link;
      cta.target = '_blank';
      cta.rel = 'noopener';
      cta.innerHTML = `<span>Streaming-Details bei JustWatch ansehen</span><i class="ti ti-external-link text-[16px]"></i>`;
      content.appendChild(cta);
    }

    modalBodyEl.appendChild(content);
  }

  function addModalPill(parent, text) {
    const s = document.createElement('span');
    s.className = 'modal-pill';
    s.textContent = text;
    parent.appendChild(s);
    return s;
  }

  function addModalSectionTitle(parent, text) {
    const h = document.createElement('h2');
    h.className = 'modal-section-title';
    h.textContent = text;
    parent.appendChild(h);
    return h;
  }

  function dedupeByName(arr) {
    const seen = new Set();
    const out = [];
    for (const x of arr || []) {
      const k = String(x.name).toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  }

  function addProviderGroup(parent, label, list, fallbackLink) {
    const group = document.createElement('div');
    group.className = 'modal-provider-group';

    const title = document.createElement('p');
    title.className = 'modal-group-subtitle';
    title.textContent = label;
    group.appendChild(title);

    const chips = document.createElement('div');
    chips.className = 'modal-provider-chips';

    for (const pr of list) {
      const d = displayProvider(pr.name);
      const a = document.createElement('a');
      a.className = 'modal-provider-link';
      a.href = d.url || fallbackLink || '#';
      a.target = '_blank';
      a.rel = 'noopener';

      if (pr.logo) {
        const badge = document.createElement('span');
        badge.className = 'provider-micro-badge';
        const img = document.createElement('img');
        img.src = logoUrl(pr.logo);
        img.alt = '';
        img.loading = 'lazy';
        badge.appendChild(img);
        a.appendChild(badge);
      } else {
        const dot = document.createElement('span');
        dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${d.color};flex-shrink:0`;
        a.appendChild(dot);
      }
      a.appendChild(document.createTextNode(d.label));
      chips.appendChild(a);
    }
    group.appendChild(chips);
    parent.appendChild(group);
  }

  function closeModal() {
    modalEl.classList.remove('is-open');
    if (modalWlBtn) modalWlBtn.classList.add('hidden');
    state.modalOpenId = null;
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!modalEl.classList.contains('is-open')) modalEl.hidden = true;
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
        lastFocusedElement = null;
      }
    }, 250);
  }

  /* ============================================================
     Watchlist (localStorage)
     ============================================================ */
  const WL_KEY = 'ww_watchlist';
  function loadWatchlist() {
    try {
      const raw = localStorage.getItem(WL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  let watchlist = loadWatchlist();

  function saveWatchlist() {
    try {
      localStorage.setItem(WL_KEY, JSON.stringify(watchlist));
    } catch (e) { }
  }

  function inWatchlist(id) {
    return watchlist.some((x) => x.id === id);
  }

  function toggleWatchlist(m) {
    if (!m || m.id == null) return;
    if (inWatchlist(m.id)) {
      watchlist = watchlist.filter((x) => x.id !== m.id);
      toast('Aus der Watchlist entfernt.');
    } else {
      watchlist.push({ id: m.id, title: m.title || 'Unbekannt', poster_path: m.poster_path });
      toast('In der Watchlist gespeichert.');
    }
    saveWatchlist();
    updateWlCount();
    renderWlPanel();
    refreshCardBookmark(m.id);
  }

  function updateWlCount() {
    if (!wlCountEl) return;
    const count = watchlist.length;
    wlCountEl.textContent = String(count);
    if (count > 0) {
      wlCountEl.classList.remove('hidden');
    } else {
      wlCountEl.classList.add('hidden');
    }
  }

  function refreshCardBookmark(id) {
    const el = state.cardEls.get(id);
    if (!el) return;
    const btn = el.querySelector('.card-bookmark-btn');
    if (btn) {
      const isWl = inWatchlist(id);
      btn.classList.toggle('is-bookmarked', isWl);
      const title = el.querySelector('.card-movie-title')?.textContent || 'Film';
      btn.setAttribute('aria-label', isWl ? `${title} aus Watchlist entfernen` : `${title} in Watchlist merken`);
      btn.innerHTML = `<i class="ti ti-bookmark text-[16px]" aria-hidden="true"></i>`;
    }
  }

  function renderWlPanel() {
    wlPanelEl.innerHTML = '';
    if (!watchlist.length) {
      wlPanelEl.innerHTML = `
        <div class="py-8 text-center text-[#8B93B5]">
          <i class="ti ti-bookmark text-3xl text-[#8B93B5] mb-2 inline-block"></i>
          <p class="text-xs">Noch keine Filme in deiner Watchlist gemerkt.</p>
        </div>
      `;
      return;
    }

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between pb-3 border-b border-white/[0.08] mb-2';
    header.innerHTML = `
      <h3 class="text-xs font-bold uppercase tracking-wider text-white">Watchlist (${watchlist.length})</h3>
    `;
    wlPanelEl.appendChild(header);

    for (const item of watchlist) {
      const row = document.createElement('div');
      row.className = 'wl-item-row';

      if (item.poster_path) {
        const img = document.createElement('img');
        img.className = 'wl-thumbnail';
        img.src = IMG_BASE + POSTER_S + item.poster_path;
        img.alt = item.title;
        row.appendChild(img);
      } else {
        const d = document.createElement('div');
        d.className = 'wl-thumbnail flex items-center justify-center text-xs font-bold text-white/60';
        d.textContent = (item.title || '?').trim().charAt(0).toUpperCase();
        row.appendChild(d);
      }

      const name = document.createElement('span');
      name.className = 'wl-title-txt';
      name.textContent = item.title;
      row.appendChild(name);

      const rm = document.createElement('button');
      rm.className = 'wl-remove-btn';
      rm.setAttribute('aria-label', 'Entfernen');
      rm.innerHTML = '<i class="ti ti-x text-[16px]"></i>';
      rm.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWatchlist({ id: item.id });
      });
      row.appendChild(rm);

      row.addEventListener('click', (e) => {
        if (rm.contains(e.target)) return;
        openModal(item);
      });

      wlPanelEl.appendChild(row);
    }
  }

  /* ============================================================
     Toast Notification
     ============================================================ */
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), 2600);
  }

  /* ============================================================
     Scroll Observer & Reset Controller
     ============================================================ */
  function resetToHome() {
    state.query = '';
    restoreSavedProviders();
    state.genreId = null;
    state.sortBy = 'popularity.desc';
    state.view = 'popular';
    if (heroSearchInput) heroSearchInput.value = '';
    if (headerSearchInput) headerSearchInput.value = '';
    const heroSearchClear = document.getElementById('heroSearchClear');
    const headerSearchClear = document.getElementById('headerSearchClear');
    if (heroSearchClear) heroSearchClear.classList.add('hidden');
    if (headerSearchClear) headerSearchClear.classList.add('hidden');
    if (mobileSearchIcon) {
      mobileSearchIcon.textContent = '';
      mobileSearchIcon.className = 'ti ti-search text-[20px]';
    }
    if (mobileSearchToggle) {
      mobileSearchToggle.classList.remove('is-active');
      mobileSearchToggle.setAttribute('aria-label', 'Suche öffnen');
    }
    document.body.classList.remove('is-search-mode', 'is-header-search', 'is-scrolled', 'is-mobile-search-open');
    syncProviderUI();
    updateFilterModeState();
    state.genreId = null;
    syncGenreUI();
    if (moreProviderLabel) {
      moreProviderLabel.innerHTML = '<span class="md:hidden">Streaming-Dienste</span><span class="hidden md:inline xl:hidden">Weitere</span><span class="hidden xl:inline">Weitere Anbieter</span>';
    }
    if (moreProvidersBtn) moreProvidersBtn.classList.remove('is-active');
    state.sortBy = 'popularity.desc';
    $$('.sort-toggle-btn').forEach((btn) => {
      const isPop = btn.dataset.sort === 'popularity.desc';
      btn.classList.toggle('is-active', isPop);
      btn.classList.toggle('text-white', isPop);
      btn.classList.toggle('bg-[#222736]', isPop);
      btn.classList.toggle('shadow-sm', isPop);
      btn.classList.toggle('font-semibold', isPop);
      btn.classList.toggle('font-medium', !isPop);
      btn.classList.toggle('text-white/60', !isPop);
      btn.setAttribute('aria-pressed', String(isPop));
    });
    if (catalogSortWrap) catalogSortWrap.classList.remove('hidden');
    resetAndLoad();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function setupScrollObserver() {
    const headerLogoLink = document.getElementById('header-logo-link');
    const heroLogoImg = document.getElementById('hero-logo-img');

    const heroSection = document.getElementById('hero-section');
    const katalog = document.getElementById('katalog');

    // 1. IntersectionObserver:
    // Erkennt passiv und performant, ob der Hero noch im Sichtfeld ist.
    // Sobald der Hero nach oben herausgescrollt wird, aktiviert der Header den kompakten Modus (is-scrolled).
    if ('IntersectionObserver' in window && heroSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const isNeutral = !document.body.classList.contains('is-search-mode') &&
                            !document.body.classList.contains('is-filter-mode') &&
                            !document.body.classList.contains('is-mobile-search-open');
          if (!isNeutral) return;

          // Hero ist nach oben weggescrollt -> Header aktiviert kompakte Suche & Logo
          const heroOutOfView = !entry.isIntersecting && entry.boundingClientRect.bottom <= 80;
          document.body.classList.toggle('is-scrolled', heroOutOfView);
        });
      }, {
        threshold: 0,
        rootMargin: '-64px 0px 0px 0px'
      });

      observer.observe(heroSection);
    }

    // 2. Schnelle Synchronisation bei schnellem Scroll
    window.addEventListener('scroll', () => {
      const isNeutral = !document.body.classList.contains('is-search-mode') &&
                        !document.body.classList.contains('is-filter-mode');
      if (!isNeutral) return;

      if (window.scrollY <= 15) {
        document.body.classList.remove('is-scrolled');
      } else if (katalog && window.scrollY >= (katalog.offsetTop - 85)) {
        document.body.classList.add('is-scrolled');
      }
    }, { passive: true });

    // 3. Logo-Klicks: Sanft ganz nach oben scrollen und Zustand zurücksetzen
    const resetHome = (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      resetToHome();
    };
    if (headerLogoLink) headerLogoLink.addEventListener('click', resetHome);
    if (heroLogoImg) heroLogoImg.addEventListener('click', resetHome);
  }

  /* ============================================================
     Init & Event Wiring
     ============================================================ */
  let searchTimer = null;

  function init() {
    // 0. Startup-Check: Konsistenzprüfung DOM data-provider vs. CANONICAL_SERVICES
    document.querySelectorAll('[data-provider]').forEach((el) => {
      const p = el.getAttribute('data-provider');
      if (!PRESET_PROVIDERS.has(p) && !CANONICAL_SERVICES[p]) {
        console.warn(`[WTW Config] Element mit data-provider="${p}" hat keinen Eintrag in CANONICAL_SERVICES!`);
      }
    });

    updateWlCount();
    renderWlPanel();
    updateLoadMore();
    updateStatus();
    setupScrollObserver();
    syncProviderUI();
    updateFilterModeState();

    const heroSearchClear = document.getElementById('heroSearchClear');
    const headerSearchClear = document.getElementById('headerSearchClear');
    // 1. Dual Search Input Synchronisation + Clear-Button
    const syncSearch = (val, origin) => {
      if (heroSearchInput && heroSearchInput.value !== val) heroSearchInput.value = val;
      if (headerSearchInput && headerSearchInput.value !== val) headerSearchInput.value = val;

      const hasText = val.trim().length > 0;
      if (heroSearchClear) heroSearchClear.classList.toggle('hidden', !hasText);
      if (headerSearchClear) headerSearchClear.classList.toggle('hidden', !hasText);

      if (mobileSearchToggle) {
        mobileSearchToggle.classList.toggle('is-active', hasText);
      }

      // Wenn im Header gesucht wird oder vorher Filter aktiv waren: Suche bleibt strikt im Header
      if (origin === 'header' || document.activeElement === headerSearchInput || document.body.classList.contains('is-filter-mode')) {
        document.body.classList.add('is-header-search');
      }

      // State-Morph:
      // Nutzer sucht etwas: Filterleiste verschwindet, Inhalt rutscht nach oben
      if (hasText) {
        document.body.classList.add('is-search-mode');
        document.body.classList.remove('is-filter-mode');

        // Entweder gezielte Suche oder Inspiration/Filter - beides existiert nicht gleichzeitig:
        if (state.selectedProviders.size > 0 || state.service !== 'all' || state.genreId !== null) {
          state.selectedProviders.clear();
          state.service = 'all';
          state.genreId = null;
          syncProviderUI();
          syncGenreUI();
        }
        if (catalogSortWrap) catalogSortWrap.classList.add('hidden');
      } else {
        document.body.classList.remove('is-search-mode', 'is-header-search');
        if (catalogSortWrap) catalogSortWrap.classList.remove('hidden');
        // Gespeicherte Anbieter-Präferenzen wiederherstellen:
        restoreSavedProviders();
        syncProviderUI();
        updateFilterModeState();
      }

      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = val.trim();
        state.view = state.query ? 'search' : 'popular';
        resetAndLoad();
      }, 250);
    };

    if (heroSearchInput) {
      heroSearchInput.addEventListener('input', (e) => syncSearch(e.target.value, 'hero'));
    }
    if (headerSearchInput) {
      headerSearchInput.addEventListener('input', (e) => syncSearch(e.target.value, 'header'));
      headerSearchInput.addEventListener('focus', () => {
        document.body.classList.add('is-header-search');
      });
    }

    if (heroSearchClear) {
      heroSearchClear.addEventListener('click', () => {
        syncSearch('', 'hero');
        if (heroSearchInput) heroSearchInput.focus({ preventScroll: true });
      });
    }
    if (headerSearchClear) {
      headerSearchClear.addEventListener('click', () => {
        syncSearch('', 'header');
        if (headerSearchInput) headerSearchInput.focus({ preventScroll: true });
      });
    }

    // Mobile Search im Header (Öffnen & Schließen)
    const headerSearchWrap = document.getElementById('header-search-wrap');

    function openMobileSearch() {
      document.body.classList.add('is-mobile-search-open');
      if (mobileSearchIcon) {
        mobileSearchIcon.textContent = '';
        mobileSearchIcon.className = 'ti ti-x text-[20px]';
      }
      if (mobileSearchToggle) {
        mobileSearchToggle.classList.add('is-active');
        mobileSearchToggle.setAttribute('aria-label', 'Suche schließen');
      }
      if (headerSearchInput) {
        setTimeout(() => {
          headerSearchInput.focus();
        }, 60);
      }
    }

    function closeMobileSearch(clear = true) {
      document.body.classList.remove('is-mobile-search-open');
      if (mobileSearchIcon) {
        mobileSearchIcon.textContent = '';
        mobileSearchIcon.className = 'ti ti-search text-[20px]';
      }
      if (mobileSearchToggle) {
        mobileSearchToggle.classList.remove('is-active');
        mobileSearchToggle.setAttribute('aria-label', 'Suche öffnen');
      }
      if (headerSearchInput) {
        headerSearchInput.blur();
      }
      if (clear && state.query) {
        syncSearch('');
      }
    }

    if (mobileSearchToggle) {
      mobileSearchToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();
        if (document.body.classList.contains('is-mobile-search-open')) {
          closeMobileSearch(true);
        } else {
          openMobileSearch();
        }
      });
    }

    // Tastatur-Shortcut: Cmd+K / Ctrl+K fokussiert die Suche
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const activeSearch = heroSearchInput || headerSearchInput;
        if (activeSearch) {
          activeSearch.focus();
          activeSearch.select();
        }
      }
    });

    // ESC to clear search or close dropdowns / bottom sheets
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!modalEl.hidden) {
          closeModal();
          return;
        }
        if (mobileProviderSheet && mobileProviderSheet.classList.contains('is-open')) {
          closeMobileProviderSheet();
          return;
        }
        if (mobileGenreSheet && mobileGenreSheet.classList.contains('is-open')) {
          closeMobileGenreSheet();
          return;
        }
        if (document.body.classList.contains('is-mobile-search-open')) {
          closeMobileSearch(true);
          return;
        }
        if (genreDropdownMenu && !genreDropdownMenu.classList.contains('hidden')) {
          genreDropdownMenu.classList.add('hidden');
          if (genreDropdownChevron) genreDropdownChevron.classList.remove('rotate-180');
          return;
        }
        if (moreProviderMenu && !moreProviderMenu.classList.contains('hidden')) {
          moreProviderMenu.classList.add('hidden');
          if (moreProviderChevron) moreProviderChevron.classList.remove('rotate-180');
          return;
        }
        if (state.query || document.body.classList.contains('is-search-mode')) {
          syncSearch('');
          if (heroSearchInput) heroSearchInput.blur();
          if (headerSearchInput) headerSearchInput.blur();
        }
      }
    });

    // 2. Provider Filter Buttons
    $$('[data-provider]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setProviderFilter(btn.dataset.provider);
      });
    });

    // Weitere Anbieter Dropdown / Mobile Bottom Sheet Toggle
    if (moreProvidersBtn) {
      moreProvidersBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMobileLayout()) {
          const isOpen = mobileProviderSheet && mobileProviderSheet.classList.contains('is-open');
          if (isOpen) {
            closeMobileProviderSheet();
          } else {
            openMobileProviderSheet();
          }
        } else if (moreProviderMenu) {
          const isHidden = moreProviderMenu.classList.contains('hidden');
          closeAllMenus();
          moreProviderMenu.classList.toggle('hidden', !isHidden);
          if (moreProviderChevron) moreProviderChevron.classList.toggle('rotate-180', isHidden);
        }
      });
    }

    // Zurücksetzen Button im Desktop Anbieter-Dropdown
    if (clearProvidersBtn) {
      clearProvidersBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setProviderFilter('all');
      });
    }

    // 3. Genre Dropdown / Mobile Bottom Sheet Toggle & Items
    if (genreDropdownBtn) {
      genreDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMobileLayout()) {
          const isOpen = mobileGenreSheet && mobileGenreSheet.classList.contains('is-open');
          if (isOpen) {
            closeMobileGenreSheet();
          } else {
            openMobileGenreSheet();
          }
        } else if (genreDropdownMenu) {
          const isHidden = genreDropdownMenu.classList.contains('hidden');
          closeAllMenus();
          genreDropdownMenu.classList.toggle('hidden', !isHidden);
          if (genreDropdownChevron) genreDropdownChevron.classList.toggle('rotate-180', isHidden);
        }
      });
    }

    $$('[data-genre]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const genreId = btn.dataset.genre;
        setGenreFilter(genreId);
        if (isMobileLayout()) {
          setTimeout(() => closeMobileGenreSheet(), 120);
        } else {
          closeAllMenus();
        }
      });
    });

    // Mobile Provider Sheet Buttons
    if (mobileClearProvidersBtn) {
      mobileClearProvidersBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setProviderFilter('all');
      });
    }
    if (mobileProviderCloseBtn) {
      mobileProviderCloseBtn.addEventListener('click', () => closeMobileProviderSheet());
    }
    if (mobileProviderApplyBtn) {
      mobileProviderApplyBtn.addEventListener('click', () => closeMobileProviderSheet());
    }

    // Mobile Genre Sheet Buttons & Search
    if (mobileGenreCloseBtn) {
      mobileGenreCloseBtn.addEventListener('click', () => closeMobileGenreSheet());
    }
    if (mobileGenreSearchInput) {
      mobileGenreSearchInput.addEventListener('input', (e) => {
        filterMobileGenres(e.target.value);
      });
    }
    if (mobileGenreSearchClear) {
      mobileGenreSearchClear.addEventListener('click', () => {
        mobileGenreSearchInput.value = '';
        filterMobileGenres('');
        mobileGenreSearchInput.focus();
      });
    }

    // Drag-to-dismiss & Scrim click for mobile sheets
    if (mobileProviderSheet) {
      mobileProviderSheet.addEventListener('click', (e) => {
        if (e.target === mobileProviderSheet) closeMobileProviderSheet();
      });
      setupDragToDismiss(mobileProviderDragZone, mobileProviderSheet, closeMobileProviderSheet);
      const provHeader = mobileProviderSheet.querySelector('.bottom-sheet-header');
      if (provHeader) setupDragToDismiss(provHeader, mobileProviderSheet, closeMobileProviderSheet);
    }

    if (mobileGenreSheet) {
      mobileGenreSheet.addEventListener('click', (e) => {
        if (e.target === mobileGenreSheet) closeMobileGenreSheet();
      });
      setupDragToDismiss(mobileGenreDragZone, mobileGenreSheet, closeMobileGenreSheet);
      const genreHeader = mobileGenreSheet.querySelector('.bottom-sheet-header');
      if (genreHeader) setupDragToDismiss(genreHeader, mobileGenreSheet, closeMobileGenreSheet);
    }

    // Window Resize: Breakpoint Synchronisation
    window.addEventListener('resize', () => {
      if (!isMobileLayout()) {
        closeAllMobileSheets();
      } else {
        if (moreProviderMenu && !moreProviderMenu.classList.contains('hidden')) {
          moreProviderMenu.classList.add('hidden');
          if (moreProviderChevron) moreProviderChevron.classList.remove('rotate-180');
        }
        if (genreDropdownMenu && !genreDropdownMenu.classList.contains('hidden')) {
          genreDropdownMenu.classList.add('hidden');
          if (genreDropdownChevron) genreDropdownChevron.classList.remove('rotate-180');
        }
      }
    });

    document.addEventListener('click', (e) => {
      const inGenre = (genreDropdownMenu && genreDropdownMenu.contains(e.target)) || (genreDropdownBtn && genreDropdownBtn.contains(e.target));
      const inProvMore = (moreProviderMenu && moreProviderMenu.contains(e.target)) || (moreProvidersBtn && moreProvidersBtn.contains(e.target));
      const inHeaderSearch = (headerSearchWrap && headerSearchWrap.contains(e.target)) || (mobileSearchToggle && mobileSearchToggle.contains(e.target));
      const inMobileSheet = (mobileProviderSheet && mobileProviderSheet.contains(e.target)) || (mobileGenreSheet && mobileGenreSheet.contains(e.target));

      if (!inGenre && !inProvMore && !inMobileSheet) {
        closeAllMenus();
      }
      if (!inHeaderSearch && document.body.classList.contains('is-mobile-search-open') && !state.query) {
        closeMobileSearch(false);
      }
    });

    // 4. Sortierung Segmented Control (Beliebte vs. Neueste Streaming-Titel)
    if (sortToggleGroup) {
      sortToggleGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.sort-toggle-btn');
        if (!btn) return;
        const s = btn.dataset.sort;
        if (s) setSort(s);
      });
    }

    // 5. Klick & Tastatur auf Unterstützte Streaming-Dienste Cards
    $$('.service-card').forEach((card) => {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      const selectService = () => {
        const key = card.dataset.serviceKey;
        if (!key) return;
        setProviderFilter(key);
        const katalogEl = document.getElementById('katalog');
        if (katalogEl) katalogEl.scrollIntoView({ behavior: 'smooth' });
      };
      card.addEventListener('click', selectService);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectService();
        }
      });
    });

    // 6. Mehr laden
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', loadNextPage);
    }

    // 7. Modal Events & Fokus-Falle (WCAG 2.1.2)
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });
    modalEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = modalEl.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // 8. Watchlist Flyout Toggle
    if (wlToggle) {
      wlToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = wlPanelEl.classList.contains('hidden');
        wlPanelEl.classList.toggle('hidden', !isHidden);
        if (isHidden) renderWlPanel();
      });

      document.addEventListener('click', (e) => {
        if (!wlPanelEl.classList.contains('hidden') && !wlPanelEl.contains(e.target) && !wlToggle.contains(e.target)) {
          wlPanelEl.classList.add('hidden');
        }
      });
    }

    // 9. Responsive Resync (Mobile <-> Desktop Viewport Switch)
    window.addEventListener('resize', () => {
      syncProviderUI();
      syncGenreUI();
      updateViewTitle();
    }, { passive: true });

    // Bereinigung veralteter Cache-Einträge (v3 -> v4 Provider-Zuordnung)
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ww_prov_v3_')) {
          localStorage.removeItem(k);
        }
      }
    } catch (e) {}

    // 10. Lokale Daten löschen (DSGVO Art. 17 / § 25 TDDDG Speicherbereinigung)
    const clearDataBtn = $('#clear-local-data-btn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', async () => {
        const confirmed = window.confirm(
          'Möchtest du wirklich alle lokal gespeicherten Daten (Watchlist, Filter-Präferenzen und Cache) von deinem Gerät löschen?'
        );
        if (!confirmed) return;

        try {
          localStorage.clear();
          sessionStorage.clear();

          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((name) => caches.delete(name)));
          }

          toast('Alle lokalen Daten und der Cache wurden gelöscht.');

          setTimeout(() => {
            window.location.reload();
          }, 800);
        } catch (err) {
          console.error('Fehler beim Löschen der Daten:', err);
          toast('Fehler beim Löschen der Daten.');
        }
      });
    }

    // 11. Progressive Web App (PWA) Service Worker & Controller
    initPWA();

    // Startansicht initial laden
    resetAndLoad();
  }

  /* ============================================================
     Progressive Web App (PWA) Controller
     ============================================================ */
  function initPWA() {
    // 0. Display-Mode Erkennung (PWA Standalone vs. Normaler Browser)
    function updateDisplayMode() {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone === true ||
                           Boolean(document.referrer && document.referrer.startsWith('android-app://'));
      document.documentElement.classList.toggle('is-pwa', isStandalone);
      document.documentElement.classList.toggle('is-browser', !isStandalone);
    }
    updateDisplayMode();
    try {
      const mql = window.matchMedia('(display-mode: standalone)');
      if (mql && typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', updateDisplayMode);
      } else if (mql && typeof mql.addListener === 'function') {
        mql.addListener(updateDisplayMode);
      }
    } catch (e) {}

    // 1. Service Worker Registrierung
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker aktiv mit Scope:', reg.scope);
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast('Neue Version verfügbar – Seite aktualisieren.');
                }
              });
            });
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker Fehler:', err);
          });
      });
    }

    // 2. BeforeInstallPrompt (Native PWA Install-Button)
    let deferredPrompt = null;
    const installBtn = $('#pwa-install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.classList.add('flex');
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        installBtn.classList.add('hidden');
        installBtn.classList.remove('flex');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          toast('Where to Watch wird installiert! 🎉');
        }
        deferredPrompt = null;
      });
    }

    window.addEventListener('appinstalled', () => {
      if (installBtn) {
        installBtn.classList.add('hidden');
        installBtn.classList.remove('flex');
      }
      toast('Where to Watch wurde erfolgreich installiert! 🎉');
      deferredPrompt = null;
    });

    // 3. Online/Offline Indikatoren
    window.addEventListener('offline', () => {
      toast('Du bist offline. Deine Watchlist ist weiterhin verfügbar.');
    });

    window.addEventListener('online', () => {
      toast('Wieder online! Frische Streaming-Daten verfügbar.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();