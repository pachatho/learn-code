// API base URL
const API_BASE = '/api';

// Initial Mock Data for Local Storage Fallback
const MOCK_ASSETS = [
  { asset_id: 'IT-HW-0001', name: 'MacBook Pro 16" M3 Max', category: 'Hardware', type: 'Laptop', status: 'Active', purchase_date: '2025-01-15', purchase_price: 112900.00, expiration_date: '2028-01-15', assignee: 'Somchai Jaidee', department: 'Engineering', location: 'HQ Office - Fl 4', notes: 'เครื่องหลักสำหรับการพัฒนาซอฟต์แวร์' },
  { asset_id: 'IT-HW-0002', name: 'Dell UltraSharp 27" U2723QE', category: 'Hardware', type: 'Monitor', status: 'Active', purchase_date: '2025-01-20', purchase_price: 18900.00, expiration_date: '2028-01-20', assignee: 'Somsri Rakdee', department: 'Design', location: 'HQ Office - Fl 4', notes: 'จอภาพรองรับสี 100% sRGB' },
  { asset_id: 'IT-SW-0001', name: 'Microsoft 365 Business Standard', category: 'Software', type: 'License', status: 'Active', purchase_date: '2025-06-01', purchase_price: 5400.00, expiration_date: '2026-06-01', assignee: 'System Account', department: 'IT Support', location: 'Cloud', notes: 'ไลเซนส์รายปีต่ออายุอัตโนมัติ' },
  { asset_id: 'IT-SW-0002', name: 'Adobe Creative Cloud All Apps', category: 'Software', type: 'License', status: 'Active', purchase_date: '2025-07-10', purchase_price: 28500.00, expiration_date: '2026-07-10', assignee: 'Piti Chuchai', department: 'Marketing', location: 'Cloud', notes: 'ลิขสิทธิ์สำหรับกราฟิกดีไซเนอร์' },
  { asset_id: 'IT-NW-0001', name: 'Cisco Catalyst 9300 Switch', category: 'Network', type: 'Switch', status: 'Active', purchase_date: '2024-03-12', purchase_price: 125000.00, expiration_date: '2027-03-12', assignee: 'Network Admin', department: 'IT Infrastructure', location: 'Server Room A', notes: 'Core Switch ประจำตึก A' },
  { asset_id: 'IT-HW-0003', name: 'Lenovo ThinkPad X1 Carbon Gen 11', category: 'Hardware', type: 'Laptop', status: 'Repair', purchase_date: '2024-08-05', purchase_price: 68000.00, expiration_date: '2027-08-05', assignee: 'Wichai Rungruang', department: 'Sales', location: 'HQ Office - Fl 2', notes: 'ส่งซ่อมหน้าจอแตก รออะไหล่จากศูนย์' },
  { asset_id: 'IT-HW-0004', name: 'iPad Pro 11" M2', category: 'Hardware', type: 'Tablet', status: 'Storage', purchase_date: '2024-11-30', purchase_price: 32900.00, expiration_date: '2025-11-30', assignee: null, department: 'IT Stock', location: 'IT Storage Room', notes: 'เครื่องสำรองสำหรับทดสอบแอปมือถือ' },
  { asset_id: 'IT-HW-0005', name: 'HP LaserJet Pro M404dn', category: 'Hardware', type: 'Printer', status: 'Retired', purchase_date: '2021-02-10', purchase_price: 12900.00, expiration_date: '2024-02-10', assignee: null, department: 'Admin', location: 'HQ Office - Fl 1', notes: 'ปลดระวางเนื่องจากซ่อมไม่คุ้มค่า' }
];

const MOCK_LOGS = [
  { id: 1, asset_id: 'IT-HW-0001', action: 'CREATE', details: 'เพิ่มสินทรัพย์ใหม่และเปิดใช้งาน มอบหมายให้ Somchai Jaidee', logged_at: '2026-06-20 10:00:00' },
  { id: 2, asset_id: 'IT-SW-0001', action: 'CREATE', details: 'ซื้อสิทธิ์การใช้งาน Microsoft 365 จำนวน 1 บัญชี', logged_at: '2026-06-20 10:15:00' },
  { id: 3, asset_id: 'IT-HW-0003', action: 'UPDATE', details: 'เปลี่ยนสถานะเป็น ส่งซ่อม (Repair) และบันทึกหมายเหตุ: ส่งซ่อมหน้าจอแตก รออะไหล่จากศูนย์', logged_at: '2026-06-20 11:30:00' },
  { id: 4, asset_id: 'IT-HW-0005', action: 'UPDATE', details: 'เปลี่ยนสถานะเป็น ปลดระวาง (Retired) เนื่องจากหมดประกันและเสื่อมสภาพ', logged_at: '2026-06-20 12:00:00' }
];

// Application State
let state = {
  assets: [], // Holds all assets loaded (either from DB or LocalStorage)
  filteredAssets: [], // Holds search/filtered results
  logs: [], // Holds logs
  activeTab: 'dashboard',
  currentPage: 1,
  itemsPerPage: 10,
  currentEditingAssetId: null,
  importData: [], // Store excel records to import
  isLocalMode: false, // Fallback offline mode status
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check if API Backend exists, otherwise set isLocalMode = true
  await checkDatabaseMode();

  // Initialize Lucide icons
  lucide.createIcons();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load initial data
  refreshData();
  
  // Initialize Sidebar for mobile toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.querySelector('.sidebar-nav').classList.toggle('show');
    });
  }
});

// Detect Database Connection
async function checkDatabaseMode() {
  const badge = document.getElementById('db-mode-badge');
  
  // If loaded via file:// protocol (direct double click)
  if (window.location.protocol === 'file:') {
    state.isLocalMode = true;
    if (badge) {
      badge.innerHTML = 'Local (Offline)';
      badge.style.color = '#e53e3e';
      badge.style.fontWeight = 'bold';
    }
    initializeLocalStorageMock();
    return;
  }

  // Attempt API connection
  try {
    const response = await fetch(`${API_BASE}/assets?limit=1`, { method: 'GET' });
    if (response.ok) {
      state.isLocalMode = false;
      if (badge) {
        badge.innerHTML = 'Cloud (Cloudflare D1)';
        badge.style.color = '#388e3c';
        badge.style.fontWeight = 'bold';
      }
    } else {
      throw new Error('API server returned error status');
    }
  } catch (error) {
    state.isLocalMode = true;
    if (badge) {
      badge.innerHTML = 'Local (Offline)';
      badge.style.color = '#e53e3e';
      badge.style.fontWeight = 'bold';
    }
    initializeLocalStorageMock();
    console.log('API unavailable, running in local localStorage mode:', error);
  }
}

