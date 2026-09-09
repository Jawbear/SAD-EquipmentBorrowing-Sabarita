// ============================================================
// TRANSACTIONS MODULE — Borrowing, Return, Overdue
// Equipment Borrowing & Return Monitoring System
// ============================================================

// ---- State ----
let allTransactions = [];

// ---- Load Transactions ----
async function loadTransactions() {
  const tableBody = document.getElementById('transactions-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="8">
        <div class="loading-overlay"><span class="spinner"></span> Loading transactions...</div>
      </td>
    </tr>
  `;

  const { data, error } = await supabaseClient
    .from('borrow_transactions')
    .select('*, equipment(equipment_name, asset_code)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading transactions:', error);
    showToast('Failed to load transactions.', 'error');
    tableBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--accent-amber);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
            <p>Failed to load transactions. Please try again.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  allTransactions = data || [];

  // BR-09: Detect overdue transactions
  await checkOverdue();

  renderTransactionsTable(allTransactions);
  updateDashboard();
}

// ---- Render Transactions Table ----
function renderTransactionsTable(transactions) {
  const tableBody = document.getElementById('transactions-table-body');
  if (!tableBody) return;

  if (transactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-icon" style="color: var(--text-muted);"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
            <p>No transactions found. Click "New Borrowing" to record a transaction.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = transactions.map(tx => {
    const equipName = tx.equipment ? tx.equipment.equipment_name : 'Unknown';
    const equipCode = tx.equipment ? tx.equipment.asset_code : '—';

    const statusClass = tx.status === 'Returned' ? 'badge-returned' :
                        tx.status === 'Overdue' ? 'badge-overdue' : 'badge-borrowed';

    // BR-12: Only show Return button for non-returned transactions
    const returnBtn = (tx.status === 'Borrowed' || tx.status === 'Overdue')
      ? `<button class="btn btn-success btn-sm" onclick="returnEquipment(${tx.id}, ${tx.equipment_id})">↩ Return</button>`
      : '';

    return `
      <tr>
        <td><code style="color: var(--accent-cyan); font-size: 0.82rem;">${escapeHtml(equipCode)}</code></td>
        <td>${escapeHtml(equipName)}</td>
        <td>
          <div><strong>${escapeHtml(tx.borrower_name)}</strong></div>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(tx.borrower_type)} · ${escapeHtml(tx.department)}</div>
        </td>
        <td>${formatDate(tx.date_borrowed)}</td>
        <td>${formatDate(tx.due_date)}</td>
        <td>${tx.date_returned ? formatDate(tx.date_returned) : '<span style="color: var(--text-muted);">—</span>'}</td>
        <td><span class="badge ${statusClass}">${tx.status}</span></td>
        <td>
          <div class="table-actions">
            ${returnBtn}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ---- Create Borrowing Transaction (BR-03, BR-04, BR-05, BR-06, BR-07) ----
async function createBorrowing(formData) {
  // BR-04: Borrower name must be provided
  if (!formData.borrower_name.trim()) {
    showToast('Borrower name must be provided. (BR-04)', 'error');
    return false;
  }

  if (!formData.department.trim()) {
    showToast('Department is required.', 'error');
    return false;
  }

  if (!formData.equipment_id) {
    showToast('Please select an equipment item.', 'error');
    return false;
  }

  // BR-05: Due date cannot be earlier than borrowing date
  if (formData.due_date < formData.date_borrowed) {
    showToast('Due date cannot be earlier than the borrowing date. (BR-05)', 'error');
    return false;
  }

  // BR-03: Only available equipment may be borrowed
  const equipment = allEquipment.find(e => e.id === parseInt(formData.equipment_id));
  if (equipment && equipment.availability !== 'Available') {
    showToast('This equipment is not available for borrowing. (BR-03)', 'error');
    return false;
  }

  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    showToast('You must be logged in to record transactions. (BR-11)', 'error');
    return false;
  }

  // Insert transaction (BR-06: Status = Borrowed)
  const { data, error } = await supabaseClient
    .from('borrow_transactions')
    .insert([{
      equipment_id: parseInt(formData.equipment_id),
      borrower_name: formData.borrower_name.trim(),
      borrower_type: formData.borrower_type,
      department: formData.department.trim(),
      date_borrowed: formData.date_borrowed,
      due_date: formData.due_date,
      status: 'Borrowed',
      user_id: user.id
    }])
    .select();

  if (error) {
    showToast('Failed to record borrowing: ' + error.message, 'error');
    return false;
  }

  // BR-07: Set equipment availability to Borrowed
  const { error: updateError } = await supabaseClient
    .from('equipment')
    .update({ availability: 'Borrowed' })
    .eq('id', parseInt(formData.equipment_id));

  if (updateError) {
    console.error('Error updating equipment availability:', updateError);
  }

  showToast('Borrowing transaction recorded successfully!', 'success');
  return true;
}

