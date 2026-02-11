/**
 * Your Browsing Analytics - Background Service Worker
 * Handles data collection, caching, and message passing
 */

importScripts('./categorization.js');

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;
const SESSION_GAP_MS = 30 * 60 * 1000;
const ACTIVE_VISIT_GAP_MS = 10 * 60 * 1000;

// Cached data store
let cachedData = null;
let cacheTimestamp = 0;
let cachedDays = 0;

// Active time tracking state
const ACTIVE_TIME_STORAGE_KEY = 'activeTimeByDomain';
const ACTIVE_TIME_TOTAL_KEY = 'activeTimeTotal';
const ACTIVE_TIME_TODAY_KEY = 'activeTimeToday';
const ACTIVE_TIME_DATE_KEY = 'activeTimeDate';

let activeTimeByDomain = {};
let activeTimeTotal = 0;
let activeTimeToday = 0;
let activeTimeDate = '';
let activeTabId = null;
let activeDomain = null;
let activeSessionStart = null;
let isWindowFocused = true;
let idleState = 'active';
let activeTimeSaveTimer = null;

let customCategoryRules = [];

const SEARCH_ENGINES = [
	{ name: 'google', host: /(^|\.)google\./i, queryParam: 'q' },
	{ name: 'bing', host: /(^|\.)bing\.com$/i, queryParam: 'q' },
	{ name: 'duckduckgo', host: /(^|\.)duckduckgo\.com$/i, queryParam: 'q' },
	{ name: 'yahoo', host: /(^|\.)search\.yahoo\.com$/i, queryParam: 'p' },
	{ name: 'brave', host: /(^|\.)search\.brave\.com$/i, queryParam: 'q' },
	{ name: 'ecosia', host: /(^|\.)ecosia\.org$/i, queryParam: 'q' },
];

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain
 */
function extractDomain(url) {
	try {
		const urlObj = new URL(url);
		return urlObj.hostname.replace(/^www\./, '');
	} catch {
		return 'unknown';
	}
}

function extractHttpDomain(url) {
	try {
		const urlObj = new URL(url);
		if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return null;
		return urlObj.hostname.replace(/^www\./, '');
	} catch {
		return null;
	}
}

function getDateKey() {
	return new Date().toISOString().slice(0, 10);
}

function ensureActiveTimeDate() {
	const key = getDateKey();
	if (key !== activeTimeDate) {
		activeTimeDate = key;
		activeTimeToday = 0;
	}
}

function getStorageLocal() {
	return chrome?.storage?.local || null;
}

function scheduleActiveTimeSave() {
	if (activeTimeSaveTimer) clearTimeout(activeTimeSaveTimer);
	activeTimeSaveTimer = setTimeout(() => {
		const storageLocal = getStorageLocal();
		if (!storageLocal) return;
		storageLocal.set({
			[ACTIVE_TIME_STORAGE_KEY]: activeTimeByDomain,
			[ACTIVE_TIME_TOTAL_KEY]: activeTimeTotal,
			[ACTIVE_TIME_TODAY_KEY]: activeTimeToday,
			[ACTIVE_TIME_DATE_KEY]: activeTimeDate,
		});
	}, 500);
}

function clearCachedAnalytics() {
	cachedData = null;
	cacheTimestamp = 0;
	cachedDays = 0;
}

function canTrackActiveTime() {
	return Boolean(activeDomain) && isWindowFocused && idleState === 'active';
}

function stopActiveSession() {
	if (!activeSessionStart) return;
	const now = Date.now();
	const elapsed = now - activeSessionStart;
	activeSessionStart = null;

	if (elapsed <= 0 || !activeDomain) return;
	ensureActiveTimeDate();

	activeTimeTotal += elapsed;
	activeTimeToday += elapsed;
	activeTimeByDomain[activeDomain] = (activeTimeByDomain[activeDomain] || 0) + elapsed;
	scheduleActiveTimeSave();
}

function startActiveSession() {
	if (activeSessionStart || !canTrackActiveTime()) return;
	activeSessionStart = Date.now();
}

function updateActiveDomain(tab) {
	const domain = tab ? extractHttpDomain(tab.url) : null;
	if (domain === activeDomain) {
		startActiveSession();
		return;
	}

	stopActiveSession();
	activeDomain = domain;
	startActiveSession();
}

