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

// 2) Haku — korjattu: try/catch, AbortController, lataustila, hakusanan suodatus
const form = document.getElementById('searchForm');
const resultsEl = document.getElementById('results');
const statusEl = document.getElementById('status');

let currentController = null;

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

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const q = $('#q').value.trim();

    if (!q) {
        statusEl.textContent = 'Anna hakusana.';
        resultsEl.innerHTML = '';
        return;
    }

    if (currentController) {
        currentController.abort();
    }

    currentController = new AbortController();

    statusEl.textContent = 'Ladataan...';
    resultsEl.innerHTML = '';

    try {
        const items = await searchImages(q, currentController.signal);

        resultsEl.innerHTML = '';

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
});

// 3) Laskuri — virhe: event delegation ja bubbling sekoilee
const counterBtn = $('.counter');
counterBtn.addEventListener('click', (e) => {
    if (e.target.classList.contains('count')) return;
    const span = $('.count', counterBtn);
    span.textContent = String(parseInt(span.textContent, 10) + 1);
});

// 4) Clipboard — virhe: ei permissioiden / https tarkistusta
$('#copyBtn').addEventListener('click', async () => {
    const text = $('#copyBtn').dataset.text;
    await navigator.clipboard.writeText(text);
    alert('Kopioitu!');
});

// 5) IntersectionObserver — virhe: threshold/cleanup puuttuu
const box = document.querySelector('.observe-box');
const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.intersectionRatio > 0.25) {
            box.textContent = 'Näkyvissä!';
        }
    });
});
io.observe(box);