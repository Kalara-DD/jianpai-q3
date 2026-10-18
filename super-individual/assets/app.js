document.querySelectorAll('[data-gallery]').forEach(gallery => {
  gallery.querySelectorAll('[data-show]').forEach(button => {
    button.addEventListener('click', () => {
      gallery.querySelectorAll('[data-show]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
      gallery.querySelectorAll('figure[id]').forEach(figure => { figure.hidden = figure.id !== button.dataset.show; });
    });
  });
});

const dialog = document.getElementById('zoom-dialog');
let zoomTrigger = null;
document.querySelectorAll('[data-zoom]').forEach(button => {
  button.addEventListener('click', () => {
    const img = button.querySelector('img');
    document.getElementById('zoom-image').src = img.src;
    document.getElementById('zoom-image').alt = img.alt;
    document.getElementById('zoom-title').textContent = button.getAttribute('aria-label').replace(/^放大/, '');
    document.getElementById('zoom-caption').textContent = button.closest('figure').querySelector('figcaption').textContent;
    zoomTrigger = button;
    dialog.showModal();
    document.getElementById('close-zoom').focus();
  });
});
document.getElementById('close-zoom').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => { if (zoomTrigger) zoomTrigger.focus(); });

const printButton = document.getElementById('print-button');
if (printButton) printButton.addEventListener('click', () => window.print());
const copyButton = document.getElementById('copy-button');
if (copyButton) copyButton.addEventListener('click', async () => {
  const content = document.getElementById('application-summary');
  const status = document.getElementById('copy-status');
  if (!content || !status) return;
  try {
    if (!navigator.clipboard) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(content.textContent.trim());
    status.textContent = '已复制，可以粘贴到申报表。';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(content);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = '摘要已选中，请使用系统复制快捷键。';
  }
});

// Native buttons keep every reading choice available to keyboard and touch users.
document.querySelectorAll('[data-choice-group]').forEach(group => {
  group.querySelectorAll('[data-select]').forEach(button => {
    button.addEventListener('click', () => {
      group.querySelectorAll('[data-select]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
      group.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== button.dataset.select; });
    });
  });
});

