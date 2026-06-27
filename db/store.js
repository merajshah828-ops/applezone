const fs = require('fs');
const path = require('path');

/**
 * Minimal JSON-file-backed data store.
 *
 * Why not a real database? At the scale of a single shop's inventory (tens to a few
 * hundred listings), a JSON file is genuinely sufficient: zero native dependencies to
 * install/compile, trivial to back up (just copy the file), human-readable if you ever
 * need to inspect/fix something by hand, and easy to swap out for a real SQL database
 * later if the store grows — every function below is small and self-contained, so
 * migrating to e.g. SQLite/Postgres later only means rewriting this one file.
 *
 * Writes are synchronous and the whole file is rewritten on each change. That's fine at
 * this scale (sub-millisecond for a file this size) and avoids any partial-write/corruption
 * complexity that comes with concurrent async writes.
 */

const DATA_DIR = path.join(__dirname, 'data');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DEVICES_FILE)) fs.writeFileSync(DEVICES_FILE, JSON.stringify([], null, 2));
  if (!fs.existsSync(ADMIN_FILE)) fs.writeFileSync(ADMIN_FILE, JSON.stringify(null));
}

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  // Write to a temp file then rename — avoids leaving a half-written/corrupt file if the
  // process is killed mid-write.
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, filePath);
}

ensureDataFiles();

// ---------- Devices ----------

function getAllDevices() {
  return readJson(DEVICES_FILE, []);
}

function getDeviceById(id) {
  return getAllDevices().find((d) => d.id === id) || null;
}

function createDevice(device) {
  const devices = getAllDevices();
  devices.push(device);
  writeJson(DEVICES_FILE, devices);
  return device;
}

function updateDevice(id, updates) {
  const devices = getAllDevices();
  const idx = devices.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  devices[idx] = { ...devices[idx], ...updates, id }; // id is immutable
  writeJson(DEVICES_FILE, devices);
  return devices[idx];
}

function deleteDevice(id) {
  const devices = getAllDevices();
  const idx = devices.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const [removed] = devices.splice(idx, 1);
  writeJson(DEVICES_FILE, devices);
  return removed;
}

// ---------- Admin account ----------

function getAdmin() {
  return readJson(ADMIN_FILE, null);
}

function setAdmin(admin) {
  writeJson(ADMIN_FILE, admin);
}

module.exports = {
  getAllDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  getAdmin,
  setAdmin,
};