// Populate LocalStorage with mock values if first time
function initializeLocalStorageMock() {
  if (!localStorage.getItem('it_assets')) {
    localStorage.setItem('it_assets', JSON.stringify(MOCK_ASSETS));
  }
  if (!localStorage.getItem('it_logs')) {
    localStorage.setItem('it_logs', JSON.stringify(MOCK_LOGS));
  }
}

// Setup DOM Event Listeners
function setupEventListeners() {
  // Tab Switching
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Filter Event Listeners
  const filterSearch = document.getElementById('filter-search');
  const filterCategory = document.getElementById('filter-category');
  const filterStatus = document.getElementById('filter-status');
  const filterExpiration = document.getElementById('filter-expiration');
  
  if (filterSearch) filterSearch.addEventListener('input', debounce(handleFilters, 300));
  if (filterCategory) filterCategory.addEventListener('change', handleFilters);
  if (filterStatus) filterStatus.addEventListener('change', handleFilters);
  if (filterExpiration) filterExpiration.addEventListener('change', handleFilters);

  document.getElementById('btn-clear-filters').addEventListener('click', clearFilters);

  // Asset Form Modal
  document.getElementById('btn-add-asset').addEventListener('click', () => openFormModal());
  document.getElementById('btn-close-form-modal').addEventListener('click', closeFormModal);
  document.getElementById('btn-cancel-form').addEventListener('click', closeFormModal);
  document.getElementById('asset-form').addEventListener('submit', handleFormSubmit);

  // View Details Modal
  document.getElementById('btn-close-view-modal').addEventListener('click', closeViewModal);
  document.getElementById('btn-print-qr').addEventListener('click', printQrTag);

  // Expiration Alert Buttons
  document.getElementById('btn-view-all-alerts').addEventListener('click', () => switchTab('alerts'));
  document.getElementById('card-alert-expired').addEventListener('click', () => {
    switchTab('alerts');
    setAlertSubFilter('expired');
  });
  document.getElementById('card-alert-expiring').addEventListener('click', () => {
    switchTab('alerts');
    setAlertSubFilter('expiring');
  });

  // Expiration Alert Sub-tabs
  document.getElementById('btn-alert-filter-all').addEventListener('click', () => filterAlertsTab('all'));
  document.getElementById('btn-alert-filter-expired').addEventListener('click', () => filterAlertsTab('expired'));
  document.getElementById('btn-alert-filter-expiring').addEventListener('click', () => filterAlertsTab('expiring'));

  // Export Excel
  document.getElementById('btn-export-excel').addEventListener('click', exportToExcel);

  // Import Excel Modal
  document.getElementById('btn-import-excel').addEventListener('click', openImportModal);
  document.getElementById('btn-close-import-modal').addEventListener('click', closeImportModal);
  document.getElementById('btn-cancel-import').addEventListener('click', closeImportModal);
  document.getElementById('btn-download-template').addEventListener('click', downloadExcelTemplate);
  document.getElementById('btn-submit-import').addEventListener('click', submitImportedData);

  // Excel Drag and Drop Setup
  setupExcelImportDragAndDrop();
}

