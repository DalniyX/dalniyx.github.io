/* ============================================================
   DalniyX — локализация.
   Сами тексты лежат в assets/content.js (window.DX.t) и правятся
   через Студию. Здесь только логика: определение языка, подстановка
   в разметку и переключатель RU/EN.
   В разметке: <p data-t="home.lead"></p>
   ============================================================ */
(function () {
  'use strict';

  var DICT = (window.DX && window.DX.t) || { ru: {}, en: {} };
  var STORAGE_KEY = 'dx-lang';

  function detect() {
    var saved;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { saved = null; }
    if (saved === 'ru' || saved === 'en') return saved;
    var forced = window.DX && window.DX.site && window.DX.site.defaultLang;
    if (forced === 'ru' || forced === 'en') return forced;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return /^(ru|be|uk|kk)/i.test(nav) ? 'ru' : 'en';
  }

  function t(key, lang) {
    var d = DICT[lang || document.documentElement.lang] || DICT.ru || {};
    return d[key] != null ? d[key] : ((DICT.ru && DICT.ru[key]) || '');
  }

  function apply(lang) {
    var dict = DICT[lang] || DICT.ru || {};
    var page = document.body.dataset.page || 'home';

    document.documentElement.lang = lang;

    [].forEach.call(document.querySelectorAll('[data-t]'), function (el) {
      var v = dict[el.dataset.t];
      if (v != null) el.innerHTML = v;
    });
    [].forEach.call(document.querySelectorAll('[data-t-aria]'), function (el) {
      var v = dict[el.dataset.tAria];
      if (v != null) el.setAttribute('aria-label', v);
    });

    var titleKey = page === 'narrata' ? 'nar.title' : 'home.title';
    var descKey = page === 'narrata' ? 'nar.desc' : 'home.desc';
    if (dict[titleKey]) document.title = dict[titleKey];
    var meta = document.querySelector('meta[name="description"]');
    if (meta && dict[descKey]) meta.setAttribute('content', dict[descKey]);

    var box = document.getElementById('lang');
    if (box) {
      box.dataset.lang = lang;
      [].forEach.call(box.querySelectorAll('button'), function (b) {
        b.classList.toggle('on', b.dataset.langSet === lang);
      });
    }

    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  function set(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* приватный режим */ }
    apply(lang);
  }

  function init() {
    apply(detect());
    var box = document.getElementById('lang');
    if (box) [].forEach.call(box.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () { set(b.dataset.langSet); });
    });
    document.documentElement.classList.add('ready');
  }

  // setDict — для предпросмотра в Студии: подменить словарь на несохранённые тексты
  function setDict(d) { DICT = d || { ru: {}, en: {} }; }

  window.DXi18n = { set: set, apply: apply, current: detect, t: t, setDict: setDict };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
