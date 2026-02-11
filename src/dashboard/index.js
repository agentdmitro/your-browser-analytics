/**
 * Your Browsing Analytics - Dashboard Script
 * Full analytics dashboard with Chart.js visualizations
 */

// State
	let analyticsData = null;
	let charts = {};
	let currentPage = 1;
	const PAGE_SIZE = 10;
	let customStartDate = null;
	let customEndDate = null;
	let selectedDays = 30;
	let historyStartDate = null;
	let historyDaysAvailable = 0;
	let customCategoryRules = [];
	let selectedCustomCategory = 'other';
	let managementUrls = [];
	const VIEW_STORAGE_KEY = 'dashboardActiveView';
	let historyPickerQuery = '';
	let historyPickerEndTime = null;
	let historyPickerLoading = false;
	let historyPickerHasMore = true;
	let historyPickerUrlSet = new Set();
	let dateStartPicker = null;
	let dateEndPicker = null;
	let managementDatePicker = null;
	let isOtherPagesExpanded = false;

const CATEGORY_COLORS = {
	development: '#22c55e',
	work: '#6366f1',
	social: '#ec4899',
	entertainment: '#f59e0b',
	movies: '#f97316',
	video: '#ff6b6b',
	gaming: '#9333ea',
	music: '#a855f7',
	shopping: '#10b981',
	news: '#3b82f6',
	search: '#8b5cf6',
	finance: '#14b8a6',
	education: '#f97316',
	ai: '#06b6d4',
	travel: '#0ea5e9',
	food: '#ef4444',
	health: '#84cc16',
	cloud: '#7c3aed',
	reference: '#64748b',
	communication: '#f472b6',
	productivity: '#fbbf24',
	mail: '#0f766e',
	government: '#dc2626',
	utilities: '#78716c',
	design: '#e879f9',
	russia: '#1e3a5f',
	podcast: '#8b5cf6',
	realestate: '#0d9488',
	jobs: '#ea580c',
	dating: '#f43f5e',
	sports: '#16a34a',
	weather: '#0284c7',
	automotive: '#525252',
	legal: '#7c2d12',
	hosting: '#4f46e5',
	forums: '#be123c',
	streaming: '#c026d3',
	modeling3d: '#0891b2',
	security: '#15803d',
	other: '#6b7280',
};

const CATEGORY_ICONS = {
	development: '🖥️',
	work: '💼',
	social: '💬',
	entertainment: '🎬',
	movies: '🍿',
	video: '📺',
	gaming: '🎮',
	music: '🎵',
	shopping: '🛒',
	news: '📰',
	search: '🔍',
	finance: '💰',
	education: '📚',
	ai: '🤖',
	travel: '✈️',
	food: '🍔',
	health: '🏥',
	cloud: '☁️',
	reference: '📖',
	communication: '📞',
	productivity: '📋',
	mail: '✉️',
	government: '🏛️',
	utilities: '🔧',
	design: '🎨',
	russia: '🤡',
	podcast: '🎙️',
	realestate: '🏠',
	jobs: '💼',
	dating: '💕',
	sports: '⚽',
	weather: '🌤️',
	automotive: '🚗',
	legal: '⚖️',
	hosting: '🌐',
	forums: '💭',
	streaming: '📡',
	modeling3d: '🧊',
	security: '🔒',
	other: '🌐',
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLORS);
const CATEGORY_LABELS = {
	movies: 'Movie / Series',
	mail: 'Email',
};

// DOM Elements - will be initialized after DOM loads
let elements = {};

// Utility functions
function formatNumber(num) {
	if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
	if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
	return num.toString();
}

function formatDuration(ms) {
	const totalMinutes = Math.floor(ms / 60000);
	if (totalMinutes < 1) return '<1m';

	const totalHours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const days = Math.floor(totalHours / 24);
	const hours = totalHours % 24;

	if (days > 0) {
		return `${days}d ${hours}h`;
	}
	if (totalHours > 0) {
		return `${totalHours}h ${minutes}m`;
	}
	return `${minutes}m`;
}

function getHourLabel(hour) {
	return `${hour.toString().padStart(2, '0')}:00`;
}

function getDayName(index) {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	return days[index] || '';
}

function getCategoryColor(category) {
	return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

function getCategoryIcon(category) {
	return CATEGORY_ICONS[category] || CATEGORY_ICONS.other;
}

function getCategoryLabel(category) {
	return CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function calcPercentage(value, total) {
	if (total === 0) return '0%';
	return ((value / total) * 100).toFixed(1) + '%';
}

function truncateUrl(url, maxLength = 50) {
	if (!url) return '';
	if (url.length <= maxLength) return url;
	try {
		const urlObj = new URL(url);
		const path = urlObj.pathname + urlObj.search;
		return urlObj.hostname + (path.length > 30 ? path.substring(0, 30) + '...' : path);
	} catch {
		return url.substring(0, maxLength) + '...';
	}
}

function escapeHtml(text) {
	if (!text) return '';
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// API functions
async function getAnalytics(days = 30, startTimestamp = null, endTimestamp = null) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{
				type: 'GET_ANALYTICS',
				days,
				startTimestamp,
				endTimestamp,
			},
			(response) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
					return;
				}
				resolve(response);
			}
		);
	});
}

async function getHistoryStartDate() {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ type: 'GET_HISTORY_START_DATE' }, (response) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}
			resolve(response);
		});
	});
}

async function getCustomCategoryRules() {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ type: 'GET_CUSTOM_CATEGORY_RULES' }, (response) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}
			resolve(response);
		});
	});
}

async function setCustomCategoryRules(rules) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ type: 'SET_CUSTOM_CATEGORY_RULES', rules }, (response) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}
			resolve(response);
		});
	});
}

async function clearAnalyticsCache() {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, (response) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}
			resolve(response);
		});
	});
}

async function deleteHistoryRange(startTime, endTime) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{
				type: 'DELETE_HISTORY_RANGE',
				startTime,
				endTime,
			},
			(response) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
					return;
				}
				resolve(response);
			}
		);
	});
}

async function deleteHistoryUrls(urls) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{
				type: 'DELETE_HISTORY_URLS',
				urls,
			},
			(response) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
					return;
				}
				resolve(response);
			}
		);
	});
}

