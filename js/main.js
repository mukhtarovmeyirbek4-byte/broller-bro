/* Общий код для всех страниц: язык, шапка, подвал, данные пород, «Моя партия». */
(function () {
  "use strict";

  const LANG = window.LANG || {};
  const BREEDS = window.BREEDS || {};
  const PHASES = window.FEED_PHASES || [];
  const App = (window.App = {});
  const listeners = [];

  // Пункты меню: [файл, ключ текста]
  const PAGES = [
    ["index.html", "nav.home"],
    ["feeding.html", "nav.feeding"],
    ["growth.html", "nav.growth"],
    ["calculator.html", "nav.calculator"],
  ];

  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* не страшно */ }
  }

  const state = { lang: "ru", breed: Object.keys(BREEDS)[0] };
  const savedLang = load("broiler-lang");
  if (savedLang && LANG[savedLang]) state.lang = savedLang;
  const savedBreed = load("broiler-breed");
  if (savedBreed && BREEDS[savedBreed]) state.breed = savedBreed;

  /* ---------- Тексты ---------- */

  App.lang = () => state.lang;

  // Текст по ключу. Если перевода нет — берём русский, чтобы на странице не было пустоты.
  App.t = function (key, vars) {
    const dict = LANG[state.lang] || {};
    let s = key in dict ? dict[key] : LANG.ru && key in LANG.ru ? LANG.ru[key] : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  };

  App.fmt = function (n, decimals = 0) {
    if (!isFinite(n)) n = 0;
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  };

  App.onLangChange = (fn) => listeners.push(fn);

  App.setLang = function (code) {
    if (!LANG[code]) return;
    state.lang = code;
    save("broiler-lang", code);
    apply();
  };

  /* ---------- Породы ---------- */

  App.breed = () => state.breed;

  App.setBreed = function (id) {
    if (!BREEDS[id]) return;
    state.breed = id;
    save("broiler-breed", id);
  };

  // Строки породы с подсчитанным привесом и накопленным кормом.
  App.breedRows = function (id) {
    const breed = BREEDS[id] || BREEDS[state.breed];
    let cumFeed = 0;
    let prev = null;
    return breed.days.map(([day, weight, feed]) => {
      cumFeed += feed;
      const row = { day, weight, feed, gain: prev === null ? 0 : weight - prev, cumFeed };
      prev = weight;
      return row;
    });
  };

  App.maxDay = (id) => {
    const d = (BREEDS[id] || BREEDS[state.breed]).days;
    return d[d.length - 1][0];
  };

  App.phaseFor = (day) => PHASES.find((p) => day >= p.from && day <= p.to);

  // Заполняет выпадающий список пород и следит за выбором.
  App.breedSelect = function (select, onChange) {
    select.innerHTML = Object.keys(BREEDS)
      .map((id) => `<option value="${id}">${BREEDS[id].name}</option>`)
      .join("");
    select.value = state.breed;
    select.addEventListener("change", () => {
      App.setBreed(select.value);
      onChange();
    });
  };

  /* ---------- «Моя партия» ---------- */
  // Хранится в браузере фермера: { start: "2026-10-20", birds: 100, breed: "ross308" }

  App.batch = function () {
    try {
      const b = JSON.parse(load("broiler-batch"));
      return b && b.start ? b : null;
    } catch (e) {
      return null;
    }
  };

  App.saveBatch = function (batch) {
    save("broiler-batch", batch ? JSON.stringify(batch) : null);
    if (batch && BREEDS[batch.breed]) App.setBreed(batch.breed);
  };

  // День выращивания: день заселения = 1-й день. 0 или меньше — партия ещё не заселена.
  App.batchDay = function (batch) {
    batch = batch || App.batch();
    if (!batch) return null;
    const [y, m, d] = batch.start.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((today - start) / 86400000) + 1;
  };

  /* ---------- Шапка и подвал ---------- */

  function renderHeader() {
    const el = document.getElementById("site-header");
    if (!el) return;
    const current = location.pathname.split("/").pop() || "index.html";
    const nav = PAGES.map(
      ([href, key]) =>
        `<a href="${href}" data-i18n="${key}"${href === current ? ' aria-current="page"' : ""}></a>`
    ).join("");
    const langs = Object.keys(LANG)
      .map((code) => `<button type="button" data-lang="${code}">${LANG[code]["lang.label"]}</button>`)
      .join("");
    el.innerHTML = `
      <div class="wrap header-inner">
        <a class="brand" href="index.html">
          <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <ellipse cx="16" cy="18" rx="11" ry="12" fill="#f5c542"/>
            <circle cx="20" cy="14" r="1.8" fill="#2b2b2b"/>
            <path d="M26 16 L31 17.5 L26 19 Z" fill="#e07a1f"/>
          </svg>
          <span class="brand-name"></span>
        </a>
        <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav">
          <span class="nav-toggle-bars" aria-hidden="true"></span>
          <span data-i18n="nav.menu"></span>
        </button>
        <div class="header-menu" id="site-nav">
          <nav class="nav">${nav}</nav>
          <div class="lang-switch" role="group" aria-label="Language">${langs}</div>
        </div>
      </div>`;
    el.querySelectorAll("[data-lang]").forEach((b) =>
      b.addEventListener("click", () => App.setLang(b.dataset.lang))
    );
    const toggle = el.querySelector(".nav-toggle");
    toggle.addEventListener("click", () => {
      const open = el.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // +998933003926 → +998 93 300 39 26
  function prettyPhone(p) {
    const d = p.replace(/\D/g, "");
    const m = d.match(/^998(\d{2})(\d{3})(\d{2})(\d{2})$/);
    return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
  }

  function renderFooter() {
    const el = document.getElementById("site-footer");
    if (!el) return;
    const phone = (window.SITE && window.SITE.adPhone) || "";
    const ad = phone
      ? `<aside class="ad-box">
          <div>
            <p class="ad-title" data-i18n="ad.title"></p>
            <p class="ad-text" data-i18n="ad.text"></p>
          </div>
          <a class="ad-phone" href="tel:${phone.replace(/[^\d+]/g, "")}">${prettyPhone(phone)}</a>
        </aside>`
      : "";
    el.innerHTML = `<div class="wrap">${ad}<p><b data-i18n="site.name"></b> · <span data-i18n="site.tagline"></span></p><p data-i18n="footer.disclaimer"></p></div>`;
  }

  // Последнее слово названия выделяется цветом: BROLLER <b>BRO</b>
  function renderBrand() {
    const name = App.t("site.name");
    const i = name.lastIndexOf(" ");
    const html = i > 0 ? `${name.slice(0, i)} <b>${name.slice(i + 1)}</b>` : name;
    document.querySelectorAll(".brand-name").forEach((el) => (el.innerHTML = html));
  }

  // Подставляет тексты нужного языка во все элементы с data-i18n.
  function apply() {
    document.documentElement.lang = App.t("lang.code");
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = App.t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = App.t(el.dataset.i18nHtml);
    });
    renderBrand();
    const titleKey = document.body.dataset.title;
    document.title = (titleKey ? App.t(titleKey) + " · " : "") + App.t("site.name");
    document.querySelectorAll("[data-lang]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang));
    });
    listeners.forEach((fn) => fn());
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderHeader();
    renderFooter();
    apply();
  });
})();
