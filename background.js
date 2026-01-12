/**
 * Your Browsing Analytics - Background Service Worker
 * Handles data collection, caching, and message passing
 */

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
const CUSTOM_CATEGORY_RULES_KEY = 'customCategoryRules';

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

/**
 * Domain categorization rules - EXPANDED
 */
const CATEGORY_RULES = {
	development: [
		/^localhost/i,
		/^127\.0\.0\.1/i,
		/^0\.0\.0\.0/i,
		/^192\.168\./i,
		/^10\.\d+\.\d+\.\d+/i,
		/^172\.(1[6-9]|2\d|3[01])\./i,
		/\.local$/i,
		/\.localhost$/i,
		/\.test$/i,
		/\.dev$/i,
		/\.example$/i,
		/ngrok\.io/i,
		/ngrok-free\.app/i,
		/localtunnel\.me/i,
		/localhost\.run/i,
		/loca\.lt/i,
		/vscode\.dev/i,
		/github\.dev/i,
		/codespaces\.github/i,
		/gitpod\.io/i,
		/stackblitz\.com/i,
		/glitch\.com/i,
		/railway\.app/i,
		/render\.com/i,
		/fly\.io/i,
		/supabase\.com/i,
		/supabase\.co/i,
		/firebase\.google/i,
		/firebaseio\.com/i,
		/planetscale\.com/i,
		/neon\.tech/i,
		/upstash\.com/i,
		/mongodb\.com/i,
		/prisma\.io/i,
		/docker\.com/i,
		/hub\.docker/i,
		/kubernetes\.io/i,
		/expo\.dev/i,
		/expo\.io/i,
		/snack\.expo/i,
		/appetize\.io/i,
		/browserstack\.com/i,
		/saucelabs\.com/i,
		/lambdatest\.com/i,
		/cypress\.io/i,
		/playwright\.dev/i,
		/storybook\.js\.org/i,
		/chromatic\.com/i,
		/bit\.dev/i,
		/bundlephobia\.com/i,
		/unpkg\.com/i,
		/jsdelivr\.net/i,
		/cdnjs\.com/i,
		/skypack\.dev/i,
		/esm\.sh/i,
		/deno\.land/i,
		/pkg\.go\.dev/i,
		/crates\.io/i,
		/rubygems\.org/i,
		/nuget\.org/i,
		/maven\.org/i,
		/mvnrepository\.com/i,
		/cocoapods\.org/i,
		/pub\.dev/i,
		/hex\.pm/i,
		/hackage\.haskell/i,
		/pkg\.julialang/i,
	],
	work: [
		/github\.com/i,
		/gitlab\.com/i,
		/bitbucket\.org/i,
		/stackoverflow\.com/i,
		/stackexchange\.com/i,
		/slack\.com/i,
		/notion\.so/i,
		/notion\.com/i,
		/trello\.com/i,
		/asana\.com/i,
		/monday\.com/i,
		/jira\./i,
		/atlassian\./i,
		/confluence\./i,
		/docs\.google\.com/i,
		/sheets\.google\.com/i,
		/slides\.google\.com/i,
		/drive\.google\.com/i,
		/calendar\.google\.com/i,
		/mail\.google\.com/i,
		/outlook\./i,
		/office\.com/i,
		/linkedin\.com/i,
		/zoom\.us/i,
		/meet\.google\.com/i,
		/teams\.microsoft\.com/i,
		/figma\.com/i,
		/canva\.com/i,
		/miro\.com/i,
		/vercel\.com/i,
		/netlify\.com/i,
		/heroku\.com/i,
		/digitalocean\.com/i,
		/aws\.amazon\.com/i,
		/console\.cloud\.google/i,
		/azure\.microsoft\.com/i,
		/codepen\.io/i,
		/jsfiddle\.net/i,
		/codesandbox\.io/i,
		/replit\.com/i,
		/npmjs\.com/i,
		/packagist\.org/i,
		/pypi\.org/i,
		/medium\.com/i,
		/dev\.to/i,
		/hashnode\.com/i,
		/smashingmagazine\.com/i,
		/css-tricks\.com/i,
		/alistapart\.com/i,
		/baeldung\.com/i,
		/theodinproject\.com/i,
		/docs\.aws\.amazon/i,
		/developers\.google/i,
		/learn\.microsoft/i,
		/docs\.docker/i,
		/coursera\.org/i,
		/udemy\.com/i,
		/skillshare\.com/i,
		/pluralsight\.com/i,
		/egghead\.io/i,
		/frontendmasters\.com/i,
		/w3schools\.com/i,
		/mdn\.mozilla/i,
		/developer\.mozilla/i,
		/freecodecamp\.org/i,
	],
	social: [
		/facebook\.com/i,
		/fb\.com/i,
		/fb\.watch/i,
		/twitter\.com/i,
		/x\.com/i,
		/instagram\.com/i,
		/snapchat\.com/i,
		/reddit\.com/i,
		/old\.reddit/i,
		/redd\.it/i,
		/discord\.com/i,
		/discord\.gg/i,
		/discordapp\.com/i,
		/telegram\.org/i,
		/t\.me/i,
		/web\.telegram/i,
		/whatsapp\.com/i,
		/web\.whatsapp/i,
		/messenger\.com/i,
		/pinterest\.com/i,
		/pin\.it/i,
		/tumblr\.com/i,
		/threads\.net/i,
		/mastodon\./i,
		/mstdn\./i,
		/bsky\.app/i,
		/quora\.com/i,
		/weibo\.com/i,
		/weibo\.cn/i,
		/douyin\.com/i,
		/kuaishou\.com/i,
		/line\.me/i,
		/kakaotalk\.com/i,
		/naver\.com/i,
		/band\.us/i,
		/clubhouse\.com/i,
		/nextdoor\.com/i,
		/meetup\.com/i,
		/eventbrite\.com/i,
		/producthunt\.com/i,
		/linktr\.ee/i,
		/linktree\.com/i,
		/bio\.link/i,
		/beacons\.ai/i,
		/stan\.store/i,
		/hackernews\.com/i,
		/news\.ycombinator/i,
		/lobste\.rs/i,
		/slashdot\.org/i,
		/digg\.com/i,
		/voat\.co/i,
		/lemmy\./i,
		/kbin\./i,
		/cohost\.org/i,
	],
	entertainment: [
		/9gag\.com/i,
		/imgur\.com/i,
		/i\.imgur/i,
		/giphy\.com/i,
		/tenor\.com/i,
		/gfycat\.com/i,
		/streamable\.com/i,
		/rottentomatoes\.com/i,
		/imdb\.com/i,
		/metacritic\.com/i,
		/letterboxd\.com/i,
		/trakt\.tv/i,
		/justwatch\.com/i,
		/thetvdb\.com/i,
		/themoviedb\.org/i,
		/myanimelist\.net/i,
		/anilist\.co/i,
		/kitsu\.io/i,
		/anime-planet\.com/i,
		/webtoons\.com/i,
		/tapas\.io/i,
		/mangadex\.org/i,
		/mangaplus\.shueisha/i,
		/comixology\.com/i,
		/marvel\.com/i,
		/dc\.com/i,
	],
	video: [
		/youtube\.com/i,
		/youtu\.be/i,
		/yt\.be/i,
		/netflix\.com/i,
		/hulu\.com/i,
		/disneyplus\.com/i,
		/disney\+/i,
		/hbomax\.com/i,
		/max\.com/i,
		/primevideo\.com/i,
		/amazon\.com\/Prime-Video/i,
		/crunchyroll\.com/i,
		/funimation\.com/i,
		/hidive\.com/i,
		/vrv\.co/i,
		/vimeo\.com/i,
		/dailymotion\.com/i,
		/bilibili\.com/i,
		/nicovideo\.jp/i,
		/tubi\.tv/i,
		/pluto\.tv/i,
		/peacocktv\.com/i,
		/paramountplus\.com/i,
		/apple\.com\/tv/i,
		/tv\.apple/i,
		/rumble\.com/i,
		/odysee\.com/i,
		/bitchute\.com/i,
		/tiktok\.com/i,
		// Ukrainian video
		/megogo\.net/i,
		/sweet\.tv/i,
		/oll\.tv/i,
		/1plus1\.video/i,
		/ictv\.ua/i,
	],
	gaming: [
		// Platforms & stores
		/steampowered\.com/i,
		/store\.steampowered/i,
		/steamcommunity\.com/i,
		/epicgames\.com/i,
		/gog\.com/i,
		/humblebundle\.com/i,
		/itch\.io/i,
		/gamejolt\.com/i,
		/origin\.com/i,
		/ea\.com/i,
		/ubisoft\.com/i,
		/blizzard\.com/i,
		/battle\.net/i,
		/playstation\.com/i,
		/xbox\.com/i,
		/nintendo\.com/i,
		// Streaming
		/twitch\.tv/i,
		/kick\.com/i,
		/mixer\.com/i,
		// Games
		/roblox\.com/i,
		/minecraft\.net/i,
		/fortnite\.com/i,
		/leagueoflegends\.com/i,
		/dota2\.com/i,
		/worldofwarcraft\.com/i,
		/valorant\.com/i,
		/callofduty\.com/i,
		/apexlegends\.com/i,
		/genshin\.hoyoverse/i,
		/mihoyo\.com/i,
		/hoyoverse\.com/i,
		/riotgames\.com/i,
		// News & community
		/gaming\./i,
		/ign\.com/i,
		/gamespot\.com/i,
		/kotaku\.com/i,
		/polygon\.com/i,
		/rockpapershotgun\.com/i,
		/pcgamer\.com/i,
		/gamesradar\.com/i,
		/eurogamer\.net/i,
		/destructoid\.com/i,
		/giantbomb\.com/i,
		/escapistmagazine\.com/i,
		/gameinformer\.com/i,
		/nintendolife\.com/i,
		/pushsquare\.com/i,
		/purexbox\.com/i,
		/n4g\.com/i,
		/neogaf\.com/i,
		/resetera\.com/i,
		/howlongtobeat\.com/i,
		/gg\.deals/i,
		/isthereanydeal\.com/i,
		/cheapshark\.com/i,
		/steamdb\.info/i,
		/steamcharts\.com/i,
		/protondb\.com/i,
		/nexusmods\.com/i,
		/moddb\.com/i,
		/curseforge\.com/i,
		/speedrun\.com/i,
	],
	music: [
		// Streaming
		/spotify\.com/i,
		/open\.spotify/i,
		/music\.apple/i,
		/music\.youtube/i,
		/soundcloud\.com/i,
		/deezer\.com/i,
		/tidal\.com/i,
		/pandora\.com/i,
		/audiomack\.com/i,
		/mixcloud\.com/i,
		/bandcamp\.com/i,
		/last\.fm/i,
		/lastfm\.com/i,
		/shazam\.com/i,
		/napster\.com/i,
		/qobuz\.com/i,
		/idagio\.com/i,
		/primephonic\.com/i,
		/amazon\.com\/music/i,
		/music\.amazon/i,
		// Lyrics & tabs
		/genius\.com/i,
		/azlyrics\.com/i,
		/lyrics\.com/i,
		/musixmatch\.com/i,
		/songsterr\.com/i,
		/ultimate-guitar\.com/i,
		/guitartabs\.cc/i,
		/chordify\.net/i,
		// Radio
		/iheart\.com/i,
		/iheartradio\.com/i,
		/tunein\.com/i,
		/radio\.com/i,
		/radioparadise\.com/i,
		/soma\.fm/i,
		/di\.fm/i,
		// Music production & tools
		/splice\.com/i,
		/landr\.com/i,
		/distrokid\.com/i,
		/tunecore\.com/i,
		/cdbaby\.com/i,
		/routenote\.com/i,
		/beatstars\.com/i,
		/bpm\.com/i,
		/loopmasters\.com/i,
		// Music info
		/discogs\.com/i,
		/allmusic\.com/i,
		/rateyourmusic\.com/i,
		/albumoftheyear\.org/i,
		/setlist\.fm/i,
		/songkick\.com/i,
		/bandsintown\.com/i,
		/concerts\.livenation/i,
		/ticketmaster\.com/i,
	],
	shopping: [
		/amazon\./i,
		/amzn\./i,
		/ebay\./i,
		/etsy\.com/i,
		/walmart\.com/i,
		/target\.com/i,
		/bestbuy\.com/i,
		/costco\.com/i,
		/homedepot\.com/i,
		/lowes\.com/i,
		/wayfair\.com/i,
		/overstock\.com/i,
		/newegg\.com/i,
		/bhphotovideo\.com/i,
		/aliexpress\.com/i,
		/alibaba\.com/i,
		/1688\.com/i,
		/taobao\.com/i,
		/tmall\.com/i,
		/jd\.com/i,
		/pinduoduo\.com/i,
		/shopify\.com/i,
		/myshopify\.com/i,
		/wish\.com/i,
		/temu\.com/i,
		/shein\.com/i,
		/romwe\.com/i,
		/zaful\.com/i,
		/fashionnova\.com/i,
		/asos\.com/i,
		/zara\.com/i,
		/hm\.com/i,
		/uniqlo\.com/i,
		/gap\.com/i,
		/oldnavy\.com/i,
		/forever21\.com/i,
		/urbanoutfitters\.com/i,
		/anthropologie\.com/i,
		/freepeople\.com/i,
		/macys\.com/i,
		/nordstrom\.com/i,
		/bloomingdales\.com/i,
		/saksfifthavenue\.com/i,
		/neimanmarcus\.com/i,
		/nike\.com/i,
		/adidas\.com/i,
		/puma\.com/i,
		/underarmour\.com/i,
		/reebok\.com/i,
		/newbalance\.com/i,
		/footlocker\.com/i,
		/finishline\.com/i,
		/zappos\.com/i,
		/dsw\.com/i,
		/6pm\.com/i,
		/sephora\.com/i,
		/ulta\.com/i,
		/glossier\.com/i,
		/colourpop\.com/i,
		/ikea\.com/i,
		/craigslist\.org/i,
		/mercari\.com/i,
		/poshmark\.com/i,
		/depop\.com/i,
		/thredup\.com/i,
		/offerup\.com/i,
		/letgo\.com/i,
		/reverb\.com/i,
		/stockx\.com/i,
		/goat\.com/i,
		/grailed\.com/i,
		/ssense\.com/i,
		/mrporter\.com/i,
		/net-a-porter\.com/i,
		/farfetch\.com/i,
		/matchesfashion\.com/i,
		// Ukrainian shopping
		/prom\.ua/i,
		/rozetka\.com\.ua/i,
		/rozetka\.ua/i,
		/olx\.ua/i,
		/allo\.ua/i,
		/comfy\.ua/i,
		/epicentrk\.ua/i,
		/makeup\.com\.ua/i,
		/citrus\.ua/i,
		/moyo\.ua/i,
		/foxtrot\.com\.ua/i,
		/hotline\.ua/i,
		/price\.ua/i,
		/zakupki\.prom\.ua/i,
		/kasta\.ua/i,
		/answear\.ua/i,
		/intertop\.ua/i,
		/leboutique\.com/i,
		/shafa\.ua/i,
		/telemart\.ua/i,
		/brain\.com\.ua/i,
		/eldorado\.ua/i,
		/stylus\.ua/i,
		/tech\.ua/i,
		/itbox\.ua/i,
		// European shopping
		/zalando\./i,
		/asos\./i,
		/otto\.de/i,
		/aboutyou\.de/i,
		/bol\.com/i,
		/cdiscount\.com/i,
		/fnac\.com/i,
		/darty\.com/i,
		/mediamarkt\./i,
		/saturn\.de/i,
		/currys\.co\.uk/i,
		/argos\.co\.uk/i,
		/johnlewis\.com/i,
		/ocado\.com/i,
	],
	news: [
		/news\./i,
		/blog\./i,
		/article\./i,
		/news-post\./i,
		/cnn\.com/i,
		/bbc\./i,
		/bbc\.co\.uk/i,
		/nytimes\.com/i,
		/theguardian\.com/i,
		/reuters\.com/i,
		/bloomberg\.com/i,
		/techcrunch\.com/i,
		/theverge\.com/i,
		/wired\.com/i,
		/arstechnica\.com/i,
		/engadget\.com/i,
		/mashable\.com/i,
		/gizmodo\.com/i,
		/lifehacker\.com/i,
		/vice\.com/i,
		/vox\.com/i,
		/buzzfeed\.com/i,
		/huffpost\.com/i,
		/washingtonpost\.com/i,
		/wsj\.com/i,
		/forbes\.com/i,
		/businessinsider\.com/i,
		/insider\.com/i,
		/cnbc\.com/i,
		/foxnews\.com/i,
		/nbcnews\.com/i,
		/abcnews\.go\.com/i,
		/apnews\.com/i,
		/axios\.com/i,
		/politico\.com/i,
		/thehill\.com/i,
		// Ukrainian news
		/pravda\.com\.ua/i,
		/ukrainska-pravda/i,
		/ukr\.net/i,
		/unian\.ua/i,
		/unian\.net/i,
		/obozrevatel\.com/i,
		/tsn\.ua/i,
		/korrespondent\.net/i,
		/liga\.net/i,
		/nv\.ua/i,
		/espreso\.tv/i,
		/hromadske\.ua/i,
		/zn\.ua/i,
		/detector\.media/i,
		/babel\.ua/i,
		/focus\.ua/i,
		/gazeta\.ua/i,
		/censor\.net/i,
		/24tv\.ua/i,
		/segodnya\.ua/i,
		/ukrinform\.ua/i,
		/interfax\.com\.ua/i,
		/rbc\.ua/i,
		/epravda\.com\.ua/i,
		// Tech news sites
		/thenextweb\.com/i,
		/zdnet\.com/i,
		/cnet\.com/i,
		/venturebeat\.com/i,
		/thenewstack\.io/i,
		/infoq\.com/i,
		/sdtimes\.com/i,
		/theregister\.com/i,
		/hackernoon\.com/i,
		/dzone\.com/i,
		/infoworld\.com/i,
		/techradar\.com/i,
		/9to5mac\.com/i,
		/9to5google\.com/i,
		/androidcentral\.com/i,
		/macrumors\.com/i,
		/appleinsider\.com/i,
		/bleepingcomputer\.com/i,
		/thehackernews\.com/i,
		/darkreading\.com/i,
		/krebsonsecurity\.com/i,
		/securityweek\.com/i,
		/tomshardware\.com/i,
		/anandtech\.com/i,
		/howtogeek\.com/i,
		/makeuseof\.com/i,
		/digitaltrends\.com/i,
		/pcmag\.com/i,
		/pcworld\.com/i,
		/computerworld\.com/i,
		/techdirt\.com/i,
		/torrentfreak\.com/i,
		/protocol\.com/i,
		/semafor\.com/i,
		/platformer\.news/i,
		/stratechery\.com/i,
		/techmeme\.com/i,
		/changelog\.com/i,
		/daily\.dev/i,
	],
	search: [
		/google\.com(?!\/(?:docs|sheets|drive|calendar|mail|meet))/i,
		/bing\.com/i,
		/duckduckgo\.com/i,
		/yahoo\.com\/search/i,
		/ecosia\.org/i,
		/brave\.com\/search/i,
		/baidu\.com/i,
	],
	russia: [
		/vk\.com/i,
		/vk\.ru/i,
		/vkontakte\.ru/i,
		/ok\.ru/i,
		/odnoklassniki\.ru/i,
		/yandex\./i,
		/ya\.ru/i,
		/mail\.ru/i,
		/rambler\.ru/i,
		/lenta\.ru/i,
		/ria\.ru/i,
		/rbc\.ru/i,
		/tass\.ru/i,
		/rt\.com/i,
		/gazeta\.ru/i,
		/kommersant\.ru/i,
		/vedomosti\.ru/i,
		/interfax\.ru/i,
		/itar-tass\.com/i,
		/sputniknews\.com/i,
		/pravda\.ru/i,
		/aif\.ru/i,
		/kp\.ru/i,
		/mk\.ru/i,
		/rg\.ru/i,
		/iz\.ru/i,
		/life\.ru/i,
		/livejournal\.com/i,
		/pikabu\.ru/i,
		/habr\.com/i,
		/habrahabr\.ru/i,
		/dzen\.ru/i,
		/zen\.yandex/i,
		/rutube\.ru/i,
		/kinopoisk\.ru/i,
		/ivi\.ru/i,
		/okko\.tv/i,
		/avito\.ru/i,
		/ozon\.ru/i,
		/wildberries\.ru/i,
		/lamoda\.ru/i,
		/mvideo\.ru/i,
		/dns-shop\.ru/i,
		/citilink\.ru/i,
		/eldorado\.ru/i,
		/sberbank\.ru/i,
		/tinkoff\.ru/i,
		/vtb\.ru/i,
		/alfabank\.ru/i,
		/gosuslugi\.ru/i,
		/nalog\.ru/i,
		/mos\.ru/i,
		/kremlin\.ru/i,
		/government\.ru/i,
		/duma\.gov\.ru/i,
		/consultant\.ru/i,
		/garant\.ru/i,
		/2gis\.ru/i,
		/auto\.ru/i,
		/drom\.ru/i,
		/cian\.ru/i,
		/domclick\.ru/i,
		/hh\.ru/i,
		/superjob\.ru/i,
		/rabota\.ru/i,
	],
	finance: [
		/paypal\.com/i,
		/stripe\.com/i,
		/square\.com/i,
		/venmo\.com/i,
		/cash\.app/i,
		/zelle\.com/i,
		/revolut\.com/i,
		/wise\.com/i,
		/transferwise\.com/i,
		/n26\.com/i,
		/chime\.com/i,
		/sofi\.com/i,
		/ally\.com/i,
		/marcus\.com/i,
		/nerdwallet\.com/i,
		/creditkarma\.com/i,
		/mint\.com/i,
		/personalcapital\.com/i,
		/ynab\.com/i,
		/experian\.com/i,
		/equifax\.com/i,
		/transunion\.com/i,
		/annualcreditreport\.com/i,
		// Ukrainian banks
		/privatbank\.ua/i,
		/privat24\.ua/i,
		/monobank\.ua/i,
		/oschadbank\.ua/i,
		/pumb\.ua/i,
		/ukrsibbank\.com/i,
		/raiffeisen\.ua/i,
		/alfabank\.ua/i,
		/abank\.ua/i,
		/ibox\.bank/i,
		/sportbank\.ua/i,
		/sense\.privatbank/i,
		// Crypto
		/binance\.com/i,
		/binance\.us/i,
		/coinbase\.com/i,
		/kraken\.com/i,
		/gemini\.com/i,
		/crypto\.com/i,
		/kucoin\.com/i,
		/ftx\.com/i,
		/bybit\.com/i,
		/okx\.com/i,
		/huobi\.com/i,
		/gate\.io/i,
		/bitfinex\.com/i,
		/bitstamp\.net/i,
		/blockchain\.com/i,
		/metamask\.io/i,
		/phantom\.app/i,
		/trust\.wallet/i,
		/ledger\.com/i,
		/trezor\.io/i,
		/uniswap\.org/i,
		/pancakeswap\.finance/i,
		/opensea\.io/i,
		/rarible\.com/i,
		/coingecko\.com/i,
		/coinmarketcap\.com/i,
		/etherscan\.io/i,
		/bscscan\.com/i,
		/polygonscan\.com/i,
		/solscan\.io/i,
		// Trading & investing
		/tradingview\.com/i,
		/investing\.com/i,
		/finance\.yahoo/i,
		/marketwatch\.com/i,
		/seekingalpha\.com/i,
		/fool\.com/i,
		/morningstar\.com/i,
		/zacks\.com/i,
		/barrons\.com/i,
		/robinhood\.com/i,
		/etoro\.com/i,
		/webull\.com/i,
		/fidelity\.com/i,
		/schwab\.com/i,
		/tdameritrade\.com/i,
		/etrade\.com/i,
		/vanguard\.com/i,
		/interactivebrokers\.com/i,
		/degiro\.com/i,
		/trading212\.com/i,
		/plus500\.com/i,
		/xtb\.com/i,
		/oanda\.com/i,
		/ig\.com/i,
		/cmegroup\.com/i,
		/nasdaq\.com/i,
		/nyse\.com/i,
		// Additional finance/investment sites
		/ft\.com/i,
		/kiplinger\.com/i,
		/investopedia\.com/i,
		/benzinga\.com/i,
		/thestreet\.com/i,
		/stocktwits\.com/i,
		/finviz\.com/i,
		/crunchbase\.com/i,
		/pitchbook\.com/i,
		/cbinsights\.com/i,
		/fortune\.com/i,
		/economist\.com/i,
		/institutionalinvestor\.com/i,
		/hedgeweek\.com/i,
		/privateequitywire\.com/i,
		/preqin\.com/i,
		/dealogic\.com/i,
		/refinitiv\.com/i,
		/spglobal\.com/i,
		/moodys\.com/i,
		/wealthfront\.com/i,
		/betterment\.com/i,
		// Crypto news
		/coindesk\.com/i,
		/cointelegraph\.com/i,
		/decrypt\.co/i,
		/theblock\.co/i,
		/defipulse\.com/i,
		/messari\.io/i,
	],
	education: [
		/wikipedia\.org/i,
		/wikimedia\.org/i,
		/wikibooks\.org/i,
		/wikiversity\.org/i,
		/wiktionary\.org/i,
		/wikiquote\.org/i,
		/wikisource\.org/i,
		/khanacademy\.org/i,
		/duolingo\.com/i,
		/babbel\.com/i,
		/busuu\.com/i,
		/memrise\.com/i,
		/rosettastone\.com/i,
		/italki\.com/i,
		/preply\.com/i,
		/verbling\.com/i,
		/hellotalk\.com/i,
		/tandem\.net/i,
		/quizlet\.com/i,
		/anki\.net/i,
		/ankiweb\.net/i,
		/brainly\.com/i,
		/chegg\.com/i,
		/studocu\.com/i,
		/coursehero\.com/i,
		/sparknotes\.com/i,
		/cliffsnotes\.com/i,
		/shmoop\.com/i,
		/litcharts\.com/i,
		/academia\.edu/i,
		/researchgate\.net/i,
		/scholar\.google/i,
		/semanticscholar\.org/i,
		/arxiv\.org/i,
		/biorxiv\.org/i,
		/medrxiv\.org/i,
		/ssrn\.com/i,
		/jstor\.org/i,
		/springer\.com/i,
		/sciencedirect\.com/i,
		/nature\.com/i,
		/science\.org/i,
		/plos\.org/i,
		/pmc\.ncbi/i,
		/pubmed\.ncbi/i,
		/britannica\.com/i,
		/ted\.com/i,
		/edx\.org/i,
		/coursera\.org/i,
		/udacity\.com/i,
		/masterclass\.com/i,
		/skillshare\.com/i,
		/lynda\.com/i,
		/linkedin\.com\/learning/i,
		/datacamp\.com/i,
		/codecademy\.com/i,
		/treehouse\.com/i,
		/sololearn\.com/i,
		/brilliant\.org/i,
		/openlearn\.com/i,
		/ocw\.mit\.edu/i,
		/class-central\.com/i,
		/alison\.com/i,
		/futurelearn\.com/i,
		/swayam\.gov\.in/i,
		/nptel\.ac\.in/i,
		/open\.edu/i,
		// Coding practice
		/leetcode\.com/i,
		/hackerrank\.com/i,
		/codewars\.com/i,
		/exercism\.org/i,
		/topcoder\.com/i,
		/codeforces\.com/i,
		/atcoder\.jp/i,
		/codingame\.com/i,
		/coderbyte\.com/i,
		/interviewbit\.com/i,
		/pramp\.com/i,
		/algoexpert\.io/i,
		/neetcode\.io/i,
		/geeksforgeeks\.org/i,
		/programiz\.com/i,
		/tutorialspoint\.com/i,
		/javatpoint\.com/i,
		/realpython\.com/i,
		/python\.org/i,
		/docs\.python/i,
		/javascript\.info/i,
		/typescript\.org/i,
		/typescriptlang\.org/i,
		/react\.dev/i,
		/vuejs\.org/i,
		/angular\.io/i,
		/svelte\.dev/i,
		/nextjs\.org/i,
		/nuxt\.com/i,
		/astro\.build/i,
		/tailwindcss\.com/i,
		/getbootstrap\.com/i,
		/sass-lang\.com/i,
		/nodejs\.org/i,
		/expressjs\.com/i,
		/fastify\.dev/i,
		/nestjs\.com/i,
		/djangoproject\.com/i,
		/flask\.palletsprojects/i,
		/rubyonrails\.org/i,
		/laravel\.com/i,
		/symfony\.com/i,
		/spring\.io/i,
		/dotnet\.microsoft/i,
		/rust-lang\.org/i,
		/go\.dev/i,
		/elixir-lang\.org/i,
		/kotlinlang\.org/i,
		/scala-lang\.org/i,
		/haskell\.org/i,
		/clojure\.org/i,
		/erlang\.org/i,
		/julia\.org/i,
	],
	ai: [
		/chat\.openai\.com/i,
		/openai\.com/i,
		/chatgpt\.com/i,
		/claude\.ai/i,
		/anthropic\.com/i,
		/bard\.google/i,
		/gemini\.google/i,
		/aistudio\.google/i,
		/perplexity\.ai/i,
		/midjourney\.com/i,
		/stability\.ai/i,
		/stablediffusionweb\.com/i,
		/dreamstudio\.ai/i,
		/leonardo\.ai/i,
		/runwayml\.com/i,
		/pika\.art/i,
		/kaiber\.ai/i,
		/huggingface\.co/i,
		/replicate\.com/i,
		/together\.ai/i,
		/anyscale\.com/i,
		/modal\.com/i,
		/poe\.com/i,
		/character\.ai/i,
		/chai\.ml/i,
		/janitorai\.com/i,
		/crushon\.ai/i,
		/copilot\.microsoft/i,
		/github\.com\/copilot/i,
		/github\.copilot/i,
		/you\.com/i,
		/phind\.com/i,
		/sourcegraph\.com\/cody/i,
		/cursor\.sh/i,
		/cursor\.com/i,
		/codeium\.com/i,
		/tabnine\.com/i,
		/replit\.com\/ai/i,
		/amazon\.com\/codewhisperer/i,
		/codewhisperer\.aws/i,
		/sourcery\.ai/i,
		/pieces\.app/i,
		/jasper\.ai/i,
		/copy\.ai/i,
		/writesonic\.com/i,
		/rytr\.me/i,
		/anyword\.com/i,
		/wordtune\.com/i,
		/quillbot\.com/i,
		/notion\.so\/ai/i,
		/canva\.com\/ai/i,
		/adobe\.com\/firefly/i,
		/firefly\.adobe/i,
		/clipdrop\.co/i,
		/remove\.bg/i,
		/photoroom\.com/i,
		/lensa\.ai/i,
		/tome\.app/i,
		/gamma\.app/i,
		/beautiful\.ai/i,
		/slidesai\.io/i,
		/synthesia\.io/i,
		/heygen\.com/i,
		/d-id\.com/i,
		/elevenlabs\.io/i,
		/murf\.ai/i,
		/play\.ht/i,
		/resemble\.ai/i,
		/uberduck\.ai/i,
		/descript\.com/i,
		/assemblyai\.com/i,
		/whisper\.ai/i,
		/otter\.ai/i,
		/krisp\.ai/i,
		/fathom\.video/i,
		/fireflies\.ai/i,
		/suno\.ai/i,
		/soundraw\.io/i,
		/aiva\.ai/i,
		/amper\.ai/i,
		/boomy\.com/i,
		/lalal\.ai/i,
		/moises\.ai/i,
		/labs\.google/i,
		/deepmind\.com/i,
		/ai\.meta\.com/i,
		/llama\.meta\.com/i,
		/inflection\.ai/i,
		/pi\.ai/i,
		/cohere\.ai/i,
		/cohere\.com/i,
		/ai21\.com/i,
		/aleph-alpha\.com/i,
		/mistral\.ai/i,
		/groq\.com/i,
		/ollama\.ai/i,
		/lmstudio\.ai/i,
		/gpt4all\.io/i,
		/jan\.ai/i,
		/localai\.io/i,
		/koboldai\.com/i,
		/oobabooga/i,
		/text-generation-webui/i,
	],
	travel: [
		/booking\.com/i,
		/airbnb\.com/i,
		/tripadvisor\.com/i,
		/expedia\.com/i,
		/kayak\.com/i,
		/skyscanner\.com/i,
		/hotels\.com/i,
		/agoda\.com/i,
		/trivago\.com/i,
		/google\.com\/travel/i,
		/google\.com\/flights/i,
		/google\.com\/maps/i,
		/maps\.google/i,
		/waze\.com/i,
		/uber\.com/i,
		/lyft\.com/i,
		/bolt\.eu/i,
		/uklon\.com/i,
		/flixbus\.com/i,
		/ryanair\.com/i,
		/easyjet\.com/i,
		/lufthansa\.com/i,
		/klm\.com/i,
		/united\.com/i,
		/delta\.com/i,
		/southwest\.com/i,
		/aa\.com/i,
		/flightradar24\.com/i,
		/rome2rio\.com/i,
		/hostelworld\.com/i,
		/couchsurfing\.com/i,
		/viator\.com/i,
		/getyourguide\.com/i,
		/lonelyplanet\.com/i,
		// Ukrainian travel
		/tickets\.ua/i,
		/proizd\.ua/i,
		/bus\.com\.ua/i,
		/infobus\.eu/i,
		/uz\.gov\.ua/i,
	],
	food: [
		/ubereats\.com/i,
		/doordash\.com/i,
		/grubhub\.com/i,
		/postmates\.com/i,
		/deliveroo\.com/i,
		/justeat\./i,
		/seamless\.com/i,
		/yelp\.com/i,
		/opentable\.com/i,
		/zomato\.com/i,
		/swiggy\.com/i,
		/foodpanda\./i,
		/allrecipes\.com/i,
		/tasty\.co/i,
		/epicurious\.com/i,
		/seriouseats\.com/i,
		/bonappetit\.com/i,
		/food\.com/i,
		/delish\.com/i,
		/cookpad\.com/i,
		/yummly\.com/i,
		/hellofresh\.com/i,
		/blueapron\.com/i,
		// Ukrainian food delivery
		/glovo\.com/i,
		/raketa\.app/i,
		/silpo\.ua/i,
		/novus\.ua/i,
		/zakaz\.ua/i,
		/food\.bolt/i,
		/boltfood\.com/i,
	],
	health: [
		/webmd\.com/i,
		/mayoclinic\.org/i,
		/healthline\.com/i,
		/medlineplus\.gov/i,
		/nih\.gov/i,
		/cdc\.gov/i,
		/who\.int/i,
		/drugs\.com/i,
		/rxlist\.com/i,
		/everydayhealth\.com/i,
		/verywellhealth\.com/i,
		/medicalnewstoday\.com/i,
		/patient\.info/i,
		/nhs\.uk/i,
		/fitbit\.com/i,
		/myfitnesspal\.com/i,
		/strava\.com/i,
		/runkeeper\.com/i,
		/headspace\.com/i,
		/calm\.com/i,
		/peloton\.com/i,
		/nike\.com\/run/i,
		/garmin\.com/i,
		/zocdoc\.com/i,
		/teladoc\.com/i,
	],
	cloud: [
		/dropbox\.com/i,
		/box\.com/i,
		/icloud\.com/i,
		/onedrive\.live/i,
		/onedrive\.com/i,
		/wetransfer\.com/i,
		/mega\.nz/i,
		/mediafire\.com/i,
		/sendspace\.com/i,
		/pcloud\.com/i,
		/sync\.com/i,
		/backblaze\.com/i,
		/carbonite\.com/i,
		/crashplan\.com/i,
		/idrive\.com/i,
		/spideroak\.com/i,
		/nextcloud\./i,
		/owncloud\./i,
	],
	reference: [
		/dictionary\.com/i,
		/thesaurus\.com/i,
		/merriam-webster\.com/i,
		/oxforddictionaries\.com/i,
		/cambridge\.org\/dictionary/i,
		/wordreference\.com/i,
		/translate\.google/i,
		/deepl\.com/i,
		/linguee\.com/i,
		/reverso\.net/i,
		/forvo\.com/i,
		/howjsay\.com/i,
		/urbandictionary\.com/i,
		/abbreviations\.com/i,
		/acronymfinder\.com/i,
		/timeanddate\.com/i,
		/worldtimebuddy\.com/i,
		/xe\.com/i,
		/oanda\.com/i,
		/convertunits\.com/i,
		/calculator\.net/i,
		/wolframalpha\.com/i,
		/symbolab\.com/i,
		/desmos\.com/i,
		/geogebra\.org/i,
		/archive\.org/i,
		/gutenberg\.org/i,
		/libgen\./i,
		/zlibrary\./i,
		/sci-hub\./i,
	],
	communication: [
		/skype\.com/i,
		/viber\.com/i,
		/signal\.org/i,
		/element\.io/i,
		/matrix\.org/i,
		/rocket\.chat/i,
		/mattermost\.com/i,
		/webex\.com/i,
		/gotomeeting\.com/i,
		/whereby\.com/i,
		/jitsi\./i,
		/loom\.com/i,
		/calendly\.com/i,
		/doodle\.com/i,
		/icalendar\.com/i,
		/mailchimp\.com/i,
		/sendgrid\.com/i,
		/constantcontact\.com/i,
		/hubspot\.com/i,
		/zendesk\.com/i,
		/intercom\.com/i,
		/freshdesk\.com/i,
		/crisp\.chat/i,
		/tawk\.to/i,
		/drift\.com/i,
	],
	productivity: [
		/todoist\.com/i,
		/ticktick\.com/i,
		/any\.do/i,
		/wunderlist\.com/i,
		/remember-the-milk/i,
		/evernote\.com/i,
		/onenote\.com/i,
		/bear\.app/i,
		/notability\.com/i,
		/goodnotes\.com/i,
		/roamresearch\.com/i,
		/obsidian\.md/i,
		/logseq\.com/i,
		/craft\.do/i,
		/coda\.io/i,
		/airtable\.com/i,
		/basecamp\.com/i,
		/clickup\.com/i,
		/wrike\.com/i,
		/teamwork\.com/i,
		/smartsheet\.com/i,
		/lucidchart\.com/i,
		/draw\.io/i,
		/diagrams\.net/i,
		/whimsical\.com/i,
		/excalidraw\.com/i,
		/mindmeister\.com/i,
		/xmind\.net/i,
		/grammarly\.com/i,
		/hemingwayapp\.com/i,
		/prowritingaid\.com/i,
	],
	government: [
		// Ukrainian government
		/gov\.ua/i,
		/diia\.gov\.ua/i,
		/action\.diia/i,
		/e-consul\.gov\.ua/i,
		/mfa\.gov\.ua/i,
		/minjust\.gov\.ua/i,
		/court\.gov\.ua/i,
		/rada\.gov\.ua/i,
		/kmu\.gov\.ua/i,
		/president\.gov\.ua/i,
		/tax\.gov\.ua/i,
		/pfu\.gov\.ua/i,
		/nssmc\.gov\.ua/i,
		/bank\.gov\.ua/i,
		/minregion\.gov\.ua/i,
		/moz\.gov\.ua/i,
		/mon\.gov\.ua/i,
		/mvs\.gov\.ua/i,
		/dpsu\.gov\.ua/i,
		/mvd\.gov\.ua/i,
		/npu\.gov\.ua/i,
		/dsns\.gov\.ua/i,
		/sbu\.gov\.ua/i,
		/mepr\.gov\.ua/i,
		/me\.gov\.ua/i,
		/mev\.gov\.ua/i,
		/msp\.gov\.ua/i,
		/koda\.gov\.ua/i,
		/dasu\.gov\.ua/i,
		/ips\.ligazakon/i,
		/zakon\.rada/i,
		// US government
		/\.gov$/i,
		/usa\.gov/i,
		/whitehouse\.gov/i,
		/congress\.gov/i,
		/senate\.gov/i,
		/house\.gov/i,
		/supremecourt\.gov/i,
		/irs\.gov/i,
		/ssa\.gov/i,
		/state\.gov/i,
		/dhs\.gov/i,
		/fbi\.gov/i,
		/cia\.gov/i,
		/nsa\.gov/i,
		/nasa\.gov/i,
		/noaa\.gov/i,
		/epa\.gov/i,
		/fda\.gov/i,
		/sec\.gov/i,
		/ftc\.gov/i,
		/fcc\.gov/i,
		/usps\.com/i,
		/dmv\./i,
		// UK government
		/gov\.uk/i,
		/parliament\.uk/i,
		/nhs\.uk/i,
		// EU
		/europa\.eu/i,
		/europarl\.europa/i,
		/ec\.europa/i,
		// Other government TLDs
		/\.gov\./i,
		/\.gob\./i,
		/\.gouv\./i,
		/\.govt\./i,
		// International organizations
		/un\.org/i,
		/who\.int/i,
		/imf\.org/i,
		/worldbank\.org/i,
		/wto\.org/i,
		/nato\.int/i,
		/oecd\.org/i,
		/unicef\.org/i,
		/unhcr\.org/i,
		/icrc\.org/i,
		/redcross\.org/i,
		/amnesty\.org/i,
		/hrw\.org/i,
		/greenpeace\.org/i,
		/wwf\.org/i,
	],
	utilities: [
		// URL shorteners
		/bit\.ly/i,
		/tinyurl\.com/i,
		/t\.co/i,
		/goo\.gl/i,
		/ow\.ly/i,
		/is\.gd/i,
		/buff\.ly/i,
		/adf\.ly/i,
		/bl\.ink/i,
		/short\.io/i,
		/rebrand\.ly/i,
		/cutt\.ly/i,
		/shorturl\.at/i,
		/tiny\.cc/i,
		// File sharing
		/sendfiles\.online/i,
		/send\.firefox/i,
		/filemail\.com/i,
		/fromsmash\.com/i,
		/jumpshare\.com/i,
		/ge\.tt/i,
		/hightail\.com/i,
		/filedropper\.com/i,
		/uploadfiles\.io/i,
		/file\.io/i,
		/temp\.sh/i,
		/tempfiles\.ninja/i,
		// Tools & utilities
		/speedtest\.net/i,
		/fast\.com/i,
		/whatismyip\.com/i,
		/whatismyipaddress\.com/i,
		/iplocation\.net/i,
		/browserling\.com/i,
		/browserstack\.com/i,
		/caniuse\.com/i,
		/keycode\.info/i,
		/regexr\.com/i,
		/regex101\.com/i,
		/jsonformatter\.org/i,
		/jsonlint\.com/i,
		/jsbeautifier\.org/i,
		/beautifier\.io/i,
		/minifier\.org/i,
		/base64decode\.org/i,
		/base64encode\.org/i,
		/urlencode\.org/i,
		/urldecoder\.org/i,
		/md5hashgenerator\.com/i,
		/sha256\.online/i,
		/passwordsgenerator\.net/i,
		/random\.org/i,
		/uuidgenerator\.net/i,
		/qrcode-generator\.com/i,
		/qr-code-generator\.com/i,
		/barcode-generator\.org/i,
		/epochconverter\.com/i,
		/timestamp\.online/i,
		/convertio\.co/i,
		/cloudconvert\.com/i,
		/zamzar\.com/i,
		/online-convert\.com/i,
		/freeconvert\.com/i,
		/ilovepdf\.com/i,
		/smallpdf\.com/i,
		/pdf2go\.com/i,
		/sejda\.com/i,
		/tinypng\.com/i,
		/compressjpeg\.com/i,
		/imagecompressor\.com/i,
		/squoosh\.app/i,
		/imageoptim\.com/i,
		/removebg\.com/i,
		/photopea\.com/i,
		/pixlr\.com/i,
		/fotor\.com/i,
		/befunky\.com/i,
		/screenshotmachine\.com/i,
		/web\.archive/i,
		/cachedview\.com/i,
		/downforeveryoneorjustme\.com/i,
		/isitdownrightnow\.com/i,
		/virustotal\.com/i,
		/haveibeenpwned\.com/i,
		/shodan\.io/i,
		/whois\.com/i,
		/who\.is/i,
		/dnswatch\.info/i,
		/mxtoolbox\.com/i,
		/ssllabs\.com/i,
		/builtwith\.com/i,
		/wappalyzer\.com/i,
		/similarweb\.com/i,
		/alexa\.com/i,
		/semrush\.com/i,
		/ahrefs\.com/i,
		/moz\.com/i,
		/majestic\.com/i,
		/gtmetrix\.com/i,
		/pagespeed\.web\.dev/i,
		/webpagetest\.org/i,
		/pingdom\.com/i,
		/uptimerobot\.com/i,
		/statuspage\.io/i,
	],
	design: [
		/dribbble\.com/i,
		/behance\.net/i,
		/deviantart\.com/i,
		/artstation\.com/i,
		/awwwards\.com/i,
		/cssdesignawards\.com/i,
		/siteinspire\.com/i,
		/lapa\.ninja/i,
		/landingfolio\.com/i,
		/onepagelove\.com/i,
		/mobbin\.com/i,
		/screenlane\.com/i,
		/uxarchive\.com/i,
		/collectui\.com/i,
		/uigarage\.net/i,
		/pttrns\.com/i,
		/scrnshts\.club/i,
		/godly\.website/i,
		/httpster\.net/i,
		/cssmania\.com/i,
		/fontpair\.co/i,
		/fontjoy\.com/i,
		/fonts\.google/i,
		/fonts\.adobe/i,
		/fontsquirrel\.com/i,
		/dafont\.com/i,
		/1001fonts\.com/i,
		/fontspace\.com/i,
		/myfonts\.com/i,
		/typewolf\.com/i,
		/fontsinuse\.com/i,
		/typehunting\.com/i,
		/coolors\.co/i,
		/colorhunt\.co/i,
		/color\.adobe/i,
		/colorsinspo\.com/i,
		/paletton\.com/i,
		/colourlovers\.com/i,
		/colorleap\.app/i,
		/palettegenerator\.com/i,
		/flatuicolors\.com/i,
		/materialpalette\.com/i,
		/uigradients\.com/i,
		/cssgradient\.io/i,
		/webgradients\.com/i,
		/grabient\.com/i,
		/unsplash\.com/i,
		/pexels\.com/i,
		/pixabay\.com/i,
		/stocksnap\.io/i,
		/kaboompics\.com/i,
		/burst\.shopify/i,
		/reshot\.com/i,
		/freepik\.com/i,
		/flaticon\.com/i,
		/iconmonstr\.com/i,
		/iconfinder\.com/i,
		/icons8\.com/i,
		/thenounproject\.com/i,
		/heroicons\.com/i,
		/feathericons\.com/i,
		/fontawesome\.com/i,
		/iconify\.design/i,
		/lordicon\.com/i,
		/lottiefiles\.com/i,
		/svgrepo\.com/i,
		/undraw\.co/i,
		/drawkit\.io/i,
		/humaaans\.com/i,
		/openpeeps\.com/i,
		/storyset\.com/i,
		/blush\.design/i,
		/isometric\.online/i,
		/shapefest\.com/i,
		/blobmaker\.app/i,
		/getwaves\.io/i,
		/haikei\.app/i,
		/fffuel\.co/i,
		/patternpad\.com/i,
		/heropatterns\.com/i,
		/patternico\.com/i,
		/svgbackgrounds\.com/i,
		/magicpattern\.design/i,
		/sketch\.com/i,
		/invisionapp\.com/i,
		/zeplin\.io/i,
		/abstract\.com/i,
		/framer\.com/i,
		/principle\.app/i,
		/protopie\.io/i,
		/origami\.design/i,
		/marvelapp\.com/i,
		/uxpin\.com/i,
		/axure\.com/i,
		/balsamiq\.com/i,
		/mockflow\.com/i,
		/wireframe\.cc/i,
		/uizard\.io/i,
		/webflow\.com/i,
		/wix\.com/i,
		/squarespace\.com/i,
		/weebly\.com/i,
		/wordpress\.com/i,
		/wordpress\.org/i,
		/elementor\.com/i,
		/divi\.com/i,
		/tilda\.cc/i,
		/readymag\.com/i,
		/carrd\.co/i,
		/cargo\.site/i,
		/format\.com/i,
		/notion\.site/i,
		/super\.so/i,
		/typedream\.com/i,
		/mmm\.page/i,
		/versoly\.com/i,
	],
	podcast: [
		/podcasts\.apple/i,
		/podcasts\.google/i,
		/open\.spotify\.com\/show/i,
		/pocketcasts\.com/i,
		/overcast\.fm/i,
		/castro\.fm/i,
		/castbox\.fm/i,
		/stitcher\.com/i,
		/podbean\.com/i,
		/buzzsprout\.com/i,
		/anchor\.fm/i,
		/spreaker\.com/i,
		/simplecast\.com/i,
		/transistor\.fm/i,
		/libsyn\.com/i,
		/megaphone\.fm/i,
		/acast\.com/i,
		/podtrac\.com/i,
		/chartable\.com/i,
		/podchaser\.com/i,
		/listennotes\.com/i,
		/player\.fm/i,
		/podcast\.app/i,
		/podcastaddict\.com/i,
		/radiopublic\.com/i,
		/podfriend\.com/i,
		/podcastindex\.org/i,
		/fountain\.fm/i,
	],
	realestate: [
		/zillow\.com/i,
		/realtor\.com/i,
		/redfin\.com/i,
		/trulia\.com/i,
		/apartments\.com/i,
		/rent\.com/i,
		/hotpads\.com/i,
		/streeteasy\.com/i,
		/rightmove\.co\.uk/i,
		/zoopla\.co\.uk/i,
		/immobilienscout24\.de/i,
		/idealista\.com/i,
		/seloger\.com/i,
		/immoweb\.be/i,
		/funda\.nl/i,
		// Ukrainian real estate
		/dom\.ria\.com/i,
		/lun\.ua/i,
		/flatfy\.ua/i,
		/rieltor\.ua/i,
		/100realty\.ua/i,
		/address\.ua/i,
		/bird\.ua/i,
		/novostroyki\.lun\.ua/i,
	],
	jobs: [
		/indeed\.com/i,
		/glassdoor\.com/i,
		/monster\.com/i,
		/careerbuilder\.com/i,
		/ziprecruiter\.com/i,
		/dice\.com/i,
		/simplyhired\.com/i,
		/snagajob\.com/i,
		/flexjobs\.com/i,
		/wellfound\.com/i,
		/angel\.co\/jobs/i,
		/weworkremotely\.com/i,
		/remoteok\.com/i,
		/remote\.co/i,
		/justremote\.co/i,
		/workingnomads\.com/i,
		/himalayas\.app/i,
		/nodesk\.co/i,
		/hired\.com/i,
		/triplebyte\.com/i,
		/otta\.com/i,
		/levels\.fyi/i,
		/teamblind\.com/i,
		/blind\.com/i,
		/linkedin\.com\/jobs/i,
		// Ukrainian jobs
		/work\.ua/i,
		/rabota\.ua/i,
		/dou\.ua\/jobs/i,
		/djinni\.co/i,
		/jobs\.dou\.ua/i,
		/grc\.ua/i,
		/jooble\.org/i,
	],
	dating: [
		/tinder\.com/i,
		/bumble\.com/i,
		/hinge\.co/i,
		/match\.com/i,
		/okcupid\.com/i,
		/pof\.com/i,
		/eharmony\.com/i,
		/zoosk\.com/i,
		/badoo\.com/i,
		/happn\.com/i,
		/coffeemeetsbagel\.com/i,
		/ship\.com/i,
		/theinner\.circle/i,
		/raya\.app/i,
		/feeld\.co/i,
		/grindr\.com/i,
		/taimi\.com/i,
		/her\.app/i,
		/lex\.app/i,
		/scruff\.com/i,
		/blk\.app/i,
		/chispa\.app/i,
		/jswipe\.com/i,
		/christian-mingle\.com/i,
		/elitesingles\.com/i,
		/silversingles\.com/i,
		/ourtime\.com/i,
	],
	sports: [
		/espn\.com/i,
		/sports\.yahoo/i,
		/bleacherreport\.com/i,
		/cbssports\.com/i,
		/nbcsports\.com/i,
		/foxsports\.com/i,
		/si\.com/i,
		/theathletic\.com/i,
		/thescore\.com/i,
		/sportingnews\.com/i,
		/skysports\.com/i,
		/bbc\.com\/sport/i,
		/eurosport\.com/i,
		/goal\.com/i,
		/transfermarkt\.com/i,
		/whoscored\.com/i,
		/soccerway\.com/i,
		/flashscore\.com/i,
		/sofascore\.com/i,
		/livescore\.com/i,
		/365scores\.com/i,
		/nfl\.com/i,
		/nba\.com/i,
		/mlb\.com/i,
		/nhl\.com/i,
		/mls\.com/i,
		/premierleague\.com/i,
		/laliga\.com/i,
		/bundesliga\.com/i,
		/seriea\.com/i,
		/ligue1\.com/i,
		/uefa\.com/i,
		/fifa\.com/i,
		/f1\.com/i,
		/formula1\.com/i,
		/motogp\.com/i,
		/wwe\.com/i,
		/ufc\.com/i,
		/boxingscene\.com/i,
		/pgatour\.com/i,
		/atptour\.com/i,
		/wtatennis\.com/i,
		// Ukrainian sports
		/tribuna\.com/i,
		/football\.ua/i,
		/sport\.ua/i,
		/isport\.ua/i,
		/ua-football\.com/i,
		/footboom\.com/i,
	],
	weather: [
		/weather\.com/i,
		/accuweather\.com/i,
		/wunderground\.com/i,
		/weather\.gov/i,
		/windy\.com/i,
		/windy\.app/i,
		/weatherspark\.com/i,
		/meteoblue\.com/i,
		/yr\.no/i,
		/openweathermap\.org/i,
		/darksky\.net/i,
		/ventusky\.com/i,
		/weatherbug\.com/i,
		/theweathernetwork\.com/i,
		/foreca\.com/i,
		/metoffice\.gov\.uk/i,
		// Ukrainian weather
		/sinoptik\.ua/i,
		/meteo\.ua/i,
		/pogoda\.ua/i,
		/gismeteo\.ua/i,
		/rp5\.ua/i,
	],
	automotive: [
		/cars\.com/i,
		/autotrader\.com/i,
		/cargurus\.com/i,
		/carfax\.com/i,
		/kbb\.com/i,
		/edmunds\.com/i,
		/truecar\.com/i,
		/caranddriver\.com/i,
		/motortrend\.com/i,
		/roadandtrack\.com/i,
		/autoblog\.com/i,
		/jalopnik\.com/i,
		/thedrive\.com/i,
		/carwow\.co\.uk/i,
		/autocar\.co\.uk/i,
		/topgear\.com/i,
		/carthrottle\.com/i,
		/bringatrailer\.com/i,
		/carsandbids\.com/i,
		/copart\.com/i,
		/iaai\.com/i,
		/tesla\.com/i,
		/rivian\.com/i,
		/lucidmotors\.com/i,
		/ford\.com/i,
		/chevrolet\.com/i,
		/toyota\.com/i,
		/honda\.com/i,
		/bmw\.com/i,
		/mercedes-benz\.com/i,
		/audi\.com/i,
		/porsche\.com/i,
		// Ukrainian automotive
		/auto\.ria\.com/i,
		/rst\.ua/i,
		/autoria\.com/i,
		/avtobazar\.ua/i,
		/infocar\.ua/i,
		/autocentre\.ua/i,
	],
	legal: [
		/avvo\.com/i,
		/findlaw\.com/i,
		/justia\.com/i,
		/nolo\.com/i,
		/legalzoom\.com/i,
		/rocketlawyer\.com/i,
		/lawdepot\.com/i,
		/uslegal\.com/i,
		/law\.cornell\.edu/i,
		/oyez\.org/i,
		/casetext\.com/i,
		/courtlistener\.com/i,
		/lexisnexis\.com/i,
		/westlaw\.com/i,
		/pacer\.uscourts\.gov/i,
		/law360\.com/i,
		/above-the-law\.com/i,
		/lawfare\.blog/i,
		// Ukrainian legal
		/ligazakon\.net/i,
		/zakon\.rada\.gov\.ua/i,
		/court\.gov\.ua/i,
		/reyestr\.court\.gov\.ua/i,
		/protocol\.ua/i,
		/pravotv\.gov\.ua/i,
		/vkursi\.pro/i,
		/youcontrol\.com\.ua/i,
		/opendatabot\.ua/i,
	],
	hosting: [
		/godaddy\.com/i,
		/namecheap\.com/i,
		/cloudflare\.com/i,
		/bluehost\.com/i,
		/hostgator\.com/i,
		/siteground\.com/i,
		/dreamhost\.com/i,
		/hostinger\.com/i,
		/a2hosting\.com/i,
		/inmotionhosting\.com/i,
		/greengeeks\.com/i,
		/liquidweb\.com/i,
		/wpengine\.com/i,
		/kinsta\.com/i,
		/flywheel\.com/i,
		/pressable\.com/i,
		/pantheon\.io/i,
		/acquia\.com/i,
		/platform\.sh/i,
		/ionos\.com/i,
		/ovh\.com/i,
		/hetzner\.com/i,
		/linode\.com/i,
		/vultr\.com/i,
		/scaleway\.com/i,
		/upcloud\.com/i,
		/contabo\.com/i,
		/domain\.com/i,
		/hover\.com/i,
		/porkbun\.com/i,
		/gandi\.net/i,
		/dynadot\.com/i,
		/epik\.com/i,
		/name\.com/i,
		/enom\.com/i,
		// Ukrainian hosting
		/nic\.ua/i,
		/ukraine\.com\.ua/i,
		/hostiq\.ua/i,
		/cityhost\.ua/i,
		/freehost\.com\.ua/i,
		/tuthost\.ua/i,
		/parkovka\.ua/i,
	],
	forums: [
		/4chan\.org/i,
		/4channel\.org/i,
		/8kun\.top/i,
		/somethingawful\.com/i,
		/kiwifarms\.net/i,
		/bodybuilding\.com\/forum/i,
		/xda-developers\.com/i,
		/avsforum\.com/i,
		/head-fi\.org/i,
		/overclock\.net/i,
		/tom-hardware\.com\/forum/i,
		/anandtech\.com\/forum/i,
		/whirlpool\.net\.au/i,
		/hardwarezone\.com\.sg/i,
		/tigsource\.com/i,
		/rpgcodex\.net/i,
		/fark\.com/i,
		/metafilter\.com/i,
		/dpreview\.com\/forums/i,
		/fred-miranda\.com/i,
		/thephotoforum\.com/i,
		/talkbass\.com/i,
		/gearslutz\.com/i,
		/kvraudio\.com\/forum/i,
		/vi-control\.net/i,
		/vwvortex\.com/i,
		/bimmerpost\.com/i,
		/rennlist\.com/i,
		/mbworld\.org/i,
		/audiworld\.com/i,
		/myfishingforum\.com/i,
		/flyertalk\.com/i,
		// Ukrainian forums
		/forum\.lvivport\.com/i,
		/4mama\.ua/i,
		/ukrainianforum\.com/i,
	],
	streaming: [
		/obs\.com/i,
		/obsproject\.com/i,
		/streamlabs\.com/i,
		/streamelements\.com/i,
		/restream\.io/i,
		/lightstream\.com/i,
		/xsplit\.com/i,
		/wirecast\.com/i,
		/vmix\.com/i,
		/ecamm\.com/i,
		/castr\.io/i,
		/stream\.me/i,
		/twitchalerts\.com/i,
		/nightbot\.tv/i,
		/streamdeckplugins\.com/i,
		/own3d\.tv/i,
		/overlay\.expert/i,
		/nerdordie\.com/i,
		/visuals\.by\.impulse/i,
		/twitchinsights\.net/i,
		/sullygnome\.com/i,
		/twitchtracker\.com/i,
		/streamscharts\.com/i,
	],
	modeling3d: [
		/blender\.org/i,
		/autodesk\.com/i,
		/sketchup\.com/i,
		/tinkercad\.com/i,
		/fusion360\.autodesk/i,
		/onshape\.com/i,
		/shapr3d\.com/i,
		/rhino3d\.com/i,
		/solidworks\.com/i,
		/ptc\.com\/creo/i,
		/siemens\.com\/nx/i,
		/daz3d\.com/i,
		/zbrush\.com/i,
		/pixologic\.com/i,
		/maxon\.net/i,
		/cinema4d\.com/i,
		/houdini\.com/i,
		/sidefx\.com/i,
		/unrealengine\.com/i,
		/unity\.com/i,
		/godotengine\.org/i,
		/marvelousdesigner\.com/i,
		/substance3d\.adobe/i,
		/quixel\.com/i,
		/sketchfab\.com/i,
		/turbosquid\.com/i,
		/cgtrader\.com/i,
		/blendermarket\.com/i,
		/artstation\.com\/marketplace/i,
		/kitbash3d\.com/i,
		/grabcad\.com/i,
		/thangs\.com/i,
		/myminifactory\.com/i,
		/printables\.com/i,
		/thingiverse\.com/i,
		/cults3d\.com/i,
	],
	security: [
		// VPN services
		/nordvpn\.com/i,
		/expressvpn\.com/i,
		/surfshark\.com/i,
		/protonvpn\.com/i,
		/mullvad\.net/i,
		/privateinternetaccess\.com/i,
		/cyberghostvpn\.com/i,
		/ipvanish\.com/i,
		/windscribe\.com/i,
		/tunnelbear\.com/i,
		/hidemyass\.com/i,
		/vyprvpn\.com/i,
		// Security tools
		/1password\.com/i,
		/lastpass\.com/i,
		/bitwarden\.com/i,
		/dashlane\.com/i,
		/keeper\.com/i,
		/nordpass\.com/i,
		/authy\.com/i,
		/yubico\.com/i,
		// Antivirus
		/norton\.com/i,
		/mcafee\.com/i,
		/kaspersky\.com/i,
		/bitdefender\.com/i,
		/avast\.com/i,
		/avg\.com/i,
		/malwarebytes\.com/i,
		/eset\.com/i,
		/sophos\.com/i,
		/trendmicro\.com/i,
		/f-secure\.com/i,
		/avira\.com/i,
		// Security research
		/exploit-db\.com/i,
		/cve\.mitre\.org/i,
		/nvd\.nist\.gov/i,
		/owasp\.org/i,
		/sans\.org/i,
		/offensive-security\.com/i,
		/hackthebox\.com/i,
		/tryhackme\.com/i,
		/pentesterlab\.com/i,
		/portswigger\.net/i,
		/burpsuite\.net/i,
		/metasploit\.com/i,
		/nmap\.org/i,
		/wireshark\.org/i,
		/snyk\.io/i,
		/sonarqube\.org/i,
		/dependabot\.com/i,
	],
};