function downloadAsJson(data, filename = 'browsing-analytics.json') {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

// Initialize dashboard
async function init() {
	// Initialize DOM elements
	elements = {
		totalPages: document.getElementById('total-pages'),
		uniqueDomains: document.getElementById('unique-domains'),
		peakHour: document.getElementById('peak-hour'),
		peakDay: document.getElementById('peak-day'),
		customSelect: document.getElementById('date-range-select'),
		selectTrigger: document.getElementById('select-trigger'),
		selectValue: document.getElementById('select-value'),
		selectOptions: document.getElementById('select-options'),
		dateRangePicker: document.getElementById('date-range-picker'),
		dateStart: document.getElementById('date-start'),
		dateEnd: document.getElementById('date-end'),
		btnApplyRange: document.getElementById('btn-apply-range'),
		btnExport: document.getElementById('btn-export'),
		btnRefresh: document.getElementById('btn-refresh'),
		loadingOverlay: document.getElementById('loading-overlay'),
		dashboardView: document.getElementById('dashboard-view'),
		managementView: document.getElementById('management-view'),
		tabButtons: Array.from(document.querySelectorAll('.tab-button')),
		pagesTbody: document.getElementById('pages-tbody'),
		pagination: document.getElementById('pagination'),
		pageSearch: document.getElementById('page-search'),
		categoryLegend: document.getElementById('category-legend'),
		searchSummary: document.getElementById('search-summary'),
		searchList: document.getElementById('search-list'),
		sessionsCount: document.getElementById('sessions-count'),
		sessionsAvg: document.getElementById('sessions-avg'),
		sessionsLongest: document.getElementById('sessions-longest'),
		customPattern: document.getElementById('custom-pattern'),
		customCategorySelect: document.getElementById('custom-category-select'),
		customCategoryTrigger: document.getElementById('custom-category-trigger'),
		customCategoryValue: document.getElementById('custom-category-value'),
		customCategoryOptions: document.getElementById('custom-category-options'),
		btnAddRule: document.getElementById('btn-add-rule'),
		customRulesList: document.getElementById('custom-rules-list'),
		customCategoryStatus: document.getElementById('custom-category-status'),
		btnDeleteToday: document.getElementById('btn-delete-today'),
		btnDeleteDate: document.getElementById('btn-delete-date'),
		deleteDateInput: document.getElementById('delete-date-input'),
		deleteUrlInput: document.getElementById('delete-url-input'),
		deleteUrlList: document.getElementById('delete-url-list'),
		btnDeleteUrls: document.getElementById('btn-delete-urls'),
		btnClearUrls: document.getElementById('btn-clear-urls'),
		historySearchInput: document.getElementById('history-search-input'),
		historyDropdown: document.getElementById('history-dropdown'),
		historyList: document.getElementById('history-list'),
		historyStatus: document.getElementById('history-status'),
		managementStatus: document.getElementById('management-status'),
		shareMenu: document.getElementById('share-menu'),
		shareButton: document.getElementById('share-button'),
		shareCopy: document.getElementById('share-copy'),
		shareSnapshot: document.getElementById('share-snapshot'),
		otherPagesLink: document.getElementById('other-pages-link'),
		otherPagesCount: document.getElementById('other-pages-count'),
		otherPagesPanel: document.getElementById('other-pages-panel'),
		otherPagesList: document.getElementById('other-pages-list'),
	};

	// Get history start date and filter options
	try {
		const historyInfo = await getHistoryStartDate();
		historyStartDate = historyInfo.startDate;
		historyDaysAvailable = historyInfo.daysAvailable;
		filterTimeRangeOptions();
	} catch (e) {
		console.error('Failed to get history start date:', e);
	}

	setupDatePickers();
	setupCustomSelect();
	setupEventListeners();
	setupViewTabs();
	setupManagement();
	setupTableResizers();
	await initCustomCategories();
	setupShareMenu();
	await loadAnalytics();
}

function filterTimeRangeOptions() {
	if (!elements.selectOptions || historyDaysAvailable === 0) return;

	const options = elements.selectOptions.querySelectorAll('.custom-select-option');
	options.forEach((option) => {
		const value = option.dataset.value;
		if (value === 'custom' || value === 'all' || value === '1') return;

		const days = parseInt(value, 10);
		if (!isNaN(days) && days > historyDaysAvailable) {
			option.style.display = 'none';
		}
	});
}

function formatHistoryStartDate() {
	if (!historyStartDate) return '';
	const date = new Date(historyStartDate);
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function setupCustomSelect() {
	if (!elements.selectTrigger) return;

	elements.selectTrigger.addEventListener('click', (e) => {
		e.stopPropagation();
		elements.customSelect?.classList.toggle('open');
	});

	elements.selectOptions?.addEventListener('click', (e) => {
		const option = e.target.closest('.custom-select-option');
		if (!option) return;

		const value = option.dataset.value;
		const text = option.textContent.trim();

		elements.selectOptions.querySelectorAll('.custom-select-option').forEach((opt) => {
			opt.classList.remove('selected');
		});
		option.classList.add('selected');

		elements.customSelect?.classList.remove('open');

		if (value === 'custom') {
			elements.dateRangePicker?.classList.add('visible');
			if (elements.selectValue) elements.selectValue.textContent = 'Custom Range';
		} else if (value === 'all') {
			elements.dateRangePicker?.classList.remove('visible');
			const sinceText = `Since ${formatHistoryStartDate()}`;
			if (elements.selectValue) elements.selectValue.textContent = sinceText;
			customStartDate = historyStartDate;
			customEndDate = Date.now();
			selectedDays = historyDaysAvailable;
			loadAnalytics();
		} else {
			elements.dateRangePicker?.classList.remove('visible');
			if (elements.selectValue) elements.selectValue.textContent = text;
			customStartDate = null;
			customEndDate = null;
			selectedDays = parseInt(value, 10);
			loadAnalytics();
		}
	});

	document.addEventListener('click', (e) => {
		if (!e.target.closest('.custom-select')) {
			elements.customSelect?.classList.remove('open');
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		elements.customSelect?.classList.remove('open');
		elements.customCategorySelect?.classList.remove('open');
	});
}

function setupDatePickers() {
	if (!elements.dateStart || !elements.dateEnd) return;

	const today = new Date();
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const minDate = historyStartDate ? new Date(historyStartDate) : null;
	const maxDate = new Date();

	if (window.flatpickr) {
		const baseOptions = {
			dateFormat: 'Y-m-d',
			altInput: true,
			altFormat: 'M j, Y',
			altInputClass: 'date-input flatpickr-input',
			allowInput: false,
			disableMobile: true,
			minDate,
			maxDate,
		};

		dateStartPicker = flatpickr(elements.dateStart, {
			...baseOptions,
			defaultDate: thirtyDaysAgo,
			onChange: (selectedDates) => {
				if (!dateEndPicker) return;
				const startDate = selectedDates[0];
				if (!startDate) return;
				dateEndPicker.set('minDate', startDate);
				if (dateEndPicker.selectedDates[0] && dateEndPicker.selectedDates[0] < startDate) {
					dateEndPicker.setDate(startDate, false);
				}
			},
		});

		dateEndPicker = flatpickr(elements.dateEnd, {
			...baseOptions,
			defaultDate: today,
			onChange: (selectedDates) => {
				if (!dateStartPicker) return;
				const endDate = selectedDates[0];
				if (!endDate) return;
				dateStartPicker.set('maxDate', endDate);
				if (dateStartPicker.selectedDates[0] && dateStartPicker.selectedDates[0] > endDate) {
					dateStartPicker.setDate(endDate, false);
				}
			},
		});

		if (dateStartPicker && dateEndPicker) {
			const startDate = dateStartPicker.selectedDates[0];
			const endDate = dateEndPicker.selectedDates[0];
			if (startDate) dateEndPicker.set('minDate', startDate);
			if (endDate) dateStartPicker.set('maxDate', endDate);
		}

		return;
	}

	if (elements.dateEnd) elements.dateEnd.value = formatDateInput(today);
	if (elements.dateStart) elements.dateStart.value = formatDateInput(thirtyDaysAgo);
}

function formatDateInput(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function setupEventListeners() {
	elements.btnApplyRange?.addEventListener('click', handleApplyCustomRange);
	elements.btnExport?.addEventListener('click', handleExport);
	elements.btnRefresh?.addEventListener('click', async () => {
		try {
			await clearAnalyticsCache();
		} catch (error) {
			console.warn('Failed to clear cache before refresh:', error);
		}
		loadAnalytics();
	});
	elements.otherPagesLink?.addEventListener('click', () => {
		isOtherPagesExpanded = !isOtherPagesExpanded;
		renderOtherPagesPanel();
	});

	if (elements.pageSearch) {
		let searchTimeout;
		elements.pageSearch.addEventListener('input', (e) => {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				currentPage = 1;
				renderPagesTable(e.target.value);
			}, 300);
		});
	}
}

function setupViewTabs() {
	if (!elements.tabButtons || elements.tabButtons.length === 0) return;

	elements.tabButtons.forEach((button) => {
		button.addEventListener('click', () => {
			const view = button.dataset.view;
			if (!view) return;
			setActiveView(view, { updateUrl: true, persist: true });
		});
	});

	const urlView = getViewFromUrl();
	const initialView = urlView || 'dashboard';
	setActiveView(initialView, { updateUrl: false, persist: false });
}

function getViewFromUrl() {
	const params = new URLSearchParams(window.location.search);
	const tab = params.get('tab');
	if (tab === 'dashboard' || tab === 'management') return tab;
	return null;
}

function setActiveView(view, options = {}) {
	if (!elements.tabButtons) return;
	const { updateUrl = true, persist = true } = options;

	elements.tabButtons.forEach((button) => {
		const isActive = button.dataset.view === view;
		button.classList.toggle('active', isActive);
		button.setAttribute('aria-selected', isActive ? 'true' : 'false');
	});

	if (elements.dashboardView) {
		elements.dashboardView.classList.toggle('hidden', view !== 'dashboard');
	}
	if (elements.managementView) {
		elements.managementView.classList.toggle('hidden', view !== 'management');
	}

	if (updateUrl) {
		const url = new URL(window.location.href);
		url.searchParams.set('tab', view);
		window.history.replaceState(null, '', url.toString());
	}

	if (persist) {
		localStorage.setItem(VIEW_STORAGE_KEY, view);
	}
}

function setupManagement() {
	if (elements.deleteDateInput && window.flatpickr) {
		const minDate = historyStartDate ? new Date(historyStartDate) : null;
		const maxDate = new Date();
		managementDatePicker = flatpickr(elements.deleteDateInput, {
			dateFormat: 'Y-m-d',
			altInput: true,
			altFormat: 'M j, Y',
			altInputClass: 'date-input flatpickr-input',
			allowInput: false,
			disableMobile: true,
			minDate,
			maxDate,
			defaultDate: maxDate,
		});
	} else if (elements.deleteDateInput && !elements.deleteDateInput.value) {
		elements.deleteDateInput.value = formatDateInput(new Date());
	}

	elements.btnDeleteToday?.addEventListener('click', handleDeleteToday);
	elements.btnDeleteDate?.addEventListener('click', handleDeleteDate);
	elements.deleteUrlInput?.addEventListener('blur', addUrlsFromInput);
	elements.deleteUrlInput?.addEventListener('input', updateDeleteUrlsButtonState);
	elements.deleteUrlInput?.addEventListener('keydown', (event) => {
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			addUrlsFromInput();
		}
	});
	elements.btnDeleteUrls?.addEventListener('click', handleDeleteUrls);
	elements.btnClearUrls?.addEventListener('click', () => {
		managementUrls = [];
		renderManagementUrlList();
		setManagementStatus('List cleared.', 'success');
	});

	elements.deleteUrlList?.addEventListener('click', (event) => {
		const button = event.target.closest('button[data-index]');
		if (!button) return;
		const index = Number(button.dataset.index);
		if (Number.isNaN(index)) return;
		managementUrls = managementUrls.filter((_, itemIndex) => itemIndex !== index);
		renderManagementUrlList();
	});

	setupHistoryPicker();
	renderManagementUrlList();
	updateDeleteUrlsButtonState();
}

function setupTableResizers() {
	const table = document.getElementById('pages-table');
	const resizers = table?.querySelectorAll('th .col-resizer');
	const cols = table?.querySelectorAll('colgroup col');

	if (!table || !resizers || !cols) return;

	resizers.forEach((resizer, index) => {
		resizer.addEventListener('mousedown', (event) => {
			const col = cols[index];
			if (!col) return;

			const startX = event.clientX;
			const startWidth = col.getBoundingClientRect().width;
			const minWidth = index === 0 ? 50 : index === 1 ? 140 : 180;

			function onMouseMove(e) {
				const delta = e.clientX - startX;
				const nextWidth = Math.max(minWidth, startWidth + delta);
				col.style.width = `${nextWidth}px`;
			}

			function onMouseUp() {
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
				document.body.style.cursor = '';
			}

			document.body.style.cursor = 'col-resize';
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		});
	});
}

function setupHistoryPicker() {
	if (!elements.historySearchInput || !elements.historyDropdown || !elements.historyList || !elements.historyStatus) return;

	const openDropdown = () => {
		elements.historyDropdown.classList.remove('hidden');
	};
	const closeDropdown = () => {
		elements.historyDropdown.classList.add('hidden');
	};

	let searchTimeout = null;

	elements.historySearchInput.addEventListener('focus', () => {
		openDropdown();
		if (elements.historyList.innerHTML.trim() === '') {
			resetHistoryPicker();
			loadHistoryPickerPage();
		}
	});

	elements.historySearchInput.addEventListener('input', (event) => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			historyPickerQuery = event.target.value.trim();
			resetHistoryPicker();
			loadHistoryPickerPage();
		}, 300);
	});

	elements.historyList.addEventListener('scroll', () => {
		if (!historyPickerHasMore || historyPickerLoading) return;
		const nearBottom = elements.historyList.scrollTop + elements.historyList.clientHeight >= elements.historyList.scrollHeight - 20;
		if (nearBottom) {
			loadHistoryPickerPage();
		}
	});

	elements.historyList.addEventListener('click', (event) => {
		const item = event.target.closest('[data-url]');
		if (!item) return;
		const url = item.dataset.url;
		if (!url) return;
		managementUrls = Array.from(new Set([...managementUrls, url]));
		renderManagementUrlList();
		setManagementStatus('Added 1 URL from history.', 'success');
		const isMultiSelect = event.altKey || event.metaKey;
		if (!isMultiSelect) {
			closeDropdown();
		}
	});

	document.addEventListener('click', (event) => {
		if (event.target.closest('.management-picker')) return;
		closeDropdown();
	});

	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		closeDropdown();
	});
}