// ==========================================================================
// DATA REFRESH & STATS CALCULATIONS
// ==========================================================================
async function refreshData() {
  try {
    if (state.isLocalMode) {
      // Offline mode: load from LocalStorage
      state.assets = JSON.parse(localStorage.getItem('it_assets') || '[]');
      state.logs = JSON.parse(localStorage.getItem('it_logs') || '[]');
      state.filteredAssets = [...state.assets];
    } else {
      // Cloud mode: load from worker endpoints
      const response = await fetch(`${API_BASE}/assets`);
      if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลสินทรัพย์ได้');
      state.assets = await response.json();
      state.filteredAssets = [...state.assets];
      
      const logResponse = await fetch(`${API_BASE}/logs?limit=50`);
      if (logResponse.ok) {
        state.logs = await logResponse.json();
      }
    }
    
    // Recalculate Dashboard Stats and Render
    calculateDashboardStats();
    renderCurrentTab();
    updateAlertBadge();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Update the notification badge on sidebar menu
function updateAlertBadge() {
  const expiredCount = state.assets.filter(a => isExpired(a.expiration_date)).length;
  const expiringCount = state.assets.filter(a => isExpiringSoon(a.expiration_date)).length;
  const totalAlerts = expiredCount + expiringCount;
  
  const badge = document.getElementById('alert-count-badge');
  if (totalAlerts > 0) {
    badge.innerText = totalAlerts;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function calculateDashboardStats() {
  let totalCount = state.assets.length;
  let totalValue = 0;
  let expiredCount = 0;
  let expiringCount = 0;
  
  let activeCount = 0;
  let storageCount = 0;
  let repairCount = 0;
  let retiredCount = 0;

  const expiringList = [];

  state.assets.forEach(asset => {
    // Valuation sum
    if (asset.purchase_price) {
      totalValue += Number(asset.purchase_price);
    }
    
    // Expiration alerts
    if (isExpired(asset.expiration_date)) {
      expiredCount++;
    } else if (isExpiringSoon(asset.expiration_date)) {
      expiringCount++;
      expiringList.push(asset);
    }

    // Status counts
    switch (asset.status) {
      case 'Active': activeCount++; break;
      case 'Storage': storageCount++; break;
      case 'Repair': repairCount++; break;
      case 'Retired': retiredCount++; break;
    }
  });

  // Sort upcoming expirations by closest date
  expiringList.sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date));

  // Render Stats Card Values
  document.getElementById('stat-total-assets').innerText = totalCount;
  document.getElementById('stat-total-value').innerText = formatCurrency(totalValue);
  document.getElementById('stat-expired-assets').innerText = expiredCount;
  document.getElementById('stat-expiring-assets').innerText = expiringCount;

  // Render Status Counts
  document.getElementById('status-count-active').innerText = activeCount;
  document.getElementById('status-count-storage').innerText = storageCount;
  document.getElementById('status-count-repair').innerText = repairCount;
  document.getElementById('status-count-retired').innerText = retiredCount;

  // Render Dashboard Table (upcoming expirations)
  const expiringTbody = document.getElementById('dashboard-expiring-tbody');
  if (expiringList.length === 0) {
    expiringTbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">ไม่มีสินทรัพย์ที่กำลังจะหมดอายุเร็วๆ นี้ (30 วันข้างหน้า)</td></tr>`;
  } else {
    expiringTbody.innerHTML = expiringList.slice(0, 5).map(asset => {
      const days = getDaysRemaining(asset.expiration_date);
      return `
        <tr>
          <td class="font-semibold text-red cursor-pointer" onclick="viewAssetDetails('${asset.asset_id}')">${asset.asset_id}</td>
          <td>${escapeHtml(asset.name)}</td>
          <td>${asset.category}</td>
          <td>${formatDate(asset.expiration_date)}</td>
          <td><span class="countdown-badge countdown-expiring">เหลืออีก ${days} วัน</span></td>
        </tr>
      `;
    }).join('');
  }
}

// ==========================================================================
// TABS SWITCHING
// ==========================================================================
function switchTab(tabName) {
  state.activeTab = tabName;
  
  // Update sidebar buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update navbar title
  const titleMap = {
    'dashboard': 'แดชบอร์ดสรุปสถิติ',
    'assets': 'รายการสินทรัพย์ทั้งหมด',
    'alerts': 'ตรวจสอบการหมดอายุสัญญารับประกัน / สิทธิ์การใช้งาน',
    'logs': 'ประวัติการใช้งานและกิจกรรม'
  };
  document.getElementById('page-title').innerText = titleMap[tabName] || 'ระบบ IT Asset';

  // Toggle active pane
  document.querySelectorAll('.tab-pane').forEach(pane => {
    if (pane.id === `tab-${tabName}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  // Render tab content
  renderCurrentTab();
}

function renderCurrentTab() {
  if (state.activeTab === 'assets') {
    renderAssetsTable();
  } else if (state.activeTab === 'alerts') {
    renderAlertsTable();
  } else if (state.activeTab === 'logs') {
    renderLogsTable();
  } else if (state.activeTab === 'dashboard') {
    calculateDashboardStats();
  }
}

// ==========================================================================
// TAB: ASSET LIST & FILTER LOGIC
// ==========================================================================
async function handleFilters() {
  state.currentPage = 1;
  const search = document.getElementById('filter-search').value.toLowerCase().trim();
  const category = document.getElementById('filter-category').value;
  const status = document.getElementById('filter-status').value;
  const expiration = document.getElementById('filter-expiration').value;

  if (state.isLocalMode) {
    // Offline filtering logic matching the SQL logic
    state.filteredAssets = state.assets.filter(asset => {
      // 1. Search filter
      if (search) {
        const matchesSearch = 
          (asset.asset_id && asset.asset_id.toLowerCase().includes(search)) ||
          (asset.name && asset.name.toLowerCase().includes(search)) ||
          (asset.assignee && asset.assignee.toLowerCase().includes(search)) ||
          (asset.department && asset.department.toLowerCase().includes(search)) ||
          (asset.location && asset.location.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      // 2. Category filter
      if (category && asset.category !== category) return false;

      // 3. Status filter
      if (status && asset.status !== status) return false;

      // 4. Expiration status filter
      if (expiration) {
        const isExp = isExpired(asset.expiration_date);
        const isSoon = isExpiringSoon(asset.expiration_date);
        
        if (expiration === 'expired' && !isExp) return false;
        if (expiration === 'expiring' && !isSoon) return false;
        if (expiration === 'safe' && (isExp || isSoon)) return false;
      }

      return true;
    });
    renderAssetsTable();
  } else {
    // API filter logic
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (expiration) params.append('expiration', expiration);

      const response = await fetch(`${API_BASE}/assets?${params.toString()}`);
      if (!response.ok) throw new Error('ไม่สามารถกรองข้อมูลได้');
      state.filteredAssets = await response.json();
      renderAssetsTable();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
}

function clearFilters() {
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-expiration').value = '';
  handleFilters();
}

function renderAssetsTable() {
  const tbody = document.getElementById('assets-tbody');
  const paginationText = document.getElementById('pagination-text');
  const paginationButtons = document.getElementById('pagination-buttons');
  
  if (state.filteredAssets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">ไม่พบรายการสินทรัพย์ตามเงื่อนไขที่เลือก</td></tr>`;
    paginationText.innerText = 'แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ';
    paginationButtons.innerHTML = '';
    return;
  }

  // Pagination bounds
  const totalItems = state.filteredAssets.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage);
  
  if (state.currentPage > totalPages) state.currentPage = totalPages || 1;
  
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = Math.min(startIndex + state.itemsPerPage, totalItems);
  
  const paginatedItems = state.filteredAssets.slice(startIndex, endIndex);

  // Render Table rows
  tbody.innerHTML = paginatedItems.map(asset => {
    // Status Badge
    let statusText = 'ไม่ระบุ';
    let statusClass = 'retired';
    if (asset.status === 'Active') { statusText = 'ใช้งานอยู่'; statusClass = 'active'; }
    else if (asset.status === 'Storage') { statusText = 'ในคลัง'; statusClass = 'storage'; }
    else if (asset.status === 'Repair') { statusText = 'ส่งซ่อม'; statusClass = 'repair'; }
    else if (asset.status === 'Retired') { statusText = 'ปลดระวาง'; statusClass = 'retired'; }

    // Expiration badge
    let expBadge = `<span class="text-muted">-</span>`;
    if (asset.expiration_date) {
      if (isExpired(asset.expiration_date)) {
        expBadge = `<span class="badge-alert expired"><i data-lucide="alert-circle" style="width:12px;height:12px"></i> หมดอายุแล้ว</span>`;
      } else if (isExpiringSoon(asset.expiration_date)) {
        const days = getDaysRemaining(asset.expiration_date);
        expBadge = `<span class="badge-alert expiring"><i data-lucide="clock" style="width:12px;height:12px"></i> อีก ${days} วัน</span>`;
      } else {
        expBadge = `<span class="badge-alert safe"><i data-lucide="shield-check" style="width:12px;height:12px"></i> ปกติ</span>`;
      }
    }

    const assigneeStr = asset.assignee 
      ? `<strong>${escapeHtml(asset.assignee)}</strong> <br><span class="text-muted text-xs">${escapeHtml(asset.department || '')}</span>` 
      : `<span class="text-muted">ไม่มีผู้ถือครอง</span>`;

    return `
      <tr>
        <td class="font-semibold text-red cursor-pointer" onclick="viewAssetDetails('${asset.asset_id}')">${asset.asset_id}</td>
        <td>
          <div class="font-semibold">${escapeHtml(asset.name)}</div>
          <div class="text-muted text-xs">${escapeHtml(asset.type || '')}</div>
        </td>
        <td>${asset.category}</td>
        <td><span class="status-pill ${statusClass}">${statusText}</span></td>
        <td>${assigneeStr}</td>
        <td>${formatDate(asset.purchase_date)}</td>
        <td>
          <div>${formatDate(asset.expiration_date)}</div>
          <div class="mt-1">${expBadge}</div>
        </td>
        <td class="text-right font-semibold">${formatCurrency(asset.purchase_price)}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn btn-view" title="ดูรายละเอียด / QR" onclick="viewAssetDetails('${asset.asset_id}')">
              <i data-lucide="qr-code"></i>
            </button>
            <button class="action-btn btn-edit" title="แก้ไขข้อมูล" onclick="openFormModal('${asset.asset_id}')">
              <i data-lucide="edit"></i>
            </button>
            <button class="action-btn btn-delete" title="ลบข้อมูล" onclick="handleDeleteAsset('${asset.asset_id}', '${escapeHtml(asset.name)}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();

  // Render pagination info
  paginationText.innerText = `แสดง ${startIndex + 1} ถึง ${endIndex} จากทั้งหมด ${totalItems} รายการ`;

  // Render pagination buttons
  let pgHtml = `
    <button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''} onclick="changePage(1)"><i data-lucide="chevrons-left" style="width:14px;height:14px;vertical-align:middle"></i></button>
    <button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${state.currentPage - 1})"><i data-lucide="chevron-left" style="width:14px;height:14px;vertical-align:middle"></i></button>
  `;

  // Show 5 page numbers around active page
  let startPage = Math.max(1, state.currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pgHtml += `<button class="page-btn ${i === state.currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }

  pgHtml += `
    <button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${state.currentPage + 1})"><i data-lucide="chevron-right" style="width:14px;height:14px;vertical-align:middle"></i></button>
    <button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${totalPages})"><i data-lucide="chevrons-right" style="width:14px;height:14px;vertical-align:middle"></i></button>
  `;

  paginationButtons.innerHTML = pgHtml;
  lucide.createIcons();
}

function changePage(page) {
  state.currentPage = page;
  renderAssetsTable();
}

// ==========================================================================
// TAB: EXSPIRATION ALERTS
// ==========================================================================
let currentAlertTabFilter = 'all'; // 'all', 'expired', 'expiring'

function setAlertSubFilter(filterName) {
  currentAlertTabFilter = filterName;
  
  // Highlight subtab button
  document.querySelectorAll('.tab-sub-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const btnIdMap = {
    'all': 'btn-alert-filter-all',
    'expired': 'btn-alert-filter-expired',
    'expiring': 'btn-alert-filter-expiring'
  };
  
  const targetBtn = document.getElementById(btnIdMap[filterName]);
  if (targetBtn) targetBtn.classList.add('active');
  
  renderAlertsTable();
}

function filterAlertsTab(filterType) {
  setAlertSubFilter(filterType);
}

function renderAlertsTable() {
  const tbody = document.getElementById('alerts-tbody');
  
  // Filter assets that have expiration dates and are either expired or expiring soon
  let alertAssets = state.assets.filter(asset => {
    if (!asset.expiration_date) return false;
    const isExp = isExpired(asset.expiration_date);
    const isSoon = isExpiringSoon(asset.expiration_date);
    
    if (currentAlertTabFilter === 'expired') {
      return isExp;
    } else if (currentAlertTabFilter === 'expiring') {
      return isSoon;
    } else {
      return isExp || isSoon;
    }
  });

  if (alertAssets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">ไม่พบอุปกรณ์ที่ต้องแจ้งเตือนการหมดอายุตามกลุ่มที่เลือก</td></tr>`;
    return;
  }

  // Sort: Expired first, then closest to expire
  alertAssets.sort((a, b) => {
    const isAExpired = isExpired(a.expiration_date);
    const isBExpired = isExpired(b.expiration_date);
    if (isAExpired && !isBExpired) return -1;
    if (!isAExpired && isBExpired) return 1;
    return new Date(a.expiration_date) - new Date(b.expiration_date);
  });

  tbody.innerHTML = alertAssets.map(asset => {
    const isExp = isExpired(asset.expiration_date);
    const days = getDaysRemaining(asset.expiration_date);
    
    let warningBadge = '';
    let rowClass = '';
    if (isExp) {
      warningBadge = `<span class="badge-alert expired"><i data-lucide="alert-triangle"></i> หมดอายุสัญญา</span>`;
      rowClass = 'row-expired';
    } else {
      warningBadge = `<span class="badge-alert expiring"><i data-lucide="clock"></i> อีก ${days} วัน</span>`;
    }

    return `
      <tr class="${rowClass}">
        <td>${warningBadge}</td>
        <td class="font-semibold text-red cursor-pointer" onclick="viewAssetDetails('${asset.asset_id}')">${asset.asset_id}</td>
        <td>
          <div class="font-semibold">${escapeHtml(asset.name)}</div>
          <div class="text-muted text-xs">${escapeHtml(asset.type || '')}</div>
        </td>
        <td>${asset.category}</td>
        <td>${formatDate(asset.expiration_date)}</td>
        <td class="font-semibold ${isExp ? 'text-red' : 'text-yellow'}">
          ${isExp ? `หมดประกันแล้ว (${Math.abs(days)} วัน)` : `${days} วัน`}
        </td>
        <td>${escapeHtml(asset.assignee || 'ไม่มีผู้ถือครอง')}</td>
        <td>
          <div>${escapeHtml(asset.department || '-')}</div>
          <div class="text-muted text-xs">${escapeHtml(asset.location || '')}</div>
        </td>
        <td class="text-center">
          <div class="action-buttons">
            <button class="action-btn btn-view" title="ดูรายละเอียด" onclick="viewAssetDetails('${asset.asset_id}')">
              <i data-lucide="eye"></i>
            </button>
            <button class="action-btn btn-edit" title="แก้ไขสัญญา" onclick="openFormModal('${asset.asset_id}')">
              <i data-lucide="edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

// ==========================================================================
// TAB: ACTIVITY LOGS
// ==========================================================================
function renderLogsTable() {
  const tbody = document.getElementById('logs-tbody');
  
  if (state.logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">ไม่พบประวัติกิจกรรมในระบบ</td></tr>`;
    return;
  }

  tbody.innerHTML = state.logs.map(log => {
    let actionBadgeClass = 'text-muted';
    let actionName = log.action;
    if (log.action === 'CREATE') { actionBadgeClass = 'status-pill active'; actionName = 'เพิ่มสินทรัพย์'; }
    else if (log.action === 'UPDATE') { actionBadgeClass = 'status-pill repair'; actionName = 'แก้ไขข้อมูล'; }
    else if (log.action === 'DELETE') { actionBadgeClass = 'status-pill retired'; actionName = 'ลบสินทรัพย์'; }
    else if (log.action === 'IMPORT') { actionBadgeClass = 'status-pill storage'; actionName = 'นำเข้าข้อมูล'; }

    return `
      <tr>
        <td class="text-muted" style="white-space:nowrap">${log.logged_at}</td>
        <td class="font-semibold text-red">${log.asset_id}</td>
        <td><span class="${actionBadgeClass}">${actionName}</span></td>
        <td>${escapeHtml(log.details)}</td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// CRUD OPERATIONS
// ==========================================================================
async function handleDeleteAsset(assetId, assetName) {
  if (confirm(`คุณต้องการลบสินทรัพย์ "${assetName}" (${assetId}) ออกจากระบบใช่หรือไม่?\n*การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
    try {
      if (state.isLocalMode) {
        // LocalStorage Delete
        state.assets = state.assets.filter(a => a.asset_id !== assetId);
        localStorage.setItem('it_assets', JSON.stringify(state.assets));
        
        // Log delete activity
        logActivityLocal(assetId, 'DELETE', `ลบสินทรัพย์ออกจากระบบ: ${assetName}`);
        
        showToast(`ลบสินทรัพย์ ${assetId} สำเร็จ`);
        refreshData();
      } else {
        // Cloud D1 Delete
        const response = await fetch(`${API_BASE}/assets/${encodeURIComponent(assetId)}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'ไม่สามารถลบสินทรัพย์ได้');
        }
        
        showToast(`ลบสินทรัพย์ ${assetId} สำเร็จ`);
        refreshData();
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
}

// Helper to log activities locally in LocalStorage
function logActivityLocal(assetId, action, details) {
  const localLogs = JSON.parse(localStorage.getItem('it_logs') || '[]');
  const now = new Date();
  
  // Format YYYY-MM-DD HH:MM:SS in local timezone
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hr = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  
  const newLog = {
    id: localLogs.length + 1,
    asset_id: assetId,
    action: action,
    details: details,
    logged_at: `${y}-${m}-${d} ${hr}:${min}:${sec}`
  };
  
  localLogs.unshift(newLog); // Put new logs at beginning
  localStorage.setItem('it_logs', JSON.stringify(localLogs.slice(0, 100))); // Cap at 100 logs
}

// Form Modal Open
function openFormModal(assetId = null) {
  state.currentEditingAssetId = assetId;
  const modal = document.getElementById('modal-asset-form');
  const title = document.getElementById('modal-form-title');
  const form = document.getElementById('asset-form');
  const idInput = document.getElementById('form-asset-id');
  
  form.reset();
  
  if (assetId) {
    title.innerText = 'แก้ไขข้อมูลสินทรัพย์';
    idInput.disabled = true;
    
    // Load existing data
    const asset = state.assets.find(a => a.asset_id === assetId);
    if (asset) {
      idInput.value = asset.asset_id;
      document.getElementById('form-name').value = asset.name;
      document.getElementById('form-category').value = asset.category;
      document.getElementById('form-type').value = asset.type || '';
      document.getElementById('form-status').value = asset.status;
      document.getElementById('form-purchase-price').value = asset.purchase_price || '';
      document.getElementById('form-purchase-date').value = asset.purchase_date || '';
      document.getElementById('form-expiration-date').value = asset.expiration_date || '';
      document.getElementById('form-assignee').value = asset.assignee || '';
      document.getElementById('form-department').value = asset.department || '';
      document.getElementById('form-location').value = asset.location || '';
      document.getElementById('form-notes').value = asset.notes || '';
    }
  } else {
    title.innerText = 'เพิ่มสินทรัพย์ใหม่';
    idInput.disabled = false;
    idInput.value = suggestNextAssetId();
  }
  
  modal.classList.remove('hidden');
}

function closeFormModal() {
  document.getElementById('modal-asset-form').classList.add('hidden');
  state.currentEditingAssetId = null;
}

// Predict next Asset ID sequentially based on existing hardware items
function suggestNextAssetId() {
  const currentHW = state.assets.filter(a => a.asset_id.startsWith('IT-HW-'));
  if (currentHW.length === 0) return 'IT-HW-0001';
  
  let maxId = 0;
  currentHW.forEach(a => {
    const parts = a.asset_id.split('-');
    const num = parseInt(parts[2]);
    if (!isNaN(num) && num > maxId) maxId = num;
  });
  
  const nextNum = String(maxId + 1).padStart(4, '0');
  return `IT-HW-${nextNum}`;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const idInput = document.getElementById('form-asset-id');
  const data = {
    asset_id: idInput.value.trim(),
    name: document.getElementById('form-name').value.trim(),
    category: document.getElementById('form-category').value,
    type: document.getElementById('form-type').value.trim(),
    status: document.getElementById('form-status').value,
    purchase_price: document.getElementById('form-purchase-price').value !== '' ? Number(document.getElementById('form-purchase-price').value) : null,
    purchase_date: document.getElementById('form-purchase-date').value || null,
    expiration_date: document.getElementById('form-expiration-date').value || null,
    assignee: document.getElementById('form-assignee').value.trim() || null,
    department: document.getElementById('form-department').value.trim() || null,
    location: document.getElementById('form-location').value.trim() || null,
    notes: document.getElementById('form-notes').value.trim() || ''
  };

  try {
    if (state.isLocalMode) {
      // LocalStorage CRUD logic
      if (state.currentEditingAssetId) {
        // Edit Mode
        const assetIndex = state.assets.findIndex(a => a.asset_id === state.currentEditingAssetId);
        if (assetIndex === -1) throw new Error('ไม่พบข้อมูลสินทรัพย์ที่จะอัปเดต');

        const oldAsset = state.assets[assetIndex];
        state.assets[assetIndex] = data; // replace with updated content

        // Logging the changes
        let changeDetails = `แก้ไขข้อมูลสินทรัพย์: ${data.name}`;
        const changes = [];
        if (oldAsset.status !== data.status) changes.push(`สถานะ: ${oldAsset.status} ➔ ${data.status}`);
        if (oldAsset.assignee !== data.assignee) changes.push(`ผู้ครอบครอง: ${oldAsset.assignee || 'ไม่มี'} ➔ ${data.assignee || 'ไม่มี'}`);
        if (oldAsset.location !== data.location) changes.push(`สถานที่: ${oldAsset.location || 'ไม่มี'} ➔ ${data.location || 'ไม่มี'}`);
        if (changes.length > 0) changeDetails += ` (${changes.join(", ")})`;

        logActivityLocal(data.asset_id, 'UPDATE', changeDetails);
        showToast('อัปเดตข้อมูลสินทรัพย์สำเร็จ');
      } else {
        // Create Mode
        const duplicate = state.assets.find(a => a.asset_id === data.asset_id);
        if (duplicate) throw new Error(`รหัส Asset ${data.asset_id} ถูกใช้งานไปแล้วในระบบ`);

        state.assets.push(data);
        logActivityLocal(data.asset_id, 'CREATE', `เพิ่มสินทรัพย์ใหม่: ${data.name} (ประเภท: ${data.type || 'N/A'}, สถานะ: ${data.status})`);
        showToast('เพิ่มสินทรัพย์สำเร็จ');
      }
      
      // Save changes back
      localStorage.setItem('it_assets', JSON.stringify(state.assets));
      closeFormModal();
      refreshData();
    } else {
      // Cloud Workers REST API CRUD logic
      let url = `${API_BASE}/assets`;
      let method = 'POST';
      
      if (state.currentEditingAssetId) {
        url = `${API_BASE}/assets/${encodeURIComponent(state.currentEditingAssetId)}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }

      showToast(state.currentEditingAssetId ? 'อัปเดตข้อมูลสินทรัพย์สำเร็จ' : 'เพิ่มสินทรัพย์สำเร็จ');
      closeFormModal();
      refreshData();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ==========================================================================
// VIEW DETAILS & QR CODE GENERATOR
// ==========================================================================
async function viewAssetDetails(assetId) {
  try {
    let asset = null;
    let logs = [];

    if (state.isLocalMode) {
      asset = state.assets.find(a => a.asset_id === assetId);
      if (!asset) throw new Error('ไม่พบข้อมูลสินทรัพย์นี้');
      
      logs = state.logs.filter(log => log.asset_id === assetId);
    } else {
      const response = await fetch(`${API_BASE}/assets/${encodeURIComponent(assetId)}`);
      if (!response.ok) throw new Error('ไม่พบข้อมูลสินทรัพย์นี้');
      
      const result = await response.json();
      asset = result.asset;
      logs = result.logs;
    }
    
    // Fill texts
    document.getElementById('view-title').innerText = asset.name;
    document.getElementById('view-asset-id').innerText = asset.asset_id;
    document.getElementById('view-category').innerText = asset.category;
    document.getElementById('view-type').innerText = asset.type || '-';
    
    let statusText = 'ไม่ระบุ';
    let statusClass = 'retired';
    if (asset.status === 'Active') { statusText = 'ใช้งานอยู่'; statusClass = 'status-active'; }
    else if (asset.status === 'Storage') { statusText = 'ในคลัง'; statusClass = 'status-storage'; }
    else if (asset.status === 'Repair') { statusText = 'ส่งซ่อม'; statusClass = 'status-repair'; }
    else if (asset.status === 'Retired') { statusText = 'ปลดระวาง'; statusClass = 'status-retired'; }
    
    document.getElementById('view-status').innerHTML = `<span class="status-pill ${statusClass.replace('status-', '')}">${statusText}</span>`;
    document.getElementById('view-purchase-price').innerText = formatCurrency(asset.purchase_price);
    document.getElementById('view-purchase-date').innerText = formatDate(asset.purchase_date);
    document.getElementById('view-expiration-date').innerText = formatDate(asset.expiration_date);
    document.getElementById('view-assignee').innerText = asset.assignee || 'ไม่มีผู้ถือครอง';
    document.getElementById('view-department').innerText = asset.department || '-';
    document.getElementById('view-location').innerText = asset.location || '-';
    document.getElementById('view-notes').innerText = asset.notes || '-';

    // Generate QR Code tag
    const qrDataUrl = `${window.location.origin}/?tab=assets&id=${encodeURIComponent(asset.asset_id)}`;
    const qrContainer = document.getElementById('qr-container');
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=8&data=${encodeURIComponent(qrDataUrl)}`;
    
    qrContainer.innerHTML = `<img src="${qrApiUrl}" alt="QR tag for ${asset.asset_id}" id="asset-qr-img">`;

    // Calculate expiration message
    const expCard = document.getElementById('detail-expiration-card');
    const expIcon = document.getElementById('detail-expiration-icon');
    const expTitle = document.getElementById('detail-expiration-title');
    const expDesc = document.getElementById('detail-expiration-desc');
    
    expCard.className = 'expiration-status-card';
    
    if (asset.expiration_date) {
      const days = getDaysRemaining(asset.expiration_date);
      if (isExpired(asset.expiration_date)) {
        expCard.classList.add('expired');
        expIcon.setAttribute('data-lucide', 'alert-triangle');
        expTitle.innerText = 'สัญญา/ประกัน หมดอายุแล้ว';
        expDesc.innerText = `หมดอายุไปแล้ว ${Math.abs(days)} วัน (${formatDate(asset.expiration_date)})`;
      } else if (isExpiringSoon(asset.expiration_date)) {
        expCard.classList.add('expiring');
        expIcon.setAttribute('data-lucide', 'clock');
        expTitle.innerText = 'ใกล้หมดสัญญา/หมดประกัน';
        expDesc.innerText = `เหลือเวลาคุ้มครองอีกเพียง ${days} วัน เท่านั้น!`;
      } else {
        expCard.classList.add('safe');
        expIcon.setAttribute('data-lucide', 'shield-check');
        expTitle.innerText = 'สถานะความคุ้มครองปกติ';
        expDesc.innerText = `เหลือระยะเวลาสัญญาอีก ${days} วัน (${formatDate(asset.expiration_date)})`;
      }
    } else {
      expCard.classList.add('safe');
      expIcon.setAttribute('data-lucide', 'shield');
      expTitle.innerText = 'ไม่ระบุประกันสัญญา';
      expDesc.innerText = 'สินทรัพย์นี้ไม่มีกำหนดระยะเวลาสัญญารับประกันหรือลิขสิทธิ์';
    }
    
    // Fill asset logs
    const logsTbody = document.getElementById('view-asset-logs-tbody');
    if (logs.length === 0) {
      logsTbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-2">ไม่มีประวัติสำหรับสินทรัพย์นี้</td></tr>`;
    } else {
      logsTbody.innerHTML = logs.map(log => {
        let actionLabel = log.action;
        if (log.action === 'CREATE') actionLabel = 'ลงทะเบียนแรก';
        else if (log.action === 'UPDATE') actionLabel = 'ปรับปรุง';
        else if (log.action === 'IMPORT') actionLabel = 'นำเข้าไฟล์';
        
        return `
          <tr>
            <td class="text-muted text-xs">${log.logged_at}</td>
            <td><strong class="text-xs">${actionLabel}</strong></td>
            <td class="text-muted text-xs">${escapeHtml(log.details)}</td>
          </tr>
        `;
      }).join('');
    }

    lucide.createIcons();

    // Show modal
    document.getElementById('modal-view-detail').classList.remove('hidden');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function closeViewModal() {
  document.getElementById('modal-view-detail').classList.add('hidden');
}

// Print tag handler
function printQrTag() {
  const assetId = document.getElementById('view-asset-id').innerText;
  const assetName = document.getElementById('view-title').innerText;
  const qrImgSrc = document.getElementById('asset-qr-img').querySelector('img').src;

  const printWindow = window.open('', '_blank', 'width=450,height=550');
  printWindow.document.write(`
    <html>
    <head>
      <title>พิมพ์ Asset Tag - ${assetId}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 25px; }
        .tag-box { border: 2px dashed #000; padding: 20px; display: inline-block; width: 280px; }
        .qr-img { width: 150px; height: 150px; margin: 15px 0; }
        .asset-id { font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #d32f2f; }
        .asset-name { font-size: 14px; color: #333; margin-bottom: 5px; font-weight: 600; }
        .footer { font-size: 10px; color: #666; margin-top: 15px; border-top: 1px solid #ccc; padding-top: 5px; }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <div class="tag-box">
        <div class="asset-id">${assetId}</div>
        <div class="asset-name">${assetName}</div>
        <img class="qr-img" src="${qrImgSrc}">
        <div class="footer">IT ASSET MANAGEMENT &bull; PROPERTY TAG</div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ==========================================================================
// EXCEL EXPORT (USING SHEETJS)
// ==========================================================================
function exportToExcel() {
  const dataToExport = state.filteredAssets.map(asset => ({
    'asset_id': asset.asset_id,
    'name': asset.name,
    'category': asset.category,
    'type': asset.type || '',
    'status': asset.status,
    'purchase_price': asset.purchase_price || 0,
    'purchase_date': asset.purchase_date || '',
    'expiration_date': asset.expiration_date || '',
    'assignee': asset.assignee || '',
    'department': asset.department || '',
    'location': asset.location || '',
    'notes': asset.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'IT Assets');
  
  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `it_assets_export_${today}.xlsx`);
  showToast('ส่งออกไฟล์ Excel สำเร็จ');
}

// ==========================================================================
// EXCEL IMPORT & DRAG AND DROP
// ==========================================================================
function openImportModal() {
  state.importData = [];
  document.getElementById('excel-file-input').value = '';
  document.getElementById('import-preview-section').classList.add('hidden');
  document.getElementById('btn-submit-import').disabled = true;
  document.getElementById('modal-import-excel').classList.remove('hidden');
}

function closeImportModal() {
  document.getElementById('modal-import-excel').classList.add('hidden');
}

function downloadExcelTemplate() {
  const templateData = [
    {
      'asset_id': 'IT-HW-0009',
      'name': 'Dell Latitude 3440 Laptop',
      'category': 'Hardware',
      'type': 'Laptop',
      'status': 'Active',
      'purchase_price': 24900,
      'purchase_date': '2026-06-01',
      'expiration_date': '2029-06-01',
      'assignee': 'Somsak Jaidee',
      'department': 'Marketing',
      'location': 'HQ Office Fl 3',
      'notes': 'สเปก Core i5, RAM 16GB, SSD 512GB'
    },
    {
      'asset_id': 'IT-SW-0003',
      'name': 'Figma Design Professional',
      'category': 'Software',
      'type': 'License',
      'status': 'Active',
      'purchase_price': 7200,
      'purchase_date': '2026-01-10',
      'expiration_date': '2027-01-10',
      'assignee': 'Ratchanee Rakdee',
      'department': 'Design',
      'location': 'Cloud',
      'notes': 'สิทธิ์ผู้ใช้งานรายปีสำหรับ UI Designer'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, 'it_assets_import_template.xlsx');
  showToast('ดาวน์โหลดเทมเพลตสำเร็จ');
}

function setupExcelImportDragAndDrop() {
  const dropZone = document.getElementById('excel-drop-zone');
  const fileInput = document.getElementById('excel-file-input');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    
    if (e.dataTransfer.files.length > 0) {
      handleSelectedExcelFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleSelectedExcelFile(e.target.files[0]);
    }
  });
}

function handleSelectedExcelFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension !== 'xlsx' && extension !== 'xls') {
    showToast('รองรับเฉพาะไฟล์ Excel (.xlsx, .xls) เท่านั้น', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rows = XLSX.utils.sheet_to_json(worksheet);
      
      if (rows.length === 0) {
        throw new Error('ไม่พบข้อมูลใดๆ ในแผ่นงาน Excel');
      }

      // Format check
      const sample = rows[0];
      if (!sample.hasOwnProperty('asset_id') || !sample.hasOwnProperty('name') || !sample.hasOwnProperty('category') || !sample.hasOwnProperty('status')) {
        throw new Error('โครงสร้างหัวตารางไม่ถูกต้อง! ต้องมีคอลัมน์: asset_id, name, category, status');
      }

      state.importData = rows;

      // Show preview
      const previewTbody = document.getElementById('import-preview-tbody');
      document.getElementById('import-preview-count').innerText = rows.length;
      
      previewTbody.innerHTML = rows.slice(0, 5).map(row => `
        <tr>
          <td><strong>${escapeHtml(String(row.asset_id))}</strong></td>
          <td>${escapeHtml(String(row.name || ''))}</td>
          <td>${escapeHtml(String(row.category || ''))}</td>
          <td>${escapeHtml(String(row.status || ''))}</td>
          <td>${escapeHtml(String(row.expiration_date || '-'))}</td>
          <td>${escapeHtml(String(row.assignee || '-'))}</td>
        </tr>
      `).join('');
      
      if (rows.length > 5) {
        previewTbody.innerHTML += `<tr><td colspan="6" class="text-center text-muted">และรายการอื่นๆ อีก ${rows.length - 5} แถว...</td></tr>`;
      }

      document.getElementById('import-preview-section').classList.remove('hidden');
      document.getElementById('btn-submit-import').disabled = false;
      showToast(`โหลดข้อมูลไฟล์ Excel สำเร็จ ${rows.length} รายการ`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

async function submitImportedData() {
  if (state.importData.length === 0) return;
  
  const submitBtn = document.getElementById('btn-submit-import');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `กำลังนำเข้าข้อมูล...`;

  try {
    if (state.isLocalMode) {
      // Local Storage Bulk Import
      let insertedCount = 0;
      let updatedCount = 0;
      
      state.importData.forEach(row => {
        if (!row.asset_id || !row.name || !row.category || !row.status) return;

        const data = {
          asset_id: String(row.asset_id).trim(),
          name: String(row.name).trim(),
          category: String(row.category).trim(),
          type: row.type ? String(row.type).trim() : '',
          status: String(row.status).trim(),
          purchase_price: row.purchase_price !== undefined && row.purchase_price !== '' ? Number(row.purchase_price) : null,
          purchase_date: row.purchase_date || null,
          expiration_date: row.expiration_date || null,
          assignee: row.assignee ? String(row.assignee).trim() : null,
          department: row.department ? String(row.department).trim() : null,
          location: row.location ? String(row.location).trim() : null,
          notes: row.notes ? String(row.notes).trim() : ''
        };

        const existingIndex = state.assets.findIndex(a => a.asset_id === data.asset_id);
        if (existingIndex !== -1) {
          state.assets[existingIndex] = data;
          logActivityLocal(data.asset_id, 'IMPORT', `อัปเดตข้อมูลผ่านการนำเข้าไฟล์ Excel: ${data.name}`);
          updatedCount++;
        } else {
          state.assets.push(data);
          logActivityLocal(data.asset_id, 'IMPORT', `เพิ่มสินทรัพย์ใหม่ผ่านการนำเข้าไฟล์ Excel: ${data.name}`);
          insertedCount++;
        }
      });

      localStorage.setItem('it_assets', JSON.stringify(state.assets));
      logActivityLocal('SYSTEM', 'IMPORT', `นำเข้าข้อมูลสินทรัพย์สำเร็จ รวม ${insertedCount + updatedCount} รายการ (เพิ่มใหม่: ${insertedCount}, อัปเดต: ${updatedCount})`);
      
      showToast(`นำเข้าสำเร็จ ${insertedCount + updatedCount} รายการ (ใหม่: ${insertedCount}, อัปเดต: ${updatedCount})`);
      closeImportModal();
      refreshData();
    } else {
      // Cloud D1 Bulk Import
      const response = await fetch(`${API_BASE}/assets/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(state.importData)
      });

      if (!response.ok) {
        throw new Error('การนำเข้าข้อมูลล้มเหลว');
      }

      const result = await response.json();
      showToast(`นำเข้าข้อมูลใหม่สำเร็จ ${result.inserted} รายการ และปรับปรุง ${result.updated} รายการ`);

      closeImportModal();
      refreshData();
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitBtn.innerHTML = `<i data-lucide="upload"></i> เริ่มนำเข้าข้อมูล`;
    lucide.createIcons();
  }
}

// ==========================================================================
// UTILITY HELPERS & CONVERTERS
// ==========================================================================

// Check if expired
function isExpired(expirationDateStr) {
  if (!expirationDateStr) return false;
  const expDate = new Date(expirationDateStr);
  if (isNaN(expDate.getTime())) return false;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  expDate.setHours(0,0,0,0);
  
  return expDate < today;
}

// Check if expiring in next 30 days
function isExpiringSoon(expirationDateStr) {
  if (!expirationDateStr) return false;
  const expDate = new Date(expirationDateStr);
  if (isNaN(expDate.getTime())) return false;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  expDate.setHours(0,0,0,0);
  
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30);
  
  return expDate >= today && expDate <= thirtyDaysLater;
}

function getDaysRemaining(expirationDateStr) {
  if (!expirationDateStr) return null;
  const expDate = new Date(expirationDateStr);
  if (isNaN(expDate.getTime())) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);
  
  const diffTime = expDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Formatting price
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '฿0.00';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
}

// Formatting dates
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// Escape HTML utility to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Debounce input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Display beautiful toast alert
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const messageSpan = document.getElementById('toast-message');
  const iconSpan = document.getElementById('toast-icon');
  
  toast.className = 'toast'; // reset class
  toast.classList.add(`toast-${type}`);
  messageSpan.innerText = message;
  
  if (type === 'success') {
    iconSpan.innerHTML = `<i data-lucide="check-circle-2" style="width:18px;height:18px;color:#388e3c"></i>`;
  } else if (type === 'error') {
    iconSpan.innerHTML = `<i data-lucide="alert-octagon" style="width:18px;height:18px;color:#d32f2f"></i>`;
  } else {
    iconSpan.innerHTML = `<i data-lucide="info" style="width:18px;height:18px;color:#1976d2"></i>`;
  }
  
  lucide.createIcons();
  
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}
