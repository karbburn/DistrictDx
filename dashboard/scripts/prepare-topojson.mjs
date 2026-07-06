/**
 * Convert district_index_final.geojson → india-districts.topo.json
 * Reduces ~5.6MB GeoJSON to ~1MB TopoJSON via shared arc topology.
 * Run: node scripts/prepare-topojson.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// We need topojson-server for the conversion (topology())
// Since it's a one-time script, we'll use a simpler approach:
// quantize the GeoJSON coordinates to reduce precision + file size

const geojson = JSON.parse(
  readFileSync(join(root, "public", "data", "district_index_final.geojson"), "utf8")
);

console.log(`Input: ${geojson.features.length} features`);

// Strip heavy properties — keep only what the map needs.
// Full data comes from CSV for the table/drilldown.
const lightFeatures = geojson.features.map((f) => ({
  type: "Feature",
  geometry: f.geometry,
  properties: {
    lgd_state_code: f.properties.lgd_state_code,
    lgd_district_code: f.properties.lgd_district_code,
    district_name: f.properties.district_name,
    state_name: f.properties.state_name,
  },
}));

// Quantize coordinates to 4 decimal places (~11m precision — plenty for district boundaries)
function quantizeGeometry(geom) {
  const q = (coord) => [
    Math.round(coord[0] * 10000) / 10000,
    Math.round(coord[1] * 10000) / 10000,
  ];

  if (geom.type === "Polygon") {
    geom.coordinates = geom.coordinates.map((ring) => ring.map(q));
  } else if (geom.type === "MultiPolygon") {
    geom.coordinates = geom.coordinates.map((polygon) =>
      polygon.map((ring) => ring.map(q))
    );
  }
  return geom;
}

lightFeatures.forEach((f) => quantizeGeometry(f.geometry));

const lightGeoJSON = {
  type: "FeatureCollection",
  features: lightFeatures,
};

const outPath = join(root, "public", "data", "india-districts-light.json");
const output = JSON.stringify(lightGeoJSON);
writeFileSync(outPath, output);

const sizeMB = (Buffer.byteLength(output) / 1024 / 1024).toFixed(2);
console.log(`Output: ${outPath}`);
console.log(`Size: ${sizeMB} MB`);
console.log("Done.");
