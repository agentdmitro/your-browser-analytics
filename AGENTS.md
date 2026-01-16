# Project Context (AGENTS)

## Purpose
Chrome extension that analyzes local browsing history and displays analytics
in a popup and a full dashboard. All processing is local; no network calls.

## Architecture
- background.js: MV3 service worker. Fetches history, computes analytics,
  caches results, handles runtime messages.
- src/popup.html + src/popup.js + src/popup.css: quick stats UI.
- src/dashboard.html + src/dashboard.js + src/dashboard.css: full analytics UI.
- src/utils.js: shared helpers (currently not imported by popup/dashboard).
- manifest.json: permissions (history, storage, tabs, idle).

## Data Flow
- UI sends messages to background:
  - GET_ANALYTICS {days, startTimestamp, endTimestamp}
  - GET_TODAY_STATS
  - CLEAR_CACHE
  - GET_HISTORY_START_DATE
  - EXPORT_DATA {days, startTimestamp, endTimestamp}
- background.js runs fetchHistoryData() which:
  - chrome.history.search() for URLs in range
  - chrome.history.getVisits() per URL for accurate visit counts
  - aggregates domain stats, category stats, hourly/daily activity
  - caches results for default ranges

## Categorization
- CATEGORY_RULES in background.js define regex rules per category.
- categorize(domain, url) also uses NEWS_PATH_PATTERNS for path-based news.
- If you add/remove categories, also update:
  - getCategoryColor/getCategoryIcon in src/dashboard.js
  - README.md categories table (optional)

## UX/Export
- Popup shows today stats + top 3 domains + sparkline.
- Dashboard shows charts, tables, category legend, date range filters.
- Export writes JSON via Blob/URL.createObjectURL (client-side).

## Conventions
- Plain JS, no build step.
- Keep changes local-only and privacy-preserving.
- Prefer ASCII in new files unless project already uses Unicode.
