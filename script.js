(() => {
  'use strict';

  // Adresse du service qui reçoit les demandes de rappel (Formspree, Web3Forms, Getform…).
  // Tant qu'elle est vide, le formulaire fonctionne en démonstration : la confirmation s'affiche
  // mais la demande n'est envoyée nulle part.
  const FORM_ENDPOINT = '';

  const NB = ' ';
  const EASE = 'cubic-bezier(.2,.7,.2,1)';
  const EXPO = 'cubic-bezier(.16,1,.3,1)';
  const $ = id => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const pad = n => String(n).padStart(2, '0');
  const root = document.documentElement, body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Défilement fluide à la molette et au pavé tactile (le tactile reste natif) */
  const lenis = !reduced && window.Lenis ? new window.Lenis({ lerp: 0.1 }) : null;

  /* En-tête : fond, barre de progression, masquage en descendant, lien actif */
  const header = $('header'), progress = $('progress');
  const spy = $$('.nav [data-spy]');
  let headerHidden = false, travel = 0;
  function setHeaderHidden(hide) {
    if (hide === headerHidden) return;
    headerHidden = hide;
    header.classList.toggle('is-hidden', hide);
  }
  function onScroll(y, dy) {
    const max = root.scrollHeight - window.innerHeight;
    header.classList.toggle('is-scrolled', y > 30);
    body.classList.toggle('is-far', y > 760);
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    if (!reduced) {
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
      if (y < 420 || menuOpen || header.contains(document.activeElement)) setHeaderHidden(false);
      else if (travel > 48) setHeaderHidden(true);
      else if (travel < -24) setHeaderHidden(false);
    }
    let active = '';
    spy.forEach(a => { const s = $(a.dataset.spy); if (s && s.getBoundingClientRect().top < 160) active = a.dataset.spy; });
    spy.forEach(a => a.classList.toggle('is-active', a.dataset.spy === active));
    parallax();
  }

  /* Parallaxe douce des images dans leur cadre (et du badge du hero) */
  const layers = reduced ? [] : $$('[data-speed]').map(el => ({ el, speed: parseFloat(el.dataset.speed) || 0, box: el.parentElement }));
  function parallax() {
    if (!layers.length) return;
    const vh = window.innerHeight, wide = window.innerWidth >= 768;
    for (const l of layers) {
      if (!wide) { l.el.style.translate = ''; continue; }
      const r = l.box.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      const c = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      l.el.style.translate = '0 ' + (-c * l.speed * r.height).toFixed(1) + 'px';
    }
  }

  /* Bandeaux défilants : vitesse qui suit le scroll, ralentis au survol */
  const marquees = reduced ? [] : $$('[data-marquee]').map(el => ({ el, dir: +el.dataset.marquee || -1, speed: +el.dataset.rate || 40, x: 0, w: 0, k: 1, hover: false, visible: true }));
  marquees.forEach(m => {
    const host = m.el.parentElement;
    host.addEventListener('pointerenter', () => { m.hover = true; });
    host.addEventListener('pointerleave', () => { m.hover = false; });
    new IntersectionObserver(([e]) => { m.visible = e.isIntersecting; }).observe(host);
  });
  function measureMarquees() { marquees.forEach(m => { m.w = m.el.firstElementChild.getBoundingClientRect().width; }); }

  /* Une seule boucle d'animation pour tout ce qui bouge en continu */
  let lastY = window.scrollY, lastT = 0, velocity = 0, scrollDir = 1;
  function frame(t) {
    if (lenis) lenis.raf(t);
    const dt = lastT ? Math.min(64, t - lastT) : 16;
    lastT = t;
    const y = window.scrollY, dy = y - lastY;
    velocity += (dy - velocity) * 0.2;
    if (dy) { scrollDir = dy > 0 ? 1 : -1; onScroll(y, dy); lastY = y; }
    const boost = Math.min(3, Math.abs(velocity) * 0.1);
    for (const m of marquees) {
      if (!m.visible || !m.w) continue;
      m.k += ((m.hover ? 0.12 : 1) - m.k) * 0.06;
      m.x += m.dir * scrollDir * m.speed * (m.k + boost) * dt / 1000;
      if (m.x <= -m.w) m.x += m.w; else if (m.x > 0) m.x -= m.w;
      m.el.style.transform = 'translate3d(' + m.x.toFixed(2) + 'px,0,0)';
    }
    runSlideshow(dt);
    requestAnimationFrame(frame);
  }
  if (reduced) window.addEventListener('scroll', () => { const y = window.scrollY; onScroll(y, y - lastY); lastY = y; }, { passive: true });

  /* Menu mobile : ouverture circulaire depuis le bouton */
  const menu = $('menu'), burger = $('burger');
  let menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    if (open) {
      const r = burger.getBoundingClientRect();
      menu.style.setProperty('--cx', (r.left + r.width / 2) + 'px');
      menu.style.setProperty('--cy', (r.top + r.height / 2) + 'px');
      setHeaderHidden(false);
    }
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    root.classList.toggle('menu-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
  window.matchMedia('(min-width: 1200px)').addEventListener('change', e => { if (e.matches && menuOpen) setMenu(false); });

  // Liens internes : ferment le menu, présélectionnent le projet, glissent jusqu'à la section.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('skip')) return;
    const hash = a.getAttribute('href');
    if (menuOpen) setMenu(false);
    if (a.dataset.projet) pickProjet(a.dataset.projet);
    const target = hash.length > 1 ? document.querySelector(hash) : null;
    if (!lenis || !target) return;
    e.preventDefault();
    lenis.scrollTo(target, {
      offset: -(parseFloat(getComputedStyle(target).scrollMarginTop) || 0),
      duration: 1.4,
      easing: t => 1 - Math.pow(1 - t, 4),
      onComplete: () => { if (target.id !== 'top') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); } }
    });
    history.pushState(null, '', hash);
  });

  /* Hero : diaporama avec barre de progression, en pause au survol */
  const slides = $$('.slide'), tabs = $$('.slide-tab'), slideTitle = $('slideTitle');
  const SLIDE_MS = 6500;
  let slide = 0, elapsed = 0, visualHover = false;
  function showSlide(i) {
    tabs[slide].style.setProperty('--p', 0);
    slide = i;
    elapsed = 0;
    slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
    tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-pressed', String(k === i)); });
    slideTitle.textContent = slides[i].dataset.title;
  }
  function runSlideshow(dt) {
    if (document.hidden) return;
    if (!visualHover) elapsed += dt;
    tabs[slide].style.setProperty('--p', Math.min(1, elapsed / SLIDE_MS).toFixed(4));
    if (elapsed >= SLIDE_MS) showSlide((slide + 1) % slides.length);
  }
  tabs.forEach((t, k) => t.addEventListener('click', () => showSlide(k)));
  const visual = document.querySelector('.hero-visual');
  visual.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') visualHover = true; });
  visual.addEventListener('pointerleave', () => { visualHover = false; });

  /* Titres : mots qui montent derrière un masque */
  function splitWords(el) {
    const label = document.createElement('span');
    label.className = 'sr-only';
    label.textContent = el.textContent.replace(/\s+/g, ' ').trim();
    const split = document.createElement('span');
    split.className = 'split';
    split.setAttribute('aria-hidden', 'true');
    while (el.firstChild) split.appendChild(el.firstChild);
    (function walk(node) {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/( +)/).forEach(part => {
            if (!part) return;
            if (/^ +$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'), wi = document.createElement('span');
            w.className = 'w';
            wi.className = 'wi';
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    })(split);
    el.append(label, split);
  }
  function splitChars(el) {
    const text = el.textContent.trim();
    el.textContent = '';
    [...text].forEach(ch => {
      const c = document.createElement('span'), ci = document.createElement('span');
      c.className = 'c';
      ci.className = 'ci';
      ci.textContent = ch;
      c.appendChild(ci);
      el.appendChild(c);
    });
  }
  if (!reduced) {
    $$('[data-split]').forEach(splitWords);
    $$('[data-split-chars]').forEach(splitChars);
  }

  /* Compteurs */
  const fmtCount = (el, v) => v.toFixed(+el.dataset.dec || 0).replace('.', ',');
  function countUp(el) {
    const to = parseFloat(el.dataset.count), t0 = performance.now(), dur = 1700;
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmtCount(el, to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* Apparition au scroll : blocs, images (rideau), titres, compteurs */
  const radius = el => getComputedStyle(el).borderTopLeftRadius || '0px';
  function hide(el) {
    if (el.matches('.wipe')) el.style.clipPath = 'inset(100% 0 0 0 round ' + radius(el) + ')';
    else if (el.matches('[data-split]')) $$('.wi', el).forEach(w => { w.style.transform = 'translateY(108%)'; });
    else if (el.matches('[data-split-chars]')) $$('.ci', el).forEach(c => { c.style.transform = 'translateY(105%)'; });
    else if (el.matches('[data-count]')) el.textContent = fmtCount(el, 0);
    else el.style.opacity = '0';
  }
  function reveal(el, i) {
    const delay = (+el.dataset.d || 0) + Math.min(i, 5) * 90;
    el.classList.add('is-in');
    if (el.matches('.wipe')) {
      const r = radius(el);
      el.style.clipPath = '';
      el.animate([{ clipPath: 'inset(100% 0 0 0 round ' + r + ')' }, { clipPath: 'inset(0 0 0 0 round ' + r + ')' }], { duration: 1300, delay, easing: EXPO, fill: 'backwards' });
      const img = el.querySelector(':scope > img');
      if (img) img.animate([{ transform: 'scale(1.22)' }, { transform: 'none' }], { duration: 1800, delay, easing: EXPO, fill: 'backwards' });
      if (el.id === 'ba') baHint(delay + 900);
    } else if (el.matches('[data-split]')) {
      $$('.wi', el).forEach((w, j) => {
        w.style.transform = '';
        w.animate([{ transform: 'translateY(108%)' }, { transform: 'none' }], { duration: 1050, delay: delay + j * 45, easing: EXPO, fill: 'backwards' });
      });
    } else if (el.matches('[data-split-chars]')) {
      $$('.ci', el).forEach((c, j) => {
        c.style.transform = '';
        c.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 1200, delay: j * 60, easing: EXPO, fill: 'backwards' });
      });
    } else if (el.matches('[data-count]')) {
      setTimeout(() => countUp(el), delay + 200);
    } else {
      el.style.opacity = '';
      el.animate([{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], { duration: 1100, delay, easing: EXPO, fill: 'backwards' });
    }
  }
  const watched = $$('[data-reveal], .wipe, [data-split], [data-split-chars], [data-count]');
  if (reduced) watched.forEach(el => el.classList.add('is-in'));
  else {
    // Une image « rideau » est observée via son parent : son propre clip-path la rendrait invisible pour l'observateur.
    const groups = new Map();
    watched.forEach(el => {
      const target = el.matches('.wipe') ? el.parentElement : el;
      if (target.getBoundingClientRect().top < window.innerHeight * 0.92) { el.classList.add('is-in'); return; }
      hide(el);
      if (!groups.has(target)) groups.set(target, []);
      groups.get(target).push(el);
    });
    const io = new IntersectionObserver(entries => {
      let i = 0;
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        (groups.get(e.target) || []).forEach(el => reveal(el, i++));
        groups.delete(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    groups.forEach((_, target) => io.observe(target));
  }

  /* Réalisations : filtres avec pastille glissante et réagencement animé */
  const filters = $$('.filter'), projects = $$('.project'), grid = $('projects');
  const filterPill = document.querySelector('.filter-pill');
  function movePill(instant) {
    const btn = document.querySelector('.filter.is-active');
    if (!filterPill || !btn) return;
    if (instant) filterPill.style.transition = 'none';
    filterPill.style.width = btn.offsetWidth + 'px';
    filterPill.style.height = btn.offsetHeight + 'px';
    filterPill.style.transform = 'translate(' + btn.offsetLeft + 'px,' + btn.offsetTop + 'px)';
    if (instant) { void filterPill.offsetWidth; filterPill.style.transition = ''; }
  }
  let filterTimer = 0;
  function applyFilter(f) {
    const keep = p => f === 'tout' || p.dataset.cat === f;
    clearTimeout(filterTimer);
    projects.forEach(p => p.getAnimations().forEach(a => a.finish()));
    const layout = () => {
      const before = new Map(projects.filter(p => !p.hidden).map(p => [p, p.getBoundingClientRect()]));
      const h0 = grid.offsetHeight;
      projects.forEach(p => { p.hidden = !keep(p); });
      if (reduced) return;
      const h1 = grid.offsetHeight;
      projects.forEach(p => {
        if (p.hidden) return;
        const r = p.getBoundingClientRect(), b = before.get(p);
        if (b) {
          const dx = b.left - r.left, dy = b.top - r.top;
          if (dx || dy) p.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 800, easing: EXPO });
        } else p.animate([{ opacity: 0, transform: 'translateY(26px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 120, easing: EXPO, fill: 'backwards' });
      });
      if (h0 !== h1) {
        grid.style.overflow = 'clip';
        const unclip = () => { grid.style.overflow = ''; };
        grid.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 800, easing: EXPO }).finished.then(unclip, unclip);
      }
    };
    const leaving = projects.filter(p => !p.hidden && !keep(p));
    if (reduced || !leaving.length) return layout();
    leaving.forEach(p => p.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.95)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' }));
    filterTimer = setTimeout(() => { leaving.forEach(p => p.getAnimations().forEach(a => a.cancel())); layout(); }, 220);
  }
  filters.forEach(btn => btn.addEventListener('click', () => {
    if (btn.classList.contains('is-active')) return;
    filters.forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
    movePill(false);
    applyFilter(btn.dataset.filter);
  }));

  /* Visionneuse des réalisations */
  const lb = $('lb'), lbImg = $('lbImg');
  let lbList = [], lbIndex = 0, lbOpener = null, lbTimer = 0;
  const bigSrc = img => (img.currentSrc || img.src).replace(/([?&])w=\d+/, '$1w=1800');
  function lbFill() {
    const fig = lbList[lbIndex], img = fig.querySelector('img');
    lbImg.src = bigSrc(img);
    lbImg.alt = img.alt;
    $('lbTitle').textContent = fig.querySelector('.project-t').textContent;
    $('lbDesc').textContent = fig.querySelector('.project-d').textContent + ' · ' + fig.querySelector('.project-loc').textContent;
    $('lbCount').textContent = pad(lbIndex + 1) + ' / ' + pad(lbList.length);
    [1, -1].forEach(o => { const n = lbList[(lbIndex + o + lbList.length) % lbList.length]; new Image().src = bigSrc(n.querySelector('img')); });
  }
  function lbGo(step) {
    lbIndex = (lbIndex + step + lbList.length) % lbList.length;
    if (reduced) return lbFill();
    lbImg.style.setProperty('--dir', -step);
    lbImg.classList.add('is-swapping');
    setTimeout(() => {
      lbFill();
      lbImg.style.setProperty('--dir', step);
      const done = () => requestAnimationFrame(() => lbImg.classList.remove('is-swapping'));
      if (lbImg.complete) done(); else { lbImg.onload = done; lbImg.onerror = done; }
    }, 230);
  }
  function lbOpen(fig) {
    clearTimeout(lbTimer);
    lbList = projects.filter(p => !p.hidden);
    lbIndex = Math.max(0, lbList.indexOf(fig));
    lbOpener = document.activeElement;
    lbImg.classList.remove('is-swapping');
    lbFill();
    if (!lb.open) lb.showModal();
    root.classList.add('lb-open');
    if (lenis) lenis.stop();
    requestAnimationFrame(() => lb.classList.add('is-open'));
  }
  function lbClose() {
    lb.classList.remove('is-open');
    root.classList.remove('lb-open');
    if (lenis) lenis.start();
    lbTimer = setTimeout(() => { lb.close(); if (lbOpener) lbOpener.focus({ preventScroll: true }); }, reduced ? 0 : 420);
  }
  $$('.project-zoom').forEach(b => b.addEventListener('click', () => lbOpen(b.closest('.project'))));
  $('lbPrev').addEventListener('click', () => lbGo(-1));
  $('lbNext').addEventListener('click', () => lbGo(1));
  $('lbClose').addEventListener('click', lbClose);
  lb.addEventListener('cancel', e => { e.preventDefault(); lbClose(); });
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-stage')) lbClose(); });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); lbGo(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); lbGo(1); }
  });
  let swipeX = null;
  lb.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') swipeX = e.clientX; });
  lb.addEventListener('pointerup', e => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 50) lbGo(dx < 0 ? 1 : -1);
  });

  /* Avant / Après */
  const ba = $('ba'), handle = $('baHandle');
  let baPos = 50, dragging = false, baTouched = false;
  function setBa(p) {
    baPos = Math.max(2, Math.min(98, p));
    ba.style.setProperty('--pos', baPos.toFixed(2) + '%');
    handle.setAttribute('aria-valuenow', String(Math.round(baPos)));
  }
  const baFrom = e => { const r = ba.getBoundingClientRect(); setBa((e.clientX - r.left) / r.width * 100); };
  ba.addEventListener('pointerdown', e => {
    // Au doigt, seule la poignée déplace le curseur : le reste de l'image laisse défiler la page.
    if (e.button > 0 || (e.pointerType !== 'mouse' && !handle.contains(e.target))) return;
    e.preventDefault();
    baTouched = true;
    dragging = true;
    ba.classList.add('is-dragging');
    ba.setPointerCapture(e.pointerId);
    baFrom(e);
  });
  ba.addEventListener('pointermove', e => { if (dragging) baFrom(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => ba.addEventListener(t, () => { dragging = false; ba.classList.remove('is-dragging'); }));
  handle.addEventListener('keydown', e => {
    const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[e.key];
    if (step) setBa(baPos + step);
    else if (e.key === 'Home') setBa(0);
    else if (e.key === 'End') setBa(100);
    else return;
    baTouched = true;
    e.preventDefault();
  });
  // Petit balayage à l'apparition pour montrer que l'image se compare.
  function baHint(wait) {
    const keys = [[0, 50], [750, 74], [1550, 30], [2250, 50]];
    const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    let t0 = 0;
    setTimeout(() => requestAnimationFrame(function step(t) {
      if (baTouched) return;
      if (!t0) t0 = t;
      const e = t - t0;
      const k = keys.findIndex(([at]) => at > e);
      if (k < 0) return setBa(50);
      const [a0, v0] = keys[k - 1], [a1, v1] = keys[k];
      setBa(v0 + (v1 - v0) * ease((e - a0) / (a1 - a0)));
      requestAnimationFrame(step);
    }), wait);
  }

  /* Avis */
  const avis = $$('.avis-item');
  let av = Math.max(0, avis.findIndex(a => !a.hidden));
  function showAvis(i, dir) {
    av = (i + avis.length) % avis.length;
    avis.forEach((a, k) => { a.hidden = k !== av; });
    if (reduced) return;
    avis[av].querySelector('blockquote').animate([{ opacity: 0, transform: 'translateX(' + dir * 32 + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 800, easing: EXPO });
    avis[av].querySelector('figcaption').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 150, easing: EASE, fill: 'backwards' });
  }
  $('avisPrev').addEventListener('click', () => showAvis(av - 1, -1));
  $('avisNext').addEventListener('click', () => showAvis(av + 1, 1));

  /* Questions fréquentes : une seule réponse ouverte à la fois */
  const faqs = $$('.faq-item');
  faqs.forEach(item => item.querySelector('.faq-q').addEventListener('click', () => {
    const open = !item.classList.contains('is-open');
    faqs.forEach(f => {
      const on = f === item && open;
      f.classList.toggle('is-open', on);
      f.querySelector('.faq-q').setAttribute('aria-expanded', String(on));
    });
  }));

  /* Formulaire de rappel */
  const form = $('form'), sent = $('sent'), zoneEl = $('zone'), formErr = $('formErr');
  const submitBtn = form.querySelector('[type="submit"]'), submitLabel = submitBtn.innerHTML;

  function pickProjet(value) {
    const radio = [...form.elements.projet].find(r => r.value === value);
    if (radio) radio.checked = true;
    if (form.hidden) { sent.hidden = true; form.hidden = false; }
  }

  // Secteur d'intervention déduit du code postal.
  function zone(cp) {
    const c = cp.replace(/\s/g, '');
    if (!/^\d{5}$/.test(c)) return '';
    if (c.startsWith('75')) {
      const n = parseInt(c.slice(3), 10);
      return (n >= 1 && n <= 20 ? 'Paris ' + n + (n === 1 ? 'er' : 'e') : 'Paris') + NB + ': secteur principal';
    }
    if (c === '92100') return 'Boulogne-Billancourt' + NB + ': secteur principal';
    if (c === '92200') return 'Neuilly-sur-Seine' + NB + ': secteur principal';
    if (/^(77|78|91|92|93|94|95)/.test(c)) return 'Île-de-France' + NB + ': nous nous déplaçons';
    return 'Hors Île-de-France' + NB + ': nous étudions votre demande';
  }
  form.elements.cp.addEventListener('input', () => {
    const z = zone(form.elements.cp.value);
    zoneEl.textContent = z ? '✓ ' + z : '';
    zoneEl.hidden = !z;
  });

  function setErr(name, msg) {
    form.elements[name].setAttribute('aria-invalid', msg ? 'true' : 'false');
    const el = $('err-' + name);
    el.textContent = msg;
    el.hidden = !msg;
  }
  ['nom', 'tel'].forEach(n => form.elements[n].addEventListener('input', () => setErr(n, '')));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    formErr.hidden = true;
    const el = form.elements;
    const data = {
      nom: el.nom.value.trim(),
      telephone: el.tel.value.trim(),
      projet: el.projet.value,
      code_postal: el.cp.value.trim(),
      precisions: el.msg.value.trim()
    };
    const errNom = data.nom ? '' : 'Indiquez votre nom.';
    const errTel = data.telephone.replace(/\D/g, '').length >= 10 ? '' : 'Un numéro à 10 chiffres, s’il vous plaît.';
    setErr('nom', errNom);
    setErr('tel', errTel);
    if (errNom || errTel) {
      const bad = errNom ? el.nom : el.tel;
      bad.focus();
      if (!reduced) bad.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 420, easing: EASE });
      return;
    }

    if (FORM_ENDPOINT) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours…';
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...data, _subject: 'Demande de rappel : ' + data.projet })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      } catch (err) {
        formErr.hidden = false;
        return;
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitLabel;
      }
    }

    const first = data.nom.split(/\s+/)[0];
    $('sentTitle').textContent = 'Merci' + (first ? ' ' + first : '') + ', c’est noté.';
    $('sentTel').textContent = data.telephone;
    $('sentProjet').textContent = data.projet.toLowerCase();
    form.hidden = true;
    sent.hidden = false;
    if (!reduced) sent.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: EXPO });
    $('sentTitle').focus();
  });
  $('sentEdit').addEventListener('click', () => { sent.hidden = true; form.hidden = false; form.elements.nom.focus(); });

  /* Boutons d'appel flottants : masqués quand le formulaire est à l'écran */
  new IntersectionObserver(([e]) => body.classList.toggle('devis-in', e.isIntersecting), { rootMargin: '0px 0px -25% 0px' }).observe($('devis'));

  /* Boutons : remplissage depuis le point d'entrée du curseur, effet aimanté */
  if (finePointer && !reduced) {
    const origin = (el, e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    };
    $$('.btn').forEach(el => {
      el.addEventListener('pointerenter', e => origin(el, e));
      el.addEventListener('pointerleave', e => { origin(el, e); el.style.translate = ''; });
      if (el.classList.contains('magnetic')) el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.translate = ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px';
      });
    });
  }

  /* Images : fondu à l'arrivée plutôt qu'un affichage brutal */
  $$('img').forEach(img => {
    if (!img.getAttribute('src') || img.closest('.slide:first-child') || (img.complete && img.naturalWidth)) return;
    img.classList.add('lz');
    const done = () => img.classList.add('is-loaded');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });

  /* Mise en route */
  function layout() { measureMarquees(); movePill(true); onScroll(window.scrollY, 0); }
  window.addEventListener('resize', layout);
  if (document.fonts) document.fonts.ready.then(layout);
  layout();
  if (!reduced) requestAnimationFrame(frame);
})();
