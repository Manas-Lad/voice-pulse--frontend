(() => {
  // ==========================================
  // 1. HARDWARE TOKEN CHECK & ROUTE GUARD
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  let deviceToken = urlParams.get('deviceToken');

  if (deviceToken) {
    localStorage.setItem('deviceToken', deviceToken);
    // Clean URL without losing query parameters from memory
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    deviceToken = localStorage.getItem('deviceToken');
  }

  // If no hardware token exists, bounce to landing page to download the APK
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
  const dashboardView = document.querySelector('#dashboard-view');
  const profileView = document.querySelector('#profile-view');
  const contactsView = document.querySelector('#contacts-view');
  const dashboardAlertBanner = document.querySelector('#dashboard-alert-banner');
  const dashboardAlertMessage = document.querySelector('#dashboard-alert-message');
  const dashboardLogScroll = document.querySelector('#dashboard-log-scroll');
  const dashboardLogList = document.querySelector('#dashboard-log-list');
  const dashboardHistoryList = document.querySelector('#dashboard-history-list');
  const noAlertsPlaceholder = document.querySelector('#no-alerts-placeholder');

  navbarToggle.addEventListener('click', () => {
    const willExpand = navbarToggle.getAttribute('aria-expanded') !== 'true';
    navbarToggle.setAttribute('aria-expanded', String(willExpand));
    navbarToggle.setAttribute('aria-label', willExpand ? 'Collapse navigation' : 'Expand navigation');
    sidebar.classList.toggle('is-collapsed', !willExpand);
    navbarNavigation.hidden = !willExpand;
    navbarNavigation.setAttribute('aria-hidden', String(!willExpand));
    document.body.classList.toggle('is-navbar-collapsed', !willExpand);
  });

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

    profileAction.textContent = editingProfile ? 'Save Changes' : 'Edit Profile';
    profileAction.type = 'button';
  }

  async function fetchUserProfile() {
    try {
      const res = await fetch(`${API_BASE_URL}/users/device/${deviceToken}`);
      if (!res.ok) return;
      const user = await res.json();
      profileData.forEach((field) => {
        if (user[field.key]) {
          field.value = user[field.key];
        }
      });
      renderProfile();
      addLiveLog(`Hardware paired: Device ID [${deviceToken.substring(0, 8)}...]`);
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
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
  // 4. TRUSTED CONTACTS
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

  let contacts = [
    { id: 1, name: 'Primary Emergency Contact', phone: '+91 98199 33448', emergencyAlerts: true, locationSharing: true },
  ];
  let editingContactId = null;
  let nextContactId = 2;
  let lastContactModalOpener = null;

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
    contactsGrid.replaceChildren();
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
    contactModal.hidden = true;
    contactForm.reset();
    editingContactId = null;
    const focusTarget = lastContactModalOpener?.isConnected ? lastContactModalOpener : openContactFormButton;
    focusTarget.focus();
  }

  function openContactForm(contact = null, opener = openContactFormButton) {
    editingContactId = contact?.id ?? null;
    lastContactModalOpener = opener;
    contactForm.reset();
    contactNameInput.value = contact?.name ?? '';
    contactPhoneInput.value = contact?.phone ?? '';
    contactForm.elements.namedItem('emergencyAlerts').checked = contact?.emergencyAlerts ?? true;
    contactForm.elements.namedItem('locationSharing').checked = contact?.locationSharing ?? true;
    contactFormTitle.textContent = contact ? 'Edit Contact' : 'Add Contact';
    contactSubmitButton.textContent = contact ? 'Save Changes' : 'Add Contact';
    contactModal.hidden = false;
    contactNameInput.focus();
  }

  if (contactsGrid && contactModal && contactForm && openContactFormButton && cancelContactFormButton) {
    renderContacts();
    openContactFormButton.addEventListener('click', () => openContactForm());
    cancelContactFormButton.addEventListener('click', closeContactForm);
    contactModal.querySelector('[data-close-contact-modal]').addEventListener('click', closeContactForm);

    contactsGrid.addEventListener('click', (event) => {
      const action = event.target.closest('[data-contact-action]');
      if (!action) return;
      const card = action.closest('[data-contact-id]');
      const contact = contacts.find((item) => String(item.id) === card?.dataset.contactId);
      if (!contact) return;

      if (action.dataset.contactAction === 'edit') {
        openContactForm(contact, action);
      } else if (action.dataset.contactAction === 'remove' && window.confirm('Remove this emergency contact?')) {
        contacts = contacts.filter((item) => item.id !== contact.id);
        renderContacts();
      }
    });

    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = contactNameInput.value.trim();
      const phone = contactPhoneInput.value.trim();
      if (!name || !phone) return;

      const updatedContact = {
        id: editingContactId ?? nextContactId++,
        name,
        phone,
        emergencyAlerts: contactForm.elements.namedItem('emergencyAlerts').checked,
        locationSharing: contactForm.elements.namedItem('locationSharing').checked,
      };
      if (editingContactId === null) contacts.push(updatedContact);
      else contacts = contacts.map((item) => item.id === editingContactId ? updatedContact : item);

      renderContacts();
      closeContactForm();
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
    dashboardLogScroll.scrollTop = dashboardLogScroll.scrollHeight;
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
      // 1. Try querying device-specific alert history
      let res = await fetch(`${API_BASE_URL}/alerts/device/${deviceToken}`);
      let deviceAlerts = [];

      if (res.ok) {
        deviceAlerts = await res.json();
      } else {
        // Fallback to general list and filter by deviceToken
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

  // Begin polling every 3 seconds
  setInterval(pollAlerts, 3000);
  pollAlerts();

  // Navigation switching
  function showAppView(view) {
    dashboardView.hidden = view !== 'dashboard';
    profileView.hidden = view !== 'profile';
    contactsView.hidden = view !== 'contacts';
    document.body.classList.toggle('is-dashboard-view', view === 'dashboard');
    document.body.classList.toggle('is-profile-view', view === 'profile');
    document.body.classList.toggle('is-contacts-view', view === 'contacts');

    [[dashboardNav, 'dashboard'], [contactsNav, 'contacts'], [profileNav, 'profile']].forEach(([item, itemView]) => {
      const active = view === itemView;
      item.setAttribute('aria-pressed', String(active));
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  dashboardNav.addEventListener('click', () => showAppView('dashboard'));
  profileNav.addEventListener('click', () => showAppView('profile'));
  contactsNav.addEventListener('click', () => showAppView('contacts'));
})();