const SEARCH_ENGINES = [
	{ name: 'google', host: /(^|\.)google\./i, queryParam: 'q' },
	{ name: 'bing', host: /(^|\.)bing\.com$/i, queryParam: 'q' },
	{ name: 'duckduckgo', host: /(^|\.)duckduckgo\.com$/i, queryParam: 'q' },
	{ name: 'yahoo', host: /(^|\.)search\.yahoo\.com$/i, queryParam: 'p' },
	{ name: 'brave', host: /(^|\.)search\.brave\.com$/i, queryParam: 'q' },
	{ name: 'ecosia', host: /(^|\.)ecosia\.org$/i, queryParam: 'q' },
];

/**
 * URL path patterns for news/blog/article detection
 * These patterns match against the full URL path
 */
const NEWS_PATH_PATTERNS = [
	// Blog patterns
	/\/blog\//i,
	/\/blogs\//i,
	/\/weblog\//i,

	// News patterns
	/\/news\//i,
	/\/news-/i,
	/\/breaking\//i,
	/\/latest\//i,
	/\/headlines\//i,
	/\/press\//i,
	/\/press-release/i,
	/\/media\//i,
	/\/newsroom\//i,

	// Article patterns
	/\/article\//i,
	/\/articles\//i,
	/\/story\//i,
	/\/stories\//i,
	/\/post\//i,
	/\/posts\//i,
	/\/read\//i,

	// Release/Update patterns
	/\/releases\//i,
	/\/release\//i,
	/\/changelog\//i,
	/\/updates\//i,
	/\/update\//i,
	/\/whats-new/i,
	/\/announcements?\//i,

	// Editorial patterns
	/\/editorial\//i,
	/\/opinion\//i,
	/\/perspectives?\//i,
	/\/insights?\//i,
	/\/analysis\//i,
	/\/reports?\//i,
	/\/review\//i,
	/\/reviews\//i,

	// Publication patterns
	/\/publication\//i,
	/\/publications\//i,
	/\/journal\//i,
	/\/magazine\//i,
	/\/digest\//i,

	// Date-based article URLs (common pattern: /2024/01/article-name)
	/\/\d{4}\/\d{1,2}\/[a-z0-9-]+/i,

	// Content type indicators
	/\/content\//i,
	/\/featured\//i,
	/\/trending\//i,
	/\/popular\//i,
	/\/spotlight\//i,

	// Tech/Dev specific
	/\/devblog\//i,
	/\/engineering\//i,
	/\/tech-blog\//i,
	/\/developer-blog\//i,

	// Company blog patterns
	/\/company-news\//i,
	/\/corporate\//i,
	/\/about\/news/i,

	// Newsletter patterns
	/\/newsletter\//i,
	/\/subscribe\//i,
];

