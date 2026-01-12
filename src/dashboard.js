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

const CATEGORY_COLORS = {
	development: '#22c55e',
	work: '#6366f1',
	social: '#ec4899',
	entertainment: '#f59e0b',
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
		averageStreak: document.getElementById('average-streak'),
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
		customCategory: document.getElementById('custom-category'),
		btnAddRule: document.getElementById('btn-add-rule'),
		customRulesList: document.getElementById('custom-rules-list'),
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

	setupCustomSelect();
	setupEventListeners();
	setupTableResizers();
	await initCustomCategories();
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

	const today = new Date();
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	if (elements.dateEnd) elements.dateEnd.valueAsDate = today;
	if (elements.dateStart) elements.dateStart.valueAsDate = thirtyDaysAgo;
}

function setupEventListeners() {
	elements.btnApplyRange?.addEventListener('click', handleApplyCustomRange);
	elements.btnExport?.addEventListener('click', handleExport);
	elements.btnRefresh?.addEventListener('click', () => {
		chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, () => {
			loadAnalytics();
		});
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

async function initCustomCategories() {
	if (!elements.customCategory || !elements.customPattern || !elements.customRulesList) return;

	elements.customCategory.innerHTML = CATEGORY_OPTIONS.map((category) => {
		const label = `${getCategoryIcon(category)} ${category.charAt(0).toUpperCase() + category.slice(1)}`;
		return `<option value="${category}">${label}</option>`;
	}).join('');

	try {
		const response = await getCustomCategoryRules();
		customCategoryRules = response?.rules || [];
	} catch (e) {
		console.error('Failed to load custom categories:', e);
	}

	elements.btnAddRule?.addEventListener('click', () => {
		const pattern = elements.customPattern.value.trim();
		const category = elements.customCategory.value;

		if (!pattern) {
			alert('Please enter a domain or keyword');
			return;
		}

		const rule = {
			id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
			pattern,
			category,
		};

		customCategoryRules = [...customCategoryRules, rule];
		elements.customPattern.value = '';
		saveCustomCategories();
	});

	elements.customRulesList.addEventListener('click', (event) => {
		const button = event.target.closest('.rule-remove');
		if (!button) return;
		const ruleId = button.dataset.id;
		customCategoryRules = customCategoryRules.filter((rule) => rule.id !== ruleId);
		saveCustomCategories();
	});

	renderCustomCategories();
}

async function saveCustomCategories() {
	try {
		await setCustomCategoryRules(customCategoryRules);
		renderCustomCategories();
		chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, () => {
			loadAnalytics();
		});
	} catch (e) {
		console.error('Failed to save custom categories:', e);
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
					<div class="rule-meta">${getCategoryIcon(rule.category)} ${escapeHtml(rule.category)}</div>
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
	if (elements.averageStreak) elements.averageStreak.textContent = '--';
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

	if (elements.averageStreak) {
		const streakMs = analyticsData.avgStreakMs || 0;
		elements.averageStreak.textContent = formatDuration(streakMs);
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
			labels: categories.map(([name]) => name.charAt(0).toUpperCase() + name.slice(1)),
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
				<span>${getCategoryIcon(name)} ${name.charAt(0).toUpperCase() + name.slice(1)}</span>
				<span style="margin-left: 4px; opacity: 0.6">${calcPercentage(value, total)}</span>
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