function resetHistoryPicker() {
	historyPickerEndTime = null;
	historyPickerHasMore = true;
	historyPickerUrlSet = new Set();
	if (elements.historyList) elements.historyList.innerHTML = '';
	if (elements.historyStatus) elements.historyStatus.textContent = 'Loading...';
}

function loadHistoryPickerPage() {
	if (historyPickerLoading || !historyPickerHasMore) return;
	historyPickerLoading = true;
	if (elements.historyStatus) elements.historyStatus.textContent = 'Loading...';

	const searchParams = {
		text: historyPickerQuery,
		startTime: 0,
		endTime: historyPickerEndTime || Date.now(),
		maxResults: 50,
	};

	chrome.history.search(searchParams, (items) => {
		historyPickerLoading = false;
		if (chrome.runtime.lastError) {
			if (elements.historyStatus) elements.historyStatus.textContent = 'Failed to load history.';
			return;
		}

		if (!items || items.length === 0) {
			historyPickerHasMore = false;
			if (elements.historyStatus) {
				elements.historyStatus.textContent = historyPickerQuery ? 'No results.' : 'No more items.';
			}
			return;
		}

		const fragment = document.createDocumentFragment();
		items.forEach((item) => {
			if (!item.url || historyPickerUrlSet.has(item.url)) return;
			historyPickerUrlSet.add(item.url);

			const row = document.createElement('div');
			row.className = 'management-dropdown-item';
			row.dataset.url = item.url;

			const title = document.createElement('div');
			title.className = 'management-dropdown-title';
			title.textContent = item.title || truncateUrl(item.url, 80);

			const url = document.createElement('div');
			url.className = 'management-dropdown-url';
			url.textContent = item.url;

			row.appendChild(title);
			row.appendChild(url);
			fragment.appendChild(row);
		});

		if (elements.historyList) elements.historyList.appendChild(fragment);

		const lastItem = items[items.length - 1];
		historyPickerEndTime = (lastItem?.lastVisitTime || Date.now()) - 1;
		historyPickerHasMore = historyPickerEndTime > 0;

		if (elements.historyStatus) {
			elements.historyStatus.textContent = historyPickerHasMore ? 'Scroll to load more.' : 'No more items.';
		}
	});
}

