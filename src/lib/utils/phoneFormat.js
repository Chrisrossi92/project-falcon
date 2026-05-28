export function formatPhoneForDisplay(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const extensionMatch = raw.match(/\s*(?:ext\.?|x|extension)\s*([A-Za-z0-9-]+)\s*$/i);
  const extension = extensionMatch ? extensionMatch[1] : "";
  const base = extensionMatch ? raw.slice(0, extensionMatch.index).trim() : raw;
  const digits = base.replace(/\D/g, "");

  let coreDigits = digits;
  if (digits.length === 11 && digits.startsWith("1")) {
    coreDigits = digits.slice(1);
  }

  if (coreDigits.length !== 10) return raw;

  const formatted = `${coreDigits.slice(0, 3)}-${coreDigits.slice(3, 6)}-${coreDigits.slice(6)}`;
  return extension ? `${formatted} x${extension}` : formatted;
}
