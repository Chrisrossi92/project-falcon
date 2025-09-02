export function toCsv(rows, columns) {
  const header = columns.map(c => c.header).join(",");
  const body = (rows || []).map(r =>
    columns.map(c => escapeCsv(c.accessor(r))).join(",")
  );
  return [header, ...body].join("\n");
}

function escapeCsv(val) {
  if (val == null) return "";
  const s = String(val);
  const needsQuotes = /[",\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function downloadCsv({ filename = "export.csv", data }) {
  const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

