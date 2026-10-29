/* Страница «График кормления». */
(function () {
  "use strict";

  const breedEl = document.getElementById("breed");
  const flockEl = document.getElementById("flock");
  const phasesEl = document.getElementById("phases");
  const tbody = document.querySelector("#feed-table tbody");
  const jumpBtn = document.getElementById("jump-today");
  const t = App.t;

  // Если на главной указана «Моя партия» — берём из неё число птиц и сегодняшний день.
  const batch = App.batch();
  if (batch) flockEl.value = batch.birds;
  const today = batch ? App.batchDay(batch) : null;

  function scrollToToday() {
    const row = document.getElementById("today");
    if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function render() {
    const rows = App.breedRows(App.breed()).filter((r) => r.day >= 1);
    const flock = Math.max(0, Number(flockEl.value) || 0);

    phasesEl.innerHTML = window.FEED_PHASES.map((p) => {
      const perBirdKg =
        rows.filter((r) => r.day >= p.from && r.day <= p.to).reduce((s, r) => s + r.feed, 0) / 1000;
      return `
        <article class="phase" style="--phase:${p.color}">
          <h3>${t("phase." + p.id + ".name")}</h3>
          <p class="phase-days">${t("feeding.phase.days", { from: p.from, to: p.to })}</p>
          <p class="phase-form">${t("phase." + p.id + ".form")}</p>
          <p>${t("phase." + p.id + ".desc")}</p>
          <dl>
            <div><dt>${t("feeding.phase.perBird")}</dt><dd>${App.fmt(perBirdKg, 2)} ${t("unit.kg")}</dd></div>
            <div><dt>${t("feeding.phase.perFlock", { n: App.fmt(flock) })}</dt><dd>${App.fmt(perBirdKg * flock)} ${t("unit.kg")}</dd></div>
          </dl>
        </article>`;
    }).join("");

    tbody.innerHTML = rows
      .map((r) => {
        const p = App.phaseFor(r.day);
        const color = p ? p.color : "transparent";
        const name = p ? t("phase." + p.id + ".name") : "";
        const isToday = r.day === today;
        return `<tr style="--phase:${color}"${isToday ? ' id="today" class="is-today"' : ""}>
          <td>${r.day}${isToday ? ` <span class="today-badge">${t("common.today")}</span>` : ""}</td>
          <td><span class="tag">${name}</span></td>
          <td>${App.fmt(r.feed)}</td>
          <td>${App.fmt((r.feed * flock) / 1000, 1)}</td>
          <td>${App.fmt(r.cumFeed / 1000, 2)}</td>
        </tr>`;
      })
      .join("");

    jumpBtn.hidden = !document.getElementById("today");
  }

  App.breedSelect(breedEl, render);
  flockEl.addEventListener("input", render);
  jumpBtn.addEventListener("click", scrollToToday);
  App.onLangChange(render);
  if (location.hash === "#today") window.addEventListener("load", scrollToToday);
})();
