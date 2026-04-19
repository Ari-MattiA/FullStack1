'use strict';

// 0) Pieni apu
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// 1) Teema — korjattu
const themeBtn = $('#themeToggle');
const THEME_KEY = 'theme-preference';

function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
}

function saveTheme(t) {
    localStorage.setItem(THEME_KEY, t);
}

function loadTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
}

function toggleTheme() {
    const next = loadTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    saveTheme(next);
}

themeBtn.addEventListener('click', toggleTheme);
applyTheme(loadTheme());

// 2) Haku — korjattu + URL & History API
const form = document.getElementById('searchForm');
const resultsEl = document.getElementById('results');
const statusEl = document.getElementById('status');
const qInput = document.getElementById('q');

let currentController = null;
let copyFeedbackTimer = null;

function setQueryInUrl(q, mode = 'push') {
    const url = new URL(location.href);

    if (q) {
        url.searchParams.set('q', q);
    } else {
        url.searchParams.delete('q');
    }

    const state = { q };

    if (mode === 'replace') {
        history.replaceState(state, '', url);
    } else {
        history.pushState(state, '', url);
    }
}

function getQueryFromUrl() {
    const url = new URL(location.href);
    return (url.searchParams.get('q') || '').trim();
}

// Coffee http-rajapinnan dokumentaatio: https://sampleapis.com/api-list/coffee
async function searchImages(query, signal) {
    const url = 'https://api.sampleapis.com/coffee/hot';
    const res = await fetch(url, { signal });

    if (!res.ok) {
        throw new Error(`HTTP-virhe: ${res.status}`);
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
        throw new Error('API ei palauttanut taulukkoa.');
    }

    const normalizedQuery = query.toLowerCase();

    const filtered = data.filter(item => {
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        return title.includes(normalizedQuery) || description.includes(normalizedQuery);
    });

    return filtered.slice(0, 8).map(item => ({
        title: item.title || query,
        url: item.image
    }));
}

async function runSearch(q, options = {}) {
    const {
        updateHistory = true,
        historyMode = 'push'
    } = options;

    const trimmedQuery = q.trim();

    if (currentController) {
        currentController.abort();
    }

    resultsEl.innerHTML = '';

    if (!trimmedQuery) {
        statusEl.textContent = 'Anna hakusana.';
        if (updateHistory) {
            setQueryInUrl('', historyMode);
        }
        return;
    }

    qInput.value = trimmedQuery;

    if (updateHistory) {
        setQueryInUrl(trimmedQuery, historyMode);
    }

    currentController = new AbortController();
    statusEl.textContent = 'Ladataan...';

    try {
        const items = await searchImages(trimmedQuery, currentController.signal);

        if (items.length === 0) {
            statusEl.textContent = 'Ei tuloksia.';
            return;
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'card';
            li.innerHTML = `
                <strong>${item.title}</strong><br>
                <img alt="${item.title}" width="160" height="120" src="${item.url}">
            `;
            resultsEl.appendChild(li);
        });

        statusEl.textContent = `${items.length} tulosta`;
    } catch (error) {
        if (error.name === 'AbortError') {
            statusEl.textContent = 'Edellinen haku peruttiin.';
            return;
        }

        console.error('Hakeminen epäonnistui:', error);
        statusEl.textContent = 'Virhe haussa. Yritä uudelleen.';
    } finally {
        currentController = null;
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await runSearch(qInput.value, { updateHistory: true, historyMode: 'push' });
});

window.addEventListener('popstate', async () => {
    const q = getQueryFromUrl();
    qInput.value = q;

    if (!q) {
        if (currentController) {
            currentController.abort();
        }
        resultsEl.innerHTML = '';
        statusEl.textContent = 'Anna hakusana.';
        return;
    }

    await runSearch(q, { updateHistory: false });
});

// alustetaan sivu URL-parametrin perusteella
const initialQuery = getQueryFromUrl();
history.replaceState({ q: initialQuery }, '', location.href);
qInput.value = initialQuery;

if (initialQuery) {
    runSearch(initialQuery, { updateHistory: false });
} else {
    statusEl.textContent = 'Anna hakusana.';
}

// 3) Laskuri — korjattu
const counterBtn = $('.counter');

counterBtn.addEventListener('click', (e) => {
    const button = e.target.closest('button.counter');
    if (!button) return;

    const span = button.querySelector('.count');
    span.textContent = String(Number(span.textContent) + 1);
});

// 4) Clipboard — korjattu
$('#copyBtn').addEventListener('click', async () => {
    const text = $('#copyBtn').dataset.text;
    const isSecureClipboardContext =
        location.protocol === 'https:' || location.hostname === 'localhost';

    if (!isSecureClipboardContext) {
        statusEl.textContent = 'Kopiointi vaatii HTTPS-yhteyden tai localhost-ympäristön.';
        return;
    }

    try {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
            throw new Error('Clipboard API ei ole käytettävissä tässä selaimessa.');
        }

        if (navigator.permissions?.query) {
            const permissionStatus = await navigator.permissions.query({ name: 'clipboard-write' });

            if (permissionStatus.state === 'denied') {
                statusEl.textContent = 'Leikepöydän käyttö on estetty selaimen oikeuksissa.';
                return;
            }
        }

        await navigator.clipboard.writeText(text);

        statusEl.textContent = 'Kopioitu';

        if (copyFeedbackTimer) {
            clearTimeout(copyFeedbackTimer);
        }

        copyFeedbackTimer = setTimeout(() => {
            statusEl.textContent = '';
        }, 2000);
    } catch (error) {
        console.error('Kopiointi epäonnistui:', error);
        statusEl.textContent = 'Kopiointi epäonnistui. Tarkista selaimen oikeudet ja käytä HTTPS-yhteyttä.';
    }
});

// 5) IntersectionObserver — korjattu
const box = document.querySelector('.observe-box');

const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
            box.textContent = 'Näkyvissä!';
            observer.unobserve(entry.target);
            observer.disconnect();
        }
    });
}, {
    threshold: 0.25
});

io.observe(box); 