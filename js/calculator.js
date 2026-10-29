/* Страница «Калькулятор прибыли». Формулы расчёта — в функции calc(). */
(function () {
  "use strict";

  const t = App.t;
  const D = window.CALC_DEFAULTS;
  const FIELDS = ["chicks", "chickPrice", "mortality", "days", "perf", "feedPrice", "feedReserve", "vet", "other", "salePrice"];
  const form = document.getElementById("calc-form");
  const breedEl = document.getElementById("breed");
  const out = document.getElementById("calc-output");

  const num = (id) => Math.max(0, Number(document.getElementById(id).value) || 0);

  // Значения по умолчанию; если указана «Моя партия» — берём из неё число цыплят и породу.
  function fillDefaults() {
    const batch = App.batch();
    FIELDS.forEach((id) => (document.getElementById(id).value = D[id]));
    if (batch) document.getElementById("chicks").value = batch.birds;
    const breed = batch && window.BREEDS[batch.breed] ? batch.breed : D.breed;
    if (window.BREEDS[breed]) {
      App.setBreed(breed);
      breedEl.value = breed;
    }
  }

  function calc() {
    const v = {};
    FIELDS.forEach((id) => (v[id] = num(id)));

    const rows = App.breedRows(App.breed());
    const maxDay = rows[rows.length - 1].day;
    const day = Math.min(Math.max(Math.round(v.days) || 1, 1), maxDay);
    const row = rows.find((r) => r.day === day);
    const mortality = Math.min(v.mortality, 100);

    const alive = Math.round(v.chicks * (1 - mortality / 100));
    const weightPerBird = (row.weight / 1000) * (v.perf / 100); // кг
    const totalWeight = alive * weightPerBird;
    const totalFeed = alive * (row.cumFeed / 1000) * (1 + v.feedReserve / 100);

    const parts = {
      chicks: v.chicks * v.chickPrice,
      feed: totalFeed * v.feedPrice,
      vet: v.chicks * v.vet,
      other: v.other,
    };
    const costs = parts.chicks + parts.feed + parts.vet + parts.other;
    const revenue = totalWeight * v.salePrice;
    const profit = revenue - costs;

    return {
      day, alive, weightPerBird, totalWeight, totalFeed, parts, costs, revenue, profit,
      profitPerBird: alive ? profit / alive : 0,
      costPerKg: totalWeight ? costs / totalWeight : 0,
      fcr: totalWeight ? totalFeed / totalWeight : 0,
    };
  }

  function render() {
    const r = calc();
    const sum = " " + t("unit.sum");
    const kg = " " + t("unit.kg");
    const isProfit = r.profit >= 0;

    const stat = (key, value) => `<div class="stat"><dt>${t(key)}</dt><dd>${value}</dd></div>`;
    const bars = Object.keys(r.parts)
      .map((k) => {
        const pct = r.costs ? (r.parts[k] / r.costs) * 100 : 0;
        return `<div class="bar-row">
          <span class="bar-label">${t("calc.b." + k)}</span>
          <span class="bar-track"><span class="bar-fill bar-${k}" style="width:${pct.toFixed(1)}%"></span></span>
          <span class="bar-value">${App.fmt(pct)}%</span>
        </div>`;
      })
      .join("");

    out.innerHTML = `
      <div class="profit ${isProfit ? "is-profit" : "is-loss"}">
        <span>${t(isProfit ? "calc.profit" : "calc.loss")}</span>
        <strong>${App.fmt(Math.abs(r.profit))}${sum}</strong>
      </div>
      <dl class="stats">
        ${stat("calc.revenue", App.fmt(r.revenue) + sum)}
        ${stat("calc.costs", App.fmt(r.costs) + sum)}
        ${stat("calc.profitPerBird", App.fmt(r.profitPerBird) + sum)}
        ${stat("calc.costPerKg", App.fmt(r.costPerKg) + sum)}
        ${stat("calc.alive", App.fmt(r.alive))}
        ${stat("calc.weightPerBird", App.fmt(r.weightPerBird, 2) + kg)}
        ${stat("calc.totalWeight", App.fmt(r.totalWeight) + kg)}
        ${stat("calc.totalFeed", App.fmt(r.totalFeed) + kg)}
        ${stat("calc.fcr", App.fmt(r.fcr, 2))}
      </dl>
      <h3>${t("calc.breakdown")}</h3>
      <div class="bars">${bars}</div>`;
  }

  fillDefaults();
  App.breedSelect(breedEl, render);
  form.addEventListener("input", render);
  form.addEventListener("submit", (e) => e.preventDefault());
  document.getElementById("calc-reset").addEventListener("click", () => {
    fillDefaults();
    render();
  });
  App.onLangChange(render);
})();
