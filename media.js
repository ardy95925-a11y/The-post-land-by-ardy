// ═══════════════════════════════════════════════════════
// media.js — Stickers, GIFs, Emoji for posts & DMs
// ═══════════════════════════════════════════════════════

// Using Tenor API (free) for GIFs
// Stickers are built-in emoji/art sets — no API needed

const TENOR_KEY = 'AIzaSyDHD8A6I7hqECe5mg1XBb39HcFIu0tyB4c'; // reuse project key placeholder
// We'll use Giphy's public beta key which is always free for demos
const GIPHY_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'; // public beta key

// ── STICKER PACKS ─────────────────────────────────────────────────────────────
const STICKER_PACKS = {
    'Faces': ['😀','😂','🥹','😍','🤩','😎','🥳','😭','🤔','😤','😴','🤯','🥺','😈','👻','💀'],
    'Hearts': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💘','💝','💔','❣️'],
    'Actions': ['👍','👎','👏','🙌','🤝','✌️','🤞','🤙','💪','🫶','🙏','👋','🤜','🎉','🔥','⚡'],
    'Nature': ['🌸','🌺','🌻','🌹','🌷','🍀','🌿','🍁','🌊','⭐','🌙','☀️','🌈','❄️','🦋','🐾'],
    'Food': ['🍕','🍔','🍟','🌮','🍜','🍣','🍰','🎂','🍩','🍪','🧃','☕','🍺','🥂','🍭','🍫'],
    'Objects': ['🎮','📱','💻','🎵','🎬','📸','🎨','✏️','📚','🔑','💎','🏆','🎁','🎊','🚀','🌍'],
};

// ── INJECT STYLES ─────────────────────────────────────────────────────────────
const mediaStyles = `
/* ── STICKER / GIF PANEL ── */
.media-panel {
    position: fixed;
    bottom: 0; left: 50%;
    transform: translateX(-50%);
    width: 100%; max-width: 540px;
    background: var(--white);
    border-top: 1px solid var(--border);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 32px rgba(0,0,0,0.12);
    z-index: 500;
    display: flex; flex-direction: column;
    max-height: 60vh;
    animation: panelUp 0.22s ease;
}
@keyframes panelUp { from { transform:translateX(-50%) translateY(100%); } to { transform:translateX(-50%) translateY(0); } }

.media-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}
.media-panel-title { font-weight: 700; font-size: 0.95rem; }
.media-panel-close {
    background: var(--bg); border: none; cursor: pointer;
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; color: var(--text-2);
}
.media-panel-close:hover { background: var(--border); }

.media-panel-tabs {
    display: flex; gap: 4px; padding: 10px 12px 0;
    flex-shrink: 0; overflow-x: auto;
}
.media-tab {
    background: none; border: none; cursor: pointer;
    padding: 6px 14px; border-radius: 20px; font-size: 0.82rem;
    font-weight: 500; color: var(--text-2); font-family: inherit;
    white-space: nowrap; transition: all 0.15s;
}
.media-tab.active { background: var(--primary); color: white; }
.media-tab:hover:not(.active) { background: var(--bg); }

.media-panel-body {
    flex: 1; overflow-y: auto; padding: 10px 12px 20px;
}

.sticker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
    gap: 6px;
}
.sticker-btn {
    background: var(--bg); border: 1.5px solid transparent; border-radius: 12px;
    padding: 8px; font-size: 1.8rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; line-height: 1; aspect-ratio: 1;
}
.sticker-btn:hover { background: var(--primary-light); border-color: var(--primary); transform: scale(1.1); }
.sticker-btn:active { transform: scale(0.95); }

/* GIF grid */
.gif-search-wrap {
    margin-bottom: 10px;
    position: relative;
}
.gif-search-input {
    width: 100%; padding: 9px 14px 9px 36px;
    border: 1.5px solid var(--border); border-radius: 22px;
    font-size: 0.9rem; outline: none; font-family: inherit;
    background: var(--bg); color: var(--text);
    transition: border 0.2s;
}
.gif-search-input:focus { border-color: var(--primary); background: var(--white); }
.gif-search-icon {
    position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
    color: var(--muted); pointer-events: none;
}
.gif-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
}
.gif-item {
    border-radius: 10px; overflow: hidden; cursor: pointer;
    aspect-ratio: 16/10; background: var(--bg);
    border: 2px solid transparent;
    transition: all 0.15s;
}
.gif-item:hover { border-color: var(--primary); transform: scale(1.02); }
.gif-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gif-loading { text-align: center; padding: 30px; color: var(--muted); font-size: 0.88rem; }
.gif-badge {
    position: absolute; bottom: 5px; left: 5px;
    background: rgba(0,0,0,0.7); color: white;
    font-size: 0.6rem; font-weight: 700; padding: 1px 5px;
    border-radius: 4px; pointer-events: none;
}
.msg-gif-badge {
    bottom: 8px; left: 8px;
}

/* Post sticker/gif display */
.post-sticker-wrap { padding: 8px 14px; }
.post-sticker { font-size: 3rem; line-height: 1; display: block; }
.post-gif-wrap { position: relative; display: inline-block; width: 100%; }

/* DM sticker/gif bubbles */
.msg-sticker { max-width: 100px; border-radius: 8px; display: block; cursor: pointer; }
.msg-gif { max-width: 200px; }

/* Chat toolbar sticker/gif buttons */
.chat-media-btn {
    background: none; border: none; cursor: pointer; color: var(--muted);
    padding: 7px; border-radius: 8px; display: flex; align-items: center;
    transition: all 0.15s; flex-shrink: 0; font-size: 1.1rem;
}
.chat-media-btn:hover { background: var(--bg); color: var(--primary); }

/* Post toolbar sticker/gif buttons */
.tool-btn.sticker-tool { font-size: 1rem; }

/* Panel overlay */
.media-panel-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.3);
    z-index: 499; backdrop-filter: blur(2px);
}

/* Selected media preview in create */
#post-gif-preview, #post-sticker-preview {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; background: var(--primary-light);
    border-radius: 10px; margin-bottom: 8px;
    font-size: 0.85rem; color: var(--primary);
}
#post-gif-preview img { height: 40px; border-radius: 6px; }
`;