function setManagementStatus(message, tone = '') {
	if (!elements.managementStatus) return;
	elements.managementStatus.textContent = message || '';
	elements.managementStatus.classList.remove('success', 'error');
	if (tone) {
		elements.managementStatus.classList.add(tone);
	}
}

function normalizeUrlInput(value) {
	const trimmed = value.trim();
	if (!trimmed) return null;
	let candidate = trimmed;
	if (!/^https?:\/\//i.test(candidate)) {
		candidate = `https://${candidate}`;
	}
	try {
		const url = new URL(candidate);
		if (!['http:', 'https:'].includes(url.protocol)) return null;
		return url.href;
	} catch {
		return null;
	}
}

function renderManagementUrlList() {
	if (!elements.deleteUrlList) return;

	if (managementUrls.length === 0) {
		elements.deleteUrlList.innerHTML = '<div class="management-empty">No URLs added yet.</div>';
		updateDeleteUrlsButtonState();
		return;
	}

	elements.deleteUrlList.innerHTML = managementUrls
		.map(
			(url, index) =>
				`<div class="management-url-item"><span>${escapeHtml(url)}</span><button class="btn-ghost" type="button" data-index="${index}">Remove</button></div>`
		)
		.join('');

	updateDeleteUrlsButtonState();
}

function addUrlsFromInput() {
	if (!elements.deleteUrlInput) return;
	const rawValue = elements.deleteUrlInput.value;
	const candidates = rawValue.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);

	if (candidates.length === 0) {
		updateDeleteUrlsButtonState();
		return;
	}

	const validUrls = [];
	const invalidUrls = [];

	candidates.forEach((entry) => {
		const normalized = normalizeUrlInput(entry);
		if (!normalized) {
			invalidUrls.push(entry);
			return;
		}
		validUrls.push(normalized);
	});

	if (validUrls.length === 0) {
		setManagementStatus('No valid URLs found.', 'error');
		updateDeleteUrlsButtonState();
		return;
	}

	const uniqueUrls = new Set(managementUrls);
	validUrls.forEach((url) => uniqueUrls.add(url));
	managementUrls = Array.from(uniqueUrls);
	elements.deleteUrlInput.value = '';
	renderManagementUrlList();

	if (invalidUrls.length > 0) {
		setManagementStatus(`Added ${validUrls.length} URL(s). ${invalidUrls.length} invalid.`, 'error');
	} else {
		setManagementStatus(`Added ${validUrls.length} URL(s).`, 'success');
	}

	updateDeleteUrlsButtonState();
}

function getValidUrlCountFromInput() {
	if (!elements.deleteUrlInput) return 0;
	const rawValue = elements.deleteUrlInput.value;
	const candidates = rawValue.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
	let validCount = 0;
	for (const entry of candidates) {
		if (normalizeUrlInput(entry)) validCount += 1;
	}
	return validCount;
}

function updateDeleteUrlsButtonState() {
	if (!elements.btnDeleteUrls) return;
	const hasListItems = managementUrls.length > 0;
	const hasValidInput = getValidUrlCountFromInput() > 0;
	elements.btnDeleteUrls.disabled = !(hasListItems || hasValidInput);
}

function getDateRangeFromInput(dateValue) {
	if (!dateValue) return null;
	const parts = dateValue.split('-').map(Number);
	if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
	const [year, month, day] = parts;
	const start = new Date(year, month - 1, day, 0, 0, 0, 0);
	const end = new Date(year, month - 1, day, 23, 59, 59, 999);
	return { start: start.getTime(), end: end.getTime() };
}

async function refreshHistoryInfo() {
	try {
		const historyInfo = await getHistoryStartDate();
		historyStartDate = historyInfo.startDate;
		historyDaysAvailable = historyInfo.daysAvailable;
		filterTimeRangeOptions();

		const selectedOption = elements.selectOptions?.querySelector('.custom-select-option.selected');
		if (selectedOption?.dataset.value === 'all') {
			if (elements.selectValue) elements.selectValue.textContent = `Since ${formatHistoryStartDate()}`;
		}
	} catch (error) {
		console.error('Failed to refresh history start date:', error);
	}
}

async function handleDeleteToday() {
	if (!confirm('Delete all browsing history for today?')) return;

	const start = new Date();
	start.setHours(0, 0, 0, 0);
	const end = Date.now();

	try {
		if (elements.btnDeleteToday) elements.btnDeleteToday.disabled = true;
		const response = await deleteHistoryRange(start.getTime(), end);
		if (!response?.success) {
			throw new Error(response?.error || 'Failed to delete history.');
		}
		setManagementStatus('Deleted today\'s history.', 'success');
		await refreshHistoryInfo();
		await loadAnalytics();
	} catch (error) {
		console.error('Delete today failed:', error);
		setManagementStatus('Failed to delete today\'s history.', 'error');
	} finally {
		if (elements.btnDeleteToday) elements.btnDeleteToday.disabled = false;
	}
}

