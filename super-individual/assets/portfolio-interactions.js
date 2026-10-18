(() => {
  'use strict';

  const controlSelector = 'button[data-show], button[data-select], button[data-hero-select]';
  const modes = [
    { control: 'button[data-show]', scope: '[data-gallery]', panel: 'figure[id]', value: 'show' },
    { control: 'button[data-select]', scope: '[data-choice-group]', panel: '[data-panel]', value: 'select' },
    { control: 'button[data-hero-select]', scope: '[data-hero-gallery]', panel: '[data-hero-panel]', value: 'heroSelect' }
  ];
  const groups = new Map();
  const pendingClicks = new WeakMap();
  const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function controlFrom(event) {
    return event.target instanceof Element ? event.target.closest(controlSelector) : null;
  }

  function describe(button) {
    const mode = modes.find(item => button.matches(item.control));
    const scope = mode && button.closest(mode.scope);
    if (!scope) return null;
    const belongs = element => element.closest(mode.scope) === scope;
    return {
      mode,
      scope,
      controls: Array.from(scope.querySelectorAll(mode.control)).filter(belongs),
      panels: Array.from(scope.querySelectorAll(mode.panel)).filter(belongs)
    };
  }

  function panelFor(group, button) {
    const value = button.dataset[group.mode.value];
    if (group.mode.value === 'show') return group.panels.find(panel => panel.id === value);
    if (group.mode.value === 'select') return group.panels.find(panel => panel.dataset.panel === value);
    return group.panels.find(panel => panel.dataset.heroPanel === value && panel.id === button.getAttribute('aria-controls'));
  }

  function stateFor(scope) {
    if (!groups.has(scope)) groups.set(scope, { sequence: 0, animation: null });
    return groups.get(scope);
  }

  function cancelAnimation(state) {
    if (state.animation) {
      state.animation.cancel();
      state.animation = null;
    }
  }

  function reveal(panel, state) {
    if (reducedMotion?.matches || typeof panel.animate !== 'function') return;
    const animation = panel.animate([
      { opacity: 0, transform: 'translateY(4px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
    state.animation = animation;
    const clear = () => { if (state.animation === animation) state.animation = null; };
    animation.addEventListener('finish', clear, { once: true });
    animation.addEventListener('cancel', clear, { once: true });
  }

  // Capture the previous panel before app.js runs. The matching document
  // bubble listener runs after app.js's button handlers, regardless of order.
  document.addEventListener('click', event => {
    const button = controlFrom(event);
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    const group = describe(button);
    if (!group) return;
    const panel = panelFor(group, button);
    if (!panel) return;
    const previous = group.panels.find(item => !item.hidden);
    const state = stateFor(group.scope);
    const sequence = ++state.sequence;
    cancelAnimation(state);

    // Only the new hero gallery owns its selection here. Existing galleries
    // and research choices keep app.js as the owner of hidden/pressed state.
    if (group.mode.value === 'heroSelect') {
      group.controls.forEach(control => control.setAttribute('aria-pressed', String(control === button)));
      group.panels.forEach(item => { item.hidden = item !== panel; });
    }

    pendingClicks.set(event, { panel, previous, state, sequence });
  }, true);

  document.addEventListener('click', event => {
    const pending = pendingClicks.get(event);
    if (!pending) return;
    const { panel, previous, state, sequence } = pending;
    pendingClicks.delete(event);
    if (state.sequence !== sequence || !panel.isConnected || panel.hidden || panel === previous) return;
    reveal(panel, state);
  });

  function keepControlVisible(button, controlGroup) {
    if (!controlGroup || controlGroup.scrollWidth <= controlGroup.clientWidth) return;
    const groupBounds = controlGroup.getBoundingClientRect();
    const buttonBounds = button.getBoundingClientRect();
    const left = groupBounds.left + controlGroup.clientLeft;
    const right = left + controlGroup.clientWidth;
    let offset = 0;
    if (buttonBounds.left < left) offset = buttonBounds.left - left;
    else if (buttonBounds.right > right) offset = buttonBounds.right - right;
    // Scroll only this horizontal control group; the page keeps its position.
    if (offset) controlGroup.scrollLeft += offset;
  }

  // Every button stays in the normal Tab order. These optional shortcuts only
  // act when focus is on a selection button inside its own control group.
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const button = controlFrom(event);
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    const group = describe(button);
    if (!group) return;
    const controlGroup = button.closest('[role="group"]');
    const controls = group.controls.filter(control =>
      !control.disabled && control.getAttribute('aria-disabled') !== 'true' &&
      !control.closest('[hidden], [inert]') &&
      (!controlGroup || control.closest('[role="group"]') === controlGroup)
    );
    const current = controls.indexOf(button);
    if (current < 0 || !controls.length) return;
    let next;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = controls.length - 1;
    else {
      const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      next = (current + step + controls.length) % controls.length;
    }
    event.preventDefault();
    controls[next].focus({ preventScroll: true });
    controls[next].click();
    keepControlVisible(controls[next], controlGroup);
  });

  function cancelAll() {
    groups.forEach(state => {
      ++state.sequence;
      cancelAnimation(state);
    });
  }

  if (reducedMotion) {
    const onMotionChange = () => { if (reducedMotion.matches) cancelAll(); };
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionChange);
    else if (reducedMotion.addListener) reducedMotion.addListener(onMotionChange);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAll(); });
  window.addEventListener('beforeprint', cancelAll);
})();
