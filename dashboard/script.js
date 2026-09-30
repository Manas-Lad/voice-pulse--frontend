(() => {
  // ==========================================
  // 1. HARDWARE UUID CHECK & ROUTE GUARD
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  const API_BASE_URL = 'https://voice-pulse-backend.onrender.com/api';
  const alertToken = urlParams.get('alertToken');
  let deviceToken = urlParams.get('deviceToken');

  if (deviceToken) {
    localStorage.setItem('deviceToken', deviceToken);
  } else {
    deviceToken = localStorage.getItem('deviceToken');
  }

  if (!deviceToken && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')) {
    deviceToken = crypto.randomUUID();
    localStorage.setItem('deviceToken', deviceToken);
    console.info('Initialized local test session with valid hardware UUID:', deviceToken);
  }

  if (!deviceToken) {
    window.location.replace('/');
    return;
  }

  // ==========================================
  // 2. DOM ELEMENTS
  // ==========================================
  const sidebar = document.querySelector('.profile-sidebar');
  const navbarToggle = document.querySelector('#navbar-toggle');
  const navbarNavigation = document.querySelector('#navbar-navigation');
  const dashboardNav = document.querySelector('#dashboard-nav-toggle');
  const profileNav = document.querySelector('#profile-nav-toggle');
  const contactsNav = document.querySelector('#contacts-nav-toggle');
  const codewordsNav = document.querySelector('#codewords-nav-toggle');
  const dashboardView = document.querySelector('#dashboard-view');
  const profileView = document.querySelector('#profile-view');
  const contactsView = document.querySelector('#contacts-view');
  const codewordsView = document.querySelector('#codewords-view');
  const dashboardAlertBanner = document.querySelector('#dashboard-alert-banner');
  const dashboardAlertMessage = document.querySelector('#dashboard-alert-message');
  const dashboardLogScroll = document.querySelector('#dashboard-log-scroll');
  const dashboardLogList = document.querySelector('#dashboard-log-list');
  const dashboardHistoryList = document.querySelector('#dashboard-history-list');
  const noAlertsPlaceholder = document.querySelector('#no-alerts-placeholder');

  const codewordForm = document.querySelector('#codeword-form');
  const codewordInput = document.querySelector('#codeword-input');
  const codewordFeedback = document.querySelector('#codeword-feedback');
  const activeCodewordsList = document.querySelector('#active-codewords-list');

  // Sidebar Toggle Button Click Listener
  navbarToggle?.addEventListener('click', () => {
    const isCollapsed = sidebar?.classList.toggle('is-collapsed');
    document.body.classList.toggle('is-navbar-collapsed', isCollapsed);
    navbarToggle.setAttribute('aria-expanded', String(!isCollapsed));
  });

  // Clean IST timestamp formatter
  function formatTimestampIST(rawTimestamp) {
    if (!rawTimestamp) return 'Just now';
    let date;
    if (typeof rawTimestamp === 'number') {
      date = new Date(rawTimestamp);
    } else {
      const cleanStr = String(rawTimestamp).replace(/Z$/i, '');
      date = new Date(cleanStr);
    }
    return isNaN(date.getTime()) 
      ? String(rawTimestamp) 
      : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  let codewords = [];

  function normalizeCodeword(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  }

  function showCodewordFeedback(message) {
    if (codewordFeedback) codewordFeedback.textContent = message;
  }

  // ==========================================
  // 3. CODEWORDS SYNC
  // ==========================================
  async function fetchCodewordsFromBackend() {
    try {
      const res = await fetch(`${API_BASE_URL}/users/device/${deviceToken}/codes`);
      if (res.ok) {
        const data = await res.json();
        codewords = Array.isArray(data) ? [...new Set(data.map(normalizeCodeword).filter(Boolean))] : [];
        renderCodewords();
      }
    } catch (e) {
      console.error('Failed to load custom codewords:', e);
      showCodewordFeedback('Could not fetch codewords from server.');
    }
  }

  async function appendCodewordsToBackend(wordsToAdd) {
    try {
      const res = await fetch(`${API_BASE_URL}/users/device/${deviceToken}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wordsToAdd)
      });
      if (res.ok) {
        const updatedList = await res.json();
        codewords = Array.isArray(updatedList) ? updatedList : [];
        renderCodewords();
        addLiveLog(`Dynamic codeword registered: [${wordsToAdd.join(', ')}]`);
        showCodewordFeedback('Codeword saved.');
      } else {
        showCodewordFeedback('Server error saving codeword.');
      }
    } catch (e) {
      console.error('Failed to append custom codewords:', e);
      showCodewordFeedback('Network error reaching backend.');
    }
  }

  function renderCodewords() {
    if (!activeCodewordsList) return;
    activeCodewordsList.replaceChildren();

    if (!codewords.length) {
      const emptyState = document.createElement('li');
      emptyState.className = 'codewords-empty-state';
      emptyState.textContent = 'No custom codewords configured yet.';
      activeCodewordsList.append(emptyState);
      return;
    }

    codewords.forEach((codeword, index) => {
      const row = document.createElement('li');
      row.className = 'codeword-row';

      const name = document.createElement('span');
      name.className = 'codeword-name';
      name.textContent = codeword;

      const actions = document.createElement('div');
      actions.className = 'codeword-actions';

      const deleteButton = document.createElement('button');
      deleteButton.className = 'profile-action-button';
      deleteButton.type = 'button';
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete ${codeword}`);
      deleteButton.addEventListener('click', async () => {
        codewords.splice(index, 1);
        renderCodewords();
        try {
          await fetch(`${API_BASE_URL}/users/device/${deviceToken}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customCodes: codewords })
          });
          addLiveLog(`Codeword removed: "${codeword}"`);
          showCodewordFeedback('Codeword deleted successfully.');
        } catch (e) {
          console.error('Failed to sync deletion:', e);
        }
      });

      actions.append(deleteButton);
      row.append(name, actions);
      activeCodewordsList.append(row);
    });
  }

  codewordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const codeword = normalizeCodeword(codewordInput?.value || '');
    if (!codeword) {
      showCodewordFeedback('Please enter a codeword.');
      return;
    }
    if (codewords.includes(codeword)) {
      showCodewordFeedback('Codeword already exists.');
      return;
    }
    showCodewordFeedback('Saving...');
    await appendCodewordsToBackend([codeword]);
    codewordForm.reset();
  });

  codewordInput?.addEventListener('input', () => showCodewordFeedback(''));
  fetchCodewordsFromBackend();

  // ==========================================
  // 4. PROFILE MANAGEMENT
  // ==========================================
  const profileForm = document.querySelector('#profile-form');
  const profileFields = document.querySelector('#profile-fields');
  const profileAction = document.querySelector('#profile-edit-button');

  const profileData = [
    { key: 'name', label: 'Name', value: '', type: 'text' },
    { key: 'phoneNumber', label: 'Phone Number', value: '', type: 'tel' },
    { key: 'gender', label: 'Gender', value: 'Prefer not to say', type: 'select' },
    { key: 'dateOfBirth', label: 'Date of Birth', value: '', type: 'date' },
    { key: 'address', label: 'Address', value: '', type: 'textarea' },
  ];
  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];
  let editingProfile = false;

  function formatDate(value) {
    if (!value) return 'Not set';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(date);
  }

  function renderProfile() {
    if (!profileFields) return;
    profileFields.replaceChildren();

    profileData.forEach((field) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'profile-field';

      const fieldId = `profile-${field.key}`;
      if (editingProfile) {
        const label = document.createElement('label');
        label.htmlFor = fieldId;
        label.textContent = field.label;
        wrapper.append(label);

        let control;
        if (field.type === 'select') {
          control = document.createElement('select');
          genderOptions.forEach((optionText) => {
            const option = document.createElement('option');
            option.value = optionText;
            option.textContent = optionText;
            if (field.value === optionText) option.selected = true;
            control.append(option);
          });
        } else if (field.type === 'textarea') {
          control = document.createElement('textarea');
          control.rows = 2;
        } else {
          control = document.createElement('input');
          control.type = field.type;
        }

        control.id = fieldId;
        control.name = field.key;
        control.value = field.value || '';
        control.autocomplete = field.key === 'name' ? 'name'
          : field.key === 'phoneNumber' ? 'tel'
            : field.key === 'address' ? 'street-address' : 'off';
        wrapper.append(control);
      } else {
        const label = document.createElement('span');
        label.className = 'profile-label';
        label.textContent = field.label;
        const value = document.createElement('p');
        value.className = 'profile-value';
        value.textContent = (field.key === 'dateOfBirth')
          ? formatDate(field.value)
          : (field.value || 'Not set');
        wrapper.append(label, value);
      }
      profileFields.append(wrapper);
    });

    if (profileAction) {
      profileAction.textContent = editingProfile ? 'Save Changes' : 'Edit Profile';
    }
  }

  async function fetchUserProfile() {
    try {
      const res = await fetch(`${API_BASE_URL}/users/device/${deviceToken}`);
      if (res.ok) {
        const user = await res.json();
        profileData.forEach((field) => {
          if (user[field.key]) field.value = user[field.key];
        });
        renderProfile();
        addLiveLog(`Hardware paired: [${deviceToken.substring(0, 8)}...]`);
      } else if (res.status === 404) {
        await fetch(`${API_BASE_URL}/users/register-device`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceUuid: deviceToken })
        });
        addLiveLog(`Hardware provisioned: [${deviceToken.substring(0, 8)}...]`);
      }
    } catch (e) {
      console.warn('Backend reachability deferred:', e);
    }
  }

  async function saveUserProfile(updatedPayload) {
    try {
      const res = await fetch(`${API_BASE_URL}/users/device/${deviceToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) addLiveLog('Profile synchronized to database.');
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  }

  if (profileView && profileForm && profileFields && profileAction) {
    renderProfile();
    fetchUserProfile();

    profileAction.addEventListener('click', () => {
      if (editingProfile) {
        profileForm.requestSubmit();
        return;
      }
      editingProfile = true;
      renderProfile();
      profileFields.querySelector('input, select, textarea')?.focus();
    });

    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const updatedPayload = {};
      profileData.forEach((field) => {
        const control = profileForm.elements.namedItem(field.key);
        const val = control ? control.value.trim() : '';
        field.value = val;
        updatedPayload[field.key] = val;
      });
      editingProfile = false;
      renderProfile();
      await saveUserProfile(updatedPayload);
    });
  }

  // ==========================================
  // 5. TRUSTED CONTACTS
  // ==========================================
  const contactsGrid = document.querySelector('#contacts-grid');
  const contactModal = document.querySelector('#contact-modal');
  const contactForm = document.querySelector('#contact-form');
  const openContactFormButton = document.querySelector('#open-contact-form');
  const cancelContactFormButton = document.querySelector('#cancel-contact-form');
  const contactSubmitButton = document.querySelector('#save-contact');
  const contactFormTitle = document.querySelector('#contact-form-title');
  const contactNameInput = document.querySelector('#contact-name');
  const contactPhoneInput = document.querySelector('#contact-phone');
  const contactsApi = `${API_BASE_URL}/users/device/${encodeURIComponent(deviceToken)}/contacts`;

  let contacts = [];
  let editingContactPhone = null;

  async function fetchContactsFromBackend() {
    try {
      const res = await fetch(contactsApi);
      if (res.ok) {
        contacts = await res.json();
        renderContacts();
      }
    } catch (e) {
      console.error('Failed to load contacts:', e);
    }
  }

  function renderContacts() {
    if (!contactsGrid) return;
    contactsGrid.replaceChildren();

    if (contacts.length === 0) {
      const emptyNote = document.createElement('p');
      emptyNote.style.opacity = '0.6';
      emptyNote.style.gridColumn = '1 / -1';
      emptyNote.textContent = 'No emergency contacts registered.';
      contactsGrid.append(emptyNote);
      return;
    }

    contacts.forEach((contact) => {
      const card = document.createElement('article');
      card.className = 'trusted-contact-card';
      card.dataset.contactPhone = String(contact.phone);

      const identity = document.createElement('div');
      identity.className = 'trusted-contact-identity';
      const heading = document.createElement('h2');
      heading.textContent = contact.name;
      identity.append(heading);

      const phone = document.createElement('p');
      phone.className = 'trusted-contact-phone';
      phone.textContent = contact.phone || contact.phoneNumber;

      const actions = document.createElement('div');
      actions.className = 'trusted-contact-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.dataset.contactAction = 'edit';
      editButton.textContent = 'Edit';
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.dataset.contactAction = 'remove';
      removeButton.textContent = 'Remove';
      actions.append(editButton, removeButton);

      card.append(identity, phone, actions);
      contactsGrid.append(card);
    });
  }

  function closeContactForm() {
    if (!contactModal || !contactForm) return;
    contactModal.hidden = true;
    contactForm.reset();
    editingContactPhone = null;
  }

  function openContactForm(contact = null) {
    if (!contactModal || !contactForm) return;
    editingContactPhone = contact?.phone ?? null;
    contactForm.reset();
    if (contactNameInput) contactNameInput.value = contact?.name ?? '';
    if (contactPhoneInput) contactPhoneInput.value = contact?.phone || contact?.phoneNumber || '';
    if (contactFormTitle) contactFormTitle.textContent = contact ? 'Edit Contact' : 'Add Contact';
    if (contactSubmitButton) contactSubmitButton.textContent = contact ? 'Save Changes' : 'Add Contact';
    contactModal.hidden = false;
    contactNameInput?.focus();
  }

  if (contactsGrid && contactModal && contactForm && openContactFormButton && cancelContactFormButton) {
    fetchContactsFromBackend();
    openContactFormButton.addEventListener('click', () => openContactForm());
    cancelContactFormButton.addEventListener('click', closeContactForm);
    contactModal.querySelector('[data-close-contact-modal]')?.addEventListener('click', closeContactForm);

    contactsGrid.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-contact-action]');
      if (!action) return;
      const card = action.closest('[data-contact-phone]');
      const contact = contacts.find((item) => String(item.phone) === card?.dataset.contactPhone);
      if (!contact) return;

      if (action.dataset.contactAction === 'edit') {
        openContactForm(contact);
      } else if (action.dataset.contactAction === 'remove' && window.confirm('Remove this emergency contact?')) {
        try {
          const res = await fetch(`${contactsApi}/${encodeURIComponent(contact.phone)}`, { method: 'DELETE' });
          if (res.ok) {
            contacts = contacts.filter((item) => item.phone !== contact.phone);
            renderContacts();
            addLiveLog(`Emergency contact removed: ${contact.name}`);
          }
        } catch (e) {
          console.error('Failed to delete contact:', e);
        }
      }
    });

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = contactNameInput.value.trim();
      const phone = contactPhoneInput.value.trim();
      if (!name || !phone) return;

      const payload = {
        name,
        phone,
        emergencyAlerts: contactForm.elements.namedItem('emergencyAlerts')?.checked ?? true,
        locationSharing: contactForm.elements.namedItem('locationSharing')?.checked ?? true,
      };

      try {
        let saved = false;
        if (editingContactPhone === null) {
          const res = await fetch(contactsApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const savedContact = await res.json();
            contacts.push(savedContact);
            addLiveLog(`New emergency contact added: ${name}`);
            saved = true;
          }
        } else {
          const originalPhone = editingContactPhone;
          const res = await fetch(`${contactsApi}/${encodeURIComponent(originalPhone)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const updated = await res.json();
            contacts = contacts.map((item) => item.phone === originalPhone ? updated : item);
            addLiveLog(`Emergency contact updated: ${name}`);
            saved = true;
          }
        }
        if (saved) {
          renderContacts();
          closeContactForm();
        }
      } catch (err) {
        console.error('Error saving contact to backend:', err);
      }
    });
  }

  // ==========================================
  // 6. ALERT POLLING & HISTORY RENDERING
  // ==========================================
  function addLiveLog(message) {
    if (!dashboardLogList || typeof message !== 'string' || !message.trim()) return;
    const time = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      timeZone: 'Asia/Kolkata'
    }).format(new Date());
    const entry = document.createElement('li');
    const timestamp = document.createElement('time');
    const text = document.createElement('span');
    timestamp.textContent = `[${time}]`;
    text.textContent = message.trim();
    entry.append(timestamp, text);
    dashboardLogList.append(entry);
    if (dashboardLogScroll) {
      dashboardLogScroll.scrollTop = dashboardLogScroll.scrollHeight;
    }
  }

  function setDashboardAlert(message, isCritical = true) {
    if (!dashboardAlertMessage) return;
    dashboardAlertMessage.textContent = message;
    if (dashboardAlertBanner) {
      dashboardAlertBanner.classList.toggle('is-active-emergency', isCritical);
    }
  }

  const knownAlertIds = new Set();

  function renderAlertHistoryItem(alert) {
    if (!dashboardHistoryList) return;
    if (noAlertsPlaceholder && noAlertsPlaceholder.parentNode) {
      noAlertsPlaceholder.remove();
    }

    const item = document.createElement('li');
    const warning = document.createElement('span');
    warning.className = 'dashboard-history-warning';
    warning.setAttribute('aria-hidden', 'true');
    warning.textContent = '⚠';

    const details = document.createElement('div');
    const title = document.createElement('h3');
    const triggers = (alert.signals && alert.signals.length) ? alert.signals.join(', ') : 'Distress signal';
    title.textContent = `Distress detected (${triggers})`;

    const time = document.createElement('p');
    time.textContent = formatTimestampIST(alert.timestamp);

    const state = document.createElement('span');
    state.className = 'dashboard-history-status';
    state.textContent = `Status: ${alert.status || 'TRIGGERED'} | Score: ${alert.score ?? 1.0}`;

    details.append(title, time, state);
    if (Number.isFinite(alert.latitude) && Number.isFinite(alert.longitude)) {
      const mapLink = document.createElement('a');
      mapLink.href = `https://maps.google.com/?q=${encodeURIComponent(`${alert.latitude},${alert.longitude}`)}`;
      mapLink.target = '_blank';
      mapLink.rel = 'noopener noreferrer';
      mapLink.textContent = 'View alert location in Google Maps';
      mapLink.style.cssText = 'display:block;margin-top:8px;color:#075e54;font-weight:700';
      details.append(mapLink);
    }
    item.append(warning, details);
    dashboardHistoryList.prepend(item);
  }

  async function pollAlerts() {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts`);
      if (!res.ok) return;

      const allAlerts = await res.json();
      const deviceAlerts = Array.isArray(allAlerts)
        ? allAlerts.filter(a => a.deviceUuid === deviceToken || a.userId === deviceToken)
        : [];

      deviceAlerts.forEach((alert) => {
        if (!knownAlertIds.has(alert.id)) {
          knownAlertIds.add(alert.id);
          renderAlertHistoryItem(alert);
          setDashboardAlert(`CRITICAL ALERT: Distress event detected (${alert.signals?.join(', ') || 'Voice Stress'})`, true);
          addLiveLog(`[SOS ALERT INGESTED] Event #${alert.id} received.`);
        }
      });
    } catch (e) {
      console.warn('Alert polling update failed:', e);
    }
  }

  setInterval(pollAlerts, 3000);
  pollAlerts();

  // ==========================================
  // 7. VIEW SWITCHER
  // ==========================================
  function showAppView(view) {
    if (dashboardView) dashboardView.hidden = view !== 'dashboard';
    if (profileView) profileView.hidden = view !== 'profile';
    if (contactsView) contactsView.hidden = view !== 'contacts';
    if (codewordsView) codewordsView.hidden = view !== 'codewords';

    document.body.classList.toggle('is-dashboard-view', view === 'dashboard');
    document.body.classList.toggle('is-profile-view', view === 'profile');
    document.body.classList.toggle('is-contacts-view', view === 'contacts');
    document.body.classList.toggle('is-codewords-view', view === 'codewords');

    [[dashboardNav, 'dashboard'], [contactsNav, 'contacts'], [profileNav, 'profile'], [codewordsNav, 'codewords']].forEach(([item, itemView]) => {
      if (!item) return;
      const active = view === itemView;
      item.setAttribute('aria-pressed', String(active));
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  dashboardNav?.addEventListener('click', () => showAppView('dashboard'));
  profileNav?.addEventListener('click', () => showAppView('profile'));
  contactsNav?.addEventListener('click', () => showAppView('contacts'));
  codewordsNav?.addEventListener('click', () => showAppView('codewords'));
})();
