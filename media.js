// ═══════════════════════════════════════════════════════
// media.js — Stickers, GIFs for Posts & DMs
// ═══════════════════════════════════════════════════════

const GIPHY_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'; // Giphy public beta key

// ── STICKER PACKS ─────────────────────────────────────────────────────────────
const STICKER_PACKS = {
    'Faces':   ['😀','😂','🥹','😍','🤩','😎','🥳','😭','🤔','😤','😴','🤯','🥺','😈','👻','💀'],
    'Hearts':  ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💘','💝','💔','❣️'],
    'Actions': ['👍','👎','👏','🙌','🤝','✌️','🤞','🤙','💪','🫶','🙏','👋','🤜','🎉','🔥','⚡'],
    'Nature':  ['🌸','🌺','🌻','🌹','🌷','🍀','🌿','🍁','🌊','⭐','🌙','☀️','🌈','❄️','🦋','🐾'],
    'Food':    ['🍕','🍔','🍟','🌮','🍜','🍣','🍰','🎂','🍩','🍪','🧃','☕','🍺','🥂','🍭','🍫'],
    'Objects': ['🎮','📱','💻','🎵','🎬','📸','🎨','✏️','📚','🔑','💎','🏆','🎁','🎊','🚀','🌍'],
};

// ── INJECT STYLES ─────────────────────────────────────────────────────────────
(function injectMediaStyles() {
    if (document.getElementById('media-styles')) return;
    const s = document.createElement('style');
    s.id = 'media-styles';
    s.textContent = `
/* ── MEDIA PANEL (bottom sheet) ── */
.media-panel {
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 100%; max-width: 540px;
    background: var(--white); border-top: 1px solid var(--border);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.15);
    z-index: 600; display: flex; flex-direction: column; max-height: 62vh;
    animation: panelUp 0.22s cubic-bezier(.4,0,.2,1);
}
@keyframes panelUp {
    from { transform: translateX(-50%) translateY(100%); opacity: 0; }
    to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
}
.media-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px 10px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.media-panel-title { font-weight: 700; font-size: 0.95rem; color: var(--text); }
.media-panel-close {
    background: var(--bg); border: none; cursor: pointer;
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; color: var(--text-2); transition: background 0.15s;
}
.media-panel-close:hover { background: var(--border); }
.media-panel-tabs {
    display: flex; gap: 4px; padding: 10px 12px 6px;
    flex-shrink: 0; overflow-x: auto;
    scrollbar-width: none;
}
.media-panel-tabs::-webkit-scrollbar { display: none; }
.media-tab {
    background: none; border: none; cursor: pointer;
    padding: 6px 14px; border-radius: 20px; font-size: 0.82rem;
    font-weight: 500; color: var(--text-2); font-family: inherit;
    white-space: nowrap; transition: all 0.15s; flex-shrink: 0;
}
.media-tab.active { background: var(--primary); color: white; }
.media-tab:hover:not(.active) { background: var(--bg); }
.media-panel-body { flex: 1; overflow-y: auto; padding: 8px 12px 24px; }

/* ── STICKER GRID ── */
.sticker-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(54px, 1fr)); gap: 6px;
}
.sticker-btn {
    background: var(--bg); border: 1.5px solid transparent; border-radius: 12px;
    padding: 8px; font-size: 1.9rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; line-height: 1; aspect-ratio: 1;
}
.sticker-btn:hover  { background: var(--primary-light); border-color: var(--primary); transform: scale(1.12); }
.sticker-btn:active { transform: scale(0.95); }

/* ── GIF GRID ── */
.gif-search-wrap { margin-bottom: 10px; position: relative; }
.gif-search-input {
    width: 100%; padding: 9px 14px 9px 38px;
    border: 1.5px solid var(--border); border-radius: 22px;
    font-size: 0.9rem; outline: none; font-family: inherit;
    background: var(--bg); color: var(--text); transition: border 0.2s;
}
.gif-search-input:focus { border-color: var(--primary); background: var(--white); }
.gif-search-icon {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: var(--muted); pointer-events: none;
}
.gif-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.gif-item {
    border-radius: 10px; overflow: hidden; cursor: pointer;
    aspect-ratio: 16/10; background: var(--bg); border: 2px solid transparent; transition: all 0.15s;
}
.gif-item:hover { border-color: var(--primary); transform: scale(1.02); }
.gif-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gif-loading { text-align: center; padding: 30px; color: var(--muted); font-size: 0.88rem; }

/* ── GIF BADGE on feed ── */
.gif-badge {
    position: absolute; bottom: 6px; left: 6px;
    background: rgba(0,0,0,0.7); color: white;
    font-size: 0.6rem; font-weight: 700; letter-spacing: 0.5px;
    padding: 2px 6px; border-radius: 4px; pointer-events: none;
}
.post-gif-wrap { position: relative; display: block; width: 100%; }

/* ── POST STICKER ── */
.post-sticker-wrap {
    padding: 10px 14px; display: flex; align-items: center; justify-content: center;
}
.post-sticker-img {
    max-width: 120px; max-height: 120px;
    object-fit: contain; display: block; cursor: pointer;
}

/* ── DM STICKER / GIF bubbles ── */
.msg-sticker { max-width: 90px; max-height: 90px; border-radius: 8px; display: block; cursor: pointer; object-fit: contain; }
.msg-gif     { max-width: 200px; border-radius: 12px; display: block; cursor: pointer; }
.msg-gif-wrap { position: relative; display: inline-block; }
.msg-gif-badge {
    position: absolute; bottom: 5px; left: 5px;
    background: rgba(0,0,0,0.65); color: white;
    font-size: 0.58rem; font-weight: 700; padding: 1px 5px; border-radius: 4px;
}

/* ── TOOLBAR BUTTONS ── */
.chat-media-btn {
    background: none; border: none; cursor: pointer; color: var(--muted);
    padding: 7px; border-radius: 8px; display: flex; align-items: center;
    justify-content: center; transition: all 0.15s; flex-shrink: 0; font-size: 1.1rem; font-family: inherit;
}
.chat-media-btn:hover { background: var(--bg); color: var(--primary); }
.tool-btn-gif { font-size: 0.72rem; font-weight: 700; }

/* ── PANEL OVERLAY ── */
.media-panel-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.35);
    z-index: 599; backdrop-filter: blur(2px);
}
`;
    document.head.appendChild(s);
})();

