import { WORKS, STUDIO } from './data.js';

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
}
const fitters = [];
addEventListener('resize', () => fitters.forEach((f) => f()));

/* ---------- радужные переходы между страницами ---------- */
const wipe = $('.wipe');
function go(href) {
  if (reduced || !gsap) { location.href = href; return; }
  gsap.fromTo(wipe, { yPercent: 101 }, { yPercent: 0, duration: 0.55, ease: 'power3.inOut', onComplete: () => { location.href = href; } });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-wipe], a.acc__head, a.acc__go');
  if (!a || e.metaKey || e.ctrlKey || a.target === '_blank') return;
  e.preventDefault(); go(a.getAttribute('href'));
});
addEventListener('pageshow', () => { if (gsap) gsap.set(wipe, { yPercent: 101 }); });
if (isCase && gsap && !reduced) gsap.fromTo(wipe, { yPercent: 0 }, { yPercent: -101, duration: 0.7, ease: 'power3.inOut', delay: 0.05, onComplete: () => wipe.classList.remove('is-cover') });
else wipe.classList.remove('is-cover');

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

  /* ---------- «жидкость» за курсором: радужные пятна с затуханием, размытые фильтром ---------- */
  const cv = $('.fluid');
  if (cv && !reduced) {
    const g = cv.getContext('2d');
    let w = 0, h = 0, dpr = Math.min(devicePixelRatio || 1, 1.5);
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr / 2; cv.height = h * dpr / 2; g.setTransform(dpr / 2, 0, 0, dpr / 2, 0, 0); };
    size(); addEventListener('resize', size);
    const p = { x: w * 0.7, y: h * 0.4, px: w * 0.7, py: h * 0.4, active: 0 };
    const move = (x, y) => { const r = cv.getBoundingClientRect(); p.x = x - r.left; p.y = y - r.top; p.active = 1; };
    addEventListener('pointermove', (e) => move(e.clientX, e.clientY), { passive: true });
    let t = 0, visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
    const loop = () => {
      requestAnimationFrame(loop);
      if (!visible) return;
      t += 0.016;
      if (p.active < 0.02) { p.x = w * (0.62 + 0.22 * Math.sin(t * 0.7)); p.y = h * (0.42 + 0.2 * Math.sin(t * 1.1)); } // сам «дышит», пока мышь не двигается
      p.active *= 0.985;
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(21,23,23,0.07)'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      const steps = Math.max(1, Math.min(12, Math.hypot(p.x - p.px, p.y - p.py) / 8));
      for (let i = 0; i < steps; i++) {
        const x = p.px + (p.x - p.px) * (i / steps), y = p.py + (p.y - p.py) * (i / steps);
        const hue = (t * 40 + x * 0.15) % 360, r = Math.min(w, h) * 0.12;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, `hsla(${hue}, 90%, 62%, 0.16)`); grd.addColorStop(1, `hsla(${hue}, 90%, 62%, 0)`);
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      p.px = p.x; p.py = p.y;
    };
    loop();
  }

  /* ---------- сетка-аккордеон работ ---------- */
  const acc = $('.acc');
  acc.innerHTML = WORKS.map((w, i) => `
    <li class="acc__item" style="--h:${w.hue}">
      <a class="acc__head" href="./case.html?id=${w.id}"><span class="acc__n">${String(i + 1).padStart(2, '0')}</span><span class="acc__t">${w.title}</span><span class="acc__niche">${w.niche}</span><span class="acc__kind">${w.kind}</span></a>
      <div class="acc__body"><div><div class="acc__inner"><span></span>
        <div class="acc__shot"><iframe title="${w.title}" tabindex="-1" data-src="${w.url}"></iframe></div>
        <div class="acc__side"><p>${w.task}</p><a class="btn btn--main acc__go" href="./case.html?id=${w.id}">Открыть кейс</a></div>
      </div></div></div>
    </li>`).join('');
  const items = $$('.acc__item');
  const open = (li) => {
    items.forEach((x) => x.classList.toggle('is-open', x === li));
    const f = $('iframe', li);
    if (f && !f.src) { f.src = f.dataset.src; const fx = () => fit(f, 1280); fitters.push(fx); requestAnimationFrame(fx); }
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
  const phoneWorks = WORKS.filter((w) => !['gipu'].includes(w.id));
  tabs.innerHTML = phoneWorks.map((w, i) => `<button type="button" role="tab" aria-selected="${i === 1}" data-id="${w.id}">${w.title}</button>`).join('');
  const show = (id) => {
    const w = WORKS.find((x) => x.id === id);
    $$('button', tabs).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === id)));
    pf.src = w.url;
  };
  tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(b.dataset.id); });
  const pfit = () => fit(pf, 390); fitters.push(pfit);
  new IntersectionObserver(([e], ob) => { if (e.isIntersecting) { show(phoneWorks[1].id); pfit(); ob.disconnect(); } }, { rootMargin: '300px' }).observe(pf);
} else {
  /* ---------- страница кейса ---------- */
  const id = new URLSearchParams(location.search).get('id') || WORKS[0].id;
  const i = Math.max(0, WORKS.findIndex((w) => w.id === id));
  const w = WORKS[i];
  document.title = `${w.title} — кейс студии ${STUDIO.name}`;
  $('.case__title').textContent = w.title;
  $('.case__kind').textContent = w.kind;
  $('.case__niche').textContent = w.niche;
  $$('[data-f]').forEach((el) => { const k = el.dataset.f; if (k === 'url') el.href = w.url; else el.textContent = w[k]; });
  $('.case__did').innerHTML = w.did.map((d) => `<li>${d}</li>`).join('');
  const [desk, mob] = $$('.case__screens iframe');
  desk.src = w.url; mob.src = w.url;
  const fx = () => { fit(desk, 1280); fit(mob, 390); }; fitters.push(fx); requestAnimationFrame(fx);
  const nx = WORKS[(i + 1) % WORKS.length];
  const next = $('.case__next'); next.href = `./case.html?id=${nx.id}`; $('b', next).textContent = nx.title;
  if (gsap && !reduced) gsap.from('.case__title', { yPercent: 40, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.35 });
}