async function handleDeleteDate() {
	if (!elements.deleteDateInput) return;
	const range = getDateRangeFromInput(elements.deleteDateInput.value);
	if (!range) {
		setManagementStatus('Select a valid date first.', 'error');
		return;
	}

	const readable = new Date(range.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	if (!confirm(`Delete all browsing history for ${readable}?`)) return;

	try {
		if (elements.btnDeleteDate) elements.btnDeleteDate.disabled = true;
		const response = await deleteHistoryRange(range.start, range.end);
		if (!response?.success) {
			throw new Error(response?.error || 'Failed to delete history.');
		}
		setManagementStatus(`Deleted history for ${readable}.`, 'success');
		await refreshHistoryInfo();
		await loadAnalytics();
	} catch (error) {
		console.error('Delete date failed:', error);
		setManagementStatus('Failed to delete history for that date.', 'error');
	} finally {
		if (elements.btnDeleteDate) elements.btnDeleteDate.disabled = false;
	}
}

async function handleDeleteUrls() {
	if (!elements.btnDeleteUrls) return;
	addUrlsFromInput();
	if (managementUrls.length === 0) {
		setManagementStatus('No URLs in the list.', 'error');
		return;
	}

	if (!confirm(`Delete history for ${managementUrls.length} URL(s)?`)) return;

	try {
		elements.btnDeleteUrls.disabled = true;
		const response = await deleteHistoryUrls(managementUrls);
		if (!response?.success) {
			throw new Error(response?.error || 'Failed to delete URLs.');
		}
		managementUrls = [];
		renderManagementUrlList();
		setManagementStatus('Deleted history for selected URLs.', 'success');
		await refreshHistoryInfo();
		await loadAnalytics();
	} catch (error) {
		console.error('Delete URLs failed:', error);
		setManagementStatus('Failed to delete some URLs.', 'error');
	} finally {
		elements.btnDeleteUrls.disabled = managementUrls.length === 0;
	}
}

async function initCustomCategories() {
	if (!elements.customCategorySelect || !elements.customPattern || !elements.customRulesList) return;

	selectedCustomCategory = CATEGORY_OPTIONS[0] || 'other';
	renderCustomCategoryOptions('');
	if (elements.customCategoryValue) {
		elements.customCategoryValue.textContent = `${getCategoryIcon(selectedCustomCategory)} ${getCategoryLabel(selectedCustomCategory)}`;
	}

	try {
		const response = await getCustomCategoryRules();
		customCategoryRules = response?.rules || [];
	} catch (e) {
		console.error('Failed to load custom categories:', e);
		setCustomCategoryStatus('Failed to load custom rules.', 'error');
	}

	elements.btnAddRule?.addEventListener('click', async () => {
		const pattern = elements.customPattern.value.trim();
		const category = selectedCustomCategory;

		if (!pattern) {
			alert('Please enter a domain or keyword');
			return;
		}

		const patternKey = pattern.toLowerCase();
		const duplicateExists = customCategoryRules.some(
			(rule) => String(rule.pattern || '').trim().toLowerCase() === patternKey && rule.category === category
		);
		if (duplicateExists) {
			setCustomCategoryStatus('This custom rule already exists.', 'error');
			return;
		}

		const rule = {
			id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
			pattern,
			category,
		};

		const previousRules = customCategoryRules;
		customCategoryRules = [...customCategoryRules, rule];
		elements.customPattern.value = '';
		const saved = await saveCustomCategories();
		if (!saved) {
			customCategoryRules = previousRules;
			renderCustomCategories();
			return;
		}
		setCustomCategoryStatus('Custom rule saved.', 'success');
	});

	elements.customRulesList.addEventListener('click', async (event) => {
		const button = event.target.closest('.rule-remove');
		if (!button) return;
		const ruleId = button.dataset.id;
		const previousRules = customCategoryRules;
		customCategoryRules = customCategoryRules.filter((rule) => rule.id !== ruleId);
		const saved = await saveCustomCategories();
		if (!saved) {
			customCategoryRules = previousRules;
			renderCustomCategories();
			return;
		}
		setCustomCategoryStatus('Custom rule removed.', 'success');
	});

	setupCustomCategorySelect();
	renderCustomCategories();
}

function renderCustomCategoryOptions(searchTerm = '') {
	if (!elements.customCategoryOptions) return;

	const query = String(searchTerm || '').trim().toLowerCase();
	const filteredOptions = CATEGORY_OPTIONS.filter((category) => {
		const categoryLabel = getCategoryLabel(category).toLowerCase();
		return !query || category.includes(query) || categoryLabel.includes(query);
	});

	const optionsMarkup =
		filteredOptions.length > 0
			? filteredOptions
					.map((category) => {
						const label = `${getCategoryIcon(category)} ${getCategoryLabel(category)}`;
						const selectedClass = category === selectedCustomCategory ? 'selected' : '';
						return `<div class="custom-select-option ${selectedClass}" data-value="${category}">${label}</div>`;
					})
					.join('')
			: '<div class="custom-category-empty">No categories found</div>';

	elements.customCategoryOptions.innerHTML = `
		<div class="custom-category-search-wrap">
			<input id="custom-category-search" type="text" class="custom-category-search" placeholder="Search category..." value="${escapeHtml(searchTerm)}">
		</div>
		<div class="custom-category-options-list">
			${optionsMarkup}
		</div>
	`;
}

function setCustomCategoryStatus(message = '', kind = '') {
	if (!elements.customCategoryStatus) return;
	elements.customCategoryStatus.textContent = message;
	elements.customCategoryStatus.classList.remove('success', 'error');
	if (kind) {
		elements.customCategoryStatus.classList.add(kind);
	}
}

function setupCustomCategorySelect() {
	if (!elements.customCategoryTrigger || !elements.customCategoryOptions) return;

	elements.customCategoryTrigger.addEventListener('click', (event) => {
		event.stopPropagation();
		elements.customCategorySelect?.classList.toggle('open');
		if (!elements.customCategorySelect?.classList.contains('open')) return;
		const searchInput = elements.customCategoryOptions.querySelector('#custom-category-search');
		if (searchInput) {
			setTimeout(() => {
				searchInput.focus();
				searchInput.select();
			}, 0);
		}
	});

	elements.customCategoryOptions.addEventListener('input', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLInputElement) || target.id !== 'custom-category-search') return;

		renderCustomCategoryOptions(target.value);
		const nextInput = elements.customCategoryOptions.querySelector('#custom-category-search');
		if (nextInput) {
			nextInput.focus();
			const caret = target.value.length;
			nextInput.setSelectionRange(caret, caret);
		}
	});

	elements.customCategoryOptions.addEventListener('click', (event) => {
		const option = event.target.closest('.custom-select-option');
		if (!option) return;

		const value = option.dataset.value || 'other';
		selectedCustomCategory = value;

		elements.customCategoryOptions.querySelectorAll('.custom-select-option').forEach((opt) => {
			opt.classList.remove('selected');
		});
		option.classList.add('selected');

		if (elements.customCategoryValue) {
			elements.customCategoryValue.textContent = option.textContent.trim();
		}

		elements.customCategorySelect?.classList.remove('open');
		renderCustomCategoryOptions('');
	});
}

