const AMC_ORDER_LIST_PREFIX = "/amc/orders";
const LEGACY_ORDER_LIST_PREFIX = "/orders";

export function getOrderListBasePath(pathname = "") {
  return pathname === AMC_ORDER_LIST_PREFIX ||
    pathname.startsWith(`${AMC_ORDER_LIST_PREFIX}/`)
    ? AMC_ORDER_LIST_PREFIX
    : LEGACY_ORDER_LIST_PREFIX;
}

export function buildOrderListPath(pathname = "") {
  return getOrderListBasePath(pathname);
}

export function buildOrderDetailPath(orderId, pathname = "") {
  const basePath = getOrderListBasePath(pathname);
  return orderId ? `${basePath}/${encodeURIComponent(orderId)}` : basePath;
}