(function injectMediaStyles() {
    const s = document.createElement('style');
    s.id = 'media-styles';
    s.textContent = mediaStyles;
    document.head.appendChild(s);
})();

// ── STICKER PANEL ─────────────────────────────────────────────────────────────
let _stickerMode = 'post'; // 'post' or 'dm'
let _stickerOverlay = null;
let _stickerPanel = null;

function openStickerPanel(mode) {
    _stickerMode = mode || 'post';
    closeStickerPanel();
    closeGifPanel();

    _stickerOverlay = document.createElement('div');
    _stickerOverlay.className = 'media-panel-overlay';
    _stickerOverlay.onclick = closeStickerPanel;
    document.body.appendChild(_stickerOverlay);

    _stickerPanel = document.createElement('div');
    _stickerPanel.className = 'media-panel';
    _stickerPanel.id = 'sticker-panel';

    const packNames = Object.keys(STICKER_PACKS);

    _stickerPanel.innerHTML = `
        <div class="media-panel-header">
            <span class="media-panel-title">🎭 Stickers</span>
            <button class="media-panel-close" onclick="closeStickerPanel()">✕</button>
        </div>
        <div class="media-panel-tabs" id="sticker-pack-tabs">
            ${packNames.map((name, i) => `<button class="media-tab${i===0?' active':''}" onclick="showStickerPack('${name}', this)">${name}</button>`).join('')}
        </div>
        <div class="media-panel-body">
            <div class="sticker-grid" id="sticker-grid"></div>
        </div>`;

    document.body.appendChild(_stickerPanel);
    showStickerPack(packNames[0], _stickerPanel.querySelector('.media-tab'));
}

function showStickerPack(packName, tabEl) {
    // Update active tab
    document.querySelectorAll('#sticker-pack-tabs .media-tab').forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');

    const grid = document.getElementById('sticker-grid');
    if (!grid) return;
    const stickers = STICKER_PACKS[packName] || [];
    grid.innerHTML = stickers.map(s =>
        `<button class="sticker-btn" onclick="selectSticker('${s}')" title="${s}">${s}</button>`
    ).join('');
}

