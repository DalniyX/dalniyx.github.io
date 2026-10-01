/* ============================================================
   DalniyX — поведение страниц.
   Моторика намеренно спокойная: длинные кривые, сглаженный
   скролл, никаких дёрганых эффектов.
   ============================================================ */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- данные сайта: ссылки и карточки проектов ----------
     Источник — assets/content.js, его правит Студия. */
  var DX = window.DX || {};

  function bindLinks() {
    var links = DX.links || {};
    $$('[data-link]').forEach(function (a) {
      var url = links[a.dataset.link];
      /* style.display, не атрибут hidden — у .btn/.support-item свой display
         (inline-flex/flex) с обычной специфичностью, он бы просто перебил
         [hidden]{display:none} из UA-стиля браузера (тот всегда наименее
         приоритетный, что бы ни было записано в самом правиле). */
      if (url) {
        a.setAttribute('href', url);
        a.removeAttribute('aria-hidden');
        a.style.display = '';
      } else {
        a.removeAttribute('href');       // без адреса это уже не ссылка
        a.setAttribute('aria-hidden', 'true');
        a.style.display = 'none';
      }
    });
  }
  bindLinks();

  var ICONS = {
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    board: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
    spark: '<path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/>'
  };
  var BADGE = { release: 'b-live', wip: 'b-wip', soon: 'b-soon', idea: 'b-idea' };

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function loc(v, lang) {
    if (v == null) return '';
    return typeof v === 'string' ? v : (v[lang] || v.ru || v.en || '');
  }
  function tr(key, lang) {
    var d = (DX.t && DX.t[lang]) || (DX.t && DX.t.ru) || {};
    return d[key] || '';
  }

  function num2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- имя и подпись в шапке (Студия → Заголовок) ----------
     В HTML лежит только запасной текст, настоящие значения — site.brand и
     site.brandSub. Последняя буква имени — акцентным цветом, как X у «DalniyX». */
  function applyBrand() {
    var s = DX.site || {};
    var name = String(s.brand || '').trim();
    if (name) $$('.brand-name').forEach(function (el) {
      el.innerHTML = esc(name.slice(0, -1)) + '<span class="x">' + esc(name.slice(-1)) + '</span>' +
        '<i class="cursor" aria-hidden="true"></i>';
    });
    if (s.brandSub != null) $$('.brand-sub').forEach(function (el) { el.textContent = s.brandSub; });
  }
  applyBrand();
  document.addEventListener('langchange', applyBrand);

  /* ---------- «вид карточки» (Студия → Проекты → cardStyle) ----------
     accordion (по умолчанию) — как всегда было: узкая колонка, текст
     раскрывается по наведению. feature — та же гармошка, но шире и с
     уже раскрытым содержимым, для одного акцентного проекта среди
     мелких. minimal — тоже всегда раскрыта, но без длинного абзаца:
     только заголовок, статус и кольцо прогресса — для раннего WIP,
     когда писать длинный текст ещё рано. */
  function ringHTML(progress) {
    var r = 15, c = 2 * Math.PI * r;
    var off = c * (1 - progress / 100);
    return '<span class="ring"><svg width="38" height="38" viewBox="0 0 38 38">' +
      '<circle cx="19" cy="19" r="' + r + '" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="3"/>' +
      '<circle cx="19" cy="19" r="' + r + '" fill="none" stroke="currentColor" stroke-width="3" ' +
      'stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) +
      '" transform="rotate(-90 19 19)"/></svg><b>' + progress + '%</b></span>';
  }

  /* Публично показываем только проекты без hidden:true (флаг ставится в
     Студии → Проекты → «Показывать на сайте»). Скрытые остаются в данных —
     просто не попадают ни на карточки, ни в бегущую строку, ни в фильтры. */
  function isPublic(p) { return !!p && p.hidden !== true; }

  /* Две группы для фильтров: «В релизе» — только status:release,
     «В разработке» — всё остальное (wip, soon, idea). */
  function groupOf(p) { return p.status === 'release' ? 'release' : 'wip'; }

  /* index — позиция проекта в DX.projects (по ней клик находит данные),
     pos — порядковый номер среди ВИДИМЫХ карточек (его и показываем) */
  function cardHTML(p, lang, index, pos) {
    var title = esc(lang === 'en' && p.titleEn ? p.titleEn : p.title);
    var style = p.cardStyle === 'feature' || p.cardStyle === 'minimal' ? p.cardStyle : 'accordion';
    var badge = '<span class="badge ' + (BADGE[p.status] || 'b-idea') + '">' +
      (p.status === 'release' ? '<span class="dot"></span>' : '') +
      esc(tr('status.' + p.status, lang)) + '</span>';
    var icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' +
      (p.accent === 'o' ? '#22150a' : '#0a0d11') +
      '" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">' +
      (ICONS[p.icon] || ICONS.spark) + '</svg>';
    var prog = p.progress == null ? '' :
      '<div class="foot"><div class="prog-head"><span>' + esc(tr('home.ready', lang)) +
      '</span><span>' + p.progress + '%</span></div><div class="prog"><i style="width:' + (+p.progress || 0) + '%"></i></div></div>';

    var body;
    if (style === 'minimal') {
      body = '<span class="ico ' + esc(p.accent) + ' sm">' + icon + '</span>' + badge +
        '<h3>' + title + '</h3>' +
        (loc(p.sub, lang) ? '<p class="sub">' + esc(loc(p.sub, lang)) + '</p>' : '') +
        (p.progress == null ? '' : ringHTML(p.progress));
    } else {
      body = '<span class="ico ' + esc(p.accent) + ' sm">' + icon + '</span>' + badge +
        '<h3>' + title + '</h3>' +
        (loc(p.sub, lang) ? '<p class="sub">' + esc(loc(p.sub, lang)) + '</p>' : '') +
        '<p class="txt">' + esc(loc(p.text, lang)) + '</p>' + prog;
    }
    var cat = groupOf(p);
    /* в покое — лапа, при наведении/раскрытии — кроссфейд на кота "no access"
       (см. .ac-cat-paw/.ac-cat-noaccess в style.css) */
    var noise = cat === 'wip' ? '<span class="ac-cat-art-wrap"><span class="ac-cat-paw" aria-hidden="true"></span><span class="ac-cat-noaccess" aria-hidden="true"></span></span>' +
      '<span class="ac-noise" aria-hidden="true"></span><span class="ac-glitch-bar" aria-hidden="true"></span>' : '';
    var img = p.image ? '<img class="ac-img" src="' + esc(p.image) + '" alt="" loading="lazy">' : '';
    var inner = img +
      '<span class="ac-num">' + num2(pos + 1) + '</span>' +
      '<span class="ac-label">' + title + '</span>' +
      '<div class="ac-body">' + body + '</div>' + noise;
    var hasImg = p.image ? ' has-img' : '';
    var styleClass = style === 'accordion' ? '' : ' style-' + style;
    /* Кнопка, не ссылка — у проекта больше нет отдельной страницы, клик
       открывает модалку (см. openProjectModal() ниже); data-idx связывает
       карточку с DX.projects[idx] в обработчике клика. */
    var noOpen = (p.details && p.details.enabled) || p.href ? '' : ' no-open';
    return '<button type="button" class="ac-col rv' + hasImg + styleClass + noOpen + '" data-idx="' + index +
      '" data-cat="' + cat + '" data-accent="' + esc(p.accent) + '" style="--i:' + pos + '">' + inner + '</button>';
  }

  var grid = $('#grid');
  var firstRender = true;
  var currentFilter = 'all';   // выбранный фильтр переживает перерисовку (смена языка)
  function setupAccordionTouch() {
    $$('.ac-col', grid).forEach(function (col) {
      col.addEventListener('click', function (e) {
        var isTouch = matchMedia('(hover: none)').matches;
        if (isTouch && !col.classList.contains('open')) {
          e.preventDefault();
          $$('.ac-col.open', grid).forEach(function (c) { if (c !== col) c.classList.remove('open'); });
          col.classList.add('open');
          return;
        }
        var p = DX.projects[+col.dataset.idx];
        if (!p) return;
        /* окно открывается только если в Студии включено «Окно проекта по клику»
           (details.enabled); иначе клик ведёт по «Ссылке», если она задана */
        if (p.details && p.details.enabled) openProjectModal(p, document.documentElement.lang || 'ru');
        else if (p.href) location.href = p.href;
      });
    });
  }
  function renderProjects() {
    if (!grid || !DX.projects) return;
    var lang = document.documentElement.lang || 'ru';
    var visible = [];
    DX.projects.forEach(function (p, i) { if (isPublic(p)) visible.push({ p: p, i: i }); });
    grid.innerHTML = visible.map(function (e, pos) { return cardHTML(e.p, lang, e.i, pos); }).join('');
    if (!firstRender) $$('.rv', grid).forEach(function (el) { el.classList.add('in'); });
    firstRender = false;
    syncFilters(visible);
    setupAccordionTouch();
    updateAccordionNav();
  }

  /* Кнопки фильтров показываются только если у них есть что показать; когда
     видимые проекты все из одной группы, сам ряд фильтров прячется — иначе
     «В разработке» вёл бы на пустую гармошку. Выбранный фильтр применяется
     сразу после перерисовки (без анимации). */
  function syncFilters(visible) {
    var count = { release: 0, wip: 0 };
    visible.forEach(function (e) { count[groupOf(e.p)]++; });
    var btns = $$('.f-btn');
    btns.forEach(function (b) {
      var f = b.dataset.f;
      b.style.display = (f === 'all' || count[f]) ? '' : 'none';
    });
    var row = $('.filters');
    if (row) row.style.display = (count.release && count.wip) ? '' : 'none';
    if (currentFilter !== 'all' && !count[currentFilter]) currentFilter = 'all';
    btns.forEach(function (b) { b.classList.toggle('on', b.dataset.f === currentFilter); });
    $$('#grid > [data-cat]').forEach(function (card) {
      card.style.display = (currentFilter === 'all' || card.dataset.cat === currentFilter) ? '' : 'none';
    });
  }

  /* ---------- гармошка: стрелки прокрутки, если проектов много ----------
     Пока все колонки помещаются по min-width — просто делят ширину поровну
     (flex-grow), стрелки скрыты. Как только не помещаются — .accordion сам
     становится scroll-контейнером (overflow-x:auto), а эти кнопки —
     необязательное ручное управление тем же скроллом. */
  var acPrev = $('#acPrev'), acNext = $('#acNext');
  function updateAccordionNav() {
    if (!grid || !acPrev || !acNext) return;
    var overflowing = grid.scrollWidth > grid.clientWidth + 2;
    acPrev.hidden = acNext.hidden = !overflowing;
    acPrev.classList.toggle('show', overflowing);
    acNext.classList.toggle('show', overflowing);
  }
  if (acPrev && acNext && grid) {
    acPrev.addEventListener('click', function () { grid.scrollBy({ left: -240, behavior: reduce ? 'auto' : 'smooth' }); });
    acNext.addEventListener('click', function () { grid.scrollBy({ left: 240, behavior: reduce ? 'auto' : 'smooth' }); });
    addEventListener('resize', updateAccordionNav);
  }

  /* кот «no access» на раскрытой WIP-карточке чуть смещается вслед за
     курсором (--mx/--my, см. .ac-cat-noaccess в style.css) — будто смотрит */
  if (grid && matchMedia('(hover: hover)').matches) {
    var lookCol = null;
    var resetLook = function (col) { col.style.setProperty('--mx', 0); col.style.setProperty('--my', 0); };
    grid.addEventListener('mousemove', function (e) {
      var col = e.target.closest('.ac-col[data-cat="wip"]');
      if (lookCol && lookCol !== col) resetLook(lookCol);
      lookCol = col;
      if (!col) return;
      var r = col.getBoundingClientRect();
      col.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      col.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
    grid.addEventListener('mouseleave', function () { if (lookCol) resetLook(lookCol); lookCol = null; });
  }

  renderProjects();
  document.addEventListener('langchange', renderProjects);

  /* ---------- бегущая строка: только проекты в релизе ----------
     Названия повторяются, пока не наберётся MIN_ITEMS, и только затем
     набор дублируется 2× для бесшовного translateX(-50%)-цикла. Но если
     публичных релизных проектов меньше двух, строка превратилась бы в одно
     и то же слово много раз — тогда она скрыта целиком. */
  var marqueeTrack = $('#marqueeTrack');
  var marqueeBox = $('#marquee');
  var MARQUEE_MIN_ITEMS = 10;
  function renderMarquee() {
    if (!marqueeTrack) return;
    var released = (DX.projects || []).filter(function (p) { return isPublic(p) && p.status === 'release'; });
    if (released.length < 2) { if (marqueeBox) marqueeBox.hidden = true; return; }
    if (marqueeBox) marqueeBox.hidden = false;
    var lang = document.documentElement.lang || 'ru';
    var names = released.map(function (p) {
      return esc(lang === 'en' && p.titleEn ? p.titleEn : p.title);
    });
    var set = [];
    while (set.length < MARQUEE_MIN_ITEMS) set = set.concat(names);
    var itemsHTML = set.map(function (title) {
      return '<span class="marquee-item"><b>' + title + '</b><i></i></span>';
    }).join('');
    marqueeTrack.innerHTML = itemsHTML + itemsHTML;
  }
  renderMarquee();
  document.addEventListener('langchange', renderMarquee);

  /* ---------- новогодний снег (включается в Студии: Ссылки → Общее) ----------
     Лёгкий canvas на весь экран, position:fixed, кликов не перехватывает.
     Количество снежинок считается от площади экрана — на телефоне их
     меньше. Уважает prefers-reduced-motion — тогда снега просто нет.
     Необязательный диапазон дат «ДД.ММ» — переход через Новый год (например
     01.12–15.01) обрабатывается отдельно, потому что конец диапазона меньше
     начала по числу месяца. Оба поля пустые/некорректные — снег идёт всегда,
     пока включён общий переключатель. */
  function snowInRange(from, to) {
    var parse = function (s) {
      var m = /^(\d{2})\.(\d{2})$/.exec(s || '');
      return m ? (parseInt(m[2], 10) * 100 + parseInt(m[1], 10)) : null;
    };
    var f = parse(from), t = parse(to);
    if (f == null || t == null) return true;
    var now = new Date(), n = (now.getMonth() + 1) * 100 + now.getDate();
    return f <= t ? (n >= f && n <= t) : (n >= f || n <= t);
  }

  if (DX.site && DX.site.snow && !reduce && snowInRange(DX.site.snowFrom, DX.site.snowTo)) {
    var snowCanvas = document.createElement('canvas');
    snowCanvas.id = 'snow';
    snowCanvas.setAttribute('aria-hidden', 'true');
    snowCanvas.style.cssText = 'position:fixed;inset:0;z-index:6;pointer-events:none';
    document.body.appendChild(snowCanvas);
    var sctx = snowCanvas.getContext('2d');
    var flakes = [];
    function flakeCount() { return Math.max(24, Math.min(90, Math.round(innerWidth * innerHeight / 16000))); }
    function makeFlake() {
      return {
        x: Math.random() * innerWidth, y: Math.random() * innerHeight - innerHeight,
        r: 1 + Math.random() * 2.1, speed: .35 + Math.random() * .85,
        drift: Math.random() * .7 - .35, phase: Math.random() * Math.PI * 2
      };
    }
    function resizeSnow() {
      snowCanvas.width = innerWidth; snowCanvas.height = innerHeight;
      var need = flakeCount();
      while (flakes.length < need) flakes.push(makeFlake());
      flakes.length = need;
    }
    resizeSnow();
    addEventListener('resize', resizeSnow);
    (function snowLoop() {
      sctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
      sctx.fillStyle = 'rgba(255,255,255,.8)';
      flakes.forEach(function (f) {
        f.phase += .012;
        f.x += Math.sin(f.phase) * f.drift;
        f.y += f.speed;
        if (f.y > innerHeight + 4) { f.y = -4; f.x = Math.random() * innerWidth; }
        if (f.x > innerWidth + 4) f.x = -4; else if (f.x < -4) f.x = innerWidth + 4;
        sctx.beginPath();
        sctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        sctx.fill();
      });
      requestAnimationFrame(snowLoop);
    })();
  }

  /* ---------- магнитные кнопки ----------
     Кнопка чуть тянется к курсору внутри своих границ — только на устройствах
     с настоящим hover (мышь), не на тач-экранах, и не при reduced-motion. */
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('.btn').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5;
        var y = (e.clientY - r.top) / r.height - .5;
        btn.style.transform = 'translate(' + (x * 8).toFixed(1) + 'px,' + (y * 8).toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }

  /* ---------- мягкий скролл с собственной кривой ---------- */
  var scrollAnim = null;
  function easeInOutQuint(t) {
    return t < .5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
  }
  function stopScroll() { scrollAnim = null; }
  function smoothTo(targetY, duration) {
    var maxY = document.documentElement.scrollHeight - innerHeight;
    var to = Math.max(0, Math.min(targetY, maxY));
    if (reduce) { scrollTo(0, to); return; }
    var from = scrollY, dist = to - from, start = performance.now();
    var dur = duration || Math.min(1400, Math.max(700, Math.abs(dist) * .55));
    var id = {};
    scrollAnim = id;
    (function frame(now) {
      if (scrollAnim !== id) return;
      var t = Math.min(1, (now - start) / dur);
      scrollTo(0, from + dist * easeInOutQuint(t));
      if (t < 1) requestAnimationFrame(frame); else scrollAnim = null;
    })(start);
  }
  ['wheel', 'touchstart', 'mousedown'].forEach(function (ev) {
    addEventListener(ev, stopScroll, { passive: true });
  });

  function scrollToEl(el) {
    if (!el) return;
    var top = el.getBoundingClientRect().top + scrollY;
    var isSlide = el.classList.contains('slide');
    smoothTo(isSlide ? top : top - 90);
  }

  /* якоря внутри страницы ведут себя так же плавно */
  $$('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute('href');
    if (!id || id === '#' || id.length < 2) return;
    a.addEventListener('click', function (e) {
      var el = document.getElementById(id.slice(1));
      if (!el) return;
      e.preventDefault();
      scrollToEl(el);
      history.replaceState(null, '', id);
    });
  });

  /* ---------- шапка, полоса прогресса и кнопка «наверх» ---------- */
  var hdr = $('header'), bar = $('.progress-top'), toTop = $('#toTop');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (hdr) hdr.classList.toggle('stuck', scrollY > 24);
      if (bar) {
        var max = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
      }
      if (toTop) toTop.classList.toggle('show', scrollY > innerHeight * .8);
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { smoothTo(0); });

  /* ---------- мобильное меню ---------- */
  var burger = $('#burger'), mobile = $('#mobile'), menuOpen = false;
  function setMenu(v) {
    if (!mobile || !burger) return;
    menuOpen = v;
    mobile.style.maxHeight = v ? mobile.scrollHeight + 'px' : '0px';
    burger.classList.toggle('on', v);
    burger.setAttribute('aria-expanded', String(v));
  }
  if (burger) burger.addEventListener('click', function () { setMenu(!menuOpen); });
  if (mobile) $$('a,button', mobile).forEach(function (el) {
    el.addEventListener('click', function () { setMenu(false); });
  });

  /* ---------- появление блоков ---------- */
  var slides = $$('.slide');
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var items = $$('.rv, .rv-wipe', e.target);
      items.forEach(function (el, i) {
        var delay = Math.min(i, 8) * 90;
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('in');
        /* transition-delay — инлайновый стиль, значит держится на элементе
           вечно и тормозит вообще ЛЮБОЙ следующий переход на нём (hover
           карточек, раскрытие гармошки проектов) той же задержкой в 90-720мс.
           Как только появление доиграло — снимаем задержку, дальше переходы
           идут по своим правилам из CSS. */
        setTimeout(function () { el.style.transitionDelay = ''; }, delay + 1150);
      });
      revealObserver.unobserve(e.target);
    });
  }, { threshold: .06, rootMargin: '0px 0px -6% 0px' });

  if (slides.length) slides.forEach(function (s) { revealObserver.observe(s); });
  else $$('.rv, .rv-wipe').forEach(function (el) { el.classList.add('in'); });

  /* ---------- фильтры проектов ---------- */
  var fbtns = $$('.f-btn');
  fbtns.forEach(function (b) {
    b.addEventListener('click', function () {
      fbtns.forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var f = b.dataset.f;
      currentFilter = f;
      $$('#grid > [data-cat]').forEach(function (card) {
        var show = f === 'all' || card.dataset.cat === f;
        if (show) {
          card.style.display = '';
          requestAnimationFrame(function () { card.style.opacity = 1; card.style.transform = ''; });
        } else {
          card.style.opacity = 0;
          card.style.transform = 'translateY(8px)';
          setTimeout(function () {
            if (!(f === 'all' || card.dataset.cat === f)) card.style.display = 'none';
          }, 500);
        }
      });
    });
  });

  /* ---------- навигация по секциям ---------- */
  var navLinks = $$('#nav a[href^="#"]');
  var deck = slides.filter(function (s) { return s.dataset.label; });
  var dotsBox = null, current = 0;

  function buildDots() {
    if (deck.length < 2 || innerWidth <= 1020 || dotsBox) return;
    dotsBox = document.createElement('div');
    dotsBox.className = 'dots';
    deck.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', s.dataset.label);
      b.innerHTML = '<span></span>';
      b.addEventListener('click', function () { goTo(i); });
      dotsBox.appendChild(b);
    });
    document.body.appendChild(dotsBox);
    syncDotLabels();
    markActive(current);
  }
  function syncDotLabels() {
    if (!dotsBox) return;
    $$('button', dotsBox).forEach(function (b, i) {
      var label = deck[i].dataset['label' + (document.documentElement.lang === 'en' ? 'En' : '')] || deck[i].dataset.label;
      b.setAttribute('aria-label', label);
      var s = $('span', b);
      if (s) s.textContent = label;
    });
  }
  function markActive(i) {
    current = i;
    if (dotsBox) $$('button', dotsBox).forEach(function (b, k) { b.classList.toggle('on', k === i); });
    var id = deck[i] && deck[i].id;
    if (id) navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
  }
  function goTo(i) {
    if (i < 0 || i >= deck.length) return;
    markActive(i);
    scrollToEl(deck[i]);
  }

  if (deck.length) {
    buildDots();
    document.addEventListener('langchange', syncDotLabels);

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = deck.indexOf(e.target);
        if (i >= 0) markActive(i);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    deck.forEach(function (s) { spy.observe(s); });

    addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      if ($('dialog[open]')) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(current + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(current - 1); }
      else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
      else if (e.key === 'End') { e.preventDefault(); goTo(deck.length - 1); }
    });
  }

  /* ---------- сглаженный параллакс визуалов ---------- */
  var parallax = $$('[data-parallax]').map(function (el) {
    return { el: el, k: +(el.dataset.parallax || 6), cur: 0 };
  });
  if (parallax.length && !reduce) {
    (function frame() {
      var vh = innerHeight;
      parallax.forEach(function (p) {
        var r = p.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var center = r.top + r.height / 2;
        var target = ((center - vh / 2) / vh) * p.k * -1;
        p.cur = lerp(p.cur, target, .06);
        p.el.style.transform = 'translate3d(0,' + p.cur.toFixed(2) + 'px,0)';
      });
      requestAnimationFrame(frame);
    })();
  }

  /* ---------- прогресс-скраб секций ----------
     Приём подсмотрен у gitverse.ru: блок въезжает слегка уменьшённым
     и приглушённым, на выходе так же мягко уходит назад. Значения
     привязаны к положению секции в окне, а не к таймеру. */
  /* на телефонах эффект отключён: там он только ест батарею */
  var scrub = innerWidth > 880 ? $$('[data-scrub]') : [];
  if (scrub.length && !reduce) {
    var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    (function frame() {
      var vh = innerHeight;
      scrub.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -300 || r.top > vh + 300) return;
        var pIn = clamp((vh * .92 - r.top) / (vh * .55), 0, 1);
        var pOut = clamp((vh * .5 - r.bottom) / (vh * .5), 0, 1);
        var t = pIn * (1 - pOut * .7);
        el.style.opacity = (.4 + .6 * t).toFixed(3);
        el.style.transform = 'translate3d(0,' + ((1 - t) * 20).toFixed(1) + 'px,0) scale(' + (.955 + .045 * t).toFixed(4) + ')';
      });
      requestAnimationFrame(frame);
    })();
  }

  /* ---------- аккордеон ---------- */
  var accItems = $$('.acc-item');
  function setAcc(item, open) {
    var a = $('.acc-a', item);
    item.classList.toggle('open', open);
    $('.acc-q', item).setAttribute('aria-expanded', String(open));
    if (a) a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
  }
  accItems.forEach(function (item, i) {
    var q = $('.acc-q', item);
    if (!q) return;
    q.addEventListener('click', function () {
      var willOpen = !item.classList.contains('open');
      accItems.forEach(function (other) { setAcc(other, false); });
      setAcc(item, willOpen);
    });
    setAcc(item, i === 0);
  });
  if (accItems.length) document.addEventListener('langchange', function () {
    setTimeout(function () {
      accItems.forEach(function (item) {
        if (item.classList.contains('open')) setAcc(item, true);
      });
    }, 30);
  });

  /* ---------- закреплённая картинка в шапке ----------
     .hero-fixed стоит position:fixed, #top — пустой распорщик той
     же высоты, что и экран. Пока прокручивается #top, здесь:
       - картинка едва заметно наезжает зумом (эффект Ken Burns);
       - текст уезжает вверх и гаснет — быстрее, чем едет зум.
     Когда #top прокручен целиком, секция #intro уже закрыла картинку
     собой — дальше можно ничего не считать. Уважает
     prefers-reduced-motion: тогда ни зума, ни угасания, картинка
     просто стоит на месте. */
  var heroBg = $('#heroBg');
  var heroSpacer = $('#top');
  var heroCopy = $('#heroCopy');
  var scrollHint = $('#scrollHint');

  if (heroBg && heroSpacer && !reduce) {
    var heroH = 0;
    function measureHero() { heroH = heroSpacer.getBoundingClientRect().height || innerHeight; }
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    /* Без rAF-троттлинга нарочно: сам 'scroll' уже достаточно редкий
       и дешёвый (несколько присваиваний style), а лишний слой через
       requestAnimationFrame в некоторых окружениях срабатывает не на
       каждый кадр — эффект залипал на первом значении. */
    function applyHeroScroll() {
      var y = clamp01(scrollY / (heroH || 1)) * heroH;

      var zoomT = heroH ? y / heroH : 0;
      heroBg.style.transform = 'scale(' + (1 + zoomT * 0.12).toFixed(4) + ')';

      var fadeT = clamp01(y / (heroH * 0.62 || 1));
      if (heroCopy) {
        heroCopy.style.opacity = (1 - fadeT).toFixed(3);
        heroCopy.style.transform = 'translateY(' + (-fadeT * 90).toFixed(1) + 'px)';
      }
      if (scrollHint) scrollHint.style.opacity = (1 - clamp01(y / 150)).toFixed(3);
    }

    measureHero();
    applyHeroScroll();
    addEventListener('scroll', applyHeroScroll, { passive: true });
    addEventListener('resize', function () { measureHero(); applyHeroScroll(); });
  }

  /* ---------- фоновое видео шапки: пауза за кадром и при reduced-motion ---------- */
  if (heroBg && heroBg.tagName === 'VIDEO') {
    if (reduce) {
      heroBg.pause();
    } else {
      var heroPlayObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) heroBg.play().catch(function () {});
          else heroBg.pause();
        });
      }, { threshold: 0.01 });
      if (heroSpacer) heroPlayObserver.observe(heroSpacer);
    }
  }

  /* ---------- диалоги: общий open/close, дальше только контент ---------- */
  function wireDialog(dlg) {
    if (!dlg) return null;
    var open = function (e) {
      if (e) e.preventDefault();
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
      requestAnimationFrame(function () { dlg.classList.add('shown'); });
    };
    var close = function () {
      dlg.classList.remove('shown');
      setTimeout(function () { dlg.close ? dlg.close() : dlg.removeAttribute('open'); }, 260);
    };
    $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', close); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    return { open: open, close: close };
  }

  /* ---------- модалка поддержки ----------
     site.showSupport=false скрывает кнопки «Поддержать» целиком (шапка, мобильное
     меню, финальный блок), даже если ссылки заполнены — общий рубильник отдельно
     от того, что уже делает bindLinks() для отдельных площадок. Кнопки также
     скрыты, если ни у одной площадки в окне нет ссылки: иначе они открывали бы
     пустое окно. */
  var hasSupportLink = $$('#support [data-link]').some(function (a) {
    return !!(DX.links || {})[a.dataset.link];
  });
  var showSupport = (!DX.site || DX.site.showSupport !== false) && hasSupportLink;
  if (!showSupport) {
    $$('[data-support]').forEach(function (b) { b.style.display = 'none'; });
  }
  var supportDialog = showSupport && wireDialog($('#support'));
  if (supportDialog) $$('[data-support]').forEach(function (b) { b.addEventListener('click', supportDialog.open); });

  /* ---------- модалка проекта ----------
     Всё наполнение — из project.details (правится в Студии → Проекты):
     layout 'cover' | 'compact', cover (иначе берётся превью карточки image),
     color (#rrggbb, иначе цвет иконки проекта), version/date/platforms/price
     (строка фактов), features, две кнопки externalUrl/secondaryUrl. */
  var projectDialog = wireDialog($('#projectModal'));
  var pmCurrent = null;
  var ACCENT_HEX = { o: '#ff9a4d', s: '#87a5b8', v: '#a894f5', g: '#66d5a0' };
  var ARROW_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';
  var CHECK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  function openProjectModal(p, lang) {
    if (!projectDialog) return;
    fillProjectModal(p, lang);
    if (!$('#projectModal').open) projectDialog.open();
  }

  function fillProjectModal(p, lang) {
    pmCurrent = p;
    var d = p.details || {};
    var box = $('#projectModal .project-modal-box');
    box.style.setProperty('--pm-acc', /^#[0-9a-f]{6}$/i.test(d.color || '') ? d.color : (ACCENT_HEX[p.accent] || ACCENT_HEX.o));
    var cover = d.layout === 'compact' ? '' : (d.cover || p.image || '');
    box.classList.toggle('has-cover', !!cover);
    $('#pmCover').innerHTML = cover ? '<img src="' + esc(cover) + '" alt="">' : '';
    box.scrollTop = 0;

    var icon = $('#pmIcon');
    if (icon) {
      icon.className = 'ico ' + esc(p.accent) + ' sm';
      icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' +
        (p.accent === 'o' ? '#22150a' : '#0a0d11') + '" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">' +
        (ICONS[p.icon] || ICONS.spark) + '</svg>';
    }
    var statusEl = $('#pmStatus');
    if (statusEl) {
      statusEl.className = 'badge ' + (BADGE[p.status] || 'b-idea');
      statusEl.innerHTML = (p.status === 'release' ? '<span class="dot"></span>' : '') + esc(tr('status.' + p.status, lang));
    }
    var title = lang === 'en' && p.titleEn ? p.titleEn : p.title;
    if ($('#pmTitle')) $('#pmTitle').textContent = title;

    // details.hide.<поле> === true — поле выключено в Студии: текст хранится, но не показывается
    var hide = d.hide || {};

    var tagline = hide.tagline ? '' : loc(d.tagline, lang);
    var taglineEl = $('#pmTagline');
    taglineEl.innerHTML = tagline || '';
    taglineEl.style.display = tagline ? '' : 'none';

    var lead = hide.lead ? '' : (loc(d.lead, lang) || loc(p.text, lang) || '');
    var leadEl = $('#pmLead');
    leadEl.textContent = lead;
    leadEl.style.display = lead ? '' : 'none';

    var facts = hide.facts ? [] : [
      ['pm.version', d.version], ['pm.date', loc(d.date, lang)],
      ['pm.platforms', loc(d.platforms, lang)], ['pm.price', loc(d.price, lang)]
    ].filter(function (f) { return f[1]; });
    var factsEl = $('#pmFacts');
    factsEl.innerHTML = facts.map(function (f) {
      return '<div class="pm-fact"><small>' + esc(tr(f[0], lang)) + '</small><span>' + esc(f[1]) + '</span></div>';
    }).join('');
    factsEl.style.display = facts.length ? '' : 'none';

    var features = hide.features ? [] : (d.features || []).map(function (f) { return loc(f, lang); }).filter(Boolean);
    var featuresEl = $('#pmFeatures');
    featuresEl.innerHTML = features.map(function (f) { return '<li><i>' + CHECK_SVG + '</i>' + esc(f) + '</li>'; }).join('');
    featuresEl.style.display = features.length ? '' : 'none';

    var cta = '';
    if (d.externalUrl && !hide.primary) {
      cta += '<a class="btn btn-primary" href="' + esc(d.externalUrl) + '" target="_blank" rel="noopener"><span>' +
        esc(loc(d.externalLabel, lang) || tr('pm.open', lang) || 'Открыть') + '</span>' + ARROW_SVG + '</a>';
    }
    if (d.secondaryUrl && !hide.secondary) {
      cta += '<a class="btn btn-ghost" href="' + esc(d.secondaryUrl) + '" target="_blank" rel="noopener"><span>' +
        esc(loc(d.secondaryLabel, lang) || 'GitHub') + '</span>' + ARROW_SVG + '</a>';
    }
    var ctaEl = $('#pmCta');
    ctaEl.innerHTML = cta;
    ctaEl.style.display = cta ? '' : 'none';
  }

  document.addEventListener('langchange', function () {
    var dlgEl = $('#projectModal');
    if (pmCurrent && dlgEl && dlgEl.open) fillProjectModal(pmCurrent, document.documentElement.lang || 'ru');
  });

  /* ---------- предпросмотр из Студии ----------
     Студия открывает сайт у себя в iframe с ?studio-preview и передаёт сюда
     свои ТЕКУЩИЕ (ещё не сохранённые) данные — так правки видно до сохранения
     и публикации. Повторный apply() i18n шлёт langchange, а на него уже
     подписаны тексты, карточки, бегущая строка, шапка и открытое окно
     проекта (оно перерисуется из pmCurrent — берём свежую версию проекта).
     На обычном сайте этого хука нет. */
  if (/[?&]studio-preview\b/.test(location.search)) {
    window.DXPreview = {
      show: function (data) {
        if (pmCurrent) pmCurrent = data.projects[DX.projects.indexOf(pmCurrent)] || null;
        DX = window.DX = data;
        if (window.DXi18n) {
          window.DXi18n.setDict(data.t);
          window.DXi18n.apply(document.documentElement.lang || 'ru');
        }
      }
    };
  }
})();
