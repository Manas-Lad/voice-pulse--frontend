(() => {
  // ==========================================
  // 1. DEVICE TOKEN VERIFICATION (LANDING PAGE)
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  const queryToken = urlParams.get('deviceToken');
  const storedToken = localStorage.getItem('deviceToken');

  // If the user visits the landing page with a deviceToken query param (e.g. from an app deep link)
  if (queryToken) {
    localStorage.setItem('deviceToken', queryToken);
    window.location.replace('/dashboard/');
    return;
  }

  // If already paired from a previous session on this browser, show dashboard shortcut
  const dashboardNavLink = document.querySelector('#nav-dashboard-link');
  if (storedToken && dashboardNavLink) {
    dashboardNavLink.hidden = false;
  }

  // ==========================================
  // 2. DOWNLOAD BUTTON INTERACTION
  // ==========================================
  const downloadBtn = document.querySelector('#download-apk-action');
  const downloadBtnText = document.querySelector('#download-btn-text');
  if (downloadBtn && downloadBtnText) {
    downloadBtn.addEventListener('click', () => {
      downloadBtnText.textContent = 'Downloading APK...';
      setTimeout(() => {
        downloadBtnText.textContent = 'Download APK';
      }, 4000);
    });
  }

  // ==========================================
  // 3. MOBILE MENU TOGGLE
  // ==========================================
  const menuButton = document.querySelector('.menu-toggle');
  const siteMenu = document.querySelector('.site-menu');

  function closeMenu() {
    if (!menuButton || !siteMenu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    siteMenu.classList.remove('is-open');
  }

  if (menuButton && siteMenu) {
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
      siteMenu.classList.toggle('is-open', !isOpen);
    });

    siteMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    document.addEventListener('click', (event) => {
      if (!siteMenu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
  }

  // ==========================================
  // 4. SMOOTH SCROLLING
  // ==========================================
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', link.getAttribute('href'));
    });
  });

  // ==========================================
  // 5. SCROLL REVEAL OBSERVER
  // ==========================================
  const revealItems = document.querySelectorAll('.reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  // ==========================================
  // 6. WAVEFORM VISUALIZER INTERACTION
  // ==========================================
  const waveform = document.querySelector('#hero-waveform');
  if (waveform) {
    const bars = [...waveform.querySelectorAll('span')];
    bars.forEach((bar, index) => { bar.style.setProperty('--i', index); });

    const setWaveActive = (active) => waveform.classList.toggle('is-active', active);
    waveform.addEventListener('pointerenter', () => setWaveActive(true));
    waveform.addEventListener('pointerleave', () => setWaveActive(false));
    waveform.addEventListener('focusin', () => setWaveActive(true));
    waveform.addEventListener('focusout', () => setWaveActive(false));
    waveform.setAttribute('tabindex', '0');
    waveform.setAttribute('role', 'img');
    waveform.setAttribute('aria-label', 'Decorative voice waveform. Hover or focus to animate.');
  }
})();