function selectSticker(emoji) {
    if (_stickerMode === 'dm') {
        sendStickerDM(emojiToDataUrl(emoji), emoji + ' Sticker');
    } else {
        // Post mode: set a preview
        window._postSticker = emojiToDataUrl(emoji);
        window._postGif = null;
        // Remove image if any
        removeImage();
        // Show preview
        showPostMediaPreview('sticker', emoji);
        closeStickerPanel();
    }
}

function emojiToDataUrl(emoji) {
    // Render emoji to canvas as "sticker"
    const canvas = document.createElement('canvas');
    canvas.width = 120; canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.font = '80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 60, 64);
    return canvas.toDataURL('image/png');
}

function closeStickerPanel() {
    if (_stickerPanel) { _stickerPanel.remove(); _stickerPanel = null; }
    if (_stickerOverlay) { _stickerOverlay.remove(); _stickerOverlay = null; }
}

// ── GIF PANEL ─────────────────────────────────────────────────────────────────
let _gifMode = 'post';
let _gifOverlay = null;
let _gifPanel = null;
let _gifSearchTimer = null;

function openGifPanel(mode) {
    _gifMode = mode || 'post';
    closeGifPanel();
    closeStickerPanel();

    _gifOverlay = document.createElement('div');
    _gifOverlay.className = 'media-panel-overlay';
    _gifOverlay.onclick = closeGifPanel;
    document.body.appendChild(_gifOverlay);

    _gifPanel = document.createElement('div');
    _gifPanel.className = 'media-panel';
    _gifPanel.id = 'gif-panel';
    _gifPanel.innerHTML = `
        <div class="media-panel-header">
            <span class="media-panel-title">🎞 GIFs</span>
            <button class="media-panel-close" onclick="closeGifPanel()">✕</button>
        </div>
        <div class="media-panel-body">
            <div class="gif-search-wrap">
                <svg class="gif-search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input class="gif-search-input" id="gif-search-input" placeholder="Search GIFs…" oninput="onGifSearch(this.value)">
            </div>
            <div class="gif-grid" id="gif-grid"><div class="gif-loading">🎞 Loading trending GIFs…</div></div>
        </div>`;

    document.body.appendChild(_gifPanel);
    loadGifs('trending');
    setTimeout(() => {
        const inp = document.getElementById('gif-search-input');
        if (inp) inp.focus();
    }, 200);
}

function onGifSearch(query) {
    clearTimeout(_gifSearchTimer);
    _gifSearchTimer = setTimeout(() => {
        if (query.trim().length > 1) {
            loadGifs('search', query.trim());
        } else {
            loadGifs('trending');
        }
    }, 400);
}