function setupShareMenu() {
	if (!elements.shareMenu || !elements.shareButton) return;

	elements.shareButton.addEventListener('click', (event) => {
		event.stopPropagation();
		elements.shareMenu?.classList.toggle('style_active__TkBO3');
	});

	document.addEventListener('click', (event) => {
		if (!event.target.closest('.style_share__hADne')) {
			elements.shareMenu?.classList.remove('style_active__TkBO3');
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			elements.shareMenu?.classList.remove('style_active__TkBO3');
		}
	});

	if (elements.shareCopy) {
		elements.shareCopy.addEventListener('click', async () => {
			const url = elements.shareCopy.getAttribute('data-url') || window.location.href;
			const text = `Check out Your Browsing Analytics ${url}`;
			try {
				await navigator.clipboard.writeText(text);
			} catch {
				const input = document.createElement('input');
				input.value = text;
				document.body.appendChild(input);
				input.select();
				document.execCommand('copy');
				input.remove();
			}

			elements.shareCopy.classList.add('style_active__TkBO3');
			setTimeout(() => {
				elements.shareCopy.classList.remove('style_active__TkBO3');
			}, 1500);
		});
	}

	if (elements.shareSnapshot) {
		elements.shareSnapshot.addEventListener('click', async () => {
			try {
				const dataUrl = await captureVisibleScreenshot();
				downloadDataUrl(dataUrl, `browsing-analytics-${new Date().toISOString().split('T')[0]}.png`);
			} catch (error) {
				console.error('Failed to capture screenshot:', error);
				alert('Unable to capture screenshot. Please try again.');
			}
		});
	}
}

function captureVisibleScreenshot() {
	return new Promise((resolve, reject) => {
		if (!chrome?.tabs?.captureVisibleTab) {
			reject(new Error('captureVisibleTab not available'));
			return;
		}

		chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
			if (chrome.runtime.lastError || !dataUrl) {
				reject(chrome.runtime.lastError || new Error('No data url'));
				return;
			}
			resolve(dataUrl);
		});
	});
}

function downloadDataUrl(dataUrl, filename) {
	const link = document.createElement('a');
	link.href = dataUrl;
	link.download = filename;
	link.click();
}

async function saveCustomCategories() {
	try {
		renderCustomCategories();
		const response = await setCustomCategoryRules(customCategoryRules);
		if (!response?.success) {
			throw new Error(response?.error || 'Failed to save custom category rules.');
		}
		try {
			await clearAnalyticsCache();
		} catch (error) {
			console.warn('Failed to clear cache after saving custom categories:', error);
		}
		await loadAnalytics();
		return true;
	} catch (e) {
		console.error('Failed to save custom categories:', e);
		setCustomCategoryStatus(`Failed to save: ${e?.message || 'Unknown error'}`, 'error');
		return false;
	}
}

function renderCustomCategories() {
	if (!elements.customRulesList) return;

	if (!customCategoryRules.length) {
		elements.customRulesList.innerHTML = '<div class="custom-category-help">No custom rules yet.</div>';
		return;
	}

	elements.customRulesList.innerHTML = customCategoryRules
		.map(
			(rule) => `
				<div class="custom-category-item">
					<div class="rule-text">${escapeHtml(rule.pattern)}</div>
					<div class="rule-meta">${getCategoryIcon(rule.category)} ${escapeHtml(getCategoryLabel(rule.category))}</div>
					<button class="rule-remove" data-id="${rule.id}">Remove</button>
				</div>
			`
		)
		.join('');
}

function handleApplyCustomRange() {
	const startDate = elements.dateStart?.value;
	const endDate = elements.dateEnd?.value;

	if (!startDate || !endDate) {
		alert('Please select both start and end dates');
		return;
	}

	const start = new Date(startDate);
	const end = new Date(endDate);
	end.setHours(23, 59, 59, 999);

	if (start > end) {
		alert('Start date must be before end date');
		return;
	}

	customStartDate = start.getTime();
	customEndDate = end.getTime();

	const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	if (elements.selectValue) elements.selectValue.textContent = `${startStr} - ${endStr}`;

	loadAnalytics();
}

function showLoading() {
	elements.loadingOverlay?.classList.add('visible');
}

function hideLoading() {
	elements.loadingOverlay?.classList.remove('visible');
}

async function loadAnalytics() {
	showLoading();

	try {
		let data;

		if (customStartDate && customEndDate) {
			const days = Math.ceil((customEndDate - customStartDate) / (24 * 60 * 60 * 1000));
			data = await getAnalytics(days, customStartDate, customEndDate);
		} else {
			data = await getAnalytics(selectedDays);
		}

		analyticsData = data;

		if (!analyticsData) {
			throw new Error('No data received');
		}

		updateStats();
		renderCharts();
		renderPagesTable();
		renderCategoryLegend();
		renderOtherPagesPanel();
		renderSearchStats();
		renderSessionsStats();
	} catch (error) {
		console.error('Failed to load analytics:', error);
		showError();
	} finally {
		hideLoading();
	}
}

function showError() {
	if (elements.totalPages) elements.totalPages.textContent = '--';
	if (elements.uniqueDomains) elements.uniqueDomains.textContent = '--';
	if (elements.peakHour) elements.peakHour.textContent = '--';
	if (elements.peakDay) elements.peakDay.textContent = '--';
	if (elements.sessionsCount) elements.sessionsCount.textContent = '--';
	if (elements.sessionsAvg) elements.sessionsAvg.textContent = '--';
	if (elements.sessionsLongest) elements.sessionsLongest.textContent = '--';
}

function updateStats() {
	if (!analyticsData) return;

	const totalVisits = analyticsData.totalVisits || analyticsData.topDomains?.reduce((sum, d) => sum + d.visits, 0) || 0;

	animateValue(elements.totalPages, totalVisits);
	animateValue(elements.uniqueDomains, analyticsData.uniqueDomains || analyticsData.topDomains?.length || 0);

	if (analyticsData.hourlyActivity) {
		const maxActivity = Math.max(...analyticsData.hourlyActivity);
		if (maxActivity > 0) {
			const peakHourIndex = analyticsData.hourlyActivity.indexOf(maxActivity);
			if (elements.peakHour) elements.peakHour.textContent = getHourLabel(peakHourIndex);
		} else {
			if (elements.peakHour) elements.peakHour.textContent = '--';
		}
	}

	if (analyticsData.dailyActivity) {
		const maxActivity = Math.max(...analyticsData.dailyActivity);
		if (maxActivity > 0) {
			const peakDayIndex = analyticsData.dailyActivity.indexOf(maxActivity);
			if (elements.peakDay) elements.peakDay.textContent = getDayName(peakDayIndex);
		} else {
			if (elements.peakDay) elements.peakDay.textContent = '--';
		}
	}
}

function animateValue(element, targetValue) {
	if (!element) return;
	const formattedValue = formatNumber(targetValue);
	element.style.opacity = '0';
	element.style.transform = 'translateY(-5px)';
	setTimeout(() => {
		element.textContent = formattedValue;
		element.style.opacity = '1';
		element.style.transform = 'translateY(0)';
	}, 150);
}

function renderCharts() {
	if (typeof Chart === 'undefined') {
		console.error('Chart.js not loaded - please ensure chart.umd.min.js is in src/lib/');
		return;
	}

	renderDomainsChart();
	renderHourlyChart();
	renderDailyChart();
	renderCategoriesChart();
	renderTimeOfDay();
}

function renderDomainsChart() {
	const ctx = document.getElementById('chart-domains');
	if (!ctx || !analyticsData?.topDomains) return;

	if (charts.domains) charts.domains.destroy();

	const data = analyticsData.topDomains.slice(0, 10);

	charts.domains = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: data.map((d) => d.domain),
			datasets: [
				{
					label: 'Visits',
					data: data.map((d) => d.visits),
					backgroundColor: '#6366f1',
					borderRadius: 6,
				},
			],
		},
		options: {
			indexAxis: 'y',
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: {
				x: { grid: { color: 'rgba(0,0,0,0.05)' } },
				y: { grid: { display: false } },
			},
		},
	});
}

