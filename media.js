// ═══════════════════════════════════════════════════════════════
// media.js — Stickers & GIFs for Posts and DMs
// GIFs: Giphy public beta (working). Stickers: canvas-rendered emoji.
// ═══════════════════════════════════════════════════════════════

const GIPHY_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';

const STICKER_PACKS = {
    'Faces':   ['😀','😂','🥹','😍','🤩','😎','🥳','😭','🤔','😤','😴','🤯','🥺','😈','👻','💀'],
    'Hearts':  ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💘','💝','💔','❣️'],
    'Actions': ['👍','👎','👏','🙌','🤝','✌️','🤞','🤙','💪','🫶','🙏','👋','🤜','🎉','🔥','⚡'],
    'Nature':  ['🌸','🌺','🌻','🌹','🌷','🍀','🌿','🍁','🌊','⭐','🌙','☀️','🌈','❄️','🦋','🐾'],
    'Food':    ['🍕','🍔','🍟','🌮','🍜','🍣','🍰','🎂','🍩','🍪','🧃','☕','🍺','🥂','🍭','🍫'],
    'Objects': ['🎮','📱','💻','🎵','🎬','📸','🎨','✏️','📚','🔑','💎','🏆','🎁','🎊','🚀','🌍'],
};

// ── STYLES ────────────────────────────────────────────────────────────────────
(function () {
    if (document.getElementById('media-styles')) return;
    const s = document.createElement('style');
    s.id = 'media-styles';
    s.textContent = `
.media-panel {
    position:fixed; bottom:0; left:50%; transform:translateX(-50%);
    width:100%; max-width:540px;
    background:var(--white); border-top:1px solid var(--border);
    border-radius:20px 20px 0 0; box-shadow:0 -8px 40px rgba(0,0,0,.15);
    z-index:700; display:flex; flex-direction:column; max-height:62vh;
    animation:panelUp .22s cubic-bezier(.4,0,.2,1);
}
@keyframes panelUp { from{transform:translateX(-50%) translateY(100%);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }

.media-panel-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 16px 10px; border-bottom:1px solid var(--border); flex-shrink:0;
}
.media-panel-title { font-weight:700; font-size:.95rem; color:var(--text); }
.media-panel-close {
    background:var(--bg); border:none; cursor:pointer;
    width:30px; height:30px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:1rem; color:var(--text-2); transition:background .15s;
}
.media-panel-close:hover { background:var(--border); }

.media-panel-tabs {
    display:flex; gap:4px; padding:10px 12px 6px;
    flex-shrink:0; overflow-x:auto; scrollbar-width:none;
}
.media-panel-tabs::-webkit-scrollbar { display:none; }
.media-tab {
    background:none; border:none; cursor:pointer;
    padding:6px 14px; border-radius:20px; font-size:.82rem;
    font-weight:500; color:var(--text-2); font-family:inherit;
    white-space:nowrap; transition:all .15s; flex-shrink:0;
}
.media-tab.active { background:var(--primary); color:white; }
.media-tab:hover:not(.active) { background:var(--bg); }
.media-panel-body { flex:1; overflow-y:auto; padding:8px 12px 24px; }

.sticker-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(54px,1fr)); gap:6px; }
.sticker-btn {
    background:var(--bg); border:1.5px solid transparent; border-radius:12px;
    padding:8px; font-size:1.9rem; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:all .15s; line-height:1; aspect-ratio:1;
}
.sticker-btn:hover  { background:var(--primary-light); border-color:var(--primary); transform:scale(1.12); }
.sticker-btn:active { transform:scale(.95); }

.gif-search-wrap { margin-bottom:10px; position:relative; }
.gif-search-input {
    width:100%; padding:9px 14px 9px 38px;
    border:1.5px solid var(--border); border-radius:22px;
    font-size:.9rem; outline:none; font-family:inherit;
    background:var(--bg); color:var(--text); transition:border .2s;
}
.gif-search-input:focus { border-color:var(--primary); background:var(--white); }
.gif-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--muted); pointer-events:none; }
.gif-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:6px; }
.gif-item {
    border-radius:10px; overflow:hidden; cursor:pointer;
    aspect-ratio:16/10; background:var(--bg); border:2px solid transparent; transition:all .15s;
}
.gif-item:hover { border-color:var(--primary); transform:scale(1.02); }
.gif-item img { width:100%; height:100%; object-fit:cover; display:block; }
.gif-loading { text-align:center; padding:30px; color:var(--muted); font-size:.88rem; }

.gif-badge {
    position:absolute; bottom:6px; left:6px;
    background:rgba(0,0,0,.65); color:white;
    font-size:.6rem; font-weight:700; letter-spacing:.5px;
    padding:2px 6px; border-radius:4px; pointer-events:none;
}
.post-gif-wrap { position:relative; display:block; }
.post-sticker-wrap { padding:10px 14px; display:flex; align-items:center; justify-content:center; }
.post-sticker-img { max-width:120px; max-height:120px; object-fit:contain; display:block; cursor:pointer; filter:drop-shadow(0 2px 8px rgba(0,0,0,.15)); }

.msg-sticker { max-width:90px; max-height:90px; border-radius:8px; display:block; cursor:pointer; object-fit:contain; }
.msg-gif     { max-width:200px; border-radius:12px; display:block; cursor:pointer; }
.msg-gif-wrap { position:relative; display:inline-block; }
.msg-gif-badge { position:absolute; bottom:5px; left:5px; background:rgba(0,0,0,.65); color:white; font-size:.58rem; font-weight:700; padding:1px 5px; border-radius:4px; }

.chat-media-btn {
    background:none; border:none; cursor:pointer; color:var(--muted);
    padding:7px; border-radius:8px; display:flex; align-items:center;
    justify-content:center; transition:all .15s; flex-shrink:0;
    font-size:1.1rem; font-family:inherit;
}
.chat-media-btn:hover { background:var(--bg); color:var(--primary); }

.media-panel-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:699; backdrop-filter:blur(2px); }

/* Create post media badge */
.post-media-badge {
    display:flex; align-items:center; gap:10px;
    padding:10px 14px; background:var(--primary-light);
    border-radius:12px; margin-bottom:10px; border:1.5px solid var(--primary);
}
.post-media-badge img { height:48px; max-width:80px; border-radius:8px; object-fit:contain; background:#fff; }
.post-media-badge span { font-size:.85rem; color:var(--primary); font-weight:600; flex:1; }
.post-media-badge button { background:none; border:none; cursor:pointer; color:var(--primary); font-size:1.2rem; }
`;
    document.head.appendChild(s);
})();

