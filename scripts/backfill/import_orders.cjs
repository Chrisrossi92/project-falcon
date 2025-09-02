// scripts/backfill/import_orders.cjs
require('dotenv').config();
const { fetch: undiciFetch } = require('undici');   // ADD
global.fetch = undiciFetch;                          // ADD

const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
   global: { fetch: undiciFetch },                    // ADD
});

const filePath = process.argv[2];
const sheetName = process.argv[3] || 'Orders 2025';
if (!filePath) {
  console.error('Usage: node scripts/backfill/import_orders.cjs "<full path to Order Book.xlsx>" [SheetName]');
  process.exit(1);
}

const map = {
  CD: 'Chad Disalle',
  CR: 'Chris Rossi',
  KW: 'Kady Weith',
  MS: 'Michael Scannell',
  PC: 'Pam Casper',
  TC: 'Tracy Casper',
  Stout: 'Mike Stout',
};

const clean = (v) => (v === undefined || v === null ? null : String(v).trim() || null);
const iso = (s) => (s && /^\d{4}-\d{2}-\d{2}/.test(String(s)) ? String(s).slice(0, 10) : null);

function normalizeTwoRowSheet(ws) {
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 }).slice(1);
  const out = [];
  for (let i = 0; i < data.length; i += 2) {
    const top = data[i] || [];
    const bot = data[i + 1] || [];

    const rawInit = clean(bot[6]); // e.g., "TC (Stout)"
    const token = rawInit ? rawInit.split(/[\s(]/)[0] : null; // -> "TC"

    const rec = {
      order_number: clean(top[0]),
      address: clean(top[2]),
      special_instruction: clean(bot[2]),
      client: clean(top[4]),
      client_contact: clean(bot[4]),
      property_type: clean(top[6]),
      assigned_appraiser: rawInit,
      appraiser_name: token && map[token] ? map[token] : rawInit,
      fee: clean(top[8] && String(top[8]).replace(/[,$]/g, '')),
      date_ordered: iso(clean(top[10])),
      due_for_review: iso(clean(top[12])),
      due_to_client: iso(clean(top[14])),
      inspection_date: iso(clean(top[16])),
      date_billed: iso(clean(top[18])),
      date_paid: iso(clean(top[20])),
    };
    if (rec.order_number) out.push(rec);
  }
  return out;
}

(async () => {
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error(`Sheet "${sheetName}" not found in workbook.`);
    process.exit(1);
  }

  const records = normalizeTwoRowSheet(ws);
  console.log(`Prepared ${records.length} orders from "${sheetName}".`);

  const CHUNK = 200;
  for (let i = 0; i < records.length; i += CHUNK) {
    const payload = records.slice(i, i + CHUNK);
    const { error } = await supabase.rpc('import_orders_from_json', { payload });
    if (error) {
      console.error('RPC failed at chunk', i, error);
      process.exit(1);
    }
    console.log('Imported', i + 1, 'to', Math.min(i + CHUNK, records.length));
  }
  console.log('Done.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

