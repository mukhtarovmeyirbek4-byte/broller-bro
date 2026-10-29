/* Страница «Расчёт птичника». Нормы — в data/area.js. */
(function () {
  "use strict";

  const t = App.t;
  const N = window.AREA_NORMS;
  const form = document.getElementById("area-form");
  const breedEl = document.getElementById("breed");
  const birdsEl = document.getElementById("area-birds");
  const dayEl = document.getElementById("area-day");
  const densityEl = document.getElementById("area-density");
  const out = document.getElementById("area-output");
  const tbody = document.querySelector("#area-table tbody");

  densityEl.value = N.density;
  const batch = App.batch();
  if (batch) birdsEl.value = batch.birds;

  // Площадь на день: по весу и плотности, но не меньше брудера первой недели.
  function areaFor(birds, weightG, density) {
    return Math.max((birds * weightG) / 1000 / density, birds / N.broodPerM2);
  }

  function render() {
    const birds = Math.max(1, Math.round(Number(birdsEl.value) || 1));
    const density = Math.max(1, Number(densityEl.value) || N.density);
    const rows = App.breedRows(App.breed());
    const maxDay = rows[rows.length - 1].day;
    const day = Math.min(Math.max(Math.round(Number(dayEl.value)) || maxDay, 1), maxDay);
    const row = rows.find((r) => r.day === day);

    const area = areaFor(birds, row.weight, density);
    const side = Math.ceil(Math.sqrt(area));
    const length = Math.ceil(area / side);
    const brood = birds / N.broodPerM2;
    const litter = area * (N.litterCm / 100);
    const m2 = " " + t("unit.m2");
    const pcs = " " + t("unit.pcs");

    const item = (label, value) => `<li><span>${label}</span><strong>${value}</strong></li>`;

    out.innerHTML = `
      <div class="profit is-profit">
        <span>${t("area.need")}</span>
        <strong>${App.fmt(area, 1)}${m2}</strong>
      </div>
      <dl class="stats">
        <div class="stat"><dt>${t("area.room")}</dt><dd>${side} × ${length} ${t("unit.m")}</dd></div>
        <div class="stat"><dt>${t("area.perM2")}</dt><dd>${App.fmt(birds / area, 1)}</dd></div>
        <div class="stat"><dt>${t("area.weight", { day })}</dt><dd>${App.fmt(row.weight / 1000, 2)} ${t("unit.kg")}</dd></div>
        <div class="stat"><dt>${t("area.brood")}</dt><dd>${App.fmt(brood, 1)}${m2}</dd></div>
      </dl>
      <h3>${t("area.equip")}</h3>
      <ul class="equip-list">
        ${item(t("area.feeders"), Math.ceil(birds / N.birdsPerFeeder) + pcs + ` <small>${t("area.or")} ${App.fmt((birds * N.troughCmPerBird) / 100, 1)} ${t("area.trough")}</small>`)}
        ${item(t("area.nipples"), Math.ceil(birds / N.birdsPerNipple) + pcs + ` <small>${t("area.or")} ${Math.ceil(birds / N.birdsPerBell)} ${t("area.bells")}</small>`)}
        ${item(t("area.lamps"), Math.ceil(birds / N.birdsPerLamp) + pcs)}
        ${item(t("area.litter", { cm: N.litterCm }), App.fmt(litter, 1) + " " + t("unit.m3"))}
      </ul>`;

    const checkpoints = [7, 14, 21, 28, 35, 42, 45].filter((d) => d < day);
    checkpoints.push(day);
    tbody.innerHTML = checkpoints
      .map((d) => {
        const r = rows.find((x) => x.day === d);
        const a = areaFor(birds, r.weight, density);
        return `<tr${d === day ? ' class="is-today"' : ""}><td>${d}</td><td>${App.fmt(a, 1)}</td><td>${App.fmt(birds / a, 1)}</td></tr>`;
      })
      .join("");
  }

  App.breedSelect(breedEl, render);
  form.addEventListener("input", render);
  form.addEventListener("submit", (e) => e.preventDefault());
  App.onLangChange(render);
})();
