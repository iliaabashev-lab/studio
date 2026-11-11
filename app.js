import { WORKS, STUDIO } from './data.js?v=7';
import { mountDial } from './dial.js?v=7';

const gsap = window.gsap;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isCase = document.body.classList.contains('is-case');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// iframe с сайтом вписываем в рамку: сайт рендерится в «родной» ширине и масштабируется (как скриншот, но живой)
function fit(frame, w) {
  const box = frame.parentElement;
  const k = box.clientWidth / w;
  frame.style.transform = `scale(${k})`;
  frame.style.height = `${Math.ceil(box.clientHeight / k)}px`; // по высоте ровно на рамку — внутри листается сам сайт
}
const fitters = [];
addEventListener('resize', () => fitters.forEach((f) => f()));

/* ---------- переход между страницами: короткое затухание (без шторок) ---------- */
function go(href) {
  if (reduced) { location.href = href; return; }
  document.body.classList.add('is-leaving');
  setTimeout(() => { location.href = href; }, 320);
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-wipe], a.acc__head, a.acc__go, a.dial__go');
  if (!a || e.metaKey || e.ctrlKey || a.target === '_blank') return;
  e.preventDefault(); go(a.getAttribute('href'));
});
addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));

/* ---------- меню ---------- */
const menuBtn = $('button.menu-btn');
const menu = $('#menu');
if (menuBtn && menu) {
  const set = (o) => { menuBtn.setAttribute('aria-expanded', String(o)); menu.classList.toggle('is-open', o); $('.menu-btn__label').textContent = o ? 'Закрыть' : 'Меню'; };
  menuBtn.addEventListener('click', () => set(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
}

/* ---------- контакты ---------- */
$$('[data-phone]').forEach((el) => { el.textContent = STUDIO.phone; });

/* ---------- синее пятно за курсором: на всю страницу, позади текста ---------- */
if (!reduced) {
  const cv = document.createElement('canvas'); cv.className = 'fluid'; cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const g = cv.getContext('2d');
  let w = 0, h = 0; const q = 0.5 * Math.min(devicePixelRatio || 1, 1.5); // считаем в половинном разрешении: всё равно размыто
  const size = () => { w = innerWidth; h = innerHeight; cv.width = Math.round(w * q); cv.height = Math.round(h * q); g.setTransform(q, 0, 0, q, 0, 0); };
  size(); addEventListener('resize', size);
  const p = { x: w * 0.7, y: h * 0.4, px: w * 0.7, py: h * 0.4, active: 0 };
  addEventListener('pointermove', (e) => { p.x = e.clientX; p.y = e.clientY; p.active = 1; }, { passive: true });
  let t = 0;
  const loop = () => {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    t += 0.016;
    if (p.active < 0.02) { p.x = w * (0.62 + 0.22 * Math.sin(t * 0.7)); p.y = h * (0.42 + 0.2 * Math.sin(t * 1.1)); } // пока мышь стоит, пятно медленно плавает само
    p.active *= 0.985;
    g.globalCompositeOperation = 'destination-out'; // след гаснет до прозрачного, фон страницы не перекрашивается
    g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    const steps = Math.max(1, Math.min(12, Math.hypot(p.x - p.px, p.y - p.py) / 8));
    for (let i = 0; i < steps; i++) {
      const x = p.px + (p.x - p.px) * (i / steps), y = p.py + (p.y - p.py) * (i / steps);
      const hue = 212 + 14 * Math.sin((t * 40 + x * 0.15) / 57), r = Math.min(w, h) * 0.12;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `hsla(${hue}, 45%, 56%, 0.10)`); grd.addColorStop(1, 'hsla(212, 45%, 56%, 0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    p.px = p.x; p.py = p.y;
  };
  loop();
}

/* ---------- свой курсор: точка + кольцо с запаздыванием; над ссылками кольцо растёт,
   над работами и карточкой появляется подпись. Инверсия цвета — виден и на светлом, и на тёмном ---------- */
if (fine) {
  const cur = document.createElement('div'); cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<i class="cur__ring"><span class="cur__label"></span></i><i class="cur__dot"></i>';
  document.body.append(cur);
  document.documentElement.classList.add('has-cur');
  const ring = $('.cur__ring', cur), dot = $('.cur__dot', cur), label = $('.cur__label', cur);
  const m = { x: -100, y: -100 }, r = { x: -100, y: -100 };
  addEventListener('pointermove', (e) => {
    m.x = e.clientX; m.y = e.clientY; cur.classList.add('is-on');
    if (reduced) { r.x = m.x; r.y = m.y; }
  }, { passive: true });
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) cur.classList.remove('is-on', 'is-down'); }); // ушёл с окна или в iframe с живым сайтом
  addEventListener('pointerdown', () => cur.classList.add('is-down'));
  const up = () => cur.classList.remove('is-down');
  ['pointerup', 'pointercancel', 'blur', 'dragend'].forEach((n) => addEventListener(n, up));
  const LABELS = [['.dial__stage canvas', 'Тянуть'], ['.acc__head', 'Кейс'], ['.acc__shot, .dial__fallback', 'Кейс']];
  document.addEventListener('pointerover', (e) => {
    const el = e.target;
    const hit = LABELS.find(([sel]) => el.closest(sel));
    const link = el.closest('a, button, [role="tab"], label');
    cur.classList.toggle('is-label', !!hit);
    cur.classList.toggle('is-link', !hit && !!link);
    if (hit) label.textContent = hit[1];
  });
  const loop = () => {
    requestAnimationFrame(loop);
    r.x += (m.x - r.x) * 0.18; r.y += (m.y - r.y) * 0.18;
    dot.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`;
    ring.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
  };
  loop();
}

if (!isCase) {
  /* ---------- прелоадер: счётчик 0→100, потом панель уезжает вверх (один раз за визит) ---------- */
  const pre = $('.pre');
  let seen = false; try { seen = sessionStorage.getItem('pre') === '1'; sessionStorage.setItem('pre', '1'); } catch {}
  const startIntro = () => typeTerminal();
  if (!seen && !reduced && gsap) {
    pre.classList.add('is-on');
    const o = { v: 0 }, num = $('.pre__num');
    gsap.timeline({ onComplete: () => { pre.classList.remove('is-on'); startIntro(); } })
      .to(o, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { num.textContent = String(Math.round(o.v)).padStart(3, '0'); } })
      .to(pre, { yPercent: -100, duration: 0.7, ease: 'power4.inOut' }, '+=0.15');
  } else startIntro();

  /* ---------- интро-терминал ---------- */
  function typeTerminal() {
    const box = $('.term__body');
    const lines = ['prototype --ниша «ваш бизнес»', 'собираю первый экран, цены, кнопки Telegram и MAX', 'подключаю заявки в Telegram', 'готово за 2 дня — ссылка у вас в мессенджере'];
    if (reduced || !gsap) { box.innerHTML = lines.map((l) => `<div class="term__line is-ok">${l}</div>`).join(''); return; }
    let i = 0;
    const next = () => {
      if (i >= lines.length) { box.insertAdjacentHTML('beforeend', '<span class="term__caret"></span>'); return; }
      const div = document.createElement('div'); div.className = 'term__line'; box.append(div);
      const text = lines[i++]; let k = 0;
      const t = setInterval(() => { div.textContent = text.slice(0, ++k); if (k >= text.length) { clearInterval(t); div.classList.add('is-ok'); setTimeout(next, 220); } }, 22);
    };
    next();
  }

  /* ---------- карточка работ: прокрутка листает кадры ---------- */
  const SL = [
    { img: './img/tehnika.jpg', id: 'tehnika' },
    { img: './img/gipu.jpg', id: 'gipu' }, { img: './img/rkompas.jpg', id: 'rkompas' },
  ].map((x) => ({ ...x, w: WORKS.find((w) => w.id === x.id) }));
  const dialRoot = $('.dial');
  const names = $('.dial__names');
  names.innerHTML = SL.map((x, i) => `<li><button type="button" data-i="${i}">${x.w.title}${x.note ? ` · ${x.note}` : ''}</button></li>`).join('');
  const setMeta = (i) => {
    const x = SL[i];
    $('.dial__count').textContent = `${String(i + 1).padStart(2, '0')} / ${String(SL.length).padStart(2, '0')}`;
    $('.dial__name').textContent = x.w.title; $('.dial__niche').textContent = x.note ? `${x.w.niche} — ${x.note}` : x.w.niche;
    $('.dial__go').href = `./case.html?id=${x.w.id}`;
    $('.dial__fallback').src = x.img;
    $$('button', names).forEach((b, k) => b.classList.toggle('is-on', k === i));
  };
  setMeta(0);
  const dial = mountDial(dialRoot, SL, { reduced, onChange: setMeta });
  names.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return;
    const i = +b.dataset.i; const top = dialRoot.offsetTop + (i + 0.5) / SL.length * (dialRoot.offsetHeight - innerHeight); scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' }); });
  const onScroll = () => {
    const r = dialRoot.getBoundingClientRect(); const range = dialRoot.offsetHeight - innerHeight;
    const p = Math.min(0.999, Math.max(0, -r.top / range));
    const i = Math.floor(p * SL.length);
    if (i !== dial.index) dial.go(i, i > dial.index ? 1 : -1);
  };
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- сетка-аккордеон работ ---------- */
  const acc = $('.acc');
  acc.innerHTML = WORKS.map((w, i) => `
    <li class="acc__item" style="--h:${w.hue}">
      <a class="acc__head" href="./case.html?id=${w.id}"><span class="acc__n">${String(i + 1).padStart(2, '0')}</span><span class="acc__t">${w.title}</span><span class="acc__niche">${w.niche}</span><span class="acc__kind">${w.kind}</span></a>
      <div class="acc__body"><div><div class="acc__inner"><span></span>
        <div class="acc__shot"><img src="./img/${w.id}.jpg" alt="${w.title}: главный экран" loading="lazy"></div>
        <div class="acc__side"><p>${w.task}</p><a class="btn btn--main acc__go" href="./case.html?id=${w.id}">Открыть кейс</a></div>
      </div></div></div>
    </li>`).join('');
  const items = $$('.acc__item');
  const open = (li) => {
    items.forEach((x) => x.classList.toggle('is-open', x === li));
  };
  items.forEach((li) => {
    if (fine) li.addEventListener('mouseenter', () => open(li));
    // на телефоне первое касание раскрывает строку, второе открывает кейс
    $('.acc__head', li).addEventListener('click', (e) => { if (!fine && !li.classList.contains('is-open')) { e.preventDefault(); e.stopPropagation(); open(li); } }, true);
  });
  open(items[0]);

  /* ---------- сайты на экране телефона ---------- */
  const tabs = $('.phone-tabs');
  const pf = $('.phone__screen iframe');
  const phoneWorks = WORKS;
  tabs.innerHTML = phoneWorks.map((w, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-id="${w.id}">${w.title}</button>`).join('');
  const show = (id) => {
    const w = WORKS.find((x) => x.id === id);
    $$('button', tabs).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === id)));
    pf.src = w.url;
  };
  tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(b.dataset.id); });
  const pfit = () => fit(pf, 390); fitters.push(pfit);
  new IntersectionObserver(([e], ob) => { if (e.isIntersecting) { show(phoneWorks[0].id); pfit(); ob.disconnect(); } }, { rootMargin: '300px' }).observe(pf);
} else {
  /* ---------- страница кейса ---------- */
  const id = new URLSearchParams(location.search).get('id') || WORKS[0].id;
  const i = Math.max(0, WORKS.findIndex((w) => w.id === id));
  const w = WORKS[i];
  document.title = `${w.title} — кейс студии ${STUDIO.name}`;
  $('.case__title').textContent = w.title;
  $('.case__kind').textContent = `${w.kind} · ${w.year}`;
  $('.case__niche').textContent = w.niche;
  $$('[data-f]').forEach((el) => { const k = el.dataset.f; if (k === 'url') el.href = w.url; else el.textContent = w[k]; });
  $('.browser__url').textContent = w.url.replace('https://', '');
  $('.feats__list').innerHTML = w.features.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('');
  if (w.id === 'tehnika') $('[data-credit]').textContent = '3D-модель стиральной машины: nikita.bulgakov, CC BY 4.0';
  const desk = $('.browser iframe'), mob = $('.phone--big iframe'), stage = $('.live__stage');
  desk.src = w.url;
  const fx = () => { fit(desk, 1440); if (mob.src) fit(mob, 390); }; fitters.push(fx); requestAnimationFrame(fx);
  $('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('.seg button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    stage.dataset.mode = b.dataset.mode;
    if (b.dataset.mode === 'phone' && !mob.src) mob.src = w.url;
    requestAnimationFrame(fx);
  });
  const nx = WORKS[(i + 1) % WORKS.length];
  const next = $('.case__next'); next.href = `./case.html?id=${nx.id}`; $('b', next).textContent = nx.title;
  if (gsap && !reduced) gsap.from('.case__title', { yPercent: 40, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.35 });
}
