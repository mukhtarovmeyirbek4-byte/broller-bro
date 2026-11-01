/* Главная страница: блок «Моя партия», календарь и памятка на неделю. План по дням — в js/plan.js. */
(function () {
  "use strict";

  const t = App.t;
  const form = document.getElementById("batch-form");
  const startEl = document.getElementById("batch-start");
  const birdsEl = document.getElementById("batch-birds");
  const breedEl = document.getElementById("breed");
  const todayEl = document.getElementById("batch-today");
  const clearBtn = document.getElementById("batch-clear");
  const memoEl = document.getElementById("memo");
  const SALE_DAY = App.SALE_DAY;

  function fillForm() {
    const b = App.batch();
    startEl.value = b ? b.start : App.todayISO();
    birdsEl.value = b ? b.birds : 100;
    if (b && window.BREEDS[b.breed]) breedEl.value = b.breed;
    clearBtn.hidden = !b;
  }

  function tile(label, value, extra = "") {
    return `<div class="today-tile ${extra}"><span>${label}</span><strong>${value}</strong></div>`;
  }

  // Кнопки «Добавить в календарь» и «Памятка на неделю».
  function tools() {
    return `
      <div class="batch-tools">
        <button type="button" class="btn-secondary" data-act="ics">📅 ${t("batch.calendar")}</button>
        <button type="button" class="btn-secondary" data-act="memo">🖨 ${t("batch.memo")}</button>
      </div>
      <p class="muted small batch-tools-hint">${t("batch.calendarHint")}</p>`;
  }

  function renderToday() {
    const b = App.batch();
    if (!b) {
      todayEl.hidden = true;
      return;
    }
    todayEl.hidden = false;
    const day = App.batchDay(b);
    const max = App.maxDay(b.breed);

    if (day < 1) {
      todayEl.innerHTML = `<p class="today-head">${t("batch.future", { n: 1 - day })}</p>${tools()}`;
      return;
    }
    if (day > max) {
      todayEl.innerHTML = `<p class="today-head">${t("batch.done", { day })}</p>`;
      return;
    }

    const row = App.breedRows(b.breed).find((r) => r.day === day);
    const phase = App.phaseFor(day);
    const phases = window.FEED_PHASES;
    const next = phase ? phases[phases.indexOf(phase) + 1] : null;
    const phaseNote = next
      ? t("batch.nextPhase", { n: next.from - day, name: t("phase." + next.id + ".name") })
      : t("batch.lastPhase");
    const pct = Math.min(100, (day / max) * 100);
    const climate = App.climateFor(day);
    const light = App.lightFor(day);
    const tempTile = climate
      ? `<div class="today-tile is-wide is-temp">
          <span>${t("batch.temp")}</span>
          <strong>${App.range(climate.house)} °C</strong>
          <small>${climate.lamp ? t("batch.tempLamp", { t: App.range(climate.lamp) }) : t("batch.tempNoLamp")}</small>
          <small>${t("batch.tempHint")}</small>
        </div>`
      : "";

    todayEl.innerHTML = `
      <p class="today-head">${t("batch.today", { day })}</p>
      <div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="${max}" aria-valuenow="${day}">
        <span style="width:${pct}%"></span>
      </div>
      <div class="today-grid">
        ${tile(t("batch.feedAll"), App.fmt((row.feed * b.birds) / 1000, 1) + " " + t("unit.kg"), "is-main")}
        ${tempTile}
        ${tile(t("batch.feedBird"), App.fmt(row.feed) + " " + t("unit.g"))}
        ${tile(t("batch.weight"), App.fmt(row.weight) + " " + t("unit.g"))}
        ${tile(t("batch.light"), light ? t("batch.lightValue", { light: light.light, dark: light.dark }) : "—")}
        ${tile(t("batch.toSale"), day <= SALE_DAY ? t("batch.daysLeft", { n: SALE_DAY - day }) : "—")}
      </div>
      <p class="today-phase" style="--phase:${phase ? phase.color : "#999"}">
        <span class="tag">${phase ? t("phase." + phase.id + ".name") : ""}</span>
        ${phase ? t("phase." + phase.id + ".form") + " · " : ""}${phaseNote}
      </p>
      <p class="today-links">
        <a href="feeding.html#today">${t("nav.feeding")} →</a>
        <a href="growth.html#check">${t("batch.checkWeight")} →</a>
      </p>
      ${tools()}`;
  }

  /* ---------- Памятка на неделю ---------- */

  let memoFrom = null; // первый день показанной недели

  function weekStart(day, max) {
    const d = Math.min(Math.max(day, 1), max);
    return d - ((d - 1) % 7);
  }

  function renderMemo() {
    const b = App.batch();
    if (!b) {
      memoEl.hidden = true;
      return;
    }
    if (memoEl.hidden) return;
    const max = App.maxDay(b.breed);
    if (memoFrom === null) memoFrom = weekStart(App.batchDay(b), max);
    const to = Math.min(memoFrom + 6, max);
    const rows = App.breedRows(b.breed);
    const ev = App.batchEvents(b);
    const today = App.batchDay(b);
    const breed = window.BREEDS[b.breed];

    let body = "";
    let week = "";
    for (let d = memoFrom; d <= to; d++) {
      const r = rows.find((x) => x.day === d);
      const c = App.climateFor(d);
      const l = App.lightFor(d);
      const date = App.shortDate(App.dateOfDay(b, d));
      const temp = c ? App.range(c.house) + (c.lamp ? ` <small>(${App.range(c.lamp)})</small>` : "") : "—";
      body += `<tr${d === today ? ' class="is-today"' : ""}>
        <td>${d}</td><td>${date}</td>
        <td>${App.fmt((r.feed * b.birds) / 1000, 1)}</td><td>${App.fmt(r.feed)}</td>
        <td>${App.fmt(r.weight)}</td><td>${temp}</td><td>${l ? l.light + " / " + l.dark : "—"}</td>
      </tr>`;
      (ev[d] || []).forEach((s) => {
        week += `<li><strong>${t("memo.col.day")} ${d}, ${date}:</strong> ${App.escape(s)}</li>`;
      });
    }
    const daily = [1, 2, 3, 4, 5].map((i) => `<li>☐ ${t("memo.d" + i)}</li>`).join("");

    memoEl.innerHTML = `
      <p class="memo-brand">BROLLER BRO · brollerbro.uz</p>
      <h2>${t("memo.title")}: ${t("memo.days", { from: memoFrom, to })}</h2>
      <p class="muted small">${t("memo.batch", {
        date: App.fullDate(App.dateOfDay(b, 1)),
        birds: App.fmt(b.birds),
        breed: breed ? breed.name : "",
      })}</p>
      <div class="memo-actions">
        <button type="button" class="btn-secondary" data-act="prev"${memoFrom <= 1 ? " disabled" : ""}>${t("memo.prev")}</button>
        <button type="button" class="btn-secondary" data-act="next"${to >= max ? " disabled" : ""}>${t("memo.next")}</button>
        <button type="button" class="btn-primary" data-act="print">${t("memo.print")}</button>
        <button type="button" class="btn-link" data-act="close">${t("memo.close")}</button>
      </div>
      <div class="table-wrap">
        <table class="data-table memo-table">
          <thead><tr>
            <th>${t("memo.col.day")}</th><th>${t("memo.col.date")}</th>
            <th>${t("memo.col.feedAll")}</th><th>${t("memo.col.feedBird")}</th>
            <th>${t("memo.col.weight")}</th><th>${t("memo.col.temp")}</th><th>${t("memo.col.light")}</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <div class="memo-cols">
        <section><h3>${t("memo.week")}</h3><ul>${week || `<li>${t("memo.nothing")}</li>`}</ul></section>
        <section><h3>${t("memo.daily")}</h3><ul class="memo-check">${daily}</ul></section>
      </div>
      <p class="muted small memo-hint">${t("memo.hint")}</p>`;
  }

  function openMemo() {
    memoFrom = null;
    memoEl.hidden = false;
    renderMemo();
    memoEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  todayEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    const b = App.batch();
    if (!btn || !b) return;
    if (btn.dataset.act === "ics") App.downloadICS(b);
    if (btn.dataset.act === "memo") openMemo();
  });

  memoEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "prev") memoFrom = Math.max(1, memoFrom - 7);
    if (act === "next") memoFrom += 7;
    if (act === "close") {
      memoEl.hidden = true;
      document.getElementById("batch-title").scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (act === "print") {
      document.body.classList.add("print-memo");
      window.print();
      return;
    }
    renderMemo();
  });
  window.addEventListener("afterprint", () => document.body.classList.remove("print-memo"));

  /* ---------- Форма ---------- */

  App.breedSelect(breedEl, () => {});

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!startEl.value) return;
    App.saveBatch({
      start: startEl.value,
      birds: Math.max(1, Math.round(Number(birdsEl.value) || 1)),
      breed: breedEl.value,
    });
    clearBtn.hidden = false;
    memoFrom = null;
    renderToday();
    renderMemo();
  });

  clearBtn.addEventListener("click", () => {
    App.saveBatch(null);
    fillForm();
    renderToday();
    renderMemo();
  });

  fillForm();
  App.onLangChange(() => {
    renderToday();
    renderMemo();
  });
})();