const progress = document.getElementById('reading-progress');
let readingFrame = 0;
function updateReading() {
  readingFrame = 0;
  const total = document.documentElement.scrollHeight - innerHeight;
  if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, total ? scrollY / total : 0))})`;
  let current = '';
  document.querySelectorAll('main > section[id]').forEach(section => {
    if (section.getBoundingClientRect().top <= 160) current = section.id;
  });
  document.querySelectorAll('nav a[href^="#"]').forEach(link => {
    if (link.hash === '#' + current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
function queueReading() { if (!readingFrame) readingFrame = requestAnimationFrame(updateReading); }
addEventListener('scroll', queueReading, {passive:true});
addEventListener('resize', queueReading);
updateReading();

const playerButton = document.getElementById('animation-toggle');
const frameSlider = document.getElementById('animation-frame');
const playerStatus = document.getElementById('animation-status');
let characterAnimation = null;
let animationReady = null;
let characterPlaying = false;
let animationInView = false;
let animationManualPause = false;
const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotionEnabled = Boolean(prefersReducedMotion?.matches);
function showPlayerState(playing, message) {
  characterPlaying = playing;
  playerButton.innerHTML = playing ? '暂停动效 <span aria-hidden="true">Ⅱ</span>' : '播放动效 <span aria-hidden="true">▶</span>';
  playerStatus.textContent = message;
}
function initCharacter() {
  if (animationReady) return animationReady;
  animationReady = new Promise((resolve, reject) => {
    try {
      if (!window.lottie || !window.PAGE11_CHARACTER_ANIMATION) throw new Error('Animation resource unavailable');
      characterAnimation = lottie.loadAnimation({container:document.getElementById('lottie-container'),renderer:'svg',loop:true,autoplay:false,animationData:JSON.parse(JSON.stringify(window.PAGE11_CHARACTER_ANIMATION)),rendererSettings:{preserveAspectRatio:'xMidYMid meet'}});
      const ready = () => {
        document.getElementById('animation-poster').hidden = true;
        characterAnimation.goToAndStop(Number(frameSlider.value),true);
        resolve(characterAnimation);
      };
      if (characterAnimation.isLoaded) ready();
      else characterAnimation.addEventListener('DOMLoaded', ready);
      characterAnimation.addEventListener('data_failed', () => reject(new Error('Animation failed')));
      characterAnimation.addEventListener('enterFrame', () => {
        const frame = Math.min(149, Math.max(0, Math.round(characterAnimation.currentFrame)));
        frameSlider.value = String(frame);
        document.getElementById('animation-time').textContent = `${(frame / 30).toFixed(1)} / 5.0 s`;
        frameSlider.setAttribute('aria-valuetext', `${(frame/30).toFixed(1)}秒，共5秒`);
      });
    } catch (error) { reject(error); }
  }).catch(error => {
    console.error('[lottie] unable to initialize enter3.3', error);
    document.getElementById('animation-poster').hidden = false;
    playerStatus.textContent = '当前环境无法播放，可查看静态画面与完整交付证据。';
    return null;
  });
  return animationReady;
}
function pauseCharacter(message, manual = false) {
  if (manual) animationManualPause = true;
  if (characterAnimation && characterPlaying) {
    characterAnimation.pause();
    showPlayerState(false,message || '已暂停，可拖动进度查看姿态');
  }
}
playerButton.addEventListener('click', async () => {
  const animation = await initCharacter();
  if (!animation) return;
  if (characterPlaying) pauseCharacter(undefined, true);
  else { animationManualPause = false; animation.play(); showPlayerState(true,'正在播放已批准的角色动效'); }
});
document.getElementById('animation-reset').addEventListener('click', async () => {
  const animation = await initCharacter();
  if (!animation) return;
  animationManualPause = false;
  animation.goToAndPlay(0,true); showPlayerState(true,'从头播放完整 5 秒动作');
});
frameSlider.addEventListener('input', async () => {
  const targetFrame = Number(frameSlider.value);
  const animation = await initCharacter();
  if (!animation) return;
  animationManualPause = true;
  animation.goToAndStop(targetFrame,true);
  showPlayerState(false,'已定位到指定姿态，可继续播放');
});
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    const entry = entries[0];
    animationInView = entry.isIntersecting;
    if (!entry.isIntersecting) {
      pauseCharacter('离开预览区域，动效已暂停');
      return;
    }
    // Start the approved Lottie when its preview enters the reading area so the
    // motion is visible without requiring a second click. Respect reduced motion.
    if (!prefersReducedMotion?.matches) {
      initCharacter().then(animation => {
        if (!animation || characterPlaying || animationManualPause || !animationInView) return;
        animation.play();
        showPlayerState(true, '正在播放已批准的角色动效');
      });
    }
  }, {threshold:0.15}).observe(document.getElementById('animation-view'));
}
// Initialize once on page load as well as on viewport entry. This avoids a
// static poster when the section is already visible or the browser delays the
// first IntersectionObserver callback.
if (reducedMotionEnabled) {
  playerStatus.textContent = '系统已开启减少动态，点击“播放动效”可查看完整动作';
} else {
  initCharacter().then(animation => {
    if (!animation || animationManualPause) return;
    animation.play();
    showPlayerState(true, '正在播放已批准的角色动效');
  });
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseCharacter('页面进入后台，动效已暂停'); });
let printDetailsState = null;
addEventListener('beforeprint', () => {
  if (!printDetailsState) printDetailsState = Array.from(document.querySelectorAll('details'), detail => [detail, detail.open]);
  printDetailsState.forEach(([detail]) => { detail.open = true; });
  pauseCharacter('打印时动效已暂停');
  document.getElementById('animation-poster').hidden = false;
});
addEventListener('afterprint', () => {
  if (printDetailsState) printDetailsState.forEach(([detail, open]) => { detail.open = open; });
  printDetailsState = null;
  if (characterAnimation?.isLoaded) document.getElementById('animation-poster').hidden = true;
});