function extractSearchQuery(url) {
	try {
		const urlObj = new URL(url);
		if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return null;

		const engine = SEARCH_ENGINES.find((item) => item.host.test(urlObj.hostname));
		if (!engine) return null;

		const query = urlObj.searchParams.get(engine.queryParam);
		if (!query) return null;

		const cleaned = query.trim();
		if (!cleaned) return null;

		return { engine: engine.name, query: cleaned };
	} catch {
		return null;
	}
}

function calculateSessions(visitTimes) {
	if (!visitTimes || visitTimes.length === 0) {
		return { count: 0, totalDuration: 0, avgDuration: 0, longestDuration: 0 };
	}

	const times = [...visitTimes].sort((a, b) => a - b);
	let sessionCount = 1;
	let sessionStart = times[0];
	let sessionEnd = times[0];
	let totalDuration = 0;
	let longestDuration = 0;

	for (let i = 1; i < times.length; i++) {
		const time = times[i];
		if (time - sessionEnd > SESSION_GAP_MS) {
			const duration = sessionEnd - sessionStart;
			totalDuration += duration;
			if (duration > longestDuration) longestDuration = duration;
			sessionCount++;
			sessionStart = time;
		}
		sessionEnd = time;
	}

	const finalDuration = sessionEnd - sessionStart;
	totalDuration += finalDuration;
	if (finalDuration > longestDuration) longestDuration = finalDuration;

	const avgDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0;

	return {
		count: sessionCount,
		totalDuration,
		avgDuration,
		longestDuration,
	};
}

function calculateActiveTimeFromVisits(visitTimes, gapMs) {
	if (!visitTimes || visitTimes.length < 2) return 0;

	const times = [...visitTimes].sort((a, b) => a - b);
	let total = 0;

	for (let i = 1; i < times.length; i++) {
		const delta = times[i] - times[i - 1];
		if (delta > 0 && delta <= gapMs) {
			total += delta;
		}
	}

	return total;
}


function loadPersistentState() {
	const storageLocal = getStorageLocal();
	if (!storageLocal) {
		console.warn('chrome.storage.local is unavailable. Persistent state is disabled.');
		ensureActiveTimeDate();
		return;
	}

	storageLocal.get(
		[
			ACTIVE_TIME_STORAGE_KEY,
			ACTIVE_TIME_TOTAL_KEY,
			ACTIVE_TIME_TODAY_KEY,
			ACTIVE_TIME_DATE_KEY,
			CUSTOM_CATEGORY_RULES_KEY,
		],
		(data) => {
			activeTimeByDomain = data[ACTIVE_TIME_STORAGE_KEY] || {};
			activeTimeTotal = data[ACTIVE_TIME_TOTAL_KEY] || 0;
			activeTimeToday = data[ACTIVE_TIME_TODAY_KEY] || 0;
			activeTimeDate = data[ACTIVE_TIME_DATE_KEY] || getDateKey();
			customCategoryRules = Array.isArray(data[CUSTOM_CATEGORY_RULES_KEY]) ? data[CUSTOM_CATEGORY_RULES_KEY] : [];
			ensureActiveTimeDate();
		}
	);
}

/**
 * Fetch and process history data
 * @param {number} days - Number of days to fetch
 * @param {number} startTimestamp - Optional custom start timestamp
 * @param {number} endTimestamp - Optional custom end timestamp
 * @returns {Promise<Object>} Processed analytics data
 */
