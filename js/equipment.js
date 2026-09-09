// ============================================================
// EQUIPMENT MODULE — CRUD Operations
// Equipment Borrowing & Return Monitoring System
// ============================================================

// ---- State ----
let allEquipment = [];
let editingEquipmentId = null;

// ---- Load Equipment ----
async function loadEquipment() {
  const tableBody = document.getElementById('equipment-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="6">
        <div class="loading-overlay"><span class="spinner"></span> Loading equipment...</div>
      </td>
    </tr>
  `;

  const { data, error } = await supabaseClient
    .from('equipment')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading equipment:', error);
    showToast('Failed to load equipment.', 'error');
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--accent-amber);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
            <p>Failed to load equipment. Please try again.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  allEquipment = data || [];
  renderEquipmentTable(allEquipment);
  updateDashboard();
}

// ---- Render Equipment Table ----
function renderEquipmentTable(equipment) {
  const tableBody = document.getElementById('equipment-table-body');
  if (!tableBody) return;

  if (equipment.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-icon" style="color: var(--text-muted);"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
            <p>No equipment found. Click "Add Equipment" to get started.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = equipment.map(item => {
    const conditionClass = item.condition === 'Good' ? 'badge-good' :
                           item.condition === 'Fair' ? 'badge-fair' : 'badge-repair';
    const availClass = item.availability === 'Available' ? 'badge-available' : 'badge-borrowed';

    return `
      <tr>
        <td><code style="color: var(--accent-cyan); font-size: 0.82rem;">${escapeHtml(item.asset_code)}</code></td>
        <td>
          <span class="equipment-link" onclick="showEquipmentHistory(${item.id}, '${escapeHtml(item.equipment_name)}', '${escapeHtml(item.asset_code)}')" title="Click to view borrowing history">
            ${escapeHtml(item.equipment_name)}
          </span>
        </td>
        <td>${escapeHtml(item.category)}</td>
        <td><span class="badge ${conditionClass}">${item.condition}</span></td>
        <td><span class="badge ${availClass}">${item.availability}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-icon" onclick="openEditEquipment(${item.id})" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn btn-ghost btn-icon" onclick="confirmDeleteEquipment(${item.id}, '${escapeHtml(item.equipment_name)}')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ---- Add Equipment (BR-01, BR-02) ----
async function addEquipment(formData) {
  // BR-01: Equipment name cannot be empty
  if (!formData.equipment_name.trim()) {
    showToast('Equipment name cannot be empty. (BR-01)', 'error');
    return false;
  }

  // BR-02: Asset code must be unique (checked by DB constraint too)
  if (!formData.asset_code.trim()) {
    showToast('Asset code is required.', 'error');
    return false;
  }

  const { data, error } = await supabaseClient
    .from('equipment')
    .insert([{
      equipment_name: formData.equipment_name.trim(),
      category: formData.category,
      asset_code: formData.asset_code.trim().toUpperCase(),
      condition: formData.condition,
      availability: 'Available'
    }])
    .select();

  if (error) {
    if (error.code === '23505') {
      showToast('Asset code already exists. Please use a unique code. (BR-02)', 'error');
    } else {
      showToast('Failed to add equipment: ' + error.message, 'error');
    }
    return false;
  }

  showToast('Equipment added successfully!', 'success');
  return true;
}

// ---- Update Equipment ----
async function updateEquipment(id, formData) {
  // BR-01: Equipment name cannot be empty
  if (!formData.equipment_name.trim()) {
    showToast('Equipment name cannot be empty. (BR-01)', 'error');
    return false;
  }

  const { data, error } = await supabaseClient
    .from('equipment')
    .update({
      equipment_name: formData.equipment_name.trim(),
      category: formData.category,
      asset_code: formData.asset_code.trim().toUpperCase(),
      condition: formData.condition
    })
    .eq('id', id)
    .select();

  if (error) {
    if (error.code === '23505') {
      showToast('Asset code already exists. Please use a unique code. (BR-02)', 'error');
    } else {
      showToast('Failed to update equipment: ' + error.message, 'error');
    }
    return false;
  }

  showToast('Equipment updated successfully!', 'success');
  return true;
}

// ---- Delete Equipment (BR-10) ----
async function deleteEquipment(id) {
  const { error } = await supabaseClient
    .from('equipment')
    .delete()
    .eq('id', id);

  if (error) {
    showToast('Failed to delete equipment: ' + error.message, 'error');
    return false;
  }

  showToast('Equipment deleted successfully!', 'success');
  return true;
}

// ---- Confirm Delete (BR-10) ----
function confirmDeleteEquipment(id, name) {
  const overlay = document.getElementById('confirm-modal');
  const confirmMsg = document.getElementById('confirm-message');
  const confirmBtn = document.getElementById('confirm-action-btn');

  confirmMsg.innerHTML = `Are you sure you want to delete <strong>${escapeHtml(name)}</strong>? This action cannot be undone.`;

  confirmBtn.onclick = async () => {
    const success = await deleteEquipment(id);
    closeModal('confirm-modal');
    if (success) {
      await loadEquipment();
      await loadTransactions();
    }
  };

  openModal('confirm-modal');
}

// ---- Open Add Equipment Modal ----
function openAddEquipment() {
  editingEquipmentId = null;
  document.getElementById('equipment-modal-title').textContent = 'Add New Equipment';
  document.getElementById('equipment-form').reset();
  document.getElementById('equipment-save-btn').textContent = 'Add Equipment';
  openModal('equipment-modal');
}

// ---- Open Edit Equipment Modal ----
function openEditEquipment(id) {
  const item = allEquipment.find(e => e.id === id);
  if (!item) return;

  editingEquipmentId = id;
  document.getElementById('equipment-modal-title').textContent = 'Edit Equipment';
  document.getElementById('eq-name').value = item.equipment_name;
  document.getElementById('eq-category').value = item.category;
  document.getElementById('eq-asset-code').value = item.asset_code;
  document.getElementById('eq-condition').value = item.condition;
  document.getElementById('equipment-save-btn').textContent = 'Save Changes';
  openModal('equipment-modal');
}

// ---- Handle Equipment Form Submit ----
async function handleEquipmentSubmit(e) {
  e.preventDefault();

  const formData = {
    equipment_name: document.getElementById('eq-name').value,
    category: document.getElementById('eq-category').value,
    asset_code: document.getElementById('eq-asset-code').value,
    condition: document.getElementById('eq-condition').value
  };

  let success;
  if (editingEquipmentId) {
    success = await updateEquipment(editingEquipmentId, formData);
  } else {
    success = await addEquipment(formData);
  }

  if (success) {
    closeModal('equipment-modal');
    await loadEquipment();
  }
}

// ---- Search Equipment ----
function searchEquipment(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderEquipmentTable(allEquipment);
    return;
  }

  const filtered = allEquipment.filter(item =>
    item.equipment_name.toLowerCase().includes(q) ||
    item.asset_code.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q)
  );

  renderEquipmentTable(filtered);
}