async function loadGifs(type, query) {
    const grid = document.getElementById('gif-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="gif-loading">Loading…</div>';

    try {
        let url;
        if (type === 'search') {
            url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`;
        } else {
            url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`;
        }

        const resp = await fetch(url);
        const json = await resp.json();
        const gifs = json.data || [];

        if (!gifs.length) {
            grid.innerHTML = '<div class="gif-loading">No GIFs found 😔</div>';
            return;
        }

        grid.innerHTML = '';
        gifs.forEach(gif => {
            const preview = gif.images?.fixed_width_small?.url || gif.images?.downsized?.url || '';
            const full    = gif.images?.fixed_width?.url || gif.images?.downsized_medium?.url || preview;
            if (!preview) return;

            const item = document.createElement('div');
            item.className = 'gif-item';
            item.innerHTML = `<img src="${preview}" alt="${escapeHtml(gif.title)}" loading="lazy">`;
            item.onclick = () => selectGif(full);
            grid.appendChild(item);
        });
    } catch (e) {
        grid.innerHTML = '<div class="gif-loading">Could not load GIFs. Check your connection.</div>';
    }
}

function selectGif(url) {
    if (_gifMode === 'dm') {
        sendGifDM(url);
    } else {
        window._postGif = url;
        window._postSticker = null;
        removeImage();
        showPostMediaPreview('gif', url);
        closeGifPanel();
    }
}

function closeGifPanel() {
    if (_gifPanel) { _gifPanel.remove(); _gifPanel = null; }
    if (_gifOverlay) { _gifOverlay.remove(); _gifOverlay = null; }
}

// ── POST MEDIA PREVIEW ────────────────────────────────────────────────────────
function showPostMediaPreview(type, data) {
    // Remove old previews
    const old = document.getElementById('post-media-badge');
    if (old) old.remove();

    const badge = document.createElement('div');
    badge.id = 'post-media-badge';
    if (type === 'gif') {
        badge.innerHTML = `<img src="${data}" alt="GIF"> <span>GIF selected</span> <button onclick="clearPostMedia()" style="margin-left:auto;background:none;border:none;cursor:pointer;color:inherit">✕</button>`;
    } else {
        badge.innerHTML = `<span style="font-size:1.5rem">${data}</span> <span>Sticker selected</span> <button onclick="clearPostMedia()" style="margin-left:auto;background:none;border:none;cursor:pointer;color:inherit">✕</button>`;
    }
    badge.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--primary-light);border-radius:10px;margin-bottom:8px;font-size:0.85rem;color:var(--primary);';

    const imagePreviewWrap = document.getElementById('image-preview-wrap');
    imagePreviewWrap.parentNode.insertBefore(badge, imagePreviewWrap);
}

function clearPostMedia() {
    window._postGif = null;
    window._postSticker = null;
    const old = document.getElementById('post-media-badge');
    if (old) old.remove();
}

// ── INJECT BUTTONS INTO UI ────────────────────────────────────────────────────
// Run after DOM is ready — add sticker/GIF buttons to create post toolbar and chat input bar

document.addEventListener('DOMContentLoaded', function() {
    injectCreatePostButtons();
    injectChatButtons();
});

// Also run immediately in case DOMContentLoaded already fired
if (document.readyState !== 'loading') {
    setTimeout(() => {
        injectCreatePostButtons();
        injectChatButtons();
    }, 0);
}

function injectCreatePostButtons() {
    const tools = document.querySelector('.create-tools');
    if (!tools || tools.querySelector('.sticker-tool')) return;

    // Sticker button
    const stickerBtn = document.createElement('button');
    stickerBtn.className = 'tool-btn sticker-tool';
    stickerBtn.title = 'Add sticker';
    stickerBtn.type = 'button';
    stickerBtn.innerHTML = '🎭';
    stickerBtn.onclick = () => openStickerPanel('post');
    tools.appendChild(stickerBtn);

    // GIF button
    const gifBtn = document.createElement('button');
    gifBtn.className = 'tool-btn';
    gifBtn.title = 'Add GIF';
    gifBtn.type = 'button';
    gifBtn.innerHTML = '<span style="font-size:0.75rem;font-weight:700;color:var(--primary)">GIF</span>';
    gifBtn.onclick = () => openGifPanel('post');
    tools.appendChild(gifBtn);
}

function injectChatButtons() {
    const inputBar = document.querySelector('.chat-input-bar');
    if (!inputBar || inputBar.querySelector('.chat-media-btn')) return;

    const attachBtn = inputBar.querySelector('.chat-attach-btn');

    // Sticker button
    const stickerBtn = document.createElement('button');
    stickerBtn.className = 'chat-media-btn';
    stickerBtn.title = 'Send sticker';
    stickerBtn.type = 'button';
    stickerBtn.innerHTML = '🎭';
    stickerBtn.onclick = () => openStickerPanel('dm');

    // GIF button
    const gifBtn = document.createElement('button');
    gifBtn.className = 'chat-media-btn';
    gifBtn.title = 'Send GIF';
    gifBtn.type = 'button';
    gifBtn.innerHTML = '<span style="font-size:0.72rem;font-weight:700">GIF</span>';
    gifBtn.onclick = () => openGifPanel('dm');

    if (attachBtn) {
        attachBtn.after(stickerBtn);
        stickerBtn.after(gifBtn);
    } else {
        inputBar.prepend(gifBtn);
        inputBar.prepend(stickerBtn);
    }
}