// ---- Return Equipment (BR-08, BR-12) ----
async function returnEquipment(transactionId, equipmentId) {
  // Find the transaction
  const tx = allTransactions.find(t => t.id === transactionId);

  // BR-12: A returned transaction cannot be returned a second time
  if (tx && tx.status === 'Returned') {
    showToast('This transaction has already been returned. (BR-12)', 'warning');
    return;
  }

  // Record current date as return date
  const today = new Date().toISOString().split('T')[0];

  // Update transaction: status = Returned, date_returned = today
  const { error: txError } = await supabaseClient
    .from('borrow_transactions')
    .update({
      status: 'Returned',
      date_returned: today
    })
    .eq('id', transactionId);

  if (txError) {
    showToast('Failed to return equipment: ' + txError.message, 'error');
    return;
  }

  // BR-08: Set equipment availability back to Available
  const { error: eqError } = await supabaseClient
    .from('equipment')
    .update({ availability: 'Available' })
    .eq('id', equipmentId);

  if (eqError) {
    console.error('Error updating equipment availability:', eqError);
  }

  showToast('Equipment returned successfully!', 'success');

  // Reload both modules
  await loadEquipment();
  await loadTransactions();
}

// ---- Overdue Detection (BR-09) ----
async function checkOverdue() {
  const today = new Date().toISOString().split('T')[0];

  // Find transactions that are past due and still Borrowed
  const overdueTransactions = allTransactions.filter(tx =>
    tx.status === 'Borrowed' && tx.due_date < today
  );

  if (overdueTransactions.length === 0) return;

  // Update each overdue transaction in the database
  for (const tx of overdueTransactions) {
    const { error } = await supabaseClient
      .from('borrow_transactions')
      .update({ status: 'Overdue' })
      .eq('id', tx.id);

    if (error) {
      console.error('Error updating overdue status:', error);
    } else {
      // Update local state
      tx.status = 'Overdue';
    }
  }

  if (overdueTransactions.length > 0) {
    showToast(`${overdueTransactions.length} overdue transaction(s) detected.`, 'warning');
  }
}

// ---- Update Dashboard Stats ----
function updateDashboard() {
  const totalEl = document.getElementById('stat-total');
  const availEl = document.getElementById('stat-available');
  const borrowedEl = document.getElementById('stat-borrowed');
  const returnedEl = document.getElementById('stat-returned');
  const overdueEl = document.getElementById('stat-overdue');

  if (totalEl) {
    animateCounter(totalEl, allEquipment.length);
  }
  if (availEl) {
    const count = allEquipment.filter(e => e.availability === 'Available').length;
    animateCounter(availEl, count);
  }
  if (borrowedEl) {
    const count = allEquipment.filter(e => e.availability === 'Borrowed').length;
    animateCounter(borrowedEl, count);
  }
  if (returnedEl) {
    const count = allTransactions.filter(t => t.status === 'Returned').length;
    animateCounter(returnedEl, count);
  }
  if (overdueEl) {
    const count = allTransactions.filter(t => t.status === 'Overdue').length;
    animateCounter(overdueEl, count);
  }
}

// ---- Animate Counter ----
function animateCounter(element, target) {
  const current = parseInt(element.textContent) || 0;
  if (current === target) return;

  const duration = 400;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);  // ease-out cubic
    const value = Math.round(current + (target - current) * eased);
    element.textContent = value;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ---- Populate Equipment Dropdown (BR-03: only available) ----
function populateBorrowEquipmentDropdown() {
  const select = document.getElementById('borrow-equipment');
  if (!select) return;

  // BR-03: Only available equipment
  const availableEquipment = allEquipment.filter(e => e.availability === 'Available');

  select.innerHTML = '<option value="">Select equipment...</option>' +
    availableEquipment.map(item =>
      `<option value="${item.id}">${item.equipment_name} (${item.asset_code})</option>`
    ).join('');
}

