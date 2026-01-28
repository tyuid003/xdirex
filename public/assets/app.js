// public/assets/app.js
// Main application logic

let currentUser = null;
let currentMainLink = null;
let currentDestinations = [];

// Icon SVG mappings
const ICONS = {
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
  target: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
  gift: '<polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>',
  'shopping-cart': '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>',
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  // ตรวจสอบ auth
  currentUser = await requireAuth();
  if (!currentUser) return;
  
  // แสดง email
  document.getElementById('user-email').textContent = currentUser.email;
  
  // Setup event listeners
  setupEventListeners();
  
  // Load data
  await loadMainLink();
});

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  // User menu dropdown
  document.getElementById('user-menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('user-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    document.getElementById('user-menu').style.display = 'none';
  });
  
  // Logout
  document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await logout();
  });
  
  // Settings button
  document.getElementById('settings-btn').addEventListener('click', (e) => {
    e.preventDefault();
    openSettingsModal();
  });
  
  // Create main link button
  document.getElementById('create-main-link-btn')?.addEventListener('click', () => {
    checkLimitAndOpenModal();
  });
  
  // Add main link button (header)
  document.getElementById('add-main-link-btn')?.addEventListener('click', () => {
    checkLimitAndOpenModal();
  });
  
  // Modal close buttons
  document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-secondary') || e.target.classList.contains('modal-close')) {
        const modalId = e.target.dataset.modal || e.target.closest('.modal').id;
        closeModal(modalId);
      }
    });
  });
  
  // Create main link form
  document.getElementById('create-main-link-form').addEventListener('submit', handleCreateMainLink);
  
  // Main slug preview
  document.getElementById('main-slug').addEventListener('input', (e) => {
    const slug = e.target.value;
    document.getElementById('main-slug-preview').textContent = 
      `${window.location.origin}/${currentUser.userSlug}?go=${slug}`;
  });
  
  // Icon selector
  document.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('main-icon').value = btn.dataset.icon;
    });
  });
  
  // Add destination button
  document.getElementById('add-destination-btn')?.addEventListener('click', () => {
    openModal('add-destination-modal');
  });
  
  // Add destination form
  document.getElementById('add-destination-form').addEventListener('submit', handleAddDestination);
  
  // Conversion settings form
  document.getElementById('conversion-settings-form').addEventListener('submit', handleSaveConversionSettings);
  
  // Settings form
  document.getElementById('settings-form').addEventListener('submit', handleSaveUserSlug);
  
  // Delete main link form
  document.getElementById('delete-main-link-form').addEventListener('submit', handleDeleteMainLink);
  
  // Edit main link form
  document.getElementById('edit-main-link-form').addEventListener('submit', handleEditMainLink);
  
  // Load branding
  loadBranding();
}

// ==================== MAIN LINK ====================

function checkLimitAndOpenModal() {
  const currentCount = document.querySelectorAll('.main-link-wrapper').length;
  
  if (currentCount >= currentUser.maxLinks) {
    // ครบ limit แล้ว แสดง modal แจ้งเตือน
    if (contactUrl) {
      document.getElementById('contact-provider-btn').href = contactUrl;
    }
    openModal('limit-reached-modal');
  } else {
    // ยังสร้างได้ เปิด modal สร้างตามปกติ
    updateRemainingLinksInfo();
    openModal('create-main-link-modal');
  }
}

async function loadMainLink() {
  try {
    document.getElementById('loading').style.display = 'block';
    
    const data = await getMainLinks();
    
    document.getElementById('loading').style.display = 'none';
    
    if (data.main_links && data.main_links.length > 0) {
      // แสดงปุ่ม + เสมอ (ไม่ซ่อนแม้ครบ limit)
      document.getElementById('add-main-link-btn').style.display = 'flex';
      
      // แสดง main links ทั้งหมด
      document.getElementById('no-main-link').style.display = 'none';
      document.getElementById('main-link-card').innerHTML = '';
      
      for (const mainLink of data.main_links) {
        renderMainLink(mainLink);
      }
      
      // โหลด destinations ของ main link แรก
      if (data.main_links.length > 0) {
        currentMainLink = data.main_links[0];
        await loadDestinations(currentMainLink.id);
      }
    } else {
      document.getElementById('no-main-link').style.display = 'block';
      document.getElementById('add-main-link-btn').style.display = 'none';
    }
  } catch (error) {
    console.error('Load main link error:', error);
    alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }
}

