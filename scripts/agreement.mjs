// Measures AI vs faculty agreement from the points export.
// Get the file from http://localhost:3000/api/export?type=points, fill the facultyMarks
// column, then run: npm run agreement -- path/to/markmate-points.csv
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run agreement -- <points.csv>");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const [header, ...body] = parseCsv(fs.readFileSync(file, "utf8"));
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
const marked = body.filter((r) => r[idx.facultyMarks] !== undefined && r[idx.facultyMarks] !== "");

if (!marked.length) {
  console.log("No rows have facultyMarks filled in yet.");
  process.exit(0);
}

let exact = 0, within = 0, aiHigher = 0, aiLower = 0;
for (const r of marked) {
  const ai = Number(r[idx.aiMarks]);
  const f = Number(r[idx.facultyMarks]);
  if (ai === f) exact++;
  if (Math.abs(ai - f) <= 0.5) within++;
  if (ai > f) aiHigher++;
  if (ai < f) aiLower++;
}
const pct = (n) => `${((n / marked.length) * 100).toFixed(1)}%`;
console.log(`Marking points checked by faculty: ${marked.length}`);
console.log(`Exact agreement:        ${exact} (${pct(exact)})`);
console.log(`Within 0.5 marks:       ${within} (${pct(within)})`);
console.log(`AI gave more marks:     ${aiHigher} (${pct(aiHigher)})`);
console.log(`AI gave fewer marks:    ${aiLower} (${pct(aiLower)})`);