function renderHourlyChart() {
	const ctx = document.getElementById('chart-hourly');
	if (!ctx || !analyticsData?.hourlyActivity) return;

	if (charts.hourly) charts.hourly.destroy();

	const currentHour = new Date().getHours();
	const isToday = selectedDays === 1 && !customStartDate;

	let hourlyData = [...analyticsData.hourlyActivity];
	let labels = Array.from({ length: 24 }, (_, i) => getHourLabel(i));

	if (isToday) {
		hourlyData = hourlyData.slice(0, currentHour + 1);
		labels = labels.slice(0, currentHour + 1);
	}

	const maxVal = Math.max(...hourlyData, 1);

	charts.hourly = new Chart(ctx, {
		type: 'line',
		data: {
			labels: labels,
			datasets: [
				{
					label: 'Activity',
					data: hourlyData,
					fill: true,
					backgroundColor: 'rgba(99, 102, 241, 0.1)',
					borderColor: '#6366f1',
					borderWidth: 2,
					tension: 0.4,
					pointRadius: 3,
					pointBackgroundColor: '#6366f1',
					pointHoverRadius: 7,
					pointHoverBorderWidth: 2,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						label: (context) => `${context.parsed.y} visits`,
					},
				},
			},
			scales: {
				x: { grid: { display: false }, ticks: { maxRotation: 45 } },
				y: {
					grid: { color: 'rgba(0,0,0,0.05)' },
					beginAtZero: true,
					ticks: {
						stepSize: maxVal > 100 ? Math.ceil(maxVal / 10) : maxVal > 10 ? Math.ceil(maxVal / 5) : 1,
					},
				},
			},
		},
	});
}

function renderDailyChart() {
	const ctx = document.getElementById('chart-daily');
	if (!ctx || !analyticsData?.dailyActivity) return;

	if (charts.daily) charts.daily.destroy();

	const reorderedData = [...analyticsData.dailyActivity.slice(1), analyticsData.dailyActivity[0]];
	const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	charts.daily = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: labels,
			datasets: [
				{
					label: 'Activity',
					data: reorderedData,
					backgroundColor: labels.map((_, i) => (i < 5 ? '#6366f1' : '#a855f7')),
					borderRadius: 8,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						label: (context) => `${context.parsed.y} visits`,
					},
				},
			},
			scales: {
				x: { grid: { display: false } },
				y: { grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
			},
		},
	});
}

