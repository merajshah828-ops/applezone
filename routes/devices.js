const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('../db/store');
const { requireAuth } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();

const VALID_TYPES = ['iphone', 'android', 'macbook', 'watch', 'airpods'];
const VALID_STATUSES = ['available', 'reserved', 'sold'];

function validateDeviceFields(body) {
  const errors = [];
  if (!body.name || !body.name.trim()) errors.push('Device name is required.');
  if (!VALID_TYPES.includes(body.type)) errors.push(`Type must be one of: ${VALID_TYPES.join(', ')}.`);
  if (!body.storage || !body.storage.trim()) errors.push('Storage/spec is required.');
  if (body.battery === undefined || body.battery === '' || isNaN(Number(body.battery))) {
    errors.push('Battery health (%) must be a number.');
  } else if (Number(body.battery) < 0 || Number(body.battery) > 100) {
    errors.push('Battery health must be between 0 and 100.');
  }
  if (!body.condition || !body.condition.trim()) errors.push('Condition/grade is required.');
  if (body.price === undefined || body.price === '' || isNaN(Number(body.price)) || Number(body.price) < 0) {
    errors.push('Price must be a positive number.');
  }
  if (!VALID_STATUSES.includes(body.status)) errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
  return errors;
}

// ---------- PUBLIC: read-only, used by the live website ----------

// GET /api/devices — list all devices (public, no auth)
router.get('/', (req, res) => {
  const devices = store.getAllDevices();
  res.json(devices);
});

// GET /api/devices/:id — single device detail (public, no auth)
router.get('/:id', (req, res) => {
  const device = store.getDeviceById(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found.' });
  res.json(device);
});

// ---------- ADMIN: create / update / delete, all require login ----------

// POST /api/devices — create a new device listing with photos
router.post('/', requireAuth, upload.array('photos', 10), (req, res) => {
  const errors = validateDeviceFields(req.body);
  if (errors.length > 0) {
    // Clean up any uploaded files since we're rejecting this request
    (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
    return res.status(400).json({ errors });
  }

  const photos = (req.files || []).map((f) => `/uploads/${f.filename}`);

  const device = {
    id: crypto.randomBytes(8).toString('hex'),
    name: req.body.name.trim(),
    type: req.body.type,
    storage: req.body.storage.trim(),
    battery: Number(req.body.battery),
    condition: req.body.condition.trim(),
    price: Number(req.body.price),
    status: req.body.status,
    notes: (req.body.notes || '').trim(),
    photos,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.createDevice(device);
  res.status(201).json(device);
});

// PUT /api/devices/:id — update a device's fields, optionally adding more photos
router.put('/:id', requireAuth, upload.array('photos', 10), (req, res) => {
  const existing = store.getDeviceById(req.params.id);
  if (!existing) {
    (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
    return res.status(404).json({ error: 'Device not found.' });
  }

  const errors = validateDeviceFields(req.body);
  if (errors.length > 0) {
    (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
    return res.status(400).json({ errors });
  }

  // Photos the admin chose to keep from the existing set (sent as JSON array of URLs).
  // Any existing photo NOT in this list is deleted from disk.
  let keptPhotos = existing.photos;
  if (req.body.existingPhotos !== undefined) {
    try {
      keptPhotos = JSON.parse(req.body.existingPhotos);
    } catch (e) {
      keptPhotos = existing.photos;
    }
  }
  const removedPhotos = existing.photos.filter((p) => !keptPhotos.includes(p));
  removedPhotos.forEach((p) => {
    const filePath = path.join(UPLOAD_DIR, path.basename(p));
    fs.unlink(filePath, () => {});
  });

  const newPhotos = (req.files || []).map((f) => `/uploads/${f.filename}`);

  const updated = store.updateDevice(req.params.id, {
    name: req.body.name.trim(),
    type: req.body.type,
    storage: req.body.storage.trim(),
    battery: Number(req.body.battery),
    condition: req.body.condition.trim(),
    price: Number(req.body.price),
    status: req.body.status,
    notes: (req.body.notes || '').trim(),
    photos: [...keptPhotos, ...newPhotos],
    updatedAt: new Date().toISOString(),
  });

  res.json(updated);
});

// DELETE /api/devices/:id — delete a device and its photos from disk
router.delete('/:id', requireAuth, (req, res) => {
  const removed = store.deleteDevice(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Device not found.' });

  (removed.photos || []).forEach((p) => {
    const filePath = path.join(UPLOAD_DIR, path.basename(p));
    fs.unlink(filePath, () => {});
  });

  res.json({ success: true });
});

module.exports = router;
