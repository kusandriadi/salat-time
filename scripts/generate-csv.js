import { writeFileSync, appendFileSync, existsSync } from "fs";

const API_BASE = "https://equran.id/api/v2/shalat";
const YEAR = 2026;
const CSV_PATH = new URL("../equran/jadwal-sholat-2026.csv", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const CONCURRENCY = 3;
const DELAY_MS = 200;
const MAX_RETRIES = 3;

const CSV_HEADER = "provinsi,kabkota,tanggal,hari,imsak,subuh,terbit,dhuha,dzuhur,ashar,maghrib,isya\n";

// --- Helpers ---

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function csvEscape(val) {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function fetchJson(url, body = null, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const opts = body
        ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : { method: "GET" };

      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.code !== 200) throw new Error(`API error: ${json.message}`);
      return json.data;
    } catch (err) {
      if (attempt === retries) throw err;
      const backoff = DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`  [retry ${attempt}/${retries}] ${err.message} — waiting ${backoff}ms`);
      await sleep(backoff);
    }
  }
}

// --- Fetch steps ---

async function fetchProvinsi() {
  console.log("Fetching daftar provinsi...");
  const data = await fetchJson(`${API_BASE}/provinsi`);
  console.log(`  → ${data.length} provinsi`);
  return data; // string[]
}

async function fetchKabkota(provinsi) {
  const data = await fetchJson(`${API_BASE}/kabkota`, { provinsi });
  return data; // string[]
}

async function fetchJadwal(provinsi, kabkota, bulan) {
  const data = await fetchJson(API_BASE, { provinsi, kabkota, bulan, tahun: YEAR });
  return data.jadwal; // array of day objects
}

// --- Concurrency limiter ---

function createPool(concurrency) {
  let active = 0;
  const queue = [];

  function next() {
    if (queue.length === 0 || active >= concurrency) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      active--;
      next();
    });
  }

  return function run(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

// --- Main ---

async function main() {
  const startTime = Date.now();

  // Init CSV
  writeFileSync(CSV_PATH, CSV_HEADER);
  console.log(`Output: ${CSV_PATH}\n`);

  // 1. Fetch provinces
  const provinsiList = await fetchProvinsi();

  // 2. Fetch cities per province
  console.log("\nFetching daftar kab/kota...");
  const pool = createPool(CONCURRENCY);
  const allCities = []; // { provinsi, kabkota }[]

  const cityResults = await Promise.all(
    provinsiList.map((prov) =>
      pool(async () => {
        const cities = await fetchKabkota(prov);
        console.log(`  ${prov}: ${cities.length} kab/kota`);
        await sleep(DELAY_MS);
        return { provinsi: prov, cities };
      })
    )
  );

  for (const { provinsi, cities } of cityResults) {
    for (const kota of cities) {
      allCities.push({ provinsi, kabkota: kota });
    }
  }

  console.log(`\n→ Total: ${allCities.length} kab/kota\n`);

  // 3. Fetch schedules per city per month — append to CSV incrementally
  let totalRows = 0;
  let skipped = 0;

  for (let i = 0; i < allCities.length; i++) {
    const { provinsi, kabkota } = allCities[i];
    console.log(`[${i + 1}/${allCities.length}] ${provinsi} — ${kabkota}`);

    const monthResults = await Promise.all(
      Array.from({ length: 12 }, (_, m) => m + 1).map((bulan) =>
        pool(async () => {
          const jadwal = await fetchJadwal(provinsi, kabkota, bulan);
          await sleep(DELAY_MS);
          return jadwal;
        })
      )
    ).catch((err) => {
      console.warn(`  ⚠ SKIP ${kabkota}: ${err.message}`);
      skipped++;
      return null;
    });

    if (!monthResults) continue;

    // Build CSV lines for this city
    let csvChunk = "";
    for (const jadwal of monthResults) {
      for (const d of jadwal) {
        csvChunk +=
          [
            csvEscape(provinsi),
            csvEscape(kabkota),
            d.tanggal_lengkap,
            d.hari,
            d.imsak,
            d.subuh,
            d.terbit,
            d.dhuha,
            d.dzuhur,
            d.ashar,
            d.maghrib,
            d.isya,
          ].join(",") + "\n";
        totalRows++;
      }
    }

    appendFileSync(CSV_PATH, csvChunk);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone! ${totalRows} rows written (${skipped} cities skipped) in ${elapsed}s`);
  console.log(`Output: ${CSV_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
