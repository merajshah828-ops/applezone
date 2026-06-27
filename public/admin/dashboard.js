/* ============ AUTH CHECK ============ */
(async function checkAuth() {
  try {
    const res = await fetch('/api/admin/session');
    const data = await res.json();
    if (!data.loggedIn) {
      window.location.href = '/admin/login.html';
    } else {
      document.getElementById('loggedInAs').textContent = `Logged in as ${data.username}`;
    }
  } catch (e) {
    window.location.href = '/admin/login.html';
  }
})();

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
});

/* ============ STATE ============ */
let allDevices = [];
let newPhotoFiles = []; // File objects selected but not yet uploaded
let keptExistingPhotos = []; // photo URLs kept when editing

const TYPE_LABELS = { iphone: 'iPhone', android: 'Android', macbook: 'MacBook', watch: 'Apple Watch', airpods: 'AirPods' };
const STATUS_STYLES = {
  available: { bg: 'bg-signal/10', text: 'text-signalDark', label: 'Available' },
  reserved: { bg: 'bg-amber/10', text: 'text-amber', label: 'Reserved' },
  sold: { bg: 'bg-rose/10', text: 'text-rose', label: 'Sold' },
};

/* ============ TOAST ============ */
function toast(message, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `fixed bottom-5 right-5 ${isError ? 'bg-rose' : 'bg-ink'} text-paper px-5 py-3 rounded-lg shadow-xl font-mono text-sm opacity-100 transition-opacity z-50`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

/* ============ FETCH + RENDER DEVICES ============ */
async function loadDevices() {
  try {
    const res = await fetch('/api/devices');
    allDevices = await res.json();
    renderStats();
    applySearch();
  } catch (e) {
    toast('Could not load devices — check your connection.', true);
  }
}

function renderStats() {
  const total = allDevices.length;
  const available = allDevices.filter((d) => d.status === 'available').length;
  const reserved = allDevices.filter((d) => d.status === 'reserved').length;
  const sold = allDevices.filter((d) => d.status === 'sold').length;

  const stats = [
    { label: 'Total Listings', value: total, color: 'text-ink' },
    { label: 'Available', value: available, color: 'text-signalDark' },
    { label: 'Reserved', value: reserved, color: 'text-amber' },
    { label: 'Sold', value: sold, color: 'text-rose' },
  ];

  document.getElementById('statsRow').innerHTML = stats.map((s) => `
    <div class="bg-white border border-black/5 rounded-xl p-4">
      <p class="font-mono text-xs text-slate uppercase tracking-wide mb-1">${s.label}</p>
      <p class="font-display font-bold text-2xl ${s.color}">${s.value}</p>
    </div>`).join('');
}

function renderTable(devices) {
  const tbody = document.getElementById('deviceTableBody');
  document.getElementById('emptyState').classList.toggle('hidden', devices.length !== 0);

  tbody.innerHTML = devices.map((d) => {
    const s = STATUS_STYLES[d.status];
    const thumb = d.photos && d.photos[0]
      ? `<img src="${d.photos[0]}" class="w-12 h-12 rounded-lg object-cover border border-black/10" alt="${escapeHtml(d.name)}">`
      : `<div class="w-12 h-12 rounded-lg bg-paperDim flex items-center justify-center text-slate/40"><i class="fa-solid fa-image"></i></div>`;

    return `
      <tr class="border-b border-black/5 hover:bg-paperDim/40 transition-colors">
        <td class="px-5 py-3">${thumb}</td>
        <td class="px-5 py-3">
          <p class="font-display font-semibold text-ink">${escapeHtml(d.name)}</p>
          <p class="font-mono text-xs text-slate">${escapeHtml(d.storage)} · ${escapeHtml(d.condition)}</p>
        </td>
        <td class="px-5 py-3 text-sm text-slate">${TYPE_LABELS[d.type] || d.type}</td>
        <td class="px-5 py-3 font-mono text-sm">${d.battery}%</td>
        <td class="px-5 py-3 font-display font-semibold text-sm">₹${Number(d.price).toLocaleString('en-IN')}</td>
        <td class="px-5 py-3">
          <span class="${s.bg} ${s.text} text-xs font-mono px-2.5 py-1 rounded-full">${s.label}</span>
        </td>
        <td class="px-5 py-3 text-right whitespace-nowrap">
          <button data-edit="${d.id}" class="text-slate hover:text-signalDark transition-colors px-2" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>
          <button data-delete="${d.id}" class="text-slate hover:text-rose transition-colors px-2" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.edit));
  });
  tbody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.delete));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/* ============ SEARCH ============ */
document.getElementById('searchInput').addEventListener('input', applySearch);
function applySearch() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = q
    ? allDevices.filter((d) => d.name.toLowerCase().includes(q) || d.storage.toLowerCase().includes(q))
    : allDevices;
  renderTable(filtered);
}

/* ============ MODAL: OPEN / CLOSE ============ */
const modalOverlay = document.getElementById('deviceModalOverlay');
const deviceForm = document.getElementById('deviceForm');

function openAddModal() {
  deviceForm.reset();
  document.getElementById('deviceId').value = '';
  document.getElementById('modalTitle').textContent = 'Add Device';
  document.getElementById('saveBtnText').textContent = 'Save Device';
  document.getElementById('formError').classList.add('hidden');
  newPhotoFiles = [];
  keptExistingPhotos = [];
  renderExistingPhotosGrid();
  renderNewPhotosGrid();
  modalOverlay.classList.remove('hidden');
}

function openEditModal(id) {
  const device = allDevices.find((d) => d.id === id);
  if (!device) return;

  deviceForm.reset();
  document.getElementById('deviceId').value = device.id;
  document.getElementById('fieldName').value = device.name;
  document.getElementById('fieldType').value = device.type;
  document.getElementById('fieldStorage').value = device.storage;
  document.getElementById('fieldCondition').value = device.condition;
  document.getElementById('fieldBattery').value = device.battery;
  document.getElementById('fieldPrice').value = device.price;
  document.getElementById('fieldStatus').value = device.status;
  document.getElementById('fieldNotes').value = device.notes || '';

  document.getElementById('modalTitle').textContent = `Edit ${device.name}`;
  document.getElementById('saveBtnText').textContent = 'Update Device';
  document.getElementById('formError').classList.add('hidden');

  newPhotoFiles = [];
  keptExistingPhotos = [...(device.photos || [])];
  renderExistingPhotosGrid();
  renderNewPhotosGrid();
  modalOverlay.classList.remove('hidden');
}

function closeModal() {
  modalOverlay.classList.add('hidden');
}

document.getElementById('addDeviceBtn').addEventListener('click', openAddModal);
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

/* ============ PHOTO HANDLING ============ */
function renderExistingPhotosGrid() {
  const grid = document.getElementById('existingPhotosGrid');
  grid.innerHTML = keptExistingPhotos.map((url, i) => `
    <div class="relative group">
      <img src="${url}" class="photo-thumb w-full rounded-lg border border-black/10">
      <button type="button" data-remove-existing="${i}" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose text-white text-xs flex items-center justify-center shadow" aria-label="Remove photo">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>`).join('');
  grid.querySelectorAll('[data-remove-existing]').forEach((btn) => {
    btn.addEventListener('click', () => {
      keptExistingPhotos.splice(Number(btn.dataset.removeExisting), 1);
      renderExistingPhotosGrid();
    });
  });
}

function renderNewPhotosGrid() {
  const grid = document.getElementById('newPhotosGrid');
  grid.innerHTML = newPhotoFiles.map((file, i) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="relative group">
        <img src="${url}" class="photo-thumb w-full rounded-lg border border-signal/40">
        <span class="absolute bottom-1 left-1 bg-signal text-ink text-[10px] font-mono px-1.5 py-0.5 rounded">NEW</span>
        <button type="button" data-remove-new="${i}" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose text-white text-xs flex items-center justify-center shadow" aria-label="Remove photo">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>`;
  }).join('');
  grid.querySelectorAll('[data-remove-new]').forEach((btn) => {
    btn.addEventListener('click', () => {
      newPhotoFiles.splice(Number(btn.dataset.removeNew), 1);
      renderNewPhotosGrid();
    });
  });
}

const dropZone = document.getElementById('dropZone');
const fieldPhotos = document.getElementById('fieldPhotos');

dropZone.addEventListener('click', () => fieldPhotos.click());
fieldPhotos.addEventListener('change', () => {
  addNewPhotoFiles(Array.from(fieldPhotos.files));
  fieldPhotos.value = '';
});

['dragenter', 'dragover'].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
});
['dragleave', 'drop'].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); });
});
dropZone.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
  addNewPhotoFiles(files);
});

