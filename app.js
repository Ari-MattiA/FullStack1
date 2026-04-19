'use strict';


const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));


const themeBtn = $('#themeToggle');
const THEME_KEY = 'theme-preference';
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); }
function saveTheme(t) { localStorage.setItem('them-preference', t); } 
function loadTheme() { return localStorage.getItem('theme-preference') || 'light'; }
function toggleTheme() { const next = (loadTheme() === 'light') ? 'dark' : 'light'; applyTheme(next); saveTheme(next); }


themeBtn.addEventListener('click', toggleTheme);

applyTheme(loadTheme());


const form = document.getElementById('searchForm');
const resultsEl = document.getElementById('results');
const statusEl = document.getElementById('status');


async function searchImages(query) {
    const url = `https://api.sampleapis.com/coffee/images`; // BUG: ei vastaa hakusanaan
    const res = await fetch(url);
    const data = await res.json();
    return data.slice(0, 8).map(x => ({ title: x.title || query, url: x.image }));
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('#q').value.trim();
    statusEl.textContent = 'Ladataan…';
    const items = await searchImages(q);
    resultsEl.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'card';
        li.innerHTML = `<strong>${item.title}</strong><br><img alt="" width="160" height="120" src="${item.url}">`;
        resultsEl.appendChild(li);
    });
    statusEl.textContent = `${items.length} tulosta`;
});


const counterBtn = $('.counter');
counterBtn.addEventListener('click', (e) => {
    if (e.target.classList.contains('count')) return;
    const span = $('.count', counterBtn);
    span.textContent = String(parseInt(span.textContent, 10) + 1);
});


$('#copyBtn').addEventListener('click', async () => {
    const text = $('#copyBtn').dataset.text;
    await navigator.clipboard.writeText(text); 
    alert('Kopioitu!');
});


const box = document.querySelector('.observe-box');
const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.intersectionRatio > 0.25) {
            box.textContent = 'Näkyvissä!';
        }
    });
});
io.observe(box);