// ── PANEL STATE ───────────────────────────────────────────────────────────────
let _mediaMode    = 'post';  // 'post' | 'dm'
let _activePanel  = null;    // 'sticker' | 'gif' | null
let _panelEl      = null;
let _overlayEl    = null;
let _gifSearchTimer = null;

function _openPanel(mode, type) {
    _mediaMode = mode || 'post';
    _closePanel();

    _overlayEl = document.createElement('div');
    _overlayEl.className = 'media-panel-overlay';
    _overlayEl.onclick = _closePanel;
    document.body.appendChild(_overlayEl);

    _panelEl = document.createElement('div');
    _panelEl.className = 'media-panel';
    document.body.appendChild(_panelEl);

    _activePanel = type;
    if (type === 'sticker') _renderStickerPanel();
    else                    _renderGifPanel();
}

function _closePanel() {
    if (_panelEl)   { _panelEl.remove();   _panelEl   = null; }
    if (_overlayEl) { _overlayEl.remove(); _overlayEl = null; }
    _activePanel = null;
}

// ── STICKER PANEL ─────────────────────────────────────────────────────────────
function openStickerPanel(mode) { _openPanel(mode, 'sticker'); }
function closeStickerPanel()    { _closePanel(); }

function _renderStickerPanel() {
    const packNames = Object.keys(STICKER_PACKS);
    _panelEl.innerHTML = `
        <div class="media-panel-header">
            <span class="media-panel-title">🎭 Stickers</span>
            <button class="media-panel-close" onclick="_closePanel()">✕</button>
        </div>
        <div class="media-panel-tabs" id="sticker-pack-tabs">
            ${packNames.map((n, i) =>
                `<button class="media-tab${i === 0 ? ' active' : ''}" onclick="_showStickerPack('${n}', this)">${n}</button>`
            ).join('')}
        </div>
        <div class="media-panel-body"><div class="sticker-grid" id="sticker-grid"></div></div>`;
    _showStickerPack(packNames[0]);
}

function _showStickerPack(packName, tabEl) {
    document.querySelectorAll('#sticker-pack-tabs .media-tab').forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');
    else {
        const first = document.querySelector('#sticker-pack-tabs .media-tab');
        if (first) first.classList.add('active');
    }
    const grid = document.getElementById('sticker-grid');
    if (!grid) return;
    grid.innerHTML = (STICKER_PACKS[packName] || []).map(emoji =>
        `<button class="sticker-btn" onclick="_selectSticker('${emoji}')" title="${emoji}">${emoji}</button>`
    ).join('');
}

function _selectSticker(emoji) {
    // Render emoji to a canvas data URL so it can be stored in Firestore
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = '88px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 68);
    const dataUrl = canvas.toDataURL('image/png');

    if (_mediaMode === 'dm') {
        _closePanel();
        // Send as sticker message in DM
        if (typeof sendStickerDM === 'function') sendStickerDM(dataUrl, emoji + ' Sticker');
    } else {
        // Store for post upload
        window._postSticker = dataUrl;
        window._postGif     = null;
        // Show badge in create form
        if (typeof showPostMediaBadge === 'function') showPostMediaBadge(dataUrl, '🎭 Sticker: ' + emoji);
        _closePanel();
    }
}

// ── GIF PANEL ─────────────────────────────────────────────────────────────────
function openGifPanel(mode) { _openPanel(mode, 'gif'); }
function closeGifPanel()    { _closePanel(); }

