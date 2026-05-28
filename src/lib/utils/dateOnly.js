const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

export function dateOnlyInputValue(value) {
  if (!value) return "";

  const text = String(value);
  const match = ISO_DATE_PREFIX.exec(text);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatOperationalDate(value, fallback = "-") {
  if (!value) return fallback;

  const text = String(value);
  const match = ISO_DATE_PREFIX.exec(text);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.toLocaleDateString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString();
}
