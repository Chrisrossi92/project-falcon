// src/lib/utils/colorForId.js
// Deterministic, pleasant color per id. (No DB column needed.)
const PALETTE = [
  '#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706',
  '#0ea5e9', '#16a34a', '#f43f5e', '#6b7280', '#a855f7',
];

export default function colorForId(id) {
  if (!id) return '#6b7280';
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
