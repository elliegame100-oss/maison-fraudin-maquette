document.documentElement.classList.add('js');

// Horaires en minutes depuis minuit, par jour JS (0 = dimanche … 6 = samedi)
const HOURS = {
  0: [420, 810],   // 7h00 – 13h30
  1: null,         // lundi : fermé
  2: [420, 1170],  // 7h00 – 19h30
  3: [420, 1170],
  4: [420, 1170],
  5: [420, 1170],
  6: [420, 1140],  // 7h00 – 19h00
};
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const fmt = m => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;

// Heure de Paris, quel que soit le fuseau du visiteur
function parisNow() {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const v = t => p.find(x => x.type === t).value;
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(v('weekday')),
    min: Number(v('hour')) * 60 + Number(v('minute')),
  };
}

function nextOpening(day, min) {
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7, h = HOURS[d];
    if (h && (i > 0 || min < h[0])) {
      return `${i === 0 ? "aujourd'hui" : i === 1 ? 'demain' : DAYS[d]} à ${fmt(h[0])}`;
    }
  }
  return '';
}

function updateStatus() {
  const { day, min } = parisNow();
  const h = HOURS[day];
  const open = !!h && min >= h[0] && min < h[1];
  const txt = open
    ? (h[1] - min <= 30 ? `Ouvert · ferme bientôt (${fmt(h[1])})` : `Ouvert · jusqu'à ${fmt(h[1])}`)
    : `Fermé · ouvre ${nextOpening(day, min)}`;
  document.querySelectorAll('[data-status]').forEach(el => {
    el.classList.toggle('is-open', open);
    el.classList.toggle('is-closed', !open);
    el.querySelector('.status-txt').textContent = txt;
  });
  document.querySelectorAll('#hours tr').forEach(tr => tr.classList.toggle('today', Number(tr.dataset.day) === day));
}
updateStatus();
setInterval(updateStatus, 60_000);

// Menu mobile
const burger = document.querySelector('.burger');
const menu = document.getElementById('menu');
const setMenu = open => {
  menu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
};
burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// Lien actif dans le menu selon la section visible
const links = [...menu.querySelectorAll('a')];
const spy = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
links.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });

// Apparition douce au défilement
const io = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Formulaire de commande
const form = document.getElementById('order-form');
const date = document.getElementById('o-date');
const time = document.getElementById('o-heure');
const slotErr = document.getElementById('slot-err');
const now = new Date();
date.min = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function slotProblem() {
  if (!date.value) return '';
  const d = new Date(date.value + 'T12:00').getDay();
  const h = HOURS[d];
  if (!h) return `Nous sommes fermés le ${DAYS[d]}. Choisissez un autre jour.`;
  if (time.value) {
    const [hh, mm] = time.value.split(':').map(Number);
    const m = hh * 60 + mm;
    if (m < h[0] || m > h[1] - 15) return `Le ${DAYS[d]}, le retrait est possible de ${fmt(h[0])} à ${fmt(h[1] - 15)}.`;
  }
  return '';
}

function showFieldError(input) {
  const err = input.closest('.field')?.querySelector('.err');
  const bad = !input.checkValidity();
  input.setAttribute('aria-invalid', String(bad));
  if (err) { err.hidden = !bad; if (bad) input.setAttribute('aria-describedby', err.id || (err.id = input.id + '-err')); }
  return bad;
}

form.querySelectorAll('input, textarea').forEach(i => i.addEventListener('blur', () => { if (i.value) showFieldError(i); }));
[date, time].forEach(i => i.addEventListener('change', () => {
  const msg = slotProblem();
  slotErr.textContent = msg;
  slotErr.hidden = !msg;
}));

form.addEventListener('submit', e => {
  e.preventDefault();
  const bad = [...form.querySelectorAll('input:not([type=radio]), textarea')].filter(showFieldError);
  const msg = slotProblem();
  slotErr.textContent = msg;
  slotErr.hidden = !msg;
  if (bad.length) { bad[0].focus(); return; }
  if (msg) { date.focus(); return; }
  form.reset();
  form.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
  form.querySelector('.ok').hidden = false;
});