function _renderGifPanel() {
    _panelEl.innerHTML = `
        <div class="media-panel-header">
            <span class="media-panel-title">🎞 GIFs</span>
            <button class="media-panel-close" onclick="_closePanel()">✕</button>
        </div>
        <div class="media-panel-body">
            <div class="gif-search-wrap">
                <svg class="gif-search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input class="gif-search-input" id="gif-search-input" placeholder="Search GIFs…" oninput="_onGifSearch(this.value)" autocomplete="off">
            </div>
            <div class="gif-grid" id="gif-grid">
                <div class="gif-loading">🎞 Loading GIFs…</div>
            </div>
        </div>`;

    _loadGifs('trending');
    setTimeout(() => { const inp = document.getElementById('gif-search-input'); if (inp) inp.focus(); }, 150);
}

function _onGifSearch(q) {
    clearTimeout(_gifSearchTimer);
    _gifSearchTimer = setTimeout(() => {
        _loadGifs(q.trim().length > 1 ? 'search' : 'trending', q.trim());
    }, 380);
}

async function _loadGifs(type, query) {
    const grid = document.getElementById('gif-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="gif-loading">Loading…</div>';
    try {
        const url = type === 'search'
            ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
            : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`;

        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Network error');
        const json = await resp.json();
        const gifs = json.data || [];

        if (!gifs.length) { grid.innerHTML = '<div class="gif-loading">No GIFs found 😔</div>'; return; }

        grid.innerHTML = '';
        gifs.forEach(gif => {
            const preview = gif.images?.fixed_width_small?.url || gif.images?.downsized?.url || '';
            const full    = gif.images?.fixed_width?.url       || gif.images?.downsized_medium?.url || preview;
            if (!preview) return;
            const item = document.createElement('div');
            item.className = 'gif-item';
            item.innerHTML = `<img src="${preview}" alt="${escapeHtml(gif.title||'GIF')}" loading="lazy">`;
            item.onclick = () => _selectGif(full);
            grid.appendChild(item);
        });
    } catch (e) {
        grid.innerHTML = '<div class="gif-loading">Could not load GIFs.<br>Check your connection.</div>';
    }
}

function _selectGif(url) {
    if (_mediaMode === 'dm') {
        _closePanel();
        if (typeof sendGifDM === 'function') sendGifDM(url);
    } else {
        window._postGif     = url;
        window._postSticker = null;
        if (typeof showPostMediaBadge === 'function') showPostMediaBadge(url, '🎞 GIF selected');
        _closePanel();
    }
}

// ── INJECT TOOLBAR BUTTONS ────────────────────────────────────────────────────
function _injectCreatePostButtons() {
    const tools = document.querySelector('.create-tools');
    if (!tools || tools.querySelector('[data-media-injected]')) return;
    tools.setAttribute('data-media-injected', '1');

    const stickerBtn = document.createElement('button');
    stickerBtn.type = 'button';
    stickerBtn.className = 'tool-btn';
    stickerBtn.title = 'Add sticker';
    stickerBtn.textContent = '🎭';
    stickerBtn.onclick = () => openStickerPanel('post');
    tools.appendChild(stickerBtn);

    const gifBtn = document.createElement('button');
    gifBtn.type = 'button';
    gifBtn.className = 'tool-btn tool-btn-gif';
    gifBtn.title = 'Add GIF';
    gifBtn.textContent = 'GIF';
    gifBtn.style.fontWeight = '700';
    gifBtn.style.fontSize = '0.75rem';
    gifBtn.onclick = () => openGifPanel('post');
    tools.appendChild(gifBtn);
}

function _injectChatButtons() {
    const bar = document.querySelector('.chat-input-bar');
    if (!bar || bar.querySelector('[data-media-injected]')) return;
    bar.setAttribute('data-media-injected', '1');

    const attach = bar.querySelector('.chat-attach-btn');

    const stickerBtn = document.createElement('button');
    stickerBtn.type = 'button';
    stickerBtn.className = 'chat-media-btn';
    stickerBtn.title = 'Send sticker';
    stickerBtn.textContent = '🎭';
    stickerBtn.onclick = () => openStickerPanel('dm');

    const gifBtn = document.createElement('button');
    gifBtn.type = 'button';
    gifBtn.className = 'chat-media-btn tool-btn-gif';
    gifBtn.title = 'Send GIF';
    gifBtn.textContent = 'GIF';
    gifBtn.style.fontSize = '0.72rem';
    gifBtn.style.fontWeight = '700';
    gifBtn.onclick = () => openGifPanel('dm');

    if (attach) { attach.after(stickerBtn); stickerBtn.after(gifBtn); }
    else        { bar.prepend(gifBtn); bar.prepend(stickerBtn); }
}

// Run after DOM (scripts at end of body, so DOM is ready immediately)
_injectCreatePostButtons();
_injectChatButtons();
// Also guard against any slight timing issue
document.addEventListener('DOMContentLoaded', () => {
    _injectCreatePostButtons();
    _injectChatButtons();
});
