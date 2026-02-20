import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const KEMENAG_DIR = join(import.meta.dir, "..", "kemenag");
const YEARS = ["2026", "2027", "2028"];

function parseCSVRow(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

let totalFiles = 0;
let totalCities = 0;

for (const year of YEARS) {
  const yearDir = join(KEMENAG_DIR, year);
  if (!existsSync(yearDir)) {
    console.log(`Skipping ${year} (not found)`);
    continue;
  }

  const outDir = join(yearDir, "json");
  mkdirSync(outDir, { recursive: true });

  const csvFiles = readdirSync(yearDir).filter((f) => f.endsWith(".csv"));

  for (const csvFile of csvFiles) {
    const csv = readFileSync(join(yearDir, csvFile), "utf-8").replace(/\r/g, "");
    const lines = csv.split("\n").filter((l) => l.trim());

    // Skip header, group by city
    const data = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      // cols: [Kota/Kabupaten, "Hari, DD/MM/YYYY", Imsak, Subuh, Terbit, Dhuha, Dzuhur, Ashar, Maghrib, Isya]
      const city = cols[0];
      const tanggal = cols[1]; // "Kamis, 01/01/2026"
      const times = cols.slice(2); // [imsak, subuh, terbit, dhuha, dzuhur, ashar, maghrib, isya]

      if (!data[city]) data[city] = {};
      data[city][tanggal] = times;
    }

    const jsonFile = csvFile.replace(".csv", ".json");
    writeFileSync(join(outDir, jsonFile), JSON.stringify(data));

    const cityCount = Object.keys(data).length;
    totalCities += cityCount;
    totalFiles++;
    console.log(`${year}/${jsonFile} — ${cityCount} cities`);
  }
}

console.log(`\nDone! ${totalFiles} JSON files, ${totalCities} total city entries`);
