(() => {
  const library = document.querySelector('[data-research-library]');
  if (!library) return;
  const input = library.querySelector('[data-research-search]');
  const filters = Array.from(library.querySelectorAll('[data-research-filter]'));
  const documents = Array.from(library.querySelectorAll('[data-research-document]'));
  const count = library.querySelector('[data-result-count]');
  const empty = library.querySelector('[data-research-empty]');
  let category = 'all';
  let hashCategory = '';
  const printableState = new Map();

  function update() {
    const query = input.value.trim().toLocaleLowerCase();
    let matches = 0;
    documents.forEach(doc => {
      const visible = (category === 'all' || doc.dataset.category === category) && doc.textContent.toLocaleLowerCase().includes(query);
      doc.hidden = !visible;
      if (visible) matches++;
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.researchFilter === category)));
    count.textContent = `${matches} 份成果`;
    empty.hidden = matches > 0;
  }

  function setCategory(value, saveHash) {
    category = filters.some(button => button.dataset.researchFilter === value) ? value : 'all';
    if (saveHash) history.replaceState(null, '', category === 'all' ? location.pathname + location.search : '#topic-' + category);
    update();
  }

  function useHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id.startsWith('topic-')) setCategory(id.slice(6), false);
    else if (id.startsWith('doc-')) {
      const doc = documents.find(item => item.id === id);
      if (!doc) return;
      input.value = '';
      setCategory(doc.dataset.category, false);
      doc.open = true;
      requestAnimationFrame(() => doc.scrollIntoView({block:'start',behavior:'instant'}));
    }
  }

  input.addEventListener('input', update);
  filters.forEach(button => button.addEventListener('click', () => setCategory(button.dataset.researchFilter, true)));
  library.querySelector('[data-clear-research]').addEventListener('click', () => {
    input.value = '';
    setCategory('all', true);
    input.focus();
  });
  library.querySelector('.library-filters').addEventListener('keydown', event => {
    const index = filters.indexOf(event.target);
    if (index < 0) return;
    let target;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % filters.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index + filters.length - 1) % filters.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = filters.length - 1;
    if (target === undefined) return;
    event.preventDefault();
    filters[target].focus({preventScroll:true});
    filters[target].click();
    const group = event.currentTarget;
    const left = filters[target].offsetLeft - group.offsetLeft;
    if (left < group.scrollLeft) group.scrollLeft = Math.max(0, left - 4);
    else if (left + filters[target].offsetWidth > group.scrollLeft + group.clientWidth) group.scrollLeft = left + filters[target].offsetWidth - group.clientWidth + 4;
  });
  window.addEventListener('hashchange', useHash);
  window.addEventListener('beforeprint', () => {
    hashCategory = category;
    documents.forEach(doc => { printableState.set(doc, {open:doc.open,hidden:doc.hidden}); doc.hidden = false; doc.open = true; });
  });
  window.addEventListener('afterprint', () => {
    printableState.forEach((state, doc) => { doc.open = state.open; doc.hidden = state.hidden; });
    printableState.clear();
    category = hashCategory;
    update();
  });
  update();
  useHash();
})();
