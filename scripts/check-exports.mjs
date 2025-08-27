// scripts/check-exports.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  {
    file: "src/lib/services/ordersService.js",
    required: [
      "createOrderWithLogs",
      "assignOrder",
      "setReadyForReview",
      "requestChanges",
      "approveReview",
      "sendToClient",
      "fetchOrderById",
      "fetchOrdersList",
      "fetchOrdersInRange"
    ]
  },
  {
    file: "src/lib/services/usersService.js",
    required: ["fetchAppraisersList", "fetchUsersMapByIds"]
  },
  {
    file: "src/lib/services/clientsService.js",
    required: ["fetchClientsList"] // metrics is optional for MVP
  },
  {
    file: "src/lib/hooks/useOrders.js",
    required: ["useOrders"]
  }
];

function hasExport(src, name) {
  const fn = new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`);
  const named = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`);
  return fn.test(src) || named.test(src);
}

let fail = false;
for (const spec of files) {
  const p = path.join(root, spec.file);
  if (!fs.existsSync(p)) {
    console.error(`❌ Missing file: ${spec.file}`);
    fail = true;
    continue;
  }
  const src = fs.readFileSync(p, "utf8");
  for (const name of spec.required) {
    if (!hasExport(src, name)) {
      console.error(`❌ Missing export ${name} in ${spec.file}`);
      fail = true;
    }
  }
}
if (fail) process.exit(1);
console.log("✅ Exports OK");