function renderMainLink(mainLink) {
  const container = document.getElementById('main-link-card');
  
  const iconSvg = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[mainLink.icon] || ICONS.link}</svg>`;
  
  const redirectUrl = `${window.location.origin}/${currentUser.userSlug}?go=${mainLink.slug}`;
  
  const cardHtml = `
    <div class="main-link-wrapper" data-main-link-id="${mainLink.id}">
      <div class="main-link-card">
        <div class="card-header">
          <div class="card-icon">${iconSvg}</div>
          <div class="card-info">
            <h2>${mainLink.slug}</h2>
            <div class="redirect-url-container">
              <a href="${redirectUrl}" target="_blank" class="redirect-url">${redirectUrl}</a>
              <button class="icon-btn copy-btn" onclick="copyToClipboard('${redirectUrl}')" title="คัดลอกลิ้งก์">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="card-actions">
          <button class="icon-btn" onclick="openIconPickerModal(${mainLink.id})" title='แก้ไข'>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
              <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
            </svg>
          </button>
          <button class="icon-btn" onclick="toggleDestinations(${mainLink.id})" title="Destinations">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <button class="icon-btn delete-btn" onclick="openDeleteMainLinkModal(${mainLink.id})" title='ลบ Main Link'>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="card-mode">
        <label class="toggle-label">
          <span>Mode:</span>
          <div class="toggle-group">
            <button class="toggle-btn ${mainLink.mode === 'round-robin' ? 'active' : ''}" 
                    onclick="changeMode(${mainLink.id}, 'round-robin')">Round-robin</button>
            <button class="toggle-btn ${mainLink.mode === 'random' ? 'active' : ''}" 
                    onclick="changeMode(${mainLink.id}, 'random')">Random</button>
          </div>
        </label>
      </div>
      </div>
      
      <!-- Destinations Container สำหรับ main link นี้ -->
      <div class="destinations-container" style="display: none;">
        <div class="destinations-list"></div>
      </div>
    </div>
  `;
  
  // เพิ่มการ์ดใหม่แทนการแทนที่
  const wrapper = document.createElement('div');
  wrapper.innerHTML = cardHtml;
  container.appendChild(wrapper.firstElementChild);
  container.style.display = 'block';
}

async function toggleDestinations(mainLinkId) {
  const wrapper = document.querySelector(`[data-main-link-id="${mainLinkId}"]`);
  if (!wrapper) return;
  
  const container = wrapper.querySelector('.destinations-container');
  const toggleBtn = wrapper.querySelector('[onclick*="toggleDestinations"]');
  
  // ถ้ากำลังแสดงอยู่ ให้ซ่อน
  if (container.style.display === 'block') {
    container.style.display = 'none';
    // เปลี่ยนกลับเป็น chevron down
    if (toggleBtn) {
      toggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      `;
    }
  } else {
    // แสดง loading spinner
    if (toggleBtn) {
      toggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>
      `;
    }
    
    // โหลด destinations ของ main link นี้
    currentMainLink = { id: mainLinkId };
    await loadDestinations(mainLinkId);
    container.style.display = 'block';
    
    // เปลี่ยนเป็น chevron up
    if (toggleBtn) {
      toggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      `;
    }
  }
}

