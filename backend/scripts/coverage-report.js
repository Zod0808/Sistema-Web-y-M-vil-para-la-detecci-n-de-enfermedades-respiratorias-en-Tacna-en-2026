const s = require('../coverage/coverage-summary.json');
const rows = Object.entries(s)
  .filter(([k]) => k !== 'total')
  .map(([k, v]) => ({
    f: (k.split('backend\\src\\')[1] || k).replace(/\\/g, '/'),
    lines: v.lines.pct,
    br: v.branches.pct,
    total: v.lines.total,
    uncovered: v.lines.total - v.lines.covered,
  }))
  .filter(r => r.total > 20 && r.lines < 75)
  .sort((a, b) => b.uncovered - a.uncovered);

console.log('total:', s.total.lines.pct, '% lines,', s.total.branches.pct, '% branches');
console.log('file'.padEnd(65), 'lines%', 'br%', 'total', 'uncov');
rows.forEach(r =>
  console.log(
    r.f.padEnd(65),
    String(r.lines).padStart(6),
    String(r.br).padStart(5),
    String(r.total).padStart(5),
    String(r.uncovered).padStart(5),
  ),
);