// ---- Open Borrowing Modal ----
function openBorrowingModal() {
  populateBorrowEquipmentDropdown();
  document.getElementById('borrow-form').reset();

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('borrow-date').value = today;

  openModal('borrow-modal');
}

// ---- Handle Borrowing Form Submit ----
async function handleBorrowSubmit(e) {
  e.preventDefault();

  const formData = {
    borrower_name: document.getElementById('borrow-name').value,
    borrower_type: document.getElementById('borrow-type').value,
    department: document.getElementById('borrow-department').value,
    equipment_id: document.getElementById('borrow-equipment').value,
    date_borrowed: document.getElementById('borrow-date').value,
    due_date: document.getElementById('borrow-due-date').value
  };

  if (!formData.due_date) {
    showToast('Due date is required.', 'error');
    return;
  }

  const success = await createBorrowing(formData);

  if (success) {
    closeModal('borrow-modal');
    await loadEquipment();
    await loadTransactions();
  }
}

// ---- Search Transactions ----
function searchTransactions(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderTransactionsTable(allTransactions);
    return;
  }

  const filtered = allTransactions.filter(tx => {
    const equipName = tx.equipment ? tx.equipment.equipment_name.toLowerCase() : '';
    const equipCode = tx.equipment ? tx.equipment.asset_code.toLowerCase() : '';
    return tx.borrower_name.toLowerCase().includes(q) ||
           equipName.includes(q) ||
           equipCode.includes(q) ||
           tx.department.toLowerCase().includes(q);
  });

  renderTransactionsTable(filtered);
}

// ---- Filter Transactions ----
function filterTransactions(status) {
  if (!status || status === 'All') {
    renderTransactionsTable(allTransactions);
    return;
  }

  const filtered = allTransactions.filter(tx => tx.status === status);
  renderTransactionsTable(filtered);
}

// ---- Tab Navigation ----
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });

  // Refresh data when switching tabs
  if (tabName === 'equipment') {
    loadEquipment();
  } else if (tabName === 'transactions') {
    loadTransactions();
    populateBorrowEquipmentDropdown();
  }
}

// ---- Initialize Application ----
async function initApp() {
  // Check authentication (BR-11)
  const user = await initAuth();
  if (!user) return;

  // Setup tab navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Setup equipment form
  const eqForm = document.getElementById('equipment-form');
  if (eqForm) {
    eqForm.addEventListener('submit', handleEquipmentSubmit);
  }

  // Setup borrowing form
  const borrowForm = document.getElementById('borrow-form');
  if (borrowForm) {
    borrowForm.addEventListener('submit', handleBorrowSubmit);
  }

  // Setup equipment search
  const eqSearch = document.getElementById('equipment-search');
  if (eqSearch) {
    eqSearch.addEventListener('input', (e) => searchEquipment(e.target.value));
  }

  // Setup equipment filter
  const eqFilter = document.getElementById('equipment-filter');
  if (eqFilter) {
    eqFilter.addEventListener('change', (e) => filterEquipment(e.target.value));
  }

  // Setup transaction search
  const txSearch = document.getElementById('transaction-search');
  if (txSearch) {
    txSearch.addEventListener('input', (e) => searchTransactions(e.target.value));
  }

  // Setup transaction filter
  const txFilter = document.getElementById('transaction-filter');
  if (txFilter) {
    txFilter.addEventListener('change', (e) => filterTransactions(e.target.value));
  }

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('show');
      }
    });
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.show').forEach(modal => {
        modal.classList.remove('show');
      });
    }
  });

  // Load initial data
  await loadEquipment();
  await loadTransactions();

  // Show dashboard tab by default
  switchTab('dashboard');
}

// Make functions globally available
window.loadTransactions = loadTransactions;
window.createBorrowing = createBorrowing;
window.returnEquipment = returnEquipment;
window.checkOverdue = checkOverdue;
window.updateDashboard = updateDashboard;
window.openBorrowingModal = openBorrowingModal;
window.handleBorrowSubmit = handleBorrowSubmit;
window.searchTransactions = searchTransactions;
window.filterTransactions = filterTransactions;
window.switchTab = switchTab;
window.initApp = initApp;
window.populateBorrowEquipmentDropdown = populateBorrowEquipmentDropdown;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
