(() => {
  // ==========================================
  // 1. HARDWARE TOKEN CHECK & ROUTE GUARD
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  let deviceToken = urlParams.get('deviceToken');

  if (deviceToken) {
    localStorage.setItem('deviceToken', deviceToken);
    // Keep token in memory and clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    deviceToken = localStorage.getItem('deviceToken');
  }

  // Fallback for Local Server development if no token exists
  if (!deviceToken && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')) {
    deviceToken = 'demo-device-token-12345';
    localStorage.setItem('deviceToken', deviceToken);
    console.warn('Development mode: using demo device token.');
  }

  // Redirect to landing if no token found
  if (!deviceToken) {
    window.location.replace('/landing/');
    return;
  }

  const API_BASE_URL = 'https://voice-pulse-backend.onrender.com/api';

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

  // Frontend-only emergency codeword management.
  const codewordForm = document.querySelector('#codeword-form');
  const codewordInput = document.querySelector('#codeword-input');
  const codewordFeedback = document.querySelector('#codeword-feedback');
  const activeCodewordsList = document.querySelector('#active-codewords-list');
  const codewordsStorageKey = 'voicePulseCodewords';

  function normalizeCodeword(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  }

  function loadCodewords() {
    const savedCodewords = localStorage.getItem(codewordsStorageKey);
    if (savedCodewords !== null) {
      try {
        const parsed = JSON.parse(savedCodewords);
        if (Array.isArray(parsed)) {
          return [...new Set(parsed.map(normalizeCodeword).filter(Boolean))];
        }
      } catch {
        return [];
      }
      return [];
    }

    const previousCodeword = normalizeCodeword(localStorage.getItem('voicePulseCodeword'));
    if (previousCodeword) {
      localStorage.setItem(codewordsStorageKey, JSON.stringify([previousCodeword]));
      return [previousCodeword];
    }
    return [];
  }

  let codewords = loadCodewords();

  function saveCodewords() {
    localStorage.setItem(codewordsStorageKey, JSON.stringify(codewords));
  }

  function showCodewordFeedback(message) {
    if (codewordFeedback) codewordFeedback.textContent = message;
  }

  function renderCodewords() {
    if (!activeCodewordsList) return;
    activeCodewordsList.replaceChildren();

    if (!codewords.length) {
      const emptyState = document.createElement('li');
      emptyState.className = 'codewords-empty-state';
      emptyState.textContent = 'No codewords configured yet.';
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
      const editButton = document.createElement('button');
      editButton.className = 'profile-action-button';
      editButton.type = 'button';
      editButton.textContent = 'Edit';
      editButton.setAttribute('aria-label', `Edit ${codeword}`);
      editButton.addEventListener('click', () => editCodeword(row, index, codeword));

      const deleteButton = document.createElement('button');
      deleteButton.className = 'profile-action-button';
      deleteButton.type = 'button';
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete ${codeword}`);
      deleteButton.addEventListener('click', () => {
        codewords.splice(index, 1);
        saveCodewords();
        renderCodewords();
        showCodewordFeedback('Codeword deleted successfully.');
      });

      actions.append(editButton, deleteButton);
      row.append(name, actions);
      activeCodewordsList.append(row);
    });
  }

  function editCodeword(row, index, existingCodeword) {
    row.replaceChildren();
    const field = document.createElement('div');
    field.className = 'contact-form-field codeword-edit-field';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = existingCodeword;
    input.setAttribute('aria-label', `Edit ${existingCodeword}`);
    const feedback = document.createElement('span');
    feedback.className = 'codewords-feedback';
    field.append(input, feedback);

    const actions = document.createElement('div');
    actions.className = 'codeword-actions';
    const saveButton = document.createElement('button');
    saveButton.className = 'profile-action-button';
    saveButton.type = 'button';
    saveButton.textContent = 'Save';
    const cancelButton = document.createElement('button');
    cancelButton.className = 'profile-action-button';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';

    const saveEdit = () => {
      const updatedCodeword = normalizeCodeword(input.value);
      if (!updatedCodeword) {
        feedback.textContent = 'Please enter a codeword.';
        return;
      }
      if (codewords.some((item, itemIndex) => itemIndex !== index && item === updatedCodeword)) {
        feedback.textContent = 'Codeword already exists.';
        return;
      }

      codewords[index] = updatedCodeword;
      saveCodewords();
      renderCodewords();
      showCodewordFeedback('Codeword updated successfully.');
    };

    saveButton.addEventListener('click', saveEdit);
    cancelButton.addEventListener('click', renderCodewords);
    input.addEventListener('input', () => { feedback.textContent = ''; });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') saveEdit();
      if (event.key === 'Escape') renderCodewords();
    });
    actions.append(saveButton, cancelButton);
    row.append(field, actions);
    input.focus();
    input.select();
  }

  renderCodewords();

  codewordForm?.addEventListener('submit', (event) => {
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

    codewords.push(codeword);
    saveCodewords();
    renderCodewords();
    codewordForm.reset();
    showCodewordFeedback('Codeword added successfully.');
  });

  codewordInput?.addEventListener('input', () => {
    showCodewordFeedback('');
  });

  // User Location map: keep location handling isolated from dashboard features.
  const dashboardMap = document.querySelector('#dashboard-map');
  if (dashboardMap) {
    const showMapMessage = (message) => {
      const paragraph = document.createElement('p');
      paragraph.className = 'dashboard-map-message';
      paragraph.textContent = message;
      dashboardMap.replaceChildren(paragraph);
    };

    if (!navigator.geolocation) {
      showMapMessage('Geolocation is not supported by this browser.');
    } else {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const map = document.createElement('iframe');
        map.title = 'Google Map showing your current location';
        map.loading = 'lazy';
        map.referrerPolicy = 'no-referrer-when-downgrade';
        map.src = `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&z=15&output=embed`;
        dashboardMap.replaceChildren(map);
        dashboardMap.setAttribute('role', 'region');
        dashboardMap.setAttribute('aria-label', 'Map showing your current location');
      }, (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          showMapMessage('Location access was denied.');
        } else {
          showMapMessage('Unable to determine your location.');
        }
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    }
  }

  if (navbarToggle) {
    navbarToggle.addEventListener('click', () => {
      const willExpand = navbarToggle.getAttribute('aria-expanded') !== 'true';
      navbarToggle.setAttribute('aria-expanded', String(willExpand));
      navbarToggle.setAttribute('aria-label', willExpand ? 'Collapse navigation' : 'Expand navigation');
      sidebar?.classList.toggle('is-collapsed', !willExpand);
      if (navbarNavigation) {
        navbarNavigation.hidden = !willExpand;
        navbarNavigation.setAttribute('aria-hidden', String(!willExpand));
      }
      document.body.classList.toggle('is-navbar-collapsed', !willExpand);
    });
  }

  // ==========================================
  // 3. PROFILE MANAGEMENT (BACKEND INTEGRATION)
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
        control.setAttribute('aria-describedby', `${fieldId}-error`);
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

      const error = document.createElement('span');
      error.className = 'profile-error';
      error.id = `${fieldId}-error`;
      error.setAttribute('aria-live', 'polite');
      wrapper.append(error);
      profileFields.append(wrapper);
    });

    if (profileAction) {
      profileAction.textContent = editingProfile ? 'Save Changes' : 'Edit Profile';
      profileAction.type = 'button';
    }
  }

  async function fetchUserProfile() {
    try {
      const res = await fetch(`${API_BASE_URL}/users/device/${deviceToken}`);
      
      if (res.ok) {
        const user = await res.json();
        profileData.forEach((field) => {
          if (user[field.key]) {
            field.value = user[field.key];
          }
        });
        renderProfile();
        addLiveLog(`Hardware paired: Device ID [${deviceToken.substring(0, 8)}...]`);
      } else if (res.status === 404) {
        console.log('New device detected. Registering device in database...');
        await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceUuid: deviceToken,
            name: 'New User',
            phoneNumber: ''
          })
        });
        addLiveLog(`New hardware registered: [${deviceToken.substring(0, 8)}...]`);
      }
    } catch (e) {
      console.warn('Backend reachability check deferred:', e);
    }
  }

  async function saveUserProfile(updatedPayload) {
    try {
      const res = await fetch(`${API_BASE_URL}/users/device/${deviceToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) {
        addLiveLog('Profile updated and synchronized with secure storage.');
      }
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
  // 4. TRUSTED CONTACTS (BACKEND INTEGRATION)
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

  let contacts = [];
  let editingContactId = null;
  let lastContactModalOpener = null;

  async function fetchContactsFromBackend() {
    try {
      const res = await fetch(`${API_BASE_URL}/contacts`);
      if (res.ok) {
        const data = await res.json();
        contacts = data;
        renderContacts();
      }
    } catch (e) {
      console.error('Failed to load contacts from database:', e);
    }
  }

  function addPersonIcon(target) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('cx', '12'); head.setAttribute('cy', '8'); head.setAttribute('r', '3.5');
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    body.setAttribute('d', 'M5 20v-1.5a7 7 0 0 1 14 0V20z');
    svg.append(head, body);
    target.append(svg);
  }

  function renderContacts() {
    if (!contactsGrid) return;
    contactsGrid.replaceChildren();

    if (contacts.length === 0) {
      const emptyNote = document.createElement('p');
      emptyNote.style.opacity = '0.6';
      emptyNote.style.gridColumn = '1 / -1';
      emptyNote.textContent = 'No emergency contacts added yet. Click "Add Contact" to save one to the database.';
      contactsGrid.append(emptyNote);
      return;
    }

    contacts.forEach((contact) => {
      const card = document.createElement('article');
      card.className = 'trusted-contact-card';
      card.dataset.contactId = String(contact.id);

      const identity = document.createElement('div');
      identity.className = 'trusted-contact-identity';
      const icon = document.createElement('span');
      icon.className = 'trusted-contact-icon';
      addPersonIcon(icon);
      const heading = document.createElement('h2');
      heading.textContent = contact.name;
      identity.append(icon, heading);

      const phone = document.createElement('p');
      phone.className = 'trusted-contact-phone';
      phone.textContent = contact.phone;

      const features = document.createElement('ul');
      features.className = 'trusted-contact-features';
      if (contact.emergencyAlerts) {
        const item = document.createElement('li');
        item.textContent = 'Emergency alerts';
        features.append(item);
      }
      if (contact.locationSharing) {
        const item = document.createElement('li');
        item.textContent = 'Location sharing';
        features.append(item);
      }

      const actions = document.createElement('div');
      actions.className = 'trusted-contact-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button'; editButton.dataset.contactAction = 'edit';
      editButton.textContent = 'Edit';
      const removeButton = document.createElement('button');
      removeButton.type = 'button'; removeButton.dataset.contactAction = 'remove';
      removeButton.textContent = 'Remove';
      actions.append(editButton, removeButton);
      card.append(identity, phone, features, actions);
      contactsGrid.append(card);
    });
  }

  function closeContactForm() {
    if (!contactModal || !contactForm) return;
    contactModal.hidden = true;
    contactForm.reset();
    editingContactId = null;
    const focusTarget = lastContactModalOpener?.isConnected ? lastContactModalOpener : openContactFormButton;
    focusTarget?.focus();
  }

  function openContactForm(contact = null, opener = openContactFormButton) {
    if (!contactModal || !contactForm) return;
    editingContactId = contact?.id ?? null;
    lastContactModalOpener = opener;
    contactForm.reset();
    if (contactNameInput) contactNameInput.value = contact?.name ?? '';
    if (contactPhoneInput) contactPhoneInput.value = contact?.phone ?? '';
    if (contactForm.elements.namedItem('emergencyAlerts')) {
      contactForm.elements.namedItem('emergencyAlerts').checked = contact?.emergencyAlerts ?? true;
    }
    if (contactForm.elements.namedItem('locationSharing')) {
      contactForm.elements.namedItem('locationSharing').checked = contact?.locationSharing ?? true;
    }
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
      const card = action.closest('[data-contact-id]');
      const contact = contacts.find((item) => String(item.id) === card?.dataset.contactId);
      if (!contact) return;

      if (action.dataset.contactAction === 'edit') {
        openContactForm(contact, action);
      } else if (action.dataset.contactAction === 'remove' && window.confirm('Remove this emergency contact?')) {
        try {
          const res = await fetch(`${API_BASE_URL}/contacts/${contact.id}`, { method: 'DELETE' });
          if (res.ok) {
            contacts = contacts.filter((item) => item.id !== contact.id);
            renderContacts();
            addLiveLog(`Emergency contact deleted from database: ${contact.name}`);
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
        emergencyAlerts: contactForm.elements.namedItem('emergencyAlerts').checked,
        locationSharing: contactForm.elements.namedItem('locationSharing').checked,
      };

      contactSubmitButton.disabled = true;
      contactSubmitButton.textContent = 'Saving...';

      try {
        if (editingContactId === null) {
          const res = await fetch(`${API_BASE_URL}/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const saved = await res.json();
            contacts.push(saved);
            addLiveLog(`New emergency contact persisted to database: ${name}`);
          }
        } else {
          const res = await fetch(`${API_BASE_URL}/contacts/${editingContactId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const updated = await res.json();
            contacts = contacts.map((item) => item.id === editingContactId ? updated : item);
            addLiveLog(`Emergency contact updated in database: ${name}`);
          }
        }
        renderContacts();
        closeContactForm();
      } catch (err) {
        console.error('Error saving contact to backend:', err);
        alert('Network error connecting to backend.');
      } finally {
        contactSubmitButton.disabled = false;
        contactSubmitButton.textContent = editingContactId ? 'Save Changes' : 'Add Contact';
      }
    });
  }

  // ==========================================
  // 5. LIVE HARDWARE LOGS & ALERT POLLING
  // ==========================================
  function addLiveLog(message) {
    if (!dashboardLogList || typeof message !== 'string' || !message.trim()) return;
    const time = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
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
      if (isCritical) {
        dashboardAlertBanner.classList.add('is-active-emergency');
      } else {
        dashboardAlertBanner.classList.remove('is-active-emergency');
      }
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
    time.textContent = alert.timestamp ? new Date(alert.timestamp).toLocaleString('en-IN') : 'Just now';

    const state = document.createElement('span');
    state.className = 'dashboard-history-status';
    state.textContent = `Status: ${alert.status || 'TRIGGERED'} | Score: ${alert.score ?? 1.0}`;

    details.append(title, time, state);
    item.append(warning, details);
    dashboardHistoryList.prepend(item);
  }

  async function pollAlerts() {
    try {
      let res = await fetch(`${API_BASE_URL}/alerts/device/${deviceToken}`);
      let deviceAlerts = [];

      if (res.ok) {
        deviceAlerts = await res.json();
      } else {
        res = await fetch(`${API_BASE_URL}/alerts`);
        if (res.ok) {
          const allAlerts = await res.json();
          deviceAlerts = allAlerts.filter(a => a.deviceUuid === deviceToken);
        }
      }

      deviceAlerts.forEach((alert) => {
        if (!knownAlertIds.has(alert.id)) {
          knownAlertIds.add(alert.id);
          renderAlertHistoryItem(alert);
          setDashboardAlert(`CRITICAL ALERT: Distress event detected (${alert.signals?.join(', ') || 'Voice Stress'})`, true);
          addLiveLog(`[SOS ALERT INGESTED] Event #${alert.id} detected from mobile hardware.`);
        }
      });
    } catch (e) {
      console.warn('Alert polling update failed:', e);
    }
  }

  setInterval(pollAlerts, 3000);
  pollAlerts();

  // View Navigation Switcher
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
