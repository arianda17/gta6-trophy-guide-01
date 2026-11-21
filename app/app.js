// Vice Trophy Guide — tracker for the 55 official GTA VI PlayStation 5 trophies.
// LocalStorage tracks which trophies are earned; nothing leaves your machine.
// Grades, names, descriptions, guides and sources come from app/data/trophies.json,
// built from the verified research file. Trophy #28 Positive Mental Attitude is the
// only missable one, flagged on the roadmap and on its card.
const KEY = 'gta6-trophy-progress';
const SPOILER_KEY = 'gta6-trophy-spoiler';

const rows = document.getElementById('rows');
const gradeSel = document.getElementById('grade');
const typeSel = document.getElementById('type');
const searchIn = document.getElementById('search');
const spoilerIn = document.getElementById('spoiler');
const pctEl = document.getElementById('progress-pct');
const countEl = document.getElementById('progress-count');
const gradeCountsEl = document.getElementById('grade-counts');
const emptyEl = document.getElementById('empty');

let doc;
let earned = new Set();
let spoilerOn = false;

function loadStored() {
  const raw = localStorage.getItem(KEY);
  earned = raw ? new Set(JSON.parse(raw)) : new Set();
  spoilerOn = JSON.parse(localStorage.getItem(SPOILER_KEY) ?? 'false');
  spoilerIn.checked = spoilerOn;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
  localStorage.setItem(SPOILER_KEY, JSON.stringify(spoilerOn));
}

function gradeCounts(filtered) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const id of earned) {
    const t = doc.trophies.find((x) => String(x.id) === id);
    if (t) counts[t.grade]++;
  }
  const total = doc.trophies.length;
  const earnedTotal = earned.size;
  const pct = total ? Math.round((earnedTotal / total) * 100) : 0;
  pctEl.textContent = pct + '%';
  countEl.textContent = earnedTotal + ' of ' + total + ' earned';
  const parts = [];
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const c = counts[g];
    if (c > 0) parts.push('<span class="grade-' + g + '">' + c + ' ' + g.charAt(0).toUpperCase() + g.slice(1) + '</span>');
  }
  gradeCountsEl.innerHTML = parts.join(' · ');
}

function sourceLinks(t) {
  return '<p class="sources">Sources: ' + t.sources.map((u) => '<a href="' + u + '" target="_blank" rel="noopener">' + u.replace(/^https?:\/\//, '') + '</a>').join(', ') + '</p>';
}

function render() {
  const g = gradeSel.value;
  const ty = typeSel.value;
  const q = searchIn.value.toLowerCase().trim();
  rows.replaceChildren();
  let anyShown = false;
  for (const t of doc.trophies) {
    if (g !== 'all' && t.grade !== g) continue;
    if (ty !== 'all' && t.type !== ty) continue;
    if (q && !((t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q))) continue;
    if (spoilerOn && t.spoiler && !earned.has(String(t.id))) continue;
    anyShown = true;
    const isEarned = earned.has(String(t.id));
    const article = document.createElement('article');
    article.className = 'trophy-card grade-' + t.grade + (isEarned ? ' earned' : '');
    article.id = 't-' + t.id;
    const medal = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' }[t.grade];
    const badge = '<span class="badge grade-' + t.grade + '">' + medal + '</span>';
    const rarity = '<span class="rarity">' + t.rarity_pct + '%</span>';
    const type = '<span class="type">' + t.type + '</span>';
    const title = t.name + (t.spoiler ? ' <span class="spoiler-tag">story spoiler</span>' : '');
    const desc = '<p class="desc">' + t.description + '</p>';
    const guide = '<p class="guide">' + t.guide + '</p>';
    const miss = t.missable ? '<p class="missable"><strong>MISSABLE:</strong> ' + t.missable_reason + '</p>' : '';
    article.innerHTML =
      '<input type="checkbox" class="earn-box" data-id="' + t.id + '" ' + (isEarned ? 'checked' : '') + ' aria-label="Mark ' + t.name + ' earned">' +
      '<div class="trophy-body"><h3>' + title + '</h3>' + badge + rarity + type + desc + guide + miss + sourceLinks(t) + '</div>';
    const box = article.querySelector('.earn-box');
    box.addEventListener('change', () => {
      if (box.checked) earned.add(String(t.id));
      else earned.delete(String(t.id));
      save();
      render();
    });
    rows.appendChild(article);
  }
  emptyEl.hidden = anyShown;
  gradeCounts(doc.trophies.filter((t) => {
    if (g !== 'all' && t.grade !== g) return false;
    if (ty !== 'all' && t.type !== ty) return false;
    if (q && !((t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q))) return false;
    return true;
  }));
}

function handleExport() {
  const blob = new Blob([JSON.stringify([...earned], null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
}

async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const ids = JSON.parse(await file.text());
    if (!Array.isArray(ids)) throw new Error('expected an array');
    earned = new Set(ids.filter((x) => typeof x === 'string'));
    save();
    render();
  } catch (err) {
    alert('Could not import: ' + err.message);
  }
  e.target.value = '';
}

loadStored();
fetch('data/trophies.json').then((r) => r.json()).then((d) => {
  doc = d;
  const seenTypes = new Set();
  for (const t of d.trophies) {
    if (seenTypes.has(t.type)) continue;
    seenTypes.add(t.type);
    const o = document.createElement('option');
    o.value = t.type;
    o.textContent = t.type.charAt(0).toUpperCase() + t.type.slice(1);
    typeSel.appendChild(o);
  }
  render();
}).catch((err) => {
  rows.innerHTML = '<li class="error">Failed to load data/trophies.json: ' + err.message + '</li>';
});

gradeSel.addEventListener('change', render);
typeSel.addEventListener('change', render);
searchIn.addEventListener('input', render);
spoilerIn.addEventListener('change', () => { spoilerOn = spoilerIn.checked; save(); render(); });
document.getElementById('export').addEventListener('click', handleExport);
document.getElementById('import').addEventListener('change', handleImport);