function renderCategoriesChart() {
	const ctx = document.getElementById('chart-categories');
	if (!ctx || !analyticsData?.categoryStats) return;

	if (charts.categories) charts.categories.destroy();

	const allCategories = Object.entries(analyticsData.categoryStats).filter(([_, value]) => value > 0);
	const total = allCategories.reduce((sum, [_, val]) => sum + val, 0);

	// Filter out categories with less than 0.1% (rounds to 0.0%)
	const categories = allCategories.filter(([_, value]) => (value / total) * 100 >= 0.05).sort((a, b) => b[1] - a[1]);

	if (categories.length === 0) return;

	charts.categories = new Chart(ctx, {
		type: 'doughnut',
		data: {
			labels: categories.map(([name]) => getCategoryLabel(name)),
			datasets: [
				{
					data: categories.map(([_, value]) => value),
					backgroundColor: categories.map(([name]) => getCategoryColor(name)),
					borderWidth: 0,
					hoverOffset: 10,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			cutout: '60%',
			plugins: { legend: { display: false } },
		},
	});
}

function renderTimeOfDay() {
	if (!analyticsData?.hourlyActivity) return;

	const hourly = analyticsData.hourlyActivity;

	// Calculate totals for each period
	const periods = {
		morning: hourly.slice(6, 12).reduce((a, b) => a + b, 0), // 6-12
		afternoon: hourly.slice(12, 18).reduce((a, b) => a + b, 0), // 12-18
		evening: hourly.slice(18, 24).reduce((a, b) => a + b, 0), // 18-24
		night: hourly.slice(0, 6).reduce((a, b) => a + b, 0), // 0-6
	};

	const total = Object.values(periods).reduce((a, b) => a + b, 0);

	Object.entries(periods).forEach(([period, value]) => {
		const slot = document.querySelector(`.time-slot[data-period="${period}"]`);
		if (!slot) return;

		const percent = total > 0 ? (value / total) * 100 : 0;
		const fill = slot.querySelector('.time-fill');
		const percentEl = slot.querySelector('.time-percent');

		if (fill) fill.style.width = `${percent}%`;
		if (percentEl) percentEl.textContent = `${percent.toFixed(0)}%`;
	});
}

function renderCategoryLegend() {
	if (!elements.categoryLegend || !analyticsData?.categoryStats) return;

	const allCategories = Object.entries(analyticsData.categoryStats).filter(([_, value]) => value > 0);
	const total = allCategories.reduce((sum, [_, val]) => sum + val, 0);

	// Filter out categories with less than 0.1% (rounds to 0.0%)
	const categories = allCategories.filter(([_, value]) => (value / total) * 100 >= 0.05).sort((a, b) => b[1] - a[1]);

	elements.categoryLegend.innerHTML = categories
		.map(
			([name, value]) => `
			<div class="legend-item">
				<span class="legend-color" style="background: ${getCategoryColor(name)}"></span>
				<span>${getCategoryIcon(name)} ${getCategoryLabel(name)}</span>
				<span style="margin-left: 4px; opacity: 0.6">${calcPercentage(value, total)}</span>
			</div>
		`
		)
		.join('');
}

function renderOtherPagesPanel() {
	if (!elements.otherPagesLink || !elements.otherPagesCount || !elements.otherPagesPanel || !elements.otherPagesList) return;

	const pages = Array.isArray(analyticsData?.otherPages) ? analyticsData.otherPages : [];
	elements.otherPagesCount.textContent = formatNumber(pages.length);

	if (pages.length === 0) {
		isOtherPagesExpanded = false;
		elements.otherPagesLink.disabled = true;
		elements.otherPagesLink.textContent = 'Show pages in Other (0)';
		elements.otherPagesPanel.classList.add('hidden');
		elements.otherPagesList.innerHTML = '<div class="other-pages-empty">No pages in Other for selected period.</div>';
		return;
	}

	elements.otherPagesLink.disabled = false;
	elements.otherPagesLink.textContent = `${isOtherPagesExpanded ? 'Hide' : 'Show'} pages in Other (${pages.length})`;

	if (!isOtherPagesExpanded) {
		elements.otherPagesPanel.classList.add('hidden');
		return;
	}

	elements.otherPagesPanel.classList.remove('hidden');
	elements.otherPagesList.innerHTML = pages
		.map(
			(page, index) => `
				<div class="other-pages-item">
					<div class="other-pages-rank">${index + 1}</div>
					<div class="other-pages-content">
						<div class="other-pages-title" title="${escapeHtml(page.title || page.url)}">${escapeHtml(page.title || page.url)}</div>
						<div class="other-pages-url" title="${escapeHtml(page.url)}">${escapeHtml(page.url)}</div>
					</div>
					<div class="other-pages-visits">${formatNumber(page.visits || 0)}</div>
				</div>
			`
		)
		.join('');
}

function renderSearchStats() {
	if (!elements.searchSummary || !elements.searchList) return;

	const stats = analyticsData?.searchStats;
	if (!stats || stats.total === 0) {
		elements.searchSummary.textContent = 'No search queries detected';
		elements.searchList.innerHTML = '';
		return;
	}

	const engines = Object.entries(stats.engines || {})
		.map(([engine, count]) => ({ engine, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 3)
		.map((entry) => `${entry.engine}: ${formatNumber(entry.count)}`)
		.join(' • ');

	elements.searchSummary.textContent = `${formatNumber(stats.total)} searches${engines ? ` • ${engines}` : ''}`;

	if (!stats.topSearches || stats.topSearches.length === 0) {
		elements.searchList.innerHTML = '';
		return;
	}

	elements.searchList.innerHTML = stats.topSearches
		.map(
			(item) => `
				<div class="search-item">
					<div class="search-query" title="${escapeHtml(item.query)}">${escapeHtml(item.query)}</div>
					<div class="search-count">${formatNumber(item.count)}</div>
				</div>
			`
		)
		.join('');
}

function renderSessionsStats() {
	if (!elements.sessionsCount || !elements.sessionsAvg || !elements.sessionsLongest) return;

	const sessions = analyticsData?.sessions;
	if (!sessions) {
		elements.sessionsCount.textContent = '--';
		elements.sessionsAvg.textContent = '--';
		elements.sessionsLongest.textContent = '--';
		return;
	}

	elements.sessionsCount.textContent = formatNumber(sessions.count || 0);
	elements.sessionsAvg.textContent = formatDuration(sessions.avgDuration || 0);
	elements.sessionsLongest.textContent = formatDuration(sessions.longestDuration || 0);
}

function renderPagesTable(searchQuery = '') {
	if (!elements.pagesTbody) return;

	if (!analyticsData?.topPages || analyticsData.topPages.length === 0) {
		elements.pagesTbody.innerHTML = '<tr><td colspan="4" class="loading">No data available</td></tr>';
		if (elements.pagination) elements.pagination.innerHTML = '';
		return;
	}

	let pages = [...analyticsData.topPages];

	if (searchQuery && searchQuery.trim()) {
		const query = searchQuery.toLowerCase().trim();
		pages = pages.filter((p) => (p.title || '').toLowerCase().includes(query) || (p.url || '').toLowerCase().includes(query));
	}

	const totalPages = Math.ceil(pages.length / PAGE_SIZE);

	if (currentPage > totalPages && totalPages > 0) {
		currentPage = 1;
	}

	const start = (currentPage - 1) * PAGE_SIZE;
	const paginatedPages = pages.slice(start, start + PAGE_SIZE);

	if (paginatedPages.length === 0) {
		elements.pagesTbody.innerHTML = `<tr><td colspan="4" class="loading">No pages match "${escapeHtml(searchQuery)}"</td></tr>`;
		if (elements.pagination) elements.pagination.innerHTML = '';
		return;
	}

	elements.pagesTbody.innerHTML = paginatedPages
		.map(
			(page, index) => `
			<tr>
				<td>${start + index + 1}</td>
				<td><span class="page-title" title="${escapeHtml(page.title || 'Untitled')}">${escapeHtml(page.title || 'Untitled')}</span></td>
				<td><a href="${escapeHtml(page.url)}" target="_blank" class="page-url" title="${escapeHtml(page.url)}">${escapeHtml(truncateUrl(page.url, 50))}</a></td>
				<td>${formatNumber(page.visits)}</td>
			</tr>
		`
		)
		.join('');

	renderPagination(totalPages, pages.length, searchQuery);
}

function renderPagination(totalPages, totalItems, searchQuery = '') {
	if (!elements.pagination) return;

	if (totalPages <= 1) {
		elements.pagination.innerHTML = totalItems > 0 ? `<span class="pagination-info">${totalItems} item${totalItems !== 1 ? 's' : ''}</span>` : '';
		return;
	}

	// Create pagination container
	const container = document.createElement('div');
	container.className = 'pagination-buttons';

	// Previous button
	const prevBtn = document.createElement('button');
	prevBtn.className = 'page-btn';
	prevBtn.textContent = 'Prev';
	prevBtn.disabled = currentPage === 1;
	prevBtn.addEventListener('click', () => goToPage(currentPage - 1, searchQuery));
	container.appendChild(prevBtn);

	// Page numbers
	const maxVisible = 5;
	let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
	let endPage = Math.min(totalPages, startPage + maxVisible - 1);

	if (endPage - startPage < maxVisible - 1) {
		startPage = Math.max(1, endPage - maxVisible + 1);
	}

	if (startPage > 1) {
		const firstBtn = document.createElement('button');
		firstBtn.className = 'page-btn';
		firstBtn.textContent = '1';
		firstBtn.addEventListener('click', () => goToPage(1, searchQuery));
		container.appendChild(firstBtn);

		if (startPage > 2) {
			const ellipsis = document.createElement('span');
			ellipsis.className = 'page-ellipsis';
			ellipsis.textContent = '...';
			container.appendChild(ellipsis);
		}
	}

	for (let i = startPage; i <= endPage; i++) {
		const pageBtn = document.createElement('button');
		pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
		pageBtn.textContent = i.toString();
		pageBtn.addEventListener('click', () => goToPage(i, searchQuery));
		container.appendChild(pageBtn);
	}

	if (endPage < totalPages) {
		if (endPage < totalPages - 1) {
			const ellipsis = document.createElement('span');
			ellipsis.className = 'page-ellipsis';
			ellipsis.textContent = '...';
			container.appendChild(ellipsis);
		}

		const lastBtn = document.createElement('button');
		lastBtn.className = 'page-btn';
		lastBtn.textContent = totalPages.toString();
		lastBtn.addEventListener('click', () => goToPage(totalPages, searchQuery));
		container.appendChild(lastBtn);
	}

	// Next button
	const nextBtn = document.createElement('button');
	nextBtn.className = 'page-btn';
	nextBtn.textContent = 'Next';
	nextBtn.disabled = currentPage === totalPages;
	nextBtn.addEventListener('click', () => goToPage(currentPage + 1, searchQuery));
	container.appendChild(nextBtn);

	// Info
	const info = document.createElement('span');
	info.className = 'pagination-info';
	info.textContent = `${totalItems} items`;
	container.appendChild(info);

	elements.pagination.innerHTML = '';
	elements.pagination.appendChild(container);
}

function goToPage(page, searchQuery = '') {
	currentPage = page;
	renderPagesTable(searchQuery || elements.pageSearch?.value || '');
	document.getElementById('pages-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleExport() {
	if (!analyticsData) {
		alert('No data to export');
		return;
	}

	const exportData = {
		...analyticsData,
		exportedAt: new Date().toISOString(),
		customRange: customStartDate && customEndDate ? { start: new Date(customStartDate).toISOString(), end: new Date(customEndDate).toISOString() } : null,
	};

	downloadAsJson(exportData, `browsing-analytics-${new Date().toISOString().split('T')[0]}.json`);
}

// Add transition style for stat values
const style = document.createElement('style');
style.textContent = `.stat-value { transition: opacity 0.15s, transform 0.15s; }`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