async function handleCreateMainLink(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    slug: formData.get('slug'),
    icon: formData.get('icon'),
    mode: 'round-robin', // ค่าเริ่มต้นเป็น round-robin
  };
  
  try {
    await createMainLink(data);
    closeModal('create-main-link-modal');
    e.target.reset();
    
    // โหลดข้อมูลใหม่ทั้งหมด
    await loadMainLink();
  } catch (error) {
    console.error('Create main link error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

async function changeMode(mainLinkId, newMode) {
  try {
    await updateMainLink(mainLinkId, { mode: newMode });
    // Reload เพื่อ update UI
    await loadMainLink();
  } catch (error) {
    console.error('Change mode error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

async function changeIcon() {
  // Cycle through icons
  const icons = Object.keys(ICONS);
  const currentIndex = icons.indexOf(currentMainLink.icon);
  const nextIndex = (currentIndex + 1) % icons.length;
  const newIcon = icons[nextIndex];
  
  try {
    await updateMainLink(currentMainLink.id, { icon: newIcon });
    currentMainLink.icon = newIcon;
    renderMainLink(currentMainLink);
  } catch (error) {
    console.error('Change icon error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

// ==================== DESTINATIONS ====================

async function loadDestinations(mainLinkId) {
  try {
    const data = await getDestinations(mainLinkId);
    currentDestinations = data.destinations || [];
    renderDestinations(mainLinkId);
  } catch (error) {
    console.error('Load destinations error:', error);
    alert('เกิดข้อผิดพลาดในการโหลด destinations');
  }
}

function renderDestinations(mainLinkId) {
  const wrapper = document.querySelector(`[data-main-link-id="${mainLinkId}"]`);
  if (!wrapper) return;
  
  const container = wrapper.querySelector('.destinations-list');
  
  if (currentDestinations.length === 0) {
    container.innerHTML = `
      <div class="destinations-header">
        <h3>Destination Links</h3>
        <button class="btn btn-primary" onclick="openModal('add-destination-modal')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          เพิ่ม Destination
        </button>
      </div>
      <div class="empty-state-small">
        <p>ยังไม่มี Destination Links</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="destinations-header">
      <h3>Destination Links</h3>
      <button class="btn btn-primary" onclick="openModal('add-destination-modal')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        เพิ่ม Destination
      </button>
    </div>
  ` + currentDestinations.map(dest => `
    <div class="destination-card ${dest.is_active ? '' : 'inactive'}">
      <div class="dest-header">
        <div class="dest-info">
          <h3>${dest.slug}</h3>
          <a href="${dest.url}" target="_blank" class="dest-url">${dest.url}</a>
        </div>
        <div class="dest-actions">
          <label class="switch">
            <input type="checkbox" ${dest.is_active ? 'checked' : ''} 
                   onchange="toggleDestination(${dest.id}, this.checked)">
            <span class="slider"></span>
          </label>
          <button class="icon-btn" onclick="openConversionSettings(${dest.id})" title='ตั้งค่า Conversion'>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2"></path>
            </svg>
          </button>
          <button class="icon-btn delete-btn" onclick="handleDeleteDestination(${dest.id})" title='ลบ'>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="dest-stats">
        <div class="stat">
          <span class="stat-label">Clicks</span>
          <span class="stat-value">${dest.clicks || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Conversions</span>
          <span class="stat-value">${dest.conversions || 0}</span>
        </div>
        ${dest.conversion_setting ? `
          <div class="stat">
            <span class="stat-label">Conv. Rate</span>
            <span class="stat-value">${dest.clicks > 0 ? ((dest.conversions / dest.clicks) * 100).toFixed(1) : 0}%</span>
          </div>
        ` : ''}
      </div>
      
      ${dest.conversion_setting ? `
        <div class="dest-conversion">
          <small>🎯 Conversion: ${dest.conversion_setting.key_name} = "${dest.conversion_setting.success_value}"</small>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function handleAddDestination(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    slug: formData.get('slug'),
    url: formData.get('url'),
  };
  
  try {
    await createDestination(currentMainLink.id, data);
    closeModal('add-destination-modal');
    await loadDestinations(currentMainLink.id);
    e.target.reset();
  } catch (error) {
    console.error('Add destination error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

async function toggleDestination(id, isActive) {
  try {
    await updateDestination(id, { is_active: isActive });
    await loadDestinations(currentMainLink.id);
  } catch (error) {
    console.error('Toggle destination error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

async function handleDeleteDestination(id) {
  if (!confirm('คุณต้องการลบ destination นี้หรือไม่?')) return;
  
  try {
    await deleteDestination(id);
    await loadDestinations(currentMainLink.id);
  } catch (error) {
    console.error('Delete destination error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

// ==================== CONVERSION SETTINGS ====================

let currentDestinationId = null;

function openConversionSettings(destinationId) {
  currentDestinationId = destinationId;
  
  // Load existing settings
  const dest = currentDestinations.find(d => d.id === destinationId);
  if (dest && dest.conversion_setting) {
    document.getElementById('conv-key').value = dest.conversion_setting.key_name;
    document.getElementById('conv-value').value = dest.conversion_setting.success_value;
  } else {
    document.getElementById('conversion-settings-form').reset();
  }
  
  openModal('conversion-settings-modal');
}

async function handleSaveConversionSettings(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    destination_link_id: currentDestinationId,
    key_name: formData.get('key_name'),
    success_value: formData.get('success_value'),
  };
  
  try {
    await setConversionSetting(data);
    closeModal('conversion-settings-modal');
    await loadDestinations(currentMainLink.id);
    e.target.reset();
  } catch (error) {
    console.error('Save conversion settings error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

// ==================== USER SETTINGS ====================

function openSettingsModal() {
  document.getElementById('user-slug').value = currentUser.userSlug;
  document.getElementById('slug-preview-settings').textContent = currentUser.userSlug;
  
  // Update preview on input
  document.getElementById('user-slug').addEventListener('input', (e) => {
    document.getElementById('slug-preview-settings').textContent = e.target.value;
  });
  
  openModal('settings-modal');
}

async function handleSaveUserSlug(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const newSlug = formData.get('user_slug');
  
  if (newSlug === currentUser.userSlug) {
    closeModal('settings-modal');
    return;
  }
  
  try {
    await updateUserSlug(newSlug);
    currentUser.userSlug = newSlug;
    closeModal('settings-modal');
    renderMainLink(currentMainLink);
  } catch (error) {
    console.error('Update user slug error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

async function handleEditMainLink(e) {
  e.preventDefault();
  
  if (!editingMainLinkId) return;
  
  // หาข้อมูล main link ปัจจุบัน
  const data = await getMainLinks();
  const mainLink = data.main_links.find(ml => ml.id === editingMainLinkId);
  if (!mainLink) return;
  
  const formData = new FormData(e.target);
  const newSlug = formData.get('slug');
  
  const updates = {};
  if (newSlug !== mainLink.slug) updates.slug = newSlug;
  if (selectedIcon && selectedIcon !== mainLink.icon) updates.icon = selectedIcon;
  
  if (Object.keys(updates).length === 0) {
    closeModal('icon-picker-modal');
    return;
  }
  
  try {
    await updateMainLink(editingMainLinkId, updates);
    closeModal('icon-picker-modal');
    
    // Reload เพื่อ update UI
    await loadMainLink();
    
    // Reload destinations if slug changed (KV key changed)
    if (updates.slug && currentMainLink && currentMainLink.id === editingMainLinkId) {
      await loadDestinations(editingMainLinkId);
    }
  } catch (error) {
    console.error('Update main link error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

// ==================== DELETE MAIN LINK ====================

let selectedIcon = null;
let editingMainLinkId = null;

async function openIconPickerModal(mainLinkId) {
  editingMainLinkId = mainLinkId;
  
  // หาข้อมูล main link
  const data = await getMainLinks();
  const mainLink = data.main_links.find(ml => ml.id === mainLinkId);
  if (!mainLink) return;
  
  selectedIcon = mainLink.icon;
  
  // Set current slug
  document.getElementById('edit-main-slug').value = mainLink.slug;
  document.getElementById('edit-slug-preview').textContent = 
    `${window.location.origin}/${currentUser.userSlug}?go=${mainLink.slug}`;
  
  // Update preview on input
  const slugInput = document.getElementById('edit-main-slug');
  slugInput.oninput = (e) => {
    document.getElementById('edit-slug-preview').textContent = 
      `${window.location.origin}/${currentUser.userSlug}?go=${e.target.value}`;
  };
  
  const grid = document.getElementById('icon-picker-grid');
  grid.innerHTML = '';
  
  Object.keys(ICONS).forEach(iconKey => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-option';
    btn.dataset.icon = iconKey;
    if (iconKey === selectedIcon) btn.classList.add('active');
    
    btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[iconKey]}</svg>`;
    
    btn.addEventListener('click', () => {
      document.querySelectorAll('#icon-picker-grid .icon-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedIcon = iconKey;
    });
    
    grid.appendChild(btn);
  });
  
  openModal('icon-picker-modal');
}

async function saveSelectedIcon() {
  if (!selectedIcon || selectedIcon === currentMainLink.icon) {
    closeModal('icon-picker-modal');
    return;
  }
  
  try {
    await updateMainLink(currentMainLink.id, { icon: selectedIcon });
    currentMainLink.icon = selectedIcon;
    renderMainLink(currentMainLink);
    closeModal('icon-picker-modal');
  } catch (error) {
    console.error('Update icon error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

let deletingMainLinkId = null;

function openDeleteMainLinkModal(mainLinkId) {
  deletingMainLinkId = mainLinkId;
  document.getElementById('current-user-slug').textContent = currentUser.userSlug;
  document.getElementById('confirm-slug').value = '';
  openModal('delete-main-link-modal');
}

async function handleDeleteMainLink(e) {
  e.preventDefault();
  
  if (!deletingMainLinkId) return;
  
  const formData = new FormData(e.target);
  const confirmSlug = formData.get('confirm_slug');
  
  if (confirmSlug !== currentUser.userSlug) {
    alert('User Slug ไม่ถูกต้อง');
    return;
  }
  
  try {
    await deleteMainLink(deletingMainLinkId, confirmSlug);
    closeModal('delete-main-link-modal');
    e.target.reset();
    // Reload page
    await loadMainLink();
  } catch (error) {
    console.error('Delete main link error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

// ==================== BRANDING ====================

let brandingUrl = null;
let contactUrl = null;

async function loadBranding() {
  try {
    const branding = await getBranding();
    const link = document.getElementById('branding-link');
    link.textContent = branding.label;
    link.href = branding.url;
    brandingUrl = branding.url; // เก็บไว้ใช้ใน footer
    contactUrl = branding.contact_url; // เก็บไว้ใช้ใน popup limit
  } catch (error) {
    console.error('Load branding error:', error);
  }
}

// ==================== UTILITY FUNCTIONS ====================

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // แสดงข้อความแจ้งเตือนชั่วคราว
    const notification = document.createElement('div');
    notification.textContent = 'คัดลอกลิ้งก์แล้ว!';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success, #10b981);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }).catch(err => {
    console.error('Copy failed:', err);
    alert('ไม่สามารถคัดลอกได้');
  });
}

// ==================== MODAL HELPERS ====================

function updateRemainingLinksInfo() {
  const infoElement = document.getElementById('remaining-links-info');
  if (!infoElement || !currentUser) return;
  
  // นับจำนวน main links ที่มีอยู่แล้ว
  const currentCount = document.querySelectorAll('.main-link-wrapper').length;
  const remaining = currentUser.maxLinks - currentCount;
  
  if (remaining > 0) {
    infoElement.textContent = `จำนวนที่เหลือ: ${remaining} ลิ้งก์`;
  } else {
    infoElement.textContent = 'คุณสร้าง Main Link ครบตามจำนวนที่กำหนดแล้ว';
  }
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}
