// Build a static REST API from the existing Kemenag data in /schedule.
//
// 1. Assigns each kota/kabupaten a stable 4-digit `code` (PPCC: province + city),
//    persisted into schedule/index.json so codes never change across rebuilds.
// 2. Emits static JSON endpoints (served as-is by GitHub Pages — no server needed):
//      GET schedule/api/v1/cities.json              -> daftar semua kota + kode
//      GET schedule/api/v1/jadwal/{code}/{year}.json -> jadwal 1 tahun untuk 1 kota
//      GET schedule/api/v1/index.json               -> metadata / daftar endpoint
//
// No network calls — everything is derived from the CSV-built JSON already in repo.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";

const SCHEDULE_DIR = join(import.meta.dir, "..", "schedule");
const INDEX_PATH = join(SCHEDULE_DIR, "index.json");
const API_DIR = join(SCHEDULE_DIR, "api", "v1");

// Any 4-digit year dir that has a built /json folder (auto-detected, sorted).
const YEARS = readdirSync(SCHEDULE_DIR)
  .filter((d) => /^\d{4}$/.test(d) && existsSync(join(SCHEDULE_DIR, d, "json")))
  .sort();

// Order of times in the per-day arrays produced by build-json.js.
const FIELDS = ["imsak", "subuh", "terbit", "dhuha", "dzuhur", "ashar", "maghrib", "isya"];

// Province slug -> display name. Most are plain title-case; these tokens stay uppercase.
const ACRONYMS = { di: "DI", dki: "DKI" };

