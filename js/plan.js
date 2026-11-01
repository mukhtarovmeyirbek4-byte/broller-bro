/* «Моя партия»: план по дням — температура, свет, события для календаря и памятки.
   Данные: data/climate.js, data/light.js, data/area.js, data/phases.js. */
(function () {
  "use strict";

  const t = App.t;
  App.SALE_DAY = 42;

  const inRange = (list, day) => (list || []).find((c) => day >= c.from && day <= c.to);
  App.climateFor = (day) => inRange(window.CLIMATE, day);
  App.lightFor = (day) => inRange(window.LIGHT, day);
  App.range = (r) => `${r[0]}–${r[1]}`;

  // Дата дня выращивания: день 1 = дата заселения.
  App.dateOfDay = function (batch, day) {
    const [y, m, d] = batch.start.split("-").map(Number);
    return new Date(y, m - 1, d + day - 1);
  };
  const pad = (n) => String(n).padStart(2, "0");
  App.shortDate = (date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
  App.fullDate = (date) => `${App.shortDate(date)}.${date.getFullYear()}`;

  // Что сделать в какой день: { день: [текст, текст] }.
  App.batchEvents = function (batch) {
    const max = App.maxDay(batch.breed);
    const rows = App.breedRows(batch.breed);
    const ev = {};
    const add = (day, text) => {
      if (day >= 1 && day <= max) (ev[day] = ev[day] || []).push(text);
    };

    add(1, t("ev.start"));
    (window.FEED_PHASES || []).slice(1).forEach((p) =>
      add(p.from, t("ev.phase", { name: t("phase." + p.id + ".name") }))
    );
    const climate = window.CLIMATE || [];
    climate.forEach((c, i) => {
      if (i === 0) return;
      add(c.from, t("ev.temp", { t: App.range(c.house) }));
      if (climate[i - 1].lamp && !c.lamp) add(c.from, t("ev.lampsOff"));
    });
    (window.LIGHT || []).forEach((l, i) => {
      if (i > 0) add(l.from, t("ev.light", { light: l.light, dark: l.dark }));
    });
    const N = window.AREA_NORMS;
    if (N && N.expand) {
      N.expand.forEach(([day, perM2]) => {
        // Площадь на конец недели: не теснее нормы и не больше 30 кг на м².
        const end = rows.find((r) => r.day === Math.min(day + 6, max));
        if (!end) return;
        const need = Math.max(batch.birds / perM2, (batch.birds * end.weight) / 1000 / N.density);
        add(day, t("ev.expand", { m2: App.fmt(need, 1) }));
      });
    }
    [7, 14, 21, 28, 35].forEach((d) => add(d, t("ev.weigh")));
    add(App.SALE_DAY - 3, t("ev.saleSoon"));
    add(App.SALE_DAY, t("ev.sale", { day: App.SALE_DAY }));
    return ev;
  };

  /* ---------- Файл календаря (.ics) ---------- */
  // Каждое событие — в 8:00 по местному времени, с напоминанием.

  const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const enc = new TextEncoder();

  // Строки длиннее 75 байт по правилам календарей переносятся с пробелом в начале.
  function fold(line) {
    const parts = [];
    let cur = "";
    let bytes = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > 73) {
        parts.push(cur);
        cur = " ";
        bytes = 1;
      }
      cur += ch;
      bytes += b;
    }
    parts.push(cur);
    return parts.join("\r\n");
  }

  App.batchICS = function (batch) {
    const ev = App.batchEvents(batch);
    const now = new Date();
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
    const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BROLLER BRO//brollerbro.uz//RU", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    Object.keys(ev)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((day) => {
        const date = ymd(App.dateOfDay(batch, day));
        const items = ev[day];
        const title = t("ev.title", { day });
        lines.push(
          "BEGIN:VEVENT",
          `UID:${batch.start}-${day}@brollerbro.uz`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${date}T080000`,
          `DTEND:${date}T083000`,
          "SUMMARY:" + esc(title + ": " + items.join("; ")),
          "DESCRIPTION:" + esc(items.map((s) => "• " + s).join("\n") + "\n\nhttps://brollerbro.uz/"),
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          "DESCRIPTION:" + esc(title),
          "TRIGGER:PT0M",
          "END:VALARM",
          "END:VEVENT"
        );
      });
    lines.push("END:VCALENDAR");
    return lines.map(fold).join("\r\n") + "\r\n";
  };

  App.downloadICS = function (batch) {
    const blob = new Blob([App.batchICS(batch)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "broller-bro-" + batch.start + ".ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
})();