/**
 * Check if URL path matches news/blog patterns
 * @param {string} url - Full URL to check
 * @returns {boolean}
 */
function isNewsPath(url) {
	try {
		const urlObj = new URL(url);
		const fullPath = urlObj.pathname + urlObj.search;

		for (const pattern of NEWS_PATH_PATTERNS) {
			if (pattern.test(fullPath)) {
				return true;
			}
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * Categorize a domain (enhanced with path detection)
 * @param {string} domain - Domain to categorize
 * @param {string} url - Full URL for path-based detection
 * @returns {string} Category name
 */
function categorize(domain, url = '') {
	// Custom rules take priority
	for (const rule of customCategoryRules) {
		if (ruleMatches(rule, domain, url)) {
			return rule.category;
		}
	}

	// First check domain-based rules
	for (const [category, patterns] of Object.entries(CATEGORY_RULES)) {
		for (const pattern of patterns) {
			if (pattern.test(domain)) {
				return category;
			}
		}
	}

	// Check URL path for news/blog patterns (for sites not in domain list)
	if (url && isNewsPath(url)) {
		return 'news';
	}

	return 'other';
}

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

function scheduleActiveTimeSave() {
	if (activeTimeSaveTimer) clearTimeout(activeTimeSaveTimer);
	activeTimeSaveTimer = setTimeout(() => {
		chrome.storage.local.set({
			[ACTIVE_TIME_STORAGE_KEY]: activeTimeByDomain,
			[ACTIVE_TIME_TOTAL_KEY]: activeTimeTotal,
			[ACTIVE_TIME_TODAY_KEY]: activeTimeToday,
			[ACTIVE_TIME_DATE_KEY]: activeTimeDate,
		});
	}, 500);
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


function ruleMatches(rule, domain, url) {
	if (!rule || !rule.pattern || !rule.category) return false;
	const pattern = String(rule.pattern).trim();
	if (!pattern) return false;

	const targetDomain = (domain || '').toLowerCase();
	const targetUrl = (url || '').toLowerCase();

	if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2) {
		try {
			const re = new RegExp(pattern.slice(1, -1), 'i');
			return re.test(domain) || (url && re.test(url));
		} catch {
			return false;
		}
	}

	const needle = pattern.toLowerCase();
	return targetDomain.includes(needle) || targetUrl.includes(needle);
}

function loadPersistentState() {
	chrome.storage.local.get(
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
		cachedData = null;
		cacheTimestamp = 0;
		cachedDays = 0;
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
		chrome.storage.local.set({ [CUSTOM_CATEGORY_RULES_KEY]: customCategoryRules }, () => {
			cachedData = null;
			cacheTimestamp = 0;
			cachedDays = 0;
			sendResponse({ success: true });
		});
		return true;
	}
});

// Initial data fetch on install
chrome.runtime.onInstalled.addListener(() => {
	fetchHistoryData(30);
});

loadPersistentState();

chrome.idle.setDetectionInterval(60);

chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
	if (tabs && tabs[0]) {
		activeTabId = tabs[0].id;
		updateActiveDomain(tabs[0]);
	}
});

chrome.tabs.onActivated.addListener((activeInfo) => {
	activeTabId = activeInfo.tabId;
	chrome.tabs.get(activeInfo.tabId, (tab) => {
		updateActiveDomain(tab);
	});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (tabId !== activeTabId) return;
	if (changeInfo.url || changeInfo.status === 'complete') {
		updateActiveDomain(tab);
	}
});

chrome.tabs.onRemoved.addListener((tabId) => {
	if (tabId === activeTabId) {
		stopActiveSession();
		activeTabId = null;
		activeDomain = null;
	}
});

chrome.windows.onFocusChanged.addListener((windowId) => {
	isWindowFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
	if (!isWindowFocused) {
		stopActiveSession();
	} else {
		startActiveSession();
	}
});

chrome.idle.onStateChanged.addListener((state) => {
	idleState = state;
	if (state !== 'active') {
		stopActiveSession();
	} else {
		startActiveSession();
	}
});
