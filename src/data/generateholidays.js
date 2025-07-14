// generateHolidays.js
import Holidays from 'date-holidays';
import { writeFileSync } from 'fs';

const hd = new Holidays('US');
const holidays = hd.getHolidays(2025);

// Just keep unique public holidays
const publicHolidays = holidays
  .filter(h => h.type === 'public')
  .map(h => ({
    date: h.date,
    name: h.name,
  }));

writeFileSync('./src/data/usHolidays2025.json', JSON.stringify(publicHolidays, null, 2));

console.log('✅ Holidays written to src/data/usHolidays2025.json');