async function fetchHistoryData(days = 30, startTimestamp = null, endTimestamp = null) {
	const now = Date.now();
	const todayKey = getDateKey();

	// Calculate time range
	let startTime, endTime;
	if (startTimestamp && endTimestamp) {
		startTime = startTimestamp;
		endTime = endTimestamp;
	} else {
		startTime = now - days * 24 * 60 * 60 * 1000;
		endTime = now;
	}

	// Check cache validity (only for non-custom ranges)
	if (!startTimestamp && cachedData && cachedDays === days && now - cacheTimestamp < CACHE_DURATION) {
		return cachedData;
	}

	try {
		const historyItems = await chrome.history.search({
			text: '',
			startTime: startTime,
			endTime: endTime,
			maxResults: 10000,
		});

			// Get detailed visit information for more accurate counting
			const domainStats = {};
			const hourlyActivity = new Array(24).fill(0);
			const dailyActivity = new Array(7).fill(0);
			const searchStats = { total: 0, engines: {}, queries: {} };
			const visitTimes = [];
			const visitTimesToday = [];
			const otherPageStats = {};
		// Initialize ALL categories from CATEGORY_RULES + 'other'
		const categoryStats = {};
		for (const category of Object.keys(CATEGORY_RULES)) {
			categoryStats[category] = 0;
		}
		categoryStats.other = 0;

		const pageStats = {};
		let totalVisits = 0;
		let todayVisits = 0;
		const todayStart = new Date().setHours(0, 0, 0, 0);

		// Process each history item with actual visits
		for (const item of historyItems) {
			const domain = extractDomain(item.url);

			// Get actual visits for this URL
			let visits;
			try {
				visits = await chrome.history.getVisits({ url: item.url });
				// Filter visits within our time range
				visits = visits.filter((v) => v.visitTime >= startTime && v.visitTime <= endTime);
			} catch {
				visits = [{ visitTime: item.lastVisitTime || now }];
			}

			const visitCount = visits.length;
			if (visitCount === 0) continue;

			totalVisits += visitCount;

			const searchInfo = extractSearchQuery(item.url);
			if (searchInfo) {
				const queryKey = searchInfo.query.toLowerCase();
				searchStats.total += visitCount;
				searchStats.engines[searchInfo.engine] = (searchStats.engines[searchInfo.engine] || 0) + visitCount;
				searchStats.queries[queryKey] = (searchStats.queries[queryKey] || 0) + visitCount;
			}

			// Domain stats
			if (!domainStats[domain]) {
				domainStats[domain] = { visits: 0, lastVisit: 0 };
			}
			domainStats[domain].visits += visitCount;
			domainStats[domain].lastVisit = Math.max(domainStats[domain].lastVisit, item.lastVisitTime || 0);

			// Page stats
			const pageKey = item.url.substring(0, 150);
			if (!pageStats[pageKey]) {
				pageStats[pageKey] = { url: item.url, title: item.title || item.url, visits: 0 };
			}
			pageStats[pageKey].visits += visitCount;

			// Category stats - NOW WITH URL PATH DETECTION
			const category = categorize(domain, item.url);
			categoryStats[category] = (categoryStats[category] || 0) + visitCount;
			if (category === 'other') {
				if (!otherPageStats[item.url]) {
					otherPageStats[item.url] = {
						url: item.url,
						title: item.title || item.url,
						visits: 0,
					};
				}
				otherPageStats[item.url].visits += visitCount;
			}

			// Process each individual visit for time-based stats
			for (const visit of visits) {
				const visitDate = new Date(visit.visitTime);
				visitTimes.push(visit.visitTime);
				hourlyActivity[visitDate.getHours()]++;
				dailyActivity[visitDate.getDay()]++;

				// Today's visits
				if (visit.visitTime >= todayStart) {
					todayVisits++;
					visitTimesToday.push(visit.visitTime);
				}
			}
		}

		const sessions = calculateSessions(visitTimes);
		const activeTimeTodayFromVisits = calculateActiveTimeFromVisits(visitTimesToday, ACTIVE_VISIT_GAP_MS);

		// Sort and limit results
		const topDomains = Object.entries(domainStats)
			.map(([domain, data]) => ({ domain, ...data }))
			.sort((a, b) => b.visits - a.visits)
			.slice(0, 20);

		const topPages = Object.values(pageStats)
			.sort((a, b) => b.visits - a.visits)
			.slice(0, 50);

			const topSearches = Object.entries(searchStats.queries)
				.map(([query, count]) => ({ query, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 10);
			const otherPages = Object.values(otherPageStats)
				.sort((a, b) => b.visits - a.visits)
				.slice(0, 200);

			const result = {
				topDomains,
				topPages,
				hourlyActivity,
				dailyActivity,
				categoryStats,
				searchStats: {
					total: searchStats.total,
					engines: searchStats.engines,
					topSearches,
				},
				otherPages,
				sessions,
				todayVisits,
				totalVisits,
				totalItems: historyItems.length,
				uniqueDomains: Object.keys(domainStats).length, // Add actual unique domains count
				activeTimeTotal: (() => {
					let total = activeTimeTotal;
					if (activeSessionStart && canTrackActiveTime()) {
						const elapsed = now - activeSessionStart;
						if (elapsed > 0) total += elapsed;
					}
					return total;
				})(),
				activeTimeToday: (() => {
					let today = activeTimeDate === todayKey ? activeTimeToday : 0;
					if (activeSessionStart && canTrackActiveTime()) {
						const elapsed = now - activeSessionStart;
						if (elapsed > 0) today += elapsed;
					}
					return Math.max(today, activeTimeTodayFromVisits);
				})(),
				fetchedAt: now,
				dateRange: {
					start: startTime,
					end: endTime,
					days: days,
				},
			};

			// Update cache (only for non-custom ranges)
		if (!startTimestamp) {
			cachedData = result;
			cacheTimestamp = now;
			cachedDays = days;
		}

		return result;
	} catch (error) {
		console.error('Error fetching history:', error);
		return null;
	}
}

/**
 * Handle messages from popup and dashboard
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'GET_ANALYTICS') {
		const days = message.days || 30;
		const startTimestamp = message.startTimestamp || null;
		const endTimestamp = message.endTimestamp || null;

		fetchHistoryData(days, startTimestamp, endTimestamp).then((data) => {
			sendResponse(data);
		});
		return true;
	}

	if (message.type === 'GET_TODAY_STATS') {
		// Fetch only today's data for accurate stats
		const todayStart = new Date().setHours(0, 0, 0, 0);
		const now = Date.now();

		fetchHistoryData(1, todayStart, now).then((data) => {
			sendResponse({
				todayVisits: data?.totalVisits || 0,
				uniqueDomains: data?.uniqueDomains || 0,
				topDomains: data?.topDomains?.slice(0, 3) || [],
				hourlyActivity: data?.hourlyActivity || [],
			});
		});
		return true;
	}

	if (message.type === 'CLEAR_CACHE') {
		clearCachedAnalytics();
		sendResponse({ success: true });
		return true;
	}

	if (message.type === 'GET_HISTORY_START_DATE') {
		// Find the oldest history item
		chrome.history
			.search({
				text: '',
				startTime: 0,
				maxResults: 1,
			})
			.then(async (items) => {
				if (items.length === 0) {
					sendResponse({ startDate: Date.now(), daysAvailable: 0 });
					return;
				}

				// Get the oldest visit time from the first item
				let oldestTime = Date.now();

				for (const item of items) {
					try {
						const visits = await chrome.history.getVisits({ url: item.url });
						for (const visit of visits) {
							if (visit.visitTime < oldestTime) {
								oldestTime = visit.visitTime;
							}
						}
					} catch {
						if (item.lastVisitTime && item.lastVisitTime < oldestTime) {
							oldestTime = item.lastVisitTime;
						}
					}
				}

				// Also search for potentially older items with broader search
				const olderItems = await chrome.history.search({
					text: '',
					startTime: 0,
					endTime: oldestTime,
					maxResults: 100,
				});

				for (const item of olderItems) {
					try {
						const visits = await chrome.history.getVisits({ url: item.url });
						for (const visit of visits) {
							if (visit.visitTime < oldestTime) {
								oldestTime = visit.visitTime;
							}
						}
					} catch {
						if (item.lastVisitTime && item.lastVisitTime < oldestTime) {
							oldestTime = item.lastVisitTime;
						}
					}
				}

				const daysAvailable = Math.ceil((Date.now() - oldestTime) / (24 * 60 * 60 * 1000));
				sendResponse({ startDate: oldestTime, daysAvailable });
			});
		return true;
	}

	if (message.type === 'EXPORT_DATA') {
		const startTimestamp = message.startTimestamp || null;
		const endTimestamp = message.endTimestamp || null;
		fetchHistoryData(message.days || 30, startTimestamp, endTimestamp).then((data) => {
			sendResponse(data);
		});
		return true;
	}

	if (message.type === 'GET_CUSTOM_CATEGORY_RULES') {
		sendResponse({ rules: customCategoryRules });
		return true;
	}

	if (message.type === 'SET_CUSTOM_CATEGORY_RULES') {
		customCategoryRules = Array.isArray(message.rules) ? message.rules : [];
		const storageLocal = getStorageLocal();
		if (!storageLocal) {
			clearCachedAnalytics();
			sendResponse({
				success: true,
				persisted: false,
				warning: 'chrome.storage.local is unavailable',
			});
			return true;
		}

		storageLocal.set({ [CUSTOM_CATEGORY_RULES_KEY]: customCategoryRules }, () => {
			if (chrome.runtime.lastError) {
				sendResponse({
					success: false,
					error: chrome.runtime.lastError.message || 'Failed to persist custom category rules.',
				});
				return;
			}
			clearCachedAnalytics();
			sendResponse({ success: true });
		});
		return true;
	}

	if (message.type === 'DELETE_HISTORY_RANGE') {
		const startTime = Number(message.startTime);
		const endTime = Number(message.endTime);

		if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime > endTime) {
			sendResponse({ success: false, error: 'Invalid time range.' });
			return true;
		}

		try {
			Promise.resolve(chrome.history.deleteRange({ startTime, endTime }))
				.then(() => {
					clearCachedAnalytics();
					sendResponse({ success: true });
				})
				.catch((error) => {
					console.error('Failed to delete history range:', error);
					sendResponse({ success: false, error: error?.message || 'Failed to delete history range.' });
				});
		} catch (error) {
			console.error('Failed to delete history range:', error);
			sendResponse({ success: false, error: error?.message || 'Failed to delete history range.' });
		}
		return true;
	}

	if (message.type === 'DELETE_HISTORY_URLS') {
		const urls = Array.isArray(message.urls) ? message.urls : [];
		if (urls.length === 0) {
			sendResponse({ success: false, error: 'No URLs provided.' });
			return true;
		}

		let remaining = urls.length;
		let firstError = null;

		urls.forEach((url) => {
			try {
				chrome.history.deleteUrl({ url }, () => {
					if (chrome.runtime.lastError && !firstError) {
						firstError = chrome.runtime.lastError;
					}
					remaining -= 1;
					if (remaining === 0) {
						if (firstError) {
							console.error('Failed to delete history URLs:', firstError);
							sendResponse({
								success: false,
								error: firstError.message || 'Failed to delete history URLs.',
							});
							return;
						}
						clearCachedAnalytics();
						sendResponse({ success: true, deletedCount: urls.length });
					}
				});
			} catch (error) {
				if (!firstError) {
					firstError = error;
				}
				remaining -= 1;
				if (remaining === 0) {
					console.error('Failed to delete history URLs:', firstError);
					sendResponse({ success: false, error: firstError?.message || 'Failed to delete history URLs.' });
				}
			}
		});
		return true;
	}
});

// Initial data fetch on install
chrome.runtime.onInstalled.addListener(() => {
	fetchHistoryData(30);
});

loadPersistentState();

if (chrome?.idle?.setDetectionInterval) {
	chrome.idle.setDetectionInterval(60);
}

if (chrome?.tabs?.query) {
	chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
		if (tabs && tabs[0]) {
			activeTabId = tabs[0].id;
			updateActiveDomain(tabs[0]);
		}
	});
}

if (chrome?.tabs?.onActivated) {
	chrome.tabs.onActivated.addListener((activeInfo) => {
		activeTabId = activeInfo.tabId;
		if (!chrome?.tabs?.get) return;
		chrome.tabs.get(activeInfo.tabId, (tab) => {
			updateActiveDomain(tab);
		});
	});
}

if (chrome?.tabs?.onUpdated) {
	chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		if (tabId !== activeTabId) return;
		if (changeInfo.url || changeInfo.status === 'complete') {
			updateActiveDomain(tab);
		}
	});
}

if (chrome?.tabs?.onRemoved) {
	chrome.tabs.onRemoved.addListener((tabId) => {
		if (tabId === activeTabId) {
			stopActiveSession();
			activeTabId = null;
			activeDomain = null;
		}
	});
}

if (chrome?.windows?.onFocusChanged) {
	chrome.windows.onFocusChanged.addListener((windowId) => {
		isWindowFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
		if (!isWindowFocused) {
			stopActiveSession();
		} else {
			startActiveSession();
		}
	});
}

if (chrome?.idle?.onStateChanged) {
	chrome.idle.onStateChanged.addListener((state) => {
		idleState = state;
		if (state !== 'active') {
			stopActiveSession();
		} else {
			startActiveSession();
		}
	});
}
