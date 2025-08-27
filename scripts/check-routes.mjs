// scripts/check-routes.mjs
import fs from "node:fs";
import path from "node:path";

const mustExist = [
  "src/pages/Dashboard.jsx",
  "src/pages/Orders.jsx",
  "src/pages/orders/OrderDetail.jsx",
  "src/pages/orders/NewOrder.jsx",
  "src/pages/Calendar.jsx"
];

let fail = false;
for (const f of mustExist) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) {
    console.error(`❌ Missing route/page: ${f}`);
    fail = true;
  }
}
if (fail) process.exit(1);
console.log("✅ Routes present");