function addNewPhotoFiles(files) {
  const totalAfter = keptExistingPhotos.length + newPhotoFiles.length + files.length;
  if (totalAfter > 10) {
    toast(`Maximum 10 photos per device (you'd have ${totalAfter}).`, true);
    files = files.slice(0, Math.max(0, 10 - keptExistingPhotos.length - newPhotoFiles.length));
  }
  newPhotoFiles = [...newPhotoFiles, ...files];
  renderNewPhotosGrid();
}

/* ============ SAVE (CREATE / UPDATE) ============ */
deviceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const formError = document.getElementById('formError');
  formError.classList.add('hidden');

  const id = document.getElementById('deviceId').value;
  const isEdit = Boolean(id);

  const formData = new FormData();
  formData.append('name', document.getElementById('fieldName').value);
  formData.append('type', document.getElementById('fieldType').value);
  formData.append('storage', document.getElementById('fieldStorage').value);
  formData.append('condition', document.getElementById('fieldCondition').value);
  formData.append('battery', document.getElementById('fieldBattery').value);
  formData.append('price', document.getElementById('fieldPrice').value);
  formData.append('status', document.getElementById('fieldStatus').value);
  formData.append('notes', document.getElementById('fieldNotes').value);
  if (isEdit) formData.append('existingPhotos', JSON.stringify(keptExistingPhotos));
  newPhotoFiles.forEach((file) => formData.append('photos', file));

  saveBtn.disabled = true;
  saveBtnText.textContent = 'Saving...';

  try {
    const res = await fetch(isEdit ? `/api/devices/${id}` : '/api/devices', {
      method: isEdit ? 'PUT' : 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      formError.textContent = (data.errors || [data.error] || ['Something went wrong.']).join(' ');
      formError.classList.remove('hidden');
      return;
    }

    toast(isEdit ? 'Device updated.' : 'Device added.');
    closeModal();
    loadDevices();
  } catch (err) {
    formError.textContent = 'Network error — could not reach the server.';
    formError.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtnText.textContent = isEdit ? 'Update Device' : 'Save Device';
  }
});

/* ============ DELETE ============ */
const deleteModalOverlay = document.getElementById('deleteModalOverlay');
let pendingDeleteId = null;

function openDeleteModal(id) {
  pendingDeleteId = id;
  deleteModalOverlay.classList.remove('hidden');
}
function closeDeleteModal() {
  pendingDeleteId = null;
  deleteModalOverlay.classList.add('hidden');
}

document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
deleteModalOverlay.addEventListener('click', (e) => { if (e.target === deleteModalOverlay) closeDeleteModal(); });

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  try {
    const res = await fetch(`/api/devices/${pendingDeleteId}`, { method: 'DELETE' });
    if (res.ok) {
      toast('Device deleted.');
      loadDevices();
    } else {
      toast('Could not delete device.', true);
    }
  } catch (e) {
    toast('Network error while deleting.', true);
  } finally {
    closeDeleteModal();
  }
});

/* ============ INIT ============ */
loadDevices();
