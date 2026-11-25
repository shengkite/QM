(() => {
  'use strict';
  const pages = window.storyPages;
  const root = document.getElementById('storybook');
  const get = id => document.getElementById(id);
  const image = get('book-page'), overlay = get('turning-page');
  const audio = get('page-audio'), continuous = get('continuous');
  let index = 0, busy = false, epoch = 0;
  const src = (i, type) => `assets/storybook/page-${String(i + 1).padStart(2, '0')}.${type}`;
  const status = message => { get('audio-status').textContent = message; };
  const dots = pages.map((page, i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = i + 1;
    button.setAttribute('aria-label', `第 ${i + 1} 頁：${page.title}`);
    button.addEventListener('click', () => changePage(i));
    root.querySelector('.page-dots').appendChild(button);
    return button;
  });
  function update() {
    get('page-count').textContent = `第 ${index + 1} / ${pages.length} 頁`;
    get('page-title').textContent = pages[index].title;
    get('page-transcript').textContent = pages[index].body;
    image.alt = `第 ${index + 1} 頁：${pages[index].title}`;
    get('prev-page').disabled = busy || index === 0;
    get('next-page').disabled = busy || index === pages.length - 1;
    dots.forEach((button, i) => {
      button.disabled = busy;
      if (i === index) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  async function play(token) {
    try {
      await audio.play();
      if (token !== epoch) return;
    } catch {
      if (token === epoch) status('請按播放鍵，繼續本頁朗讀。');
    }
  }
  async function changePage(next, autoplay = false) {
    if (busy || next < 0 || next >= pages.length || next === index) return;
    const shouldPlay = autoplay || !audio.paused;
    const token = ++epoch;
    const previous = index;
    busy = true; audio.pause(); update();
    const preload = new Image(); preload.src = src(next, 'webp');
    try { await preload.decode(); }
    catch { busy = false; update(); status('圖片載入失敗，請再試一次。'); return; }
    overlay.src = src(previous, 'webp'); overlay.hidden = false;
    overlay.className = 'turning-page';
    image.src = src(next, 'webp'); index = next;
    audio.src = src(index, 'mp3'); audio.load(); update();
    status(shouldPlay ? '正在載入本頁旁白…' : '按下播放，聆聽本頁故事。');
    const animation = next > previous ? 'turn-forward' : 'turn-back';
    void overlay.offsetWidth;
    overlay.classList.add(animation);
    if (shouldPlay) void play(token);
    await new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500));
    overlay.hidden = true; overlay.className = 'turning-page'; busy = false; update();
  }
  get('prev-page').addEventListener('click', () => changePage(index - 1));
  get('next-page').addEventListener('click', () => changePage(index + 1));
  root.addEventListener('keydown', event => {
    if (['INPUT','AUDIO','SELECT','TEXTAREA'].includes(event.target.tagName)) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); void changePage(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let start = null;
  get('book-stage').addEventListener('pointerdown', event => {
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    if (event.pointerType !== 'mouse') event.currentTarget.setPointerCapture(event.pointerId);
  });
  get('book-stage').addEventListener('pointerup', event => {
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) void changePage(index + (dx < 0 ? 1 : -1));
  });
  get('book-stage').addEventListener('pointercancel', () => { start = null; });
  audio.addEventListener('play', () => status(`正在朗讀第 ${index + 1} 頁。`));
  audio.addEventListener('pause', () => { if (!busy && !audio.ended) status('朗讀已暫停。'); });
  audio.addEventListener('error', () => status('旁白載入失敗，請重新播放，或下載完整旁白。'));
  audio.addEventListener('ended', () => {
    if (index === pages.length - 1) status('全書朗讀完畢。再翻一次，會發現什麼新問題呢？');
    else if (continuous.checked) void changePage(index + 1, true);
    else status('本頁朗讀完畢，可以繼續翻頁。');
  });
  get('fullscreen-book').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.requestFullscreen) await root.requestFullscreen();
      else window.open(image.src, '_blank', 'noopener');
    } catch { status('此瀏覽器無法使用全螢幕，可開啟原版 PDF 放大閱讀。'); }
  });
  document.addEventListener('fullscreenchange', () => {
    get('fullscreen-book').textContent = document.fullscreenElement ? '結束放大' : '放大閱讀';
  });
  for (let i = 1; i < pages.length; i++) { const prefetch = new Image(); prefetch.src = src(i, 'webp'); }
  update();
})();