// ── PANEL STATE ───────────────────────────────────────────────────────────────
let _mediaMode = 'post';
let _panelEl   = null;
let _overlayEl = null;
let _gifTimer  = null;

function _closePanel() {
    if (_panelEl)   { _panelEl.remove();   _panelEl   = null; }
    if (_overlayEl) { _overlayEl.remove(); _overlayEl = null; }
}

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

    if (type === 'sticker') _renderStickerPanel();
    else                    _renderGifPanel();
}

// ── STICKER PANEL ─────────────────────────────────────────────────────────────
function openStickerPanel(mode) { _openPanel(mode, 'sticker'); }
function closeStickerPanel()    { _closePanel(); }

function _renderStickerPanel() {
    const packs = Object.keys(STICKER_PACKS);
    _panelEl.innerHTML = `
        <div class="media-panel-header">
            <span class="media-panel-title">🎭 Stickers</span>
            <button class="media-panel-close" onclick="_closePanel()">✕</button>
        </div>
        <div class="media-panel-tabs" id="sticker-tabs">
            ${packs.map((n,i)=>`<button class="media-tab${i===0?' active':''}" onclick="_showPack('${n}',this)">${n}</button>`).join('')}
        </div>
        <div class="media-panel-body"><div class="sticker-grid" id="sticker-grid"></div></div>`;
    _showPack(packs[0]);
}

