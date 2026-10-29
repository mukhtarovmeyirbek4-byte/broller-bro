/* Страница «Вес по дням»: график, проверка своей птицы, таблица. */
(function () {
  "use strict";

  const t = App.t;
  const breedEl = document.getElementById("breed");
  const dayEl = document.getElementById("check-day");
  const weightEl = document.getElementById("check-weight");
  const resultEl = document.getElementById("check-result");
  const canvas = document.getElementById("growth-chart");
  const noLibEl = document.getElementById("chart-nolib");
  const tbody = document.querySelector("#growth-table tbody");

  let chart = null;
  let userPoint = null;

  // Если указана «Моя партия» — подставляем сегодняшний день в проверку.
  const batch = App.batch();
  const today = batch ? App.batchDay(batch) : null;
  if (today !== null && today >= 0 && today <= 45) dayEl.value = today;

  function renderChart() {
    if (!window.Chart) {
      canvas.hidden = true;
      noLibEl.hidden = false;
      return;
    }
    const selected = App.breed();
    const datasets = Object.keys(window.BREEDS).map((id) => {
      const b = window.BREEDS[id];
      return {
        label: b.name,
        data: b.days.map(([d, w]) => ({ x: d, y: w })),
        borderColor: b.color,
        backgroundColor: b.color,
        borderWidth: id === selected ? 3.5 : 1.5,
        borderDash: id === selected ? [] : [5, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
      };
    });
    if (userPoint) {
      datasets.push({
        type: "scatter",
        label: t("growth.chart.you"),
        data: [userPoint],
        backgroundColor: "#d9480f",
        borderColor: "#fff",
        borderWidth: 2,
        pointRadius: 8,
      });
    }
    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: "line",
      data: { datasets },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false, axis: "x" },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              title: (items) => t("growth.th.day") + " " + items[0].parsed.x,
              label: (c) => c.dataset.label + ": " + App.fmt(c.parsed.y) + " " + t("unit.g"),
            },
          },
        },
        scales: {
          x: { type: "linear", min: 0, max: 45, ticks: { stepSize: 5 }, title: { display: true, text: t("growth.th.day") } },
          y: { beginAtZero: true, title: { display: true, text: t("growth.chart.y") } },
        },
      },
    });
  }

  function renderCheck() {
    const day = parseInt(dayEl.value, 10);
    const weight = parseFloat(weightEl.value);
    const row = App.breedRows(App.breed()).find((r) => r.day === day);
    userPoint = null;

    if (!row) {
      resultEl.hidden = true;
      return;
    }
    let html = `<p>${t("growth.check.norm", { day, norm: App.fmt(row.weight) })}</p>`;
    resultEl.className = "check-result";
    if (weight > 0) {
      const pct = Math.round((weight / row.weight) * 100);
      const status = pct > 105 ? "ahead" : pct >= 90 ? "ok" : "behind";
      resultEl.classList.add("is-" + status);
      html += `<p class="check-status">${t("growth.check." + status, { pct })}</p>`;
      userPoint = { x: day, y: weight };
    }
    resultEl.innerHTML = html;
    resultEl.hidden = false;
  }

  function renderTable() {
    tbody.innerHTML = App.breedRows(App.breed())
      .map(
        (r) => `<tr${r.day === today ? ' class="is-today"' : ""}>
          <td>${r.day}${r.day === today ? ` <span class="today-badge">${t("common.today")}</span>` : ""}</td>
          <td><b>${App.fmt(r.weight)}</b></td>
          <td>${r.day === 0 ? "—" : App.fmt(r.gain)}</td>
          <td>${App.fmt(r.cumFeed / 1000, 2)}</td>
          <td>${r.day === 0 ? "—" : App.fmt(r.cumFeed / r.weight, 2)}</td>
        </tr>`
      )
      .join("");
  }

  function renderAll() {
    renderCheck();
    renderChart();
    renderTable();
  }

  App.breedSelect(breedEl, renderAll);
  [dayEl, weightEl].forEach((el) =>
    el.addEventListener("input", () => {
      renderCheck();
      renderChart();
    })
  );
  App.onLangChange(renderAll);
})();
