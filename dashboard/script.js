(() => {
  const sidebar = document.querySelector('.profile-sidebar');
  const navbarToggle = document.querySelector('#navbar-toggle');
  const navbarNavigation = document.querySelector('#navbar-navigation');
  const dashboardNav = document.querySelector('#dashboard-nav-toggle');
  const profileNav = document.querySelector('#profile-nav-toggle');
  const contactsNav = document.querySelector('#contacts-nav-toggle');
  const dashboardView = document.querySelector('#dashboard-view');
  const profileView = document.querySelector('#profile-view');
  const contactsView = document.querySelector('#contacts-view');
  const dashboardAlertMessage = document.querySelector('#dashboard-alert-message');
  const dashboardLogScroll = document.querySelector('#dashboard-log-scroll');
  const dashboardLogList = document.querySelector('#dashboard-log-list');
  const dashboardHistoryList = document.querySelector('#dashboard-history-list');

  navbarToggle.addEventListener('click', () => {
    const willExpand = navbarToggle.getAttribute('aria-expanded') !== 'true';
    navbarToggle.setAttribute('aria-expanded', String(willExpand));
    navbarToggle.setAttribute('aria-label', willExpand ? 'Collapse navigation' : 'Expand navigation');
    sidebar.classList.toggle('is-collapsed', !willExpand);
    navbarNavigation.hidden = !willExpand;
    navbarNavigation.setAttribute('aria-hidden', String(!willExpand));
    document.body.classList.toggle('is-navbar-collapsed', !willExpand);
  });

  const profileForm = document.querySelector('#profile-form');
  const profileFields = document.querySelector('#profile-fields');
  const profileAction = document.querySelector('#profile-edit-button');

  const profileData = [
    { key: 'name', label: 'Name', value: 'Rahul Sharma', type: 'text' },
    { key: 'phone', label: 'Phone Number', value: '+91 98765 43210', type: 'tel' },
    { key: 'gender', label: 'Gender', value: 'Male', type: 'select' },
    { key: 'dateOfBirth', label: 'Date of Birth', value: '2004-03-15', type: 'date' },
    { key: 'address', label: 'Address', value: 'Mumbai, Maharashtra, India', type: 'textarea' },
  ];
  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];
  let editingProfile = false;

  function formatDate(value) {
    if (!value) return '';
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
        control.value = field.value;
        control.autocomplete = field.key === 'name' ? 'name'
          : field.key === 'phone' ? 'tel'
            : field.key === 'address' ? 'street-address' : 'off';
        control.setAttribute('aria-describedby', `${fieldId}-error`);
        wrapper.append(control);
      } else {
        const label = document.createElement('span');
        label.className = 'profile-label';
        label.textContent = field.label;
        const value = document.createElement('p');
        value.className = 'profile-value';
        value.textContent = field.key === 'dateOfBirth' ? formatDate(field.value) : field.value;
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
    // Keep the control as a button: changing it to submit during the Edit click
    // can submit the form immediately and exit edit mode before the user edits.
    profileAction.type = 'button';
  }

  function showValidationError(field, message) {
    const control = profileForm.elements.namedItem(field.key);
    const error = document.querySelector(`#profile-${field.key}-error`);
    error.textContent = message;
    control.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  if (profileView && profileForm && profileFields && profileAction) {
    renderProfile();
    profileAction.addEventListener('click', () => {
      if (editingProfile) {
        profileForm.requestSubmit();
        return;
      }
      editingProfile = true;
      renderProfile();
      profileFields.querySelector('input, select, textarea')?.focus();
    });

    profileForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const controls = new Map();
      let firstInvalid = null;

      profileData.forEach((field) => {
        const control = profileForm.elements.namedItem(field.key);
        controls.set(field.key, control);
        const value = control.value.trim();
        let error = '';

        if (!value) error = `${field.label} cannot be empty.`;
        showValidationError(field, error);
        if (error && !firstInvalid) firstInvalid = control;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      profileData.forEach((field) => {
        profileData.find((item) => item.key === field.key).value = controls.get(field.key).value.trim();
      });
      editingProfile = false;
      renderProfile();
    });
  }

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
    { id: 1, name: 'Mom', phone: '+91 XXXXX XXXXX', emergencyAlerts: true, locationSharing: true },
    { id: 2, name: 'Dad', phone: '+91 XXXXX XXXXX', emergencyAlerts: true, locationSharing: false },
  ];
  let editingContactId = null;
  let nextContactId = 3;
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

  function clearContactErrors() {
    document.querySelector('#contact-name-error').textContent = '';
    document.querySelector('#contact-phone-error').textContent = '';
    contactNameInput.removeAttribute('aria-invalid');
    contactPhoneInput.removeAttribute('aria-invalid');
  }

  function closeContactForm() {
    contactModal.hidden = true;
    contactForm.reset();
    clearContactErrors();
    editingContactId = null;
    const focusTarget = lastContactModalOpener?.isConnected ? lastContactModalOpener : openContactFormButton;
    focusTarget.focus();
  }

  function openContactForm(contact = null, opener = openContactFormButton) {
    editingContactId = contact?.id ?? null;
    lastContactModalOpener = opener;
    contactForm.reset();
    clearContactErrors();
    contactNameInput.value = contact?.name ?? '';
    contactPhoneInput.value = contact?.phone ?? '';
    contactForm.elements.namedItem('emergencyAlerts').checked = contact?.emergencyAlerts ?? false;
    contactForm.elements.namedItem('locationSharing').checked = contact?.locationSharing ?? false;
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

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !contactModal.hidden) closeContactForm();
    });

    contactsGrid.addEventListener('click', (event) => {
      const action = event.target.closest('[data-contact-action]');
      if (!action) return;
      const card = action.closest('[data-contact-id]');
      const contact = contacts.find((item) => String(item.id) === card?.dataset.contactId);
      if (!contact) return;

      if (action.dataset.contactAction === 'edit') {
        openContactForm(contact, action);
      } else if (action.dataset.contactAction === 'remove' && window.confirm('Remove this trusted contact?')) {
        contacts = contacts.filter((item) => item.id !== contact.id);
        renderContacts();
      }
    });

    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearContactErrors();
      const name = contactNameInput.value.trim();
      const phone = contactPhoneInput.value.trim();
      let firstInvalid = null;

      if (!name) {
        document.querySelector('#contact-name-error').textContent = 'Name cannot be empty.';
        contactNameInput.setAttribute('aria-invalid', 'true');
        firstInvalid = contactNameInput;
      }
      if (!phone) {
        document.querySelector('#contact-phone-error').textContent = 'Phone number cannot be empty.';
        contactPhoneInput.setAttribute('aria-invalid', 'true');
        firstInvalid ??= contactPhoneInput;
      }
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

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

  function addAlertToHistory(message, timestamp, status) {
    if (!dashboardHistoryList || typeof message !== 'string' || !message.trim()) return;
    const item = document.createElement('li');
    const warning = document.createElement('span');
    warning.className = 'dashboard-history-warning';
    warning.setAttribute('aria-hidden', 'true');
    warning.textContent = '⚠';
    const details = document.createElement('div');
    const title = document.createElement('h3');
    const time = document.createElement('p');
    const state = document.createElement('span');
    title.textContent = message.trim();
    time.textContent = timestamp ?? '';
    state.className = 'dashboard-history-status';
    state.textContent = `Status: ${status ?? ''}`;
    details.append(title, time, state);
    item.append(warning, details);
    dashboardHistoryList.prepend(item);
  }

  function setDashboardAlert(message) {
    if (dashboardAlertMessage && typeof message === 'string') dashboardAlertMessage.textContent = message;
  }

  window.addLiveLog = addLiveLog;
  window.addAlertToHistory = addAlertToHistory;
  window.setDashboardAlert = setDashboardAlert;
  if (dashboardLogScroll) dashboardLogScroll.scrollTop = dashboardLogScroll.scrollHeight;

  function showAppView(view) {
    if (view === 'dashboard' && dashboardNav.getAttribute('aria-pressed') === 'true') return;
    if (view === 'profile' && profileNav.getAttribute('aria-pressed') === 'true') return;
    if (view === 'contacts' && contactsNav.getAttribute('aria-pressed') === 'true') return;
    if (profileNav.getAttribute('aria-pressed') === 'true' && view !== 'profile' && editingProfile) {
      editingProfile = false;
      renderProfile();
    }

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

    if (view === 'dashboard') dashboardView.querySelector('#dashboard-title').focus({ preventScroll: true });
    if (view === 'profile') profileView.querySelector('#profile-title').focus({ preventScroll: true });
    if (view === 'contacts') contactsView.querySelector('#contacts-title').focus({ preventScroll: true });
  }

  dashboardNav.addEventListener('click', () => showAppView('dashboard'));
  profileNav.addEventListener('click', () => showAppView('profile'));
  contactsNav.addEventListener('click', () => showAppView('contacts'));
})();
