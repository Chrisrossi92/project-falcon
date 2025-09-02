// src/lib/utils/csv.js

/** Escape a single cell for CSV (RFC4180-ish). */
function escapeCsv(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // wrap in quotes if it contains comma, quote, newline, or leading/trailing space
  if (/[",\n\r]|^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string from rows and column defs. */
export function toCsv(rows, columns, { includeHeader = true } = {}) {
  const out = [];
  if (includeHeader) {
    out.push(columns.map((c) => escapeCsv(c.header || c.key)).join(","));
  }
  for (const row of rows || []) {
    const line = columns.map((c) => {
      const raw = typeof c.accessor === "function" ? c.accessor(row) : row[c.key];
      return escapeCsv(raw);
    });
    out.push(line.join(","));
  }
  return out.join("\r\n");
}

/** Download a string as a .csv file in the browser. */
export function downloadCsv(filename, csvString) {
  const blob = new Blob([`\uFEFF${csvString}`], { type: "text/csv;charset=utf-8" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

/** Convenience: build + download in one call. */
export function exportCsv(filename, rows, columns, opts) {
  const csv = toCsv(rows, columns, opts);
  downloadCsv(filename, csv);
}
