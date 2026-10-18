(() => {
  const headings = Array.from(document.querySelectorAll('.evidence-page > section > h2[id]'));
  const links = Array.from(document.querySelectorAll('.reading-directory a'));
  const mobileDirectory = document.querySelector('.reading-mobile-nav');
  const currentLabel = document.querySelector('[data-current-section]');
  const currentIndex = document.querySelector('[data-reading-index]');
  const tableWrappers = Array.from(document.querySelectorAll('.evidence-page .table-wrap, .evidence-page .table-scroll'));
  let activeId = '';
  let scheduled = false;

  headings.forEach((heading) => { heading.tabIndex = -1; });

  function markCurrent(heading) {
    if (!heading || heading.id === activeId) return;
    activeId = heading.id;
    links.forEach((link) => {
      if (link.hash === '#' + activeId) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const activeLink = links.find((link) => link.hash === '#' + activeId);
    const label = activeLink && activeLink.querySelector('.chapter-label');
    if (currentLabel && label) currentLabel.textContent = label.textContent;
    if (currentIndex) currentIndex.textContent = String(headings.indexOf(heading) + 1).padStart(2, '0');
  }

  function updateCurrent() {
    scheduled = false;
    const offset = window.matchMedia('(max-width: 880px)').matches ? 145 : 130;
    let current = headings[0];
    const positions = headings.map((heading) => ({ heading, top: heading.getBoundingClientRect().top }));
    positions.forEach((position) => { if (position.top <= offset) current = position.heading; });
    if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
      current = headings[headings.length - 1];
    }
    markCurrent(current);
  }

  function scheduleCurrent() {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(updateCurrent);
    }
  }

  tableWrappers.forEach((wrapper, index) => {
    const caption = wrapper.querySelector('caption');
    const hint = document.createElement('p');
    hint.className = 'reading-table-hint';
    hint.textContent = '表格可左右滑动查看';
    hint.hidden = true;
    hint.id = 'table-hint-' + index;
    wrapper.before(hint);
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', caption ? caption.textContent.trim() : '章节对照表');
    wrapper.dataset.hintId = hint.id;
  });

  function updateTableHints() {
    const overflow = tableWrappers.map((wrapper) => wrapper.scrollWidth > wrapper.clientWidth + 1);
    tableWrappers.forEach((wrapper, index) => {
      const hint = document.getElementById(wrapper.dataset.hintId);
      if (hint) hint.hidden = !overflow[index];
      if (overflow[index]) {
        wrapper.tabIndex = 0;
        wrapper.setAttribute('aria-describedby', wrapper.dataset.hintId);
      } else {
        wrapper.removeAttribute('tabindex');
        wrapper.removeAttribute('aria-describedby');
      }
    });
  }

  if (mobileDirectory) {
    mobileDirectory.addEventListener('click', (event) => {
      if (event.target.closest('.reading-directory a')) mobileDirectory.open = false;
    });
  }

  document.querySelectorAll('.evidence-page details').forEach((detail) => {
    detail.addEventListener('toggle', () => {
      scheduleCurrent();
      updateTableHints();
    });
  });

  const printState = new Map();
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('.evidence-page details').forEach((detail) => {
      printState.set(detail, detail.open);
      detail.open = true;
    });
  });
  window.addEventListener('afterprint', () => {
    printState.forEach((wasOpen, detail) => { detail.open = wasOpen; });
    printState.clear();
  });

  window.addEventListener('scroll', scheduleCurrent, { passive: true });
  window.addEventListener('resize', () => { scheduleCurrent(); updateTableHints(); }, { passive: true });
  window.addEventListener('hashchange', scheduleCurrent);
  window.addEventListener('load', () => { scheduleCurrent(); updateTableHints(); });
  updateCurrent();
  updateTableHints();
})();
