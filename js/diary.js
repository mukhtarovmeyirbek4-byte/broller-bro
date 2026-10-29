/* Страница «Дневник партии». Записи хранятся в браузере фермера (localStorage). */
(function () {
  "use strict";

  const t = App.t;
  const KEY = "broiler-diary";
  const batch = App.batch();

  if (!batch) {
    document.getElementById("diary-nobatch").hidden = false;
    return;
  }
  document.getElementById("diary-app").hidden = false;

  const form = document.getElementById("diary-form");
  const dateEl = document.getElementById("d-date");
  const weightEl = document.getElementById("d-weight");
  const feedEl = document.getElementById("d-feed");
  const deadEl = document.getElementById("d-dead");
  const noteEl = document.getElementById("d-note");
  const msgEl = document.getElementById("d-msg");
  const summaryEl = document.getElementById("diary-summary");
  const tbody = document.querySelector("#diary-table tbody");
  const emptyEl = document.getElementById("diary-empty");
  const canvas = document.getElementById("diary-chart");
  let chart = null;

  /* ---------- Хранение ---------- */

  function loadEntries() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }
  function saveEntries(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* нет места или запрещено */ }
  }
  let entries = loadEntries();

  const normRows = App.breedRows(batch.breed);
  const normFor = (day) => {
    const r = normRows.find((x) => x.day === day);
    return r ? r.weight : null;
  };
  const sorted = () => entries.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
  const numOrNull = (v) => (v === "" || v === null || isNaN(Number(v)) ? null : Number(v));

  /* ---------- Подтверждение вторым нажатием (без всплывающих окон) ---------- */

  function confirmClick(btn, action) {
    if (btn.dataset.armed) {
      action();
      return;
    }
    const label = btn.textContent;
    btn.dataset.armed = "1";
    btn.textContent = t("diary.confirm");
    btn.classList.add("is-armed");
    setTimeout(() => {
      if (!btn.isConnected) return;
      delete btn.dataset.armed;
      btn.textContent = label;
      btn.classList.remove("is-armed");
    }, 3000);
  }

  /* ---------- Отрисовка ---------- */

  function tile(label, value, sub = "", extra = "") {
    return `<div class="today-tile ${extra}"><span>${label}</span><strong>${value}</strong>${sub ? `<small>${sub}</small>` : ""}</div>`;
  }

  function renderSummary(list) {
    const deadTotal = list.reduce((s, e) => s + (e.dead || 0), 0);
    const feedTotal = list.reduce((s, e) => s + (e.feed || 0), 0);
    const alive = Math.max(0, batch.birds - deadTotal);
    const lastW = list.filter((e) => e.weight > 0).pop();
    const today = App.batchDay(batch);

    let weightTile = tile(t("diary.lastWeight"), "—");
    let fcrTile = tile(t("diary.fcr"), "—");
    if (lastW) {
      const day = App.dayOfDate(batch, lastW.date);
      const norm = normFor(day);
      const pct = norm ? Math.round((lastW.weight / norm) * 100) : null;
      const cls = pct === null ? "" : pct >= 90 ? "is-good" : "is-bad";
      weightTile = tile(
        t("diary.lastWeight"),
        App.fmt(lastW.weight) + " " + t("unit.g"),
        pct === null ? "" : t("diary.ofNorm", { pct }),
        cls
      );
      if (feedTotal > 0 && alive > 0) {
        fcrTile = tile(t("diary.fcr"), App.fmt(feedTotal / ((alive * lastW.weight) / 1000), 2));
      }
    }

    summaryEl.innerHTML = [
      tile(t("diary.day"), today >= 1 ? today : "—", "", "is-main"),
      tile(t("diary.alive"), App.fmt(alive)),
      tile(t("diary.deadTotal"), App.fmt(deadTotal), App.fmt((deadTotal / batch.birds) * 100, 1) + "%"),
      tile(t("diary.feedTotal"), App.fmt(feedTotal, 1) + " " + t("unit.kg")),
      weightTile,
      fcrTile,
    ].join("");
  }

  function renderTable(list) {
    emptyEl.hidden = list.length > 0;
    tbody.innerHTML = list
      .slice()
      .reverse()
      .map((e) => {
        const day = App.dayOfDate(batch, e.date);
        const norm = normFor(day);
        const pct = e.weight > 0 && norm ? Math.round((e.weight / norm) * 100) : null;
        const pctCls = pct === null ? "" : pct >= 90 ? "pct-good" : "pct-bad";
        const [y, m, d] = e.date.split("-");
        return `<tr>
          <td>${d}.${m}.${y}</td>
          <td>${day}</td>
          <td>${e.weight > 0 ? App.fmt(e.weight) : "—"}</td>
          <td>${norm ? App.fmt(norm) : "—"}</td>
          <td class="${pctCls}">${pct === null ? "—" : pct + "%"}</td>
          <td>${e.feed > 0 ? App.fmt(e.feed, 1) : "—"}</td>
          <td>${e.dead > 0 ? App.fmt(e.dead) : "—"}</td>
          <td class="note-cell">${e.note ? App.escape(e.note) : ""}</td>
          <td><button type="button" class="btn-del" data-del="${App.escape(e.id)}">${t("diary.delete")}</button></td>
        </tr>`;
      })
      .join("");
  }

  function renderChart(list) {
    if (!window.Chart) {
      canvas.closest(".diary-chart-panel").hidden = true;
      return;
    }
    const breed = window.BREEDS[batch.breed];
    const points = list
      .filter((e) => e.weight > 0)
      .map((e) => ({ x: App.dayOfDate(batch, e.date), y: e.weight }))
      .filter((p) => p.x >= 0 && p.x <= 45);
    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            label: t("diary.chart.norm", { breed: breed.name }),
            data: breed.days.map(([d, w]) => ({ x: d, y: w })),
            borderColor: breed.color,
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 0,
            tension: 0.3,
          },
          {
            label: t("diary.chart.you"),
            data: points,
            borderColor: "#d9480f",
            backgroundColor: "#d9480f",
            borderWidth: 3,
            pointRadius: 5,
            tension: 0.2,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false, axis: "x" },
        plugins: { legend: { position: "bottom" } },
        scales: {
          x: { type: "linear", min: 0, max: 45, ticks: { stepSize: 5 }, title: { display: true, text: t("diary.th.day") } },
          y: { beginAtZero: true, title: { display: true, text: t("diary.th.weight") } },
        },
      },
    });
  }

  function render() {
    const list = sorted();
    renderSummary(list);
    renderTable(list);
    renderChart(list);
  }

  /* ---------- Действия ---------- */

  function showMsg(text) {
    msgEl.textContent = text;
    msgEl.hidden = !text;
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const date = dateEl.value;
    if (!date) return;
    if (App.dayOfDate(batch, date) < 1) {
      showMsg(t("diary.beforeStart"));
      return;
    }
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date,
      weight: numOrNull(weightEl.value),
      feed: numOrNull(feedEl.value),
      dead: numOrNull(deadEl.value) === null ? null : Math.round(Number(deadEl.value)),
      note: noteEl.value.trim(),
    };
    if (entry.weight === null && entry.feed === null && entry.dead === null && !entry.note) return;
    showMsg("");
    entries.push(entry);
    saveEntries(entries);
    [weightEl, feedEl, deadEl, noteEl].forEach((el) => (el.value = ""));
    render();
  });

  tbody.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-del]");
    if (!btn) return;
    confirmClick(btn, () => {
      entries = entries.filter((e) => e.id !== btn.dataset.del);
      saveEntries(entries);
      render();
    });
  });

  document.getElementById("diary-clear").addEventListener("click", (ev) => {
    confirmClick(ev.currentTarget, () => {
      entries = [];
      saveEntries(entries);
      render();
    });
  });

  // Выгрузка в CSV (открывается в Excel). Разделитель «;» — так Excel в русской раскладке открывает по колонкам.
  document.getElementById("diary-export").addEventListener("click", () => {
    const head = ["diary.th.date", "diary.th.day", "diary.th.weight", "diary.th.norm", "diary.th.feed", "diary.th.dead", "diary.th.note"].map(t);
    const cell = (v) => `"${String(v === null || v === undefined ? "" : v).replace(/"/g, '""')}"`;
    const lines = [head.map(cell).join(";")].concat(
      sorted().map((e) => {
        const day = App.dayOfDate(batch, e.date);
        return [e.date, day, e.weight, normFor(day), e.feed, e.dead, e.note].map(cell).join(";");
      })
    );
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `broller-bro-${batch.start}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  dateEl.value = App.todayISO();
  App.onLangChange(render);
})();