// ---- Filter Equipment ----
function filterEquipment(availability) {
  if (!availability || availability === 'All') {
    renderEquipmentTable(allEquipment);
    return;
  }

  const filtered = allEquipment.filter(item => item.availability === availability);
  renderEquipmentTable(filtered);
}

// ---- Equipment History (Bonus Feature) ----
async function showEquipmentHistory(equipmentId, equipmentName, assetCode) {
  const historyList = document.getElementById('history-list');
  const titleEl = document.getElementById('history-equipment-title');

  titleEl.textContent = `${equipmentName} — ${assetCode}`;
  historyList.innerHTML = `<div class="loading-overlay"><span class="spinner"></span> Loading history...</div>`;

  openModal('history-modal');

  const { data, error } = await supabaseClient
    .from('borrow_transactions')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('date_borrowed', { ascending: false });

  if (error) {
    historyList.innerHTML = `<div class="empty-state"><p>Failed to load history.</p></div>`;
    return;
  }

  if (!data || data.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="color: var(--text-muted);"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <p>No borrowing history for this equipment.</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = data.map(tx => {
    const statusClass = tx.status === 'Returned' ? 'badge-returned' :
                        tx.status === 'Overdue' ? 'badge-overdue' : 'badge-borrowed';
    const returnInfo = tx.date_returned
      ? `Returned: ${formatDate(tx.date_returned)}`
      : `Due: ${formatDate(tx.due_date)}`;

    return `
      <li class="history-item">
        <div class="history-info">
          <div class="borrower">${escapeHtml(tx.borrower_name)}</div>
          <div class="dates">Borrowed: ${formatDate(tx.date_borrowed)} · ${returnInfo}</div>
        </div>
        <span class="badge ${statusClass}">${tx.status}</span>
      </li>
    `;
  }).join('');
}

// ---- Utility: Escape HTML ----
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ---- Utility: Format Date ----
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---- Modal Helpers ----
function openModal(modalId) {
  document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// Make functions globally available
window.loadEquipment = loadEquipment;
window.openAddEquipment = openAddEquipment;
window.openEditEquipment = openEditEquipment;
window.confirmDeleteEquipment = confirmDeleteEquipment;
window.handleEquipmentSubmit = handleEquipmentSubmit;
window.searchEquipment = searchEquipment;
window.filterEquipment = filterEquipment;
window.showEquipmentHistory = showEquipmentHistory;
window.openModal = openModal;
window.closeModal = closeModal;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.allEquipment = allEquipment;