function provinceName(file) {
  const slug = file.replace(/^kemenag_/, "").replace(/\.csv$/, "");
  return slug
    .split("_")
    .map((w) => ACRONYMS[w] || w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const pad2 = (n) => String(n).padStart(2, "0");

// ---------------------------------------------------------------------------
// 1. Discover every city from the built JSON (the authoritative list) and map
//    it to its province CSV file.
// ---------------------------------------------------------------------------
const cityFile = {}; // cityName -> "kemenag_xxx.csv"
for (const year of YEARS) {
  const jsonDir = join(SCHEDULE_DIR, year, "json");
  if (!existsSync(jsonDir)) continue;
  for (const jsonName of readdirSync(jsonDir).filter((f) => f.endsWith(".json"))) {
    const csvName = jsonName.replace(/\.json$/, ".csv");
    const data = JSON.parse(readFileSync(join(jsonDir, jsonName), "utf-8"));
    for (const cityName of Object.keys(data)) {
      cityFile[cityName] = csvName;
    }
  }
}

const allCities = Object.keys(cityFile);
if (allCities.length === 0) {
  console.error("No city JSON found. Run scripts/build-json.js first.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Assign stable codes, preserving any already in index.json.
// ---------------------------------------------------------------------------
const existing = existsSync(INDEX_PATH) ? JSON.parse(readFileSync(INDEX_PATH, "utf-8")) : {};

// Province code is the 1-based position of its file in sorted order, but any
// province that already has a coded city keeps its existing prefix.
const sortedFiles = [...new Set(Object.values(cityFile))].sort();
const provCode = {}; // file -> "PP"
const usedProv = new Set();
for (const [city, info] of Object.entries(existing)) {
  if (info.code && cityFile[city]) {
    provCode[cityFile[city]] = info.code.slice(0, 2);
    usedProv.add(info.code.slice(0, 2));
  }
}
for (const file of sortedFiles) {
  if (provCode[file]) continue;
  let n = sortedFiles.indexOf(file) + 1;
  while (usedProv.has(pad2(n))) n++;
  provCode[file] = pad2(n);
  usedProv.add(pad2(n));
}

// City code within a province: keep existing, fill gaps alphabetically.
const codeOf = {}; // cityName -> "PPCC"
for (const file of sortedFiles) {
  const pp = provCode[file];
  const citiesInProv = allCities.filter((c) => cityFile[c] === file);
  const usedCC = new Set();
  for (const c of citiesInProv) {
    const code = existing[c]?.code;
    if (code && code.startsWith(pp)) {
      codeOf[c] = code;
      usedCC.add(code.slice(2));
    }
  }
  const missing = citiesInProv
    .filter((c) => !codeOf[c])
    .sort((a, b) => a.localeCompare(b, "id"));
  let n = 1;
  for (const city of missing) {
    while (usedCC.has(pad2(n))) n++;
    codeOf[city] = pp + pad2(n);
    usedCC.add(pad2(n));
    n++;
  }
}

// ---------------------------------------------------------------------------
// 3. Rewrite index.json — preserve existing key order, just add `code`.
// ---------------------------------------------------------------------------
const orderedCities = [
  ...Object.keys(existing).filter((c) => cityFile[c]),
  ...allCities.filter((c) => !(c in existing)).sort((a, b) => codeOf[a].localeCompare(codeOf[b])),
];
const newIndex = {};
for (const city of orderedCities) {
  newIndex[city] = { file: cityFile[city], code: codeOf[city] };
}
writeFileSync(INDEX_PATH, JSON.stringify(newIndex, null, 2) + "\n");

// ---------------------------------------------------------------------------
// 4. Emit the static API.
// ---------------------------------------------------------------------------
rmSync(API_DIR, { recursive: true, force: true });
mkdirSync(join(API_DIR, "jadwal"), { recursive: true });

// cities.json — the searchable directory of all kota + their codes.
const cities = orderedCities
  .map((name) => ({
    code: codeOf[name],
    kota: name,
    provinsi: provinceName(cityFile[name]),
  }))
  .sort((a, b) => a.code.localeCompare(b.code));
writeFileSync(join(API_DIR, "cities.json"), JSON.stringify(cities));

// Per-kode per-tahun jadwal files.
let fileCount = 0;
for (const year of YEARS) {
  const jsonDir = join(SCHEDULE_DIR, year, "json");
  if (!existsSync(jsonDir)) continue;
  for (const jsonName of readdirSync(jsonDir).filter((f) => f.endsWith(".json"))) {
    const data = JSON.parse(readFileSync(join(jsonDir, jsonName), "utf-8"));
    for (const [cityName, days] of Object.entries(data)) {
      const code = codeOf[cityName];
      const jadwal = {};
      for (const [tanggalLengkap, times] of Object.entries(days)) {
        // "Kamis, 01/01/2026" -> hari + "01/01/2026"
        const [hari, tanggal] = tanggalLengkap.includes(", ")
          ? tanggalLengkap.split(", ")
          : ["", tanggalLengkap];
        const entry = { hari };
        FIELDS.forEach((f, i) => (entry[f] = times[i]));
        jadwal[tanggal] = entry;
      }
      const outDir = join(API_DIR, "jadwal", code);
      mkdirSync(outDir, { recursive: true });
      const payload = {
        code,
        kota: cityName,
        provinsi: provinceName(cityFile[cityName]),
        tahun: Number(year),
        jadwal,
      };
      writeFileSync(join(outDir, `${year}.json`), JSON.stringify(payload));
      fileCount++;
    }
  }
}

// Root metadata describing the API.
writeFileSync(
  join(API_DIR, "index.json"),
  JSON.stringify(
    {
      name: "Jadwal Sholat REST API",
      version: "v1",
      sumber: "Kemenag (bimasislam.kemenag.go.id) via myquran.com",
      tahun: YEARS.map(Number),
      jumlah_kota: cities.length,
      waktu: FIELDS,
      endpoints: {
        cities: "schedule/api/v1/cities.json",
        jadwal: "schedule/api/v1/jadwal/{code}/{year}.json",
      },
    },
    null,
    2,
  ),
);

console.log(`index.json: ${cities.length} kota (codes assigned)`);
console.log(`api/v1/cities.json + ${fileCount} jadwal files written`);