function _showPack(name, tabEl) {
    document.querySelectorAll('#sticker-tabs .media-tab').forEach(t=>t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');
    else { const f=document.querySelector('#sticker-tabs .media-tab'); if(f) f.classList.add('active'); }
    const grid = document.getElementById('sticker-grid'); if (!grid) return;
    grid.innerHTML = (STICKER_PACKS[name]||[]).map(e=>`<button class="sticker-btn" onclick="_selectSticker('${e}')">${e}</button>`).join('');
}
window._showPack = _showPack;

function _selectSticker(emoji) {
    // Render emoji to a canvas so we have a proper data URL (works offline, stores in Firestore)
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = '90px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 70);
    const dataUrl = canvas.toDataURL('image/png');

    if (_mediaMode === 'dm') {
        _closePanel();
        if (typeof sendStickerDM === 'function') sendStickerDM(dataUrl, emoji + ' Sticker');
    } else {
        window._postSticker = dataUrl;
        window._postGif     = null;
        if (typeof showPostMediaBadge === 'function') showPostMediaBadge(dataUrl, '🎭 Sticker: ' + emoji);
        _closePanel();
    }
}
window._selectSticker = _selectSticker;

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
                <svg class="gif-search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input class="gif-search-input" id="gif-search-input" placeholder="Search GIFs…" oninput="_onGifSearch(this.value)" autocomplete="off">
            </div>
            <div class="gif-grid" id="gif-grid"><div class="gif-loading">🎞 Loading trending GIFs…</div></div>
        </div>`;
    _loadGifs('trending');
    setTimeout(() => { const i=document.getElementById('gif-search-input'); if(i) i.focus(); }, 150);
}

window._onGifSearch = function(q) {
    clearTimeout(_gifTimer);
    _gifTimer = setTimeout(() => _loadGifs(q.trim().length>1?'search':'trending', q.trim()), 380);
};

async function _loadGifs(type, query) {
    const grid = document.getElementById('gif-grid'); if (!grid) return;
    grid.innerHTML = '<div class="gif-loading">Loading…</div>';
    try {
        const url = type === 'search'
            ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
            : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`;
        const res  = await fetch(url);
        if (!res.ok) throw new Error('Giphy error ' + res.status);
        const json = await res.json();
        const gifs = json.data || [];
        if (!gifs.length) { grid.innerHTML = '<div class="gif-loading">No GIFs found 😔</div>'; return; }
        grid.innerHTML = '';
        gifs.forEach(gif => {
            const preview = gif.images?.fixed_width_small?.url || gif.images?.downsized?.url || '';
            const full    = gif.images?.fixed_width?.url || gif.images?.downsized_medium?.url || preview;
            if (!preview) return;
            const item = document.createElement('div');
            item.className = 'gif-item';
            item.innerHTML = `<img src="${preview}" alt="${escapeHtml(gif.title||'GIF')}" loading="lazy">`;
            item.onclick = () => _selectGif(full);
            grid.appendChild(item);
        });
    } catch(e) {
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
        // Show a preview badge — we use the URL directly as preview src
        if (typeof showPostMediaBadge === 'function') showPostMediaBadge(url, '🎞 GIF selected');
        _closePanel();
    }
}

// ── INJECT TOOLBAR BUTTONS ────────────────────────────────────────────────────
function _injectCreateButtons() {
    const tools = document.querySelector('.create-tools');
    if (!tools || tools.querySelector('[data-media-inject]')) return;
    tools.setAttribute('data-media-inject','1');

    const sb = document.createElement('button');
    sb.type='button'; sb.className='tool-btn'; sb.title='Add sticker'; sb.textContent='🎭';
    sb.onclick = () => openStickerPanel('post');
    tools.appendChild(sb);

    const gb = document.createElement('button');
    gb.type='button'; gb.className='tool-btn'; gb.title='Add GIF';
    gb.style.cssText='font-size:.75rem;font-weight:700;color:var(--primary)';
    gb.textContent='GIF';
    gb.onclick = () => openGifPanel('post');
    tools.appendChild(gb);
}

function _injectChatButtons() {
    const bar = document.querySelector('.chat-input-bar');
    if (!bar || bar.querySelector('[data-media-inject]')) return;
    bar.setAttribute('data-media-inject','1');
    const attach = bar.querySelector('.chat-attach-btn');

    const sb = document.createElement('button');
    sb.type='button'; sb.className='chat-media-btn'; sb.title='Send sticker'; sb.textContent='🎭';
    sb.onclick = () => openStickerPanel('dm');

    const gb = document.createElement('button');
    gb.type='button'; gb.className='chat-media-btn'; gb.title='Send GIF';
    gb.style.cssText='font-size:.72rem;font-weight:700';
    gb.textContent='GIF';
    gb.onclick = () => openGifPanel('dm');

    if (attach) { attach.after(sb); sb.after(gb); }
    else        { bar.prepend(gb); bar.prepend(sb); }
}

// Run immediately (scripts are at end of body)
_injectCreateButtons();
_injectChatButtons();
document.addEventListener('DOMContentLoaded', () => { _injectCreateButtons(); _injectChatButtons(); });
