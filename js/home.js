/* Главная страница: блок «Моя партия». */
(function () {
  "use strict";

  const t = App.t;
  const form = document.getElementById("batch-form");
  const startEl = document.getElementById("batch-start");
  const birdsEl = document.getElementById("batch-birds");
  const breedEl = document.getElementById("breed");
  const todayEl = document.getElementById("batch-today");
  const clearBtn = document.getElementById("batch-clear");
  const SALE_DAY = 42;

  function isoToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function fillForm() {
    const b = App.batch();
    startEl.value = b ? b.start : isoToday();
    birdsEl.value = b ? b.birds : 100;
    if (b && window.BREEDS[b.breed]) breedEl.value = b.breed;
    clearBtn.hidden = !b;
  }

  function tile(label, value, extra = "") {
    return `<div class="today-tile ${extra}"><span>${label}</span><strong>${value}</strong></div>`;
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
      todayEl.innerHTML = `<p class="today-head">${t("batch.future", { n: 1 - day })}</p>`;
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

    todayEl.innerHTML = `
      <p class="today-head">${t("batch.today", { day })}</p>
      <div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="${max}" aria-valuenow="${day}">
        <span style="width:${pct}%"></span>
      </div>
      <div class="today-grid">
        ${tile(t("batch.feedAll"), App.fmt((row.feed * b.birds) / 1000, 1) + " " + t("unit.kg"), "is-main")}
        ${tile(t("batch.feedBird"), App.fmt(row.feed) + " " + t("unit.g"))}
        ${tile(t("batch.weight"), App.fmt(row.weight) + " " + t("unit.g"))}
        ${tile(t("batch.toSale"), day <= SALE_DAY ? t("batch.daysLeft", { n: SALE_DAY - day }) : "—")}
      </div>
      <p class="today-phase" style="--phase:${phase ? phase.color : "#999"}">
        <span class="tag">${phase ? t("phase." + phase.id + ".name") : ""}</span>
        ${phase ? t("phase." + phase.id + ".form") + " · " : ""}${phaseNote}
      </p>
      <p class="today-links">
        <a href="feeding.html#today">${t("nav.feeding")} →</a>
        <a href="growth.html#check">${t("batch.checkWeight")} →</a>
      </p>`;
  }

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
    renderToday();
  });

  clearBtn.addEventListener("click", () => {
    App.saveBatch(null);
    fillForm();
    renderToday();
  });

  fillForm();
  App.onLangChange(renderToday);
})();
