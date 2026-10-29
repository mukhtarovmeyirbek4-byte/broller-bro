/*
  ПЕРИОДЫ КОРМЛЕНИЯ: какой корм в какие дни.

  from / to — с какого по какой день включительно.
  Названия и описания периодов лежат в файлах языков (lang/ru.js и lang/uz.js),
  в строках "phase.start.name", "phase.grow.name" и т. д.
*/

window.FEED_PHASES = [
  { id: "start", from: 1, to: 10, color: "#e8a317" },
  { id: "grow", from: 11, to: 24, color: "#6aa84f" },
  { id: "finish", from: 25, to: 45, color: "#2f6b3a" },
];
