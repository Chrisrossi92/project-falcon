const AMC_VENDOR_DIRECTORY_PREFIX = "/amc/vendors";
const LEGACY_VENDOR_DIRECTORY_PREFIX = "/vendors";

export function getVendorDirectoryBasePath(pathname = "") {
  return pathname === AMC_VENDOR_DIRECTORY_PREFIX ||
    pathname.startsWith(`${AMC_VENDOR_DIRECTORY_PREFIX}/`)
    ? AMC_VENDOR_DIRECTORY_PREFIX
    : LEGACY_VENDOR_DIRECTORY_PREFIX;
}

export function buildVendorDirectoryPath(pathname = "") {
  return getVendorDirectoryBasePath(pathname);
}

export function buildVendorProfilePath(vendorProfileId, pathname = "") {
  const basePath = getVendorDirectoryBasePath(pathname);
  return vendorProfileId ? `${basePath}/${encodeURIComponent(vendorProfileId)}` : basePath;
}
