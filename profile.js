// ═══════════════════════════════════════════════════════════════
// profile.js — Profile Customisation: avatar, bio, banner, animations
// ═══════════════════════════════════════════════════════════════

(function () {

// ── INJECT STYLES ─────────────────────────────────────────────────────────────
const s = document.createElement('style');
s.id = 'profile-custom-styles';
s.textContent = `
/* ── ANIMATED AVATAR KEYFRAMES ── */
@keyframes avatarPulse   { 0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.6)} 50%{box-shadow:0 0 0 12px rgba(59,130,246,0)} }
@keyframes avatarSpin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes avatarBounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes avatarGlow    { 0%,100%{filter:drop-shadow(0 0 4px rgba(59,130,246,.8))} 50%{filter:drop-shadow(0 0 18px rgba(139,92,246,.9))} }
@keyframes avatarRainbow { 0%{background:linear-gradient(135deg,#ef4444,#f97316)} 25%{background:linear-gradient(135deg,#22c55e,#3b82f6)} 50%{background:linear-gradient(135deg,#8b5cf6,#ec4899)} 75%{background:linear-gradient(135deg,#f59e0b,#ef4444)} 100%{background:linear-gradient(135deg,#ef4444,#f97316)} }
@keyframes fadeIn        { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }

/* ── PROFILE CARD ── */
.profile-card { position:relative; overflow:visible; }

/* Banner */
.profile-banner {
    height: 100px; border-radius: var(--radius) var(--radius) 0 0;
    background: linear-gradient(135deg,#3b82f6,#8b5cf6);
    margin: -24px -20px 0; position:relative; overflow:hidden;
    transition: background 0.4s;
}
.profile-banner::after {
    content:''; position:absolute; inset:0;
    background: repeating-linear-gradient(45deg,rgba(255,255,255,.04) 0,rgba(255,255,255,.04) 2px,transparent 2px,transparent 8px);
}
.profile-avatar-wrap {
    display:flex; justify-content:center; margin-top:-38px; margin-bottom:10px; position:relative; z-index:2;
}
#profile-avatar-big {
    width:76px; height:76px; border-radius:50%;
    background:linear-gradient(135deg,#3b82f6,#8b5cf6);
    color:white; font-weight:700; font-size:2rem;
    display:flex; align-items:center; justify-content:center;
    border:3px solid var(--white); box-shadow:0 4px 20px rgba(0,0,0,.18);
    cursor:pointer; transition:transform .2s; flex-shrink:0;
    text-transform:uppercase; position:relative; overflow:visible;
}
#profile-avatar-big:hover { transform:scale(1.06); }

/* Display name & bio */
.profile-display-name { font-size:1.1rem; font-weight:700; color:var(--text); margin-bottom:2px; }
.profile-bio-display  { font-size:0.84rem; color:var(--muted); margin-bottom:14px; line-height:1.5; min-height:18px; }

/* Edit button */
.profile-edit-btn {
    background:none; border:1.5px solid var(--border); border-radius:20px;
    padding:6px 18px; font-size:0.82rem; font-weight:600; color:var(--text-2);
    cursor:pointer; font-family:inherit; transition:all .15s; margin-bottom:16px;
}
.profile-edit-btn:hover { border-color:var(--primary); color:var(--primary); background:var(--primary-light); }

/* ── CUSTOMISE MODAL ── */
.profile-modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:900;
    display:flex; align-items:flex-end; justify-content:center;
    animation:fadeIn .15s ease;
}
.profile-modal {
    background:var(--white); border-radius:24px 24px 0 0;
    width:100%; max-width:540px; max-height:90vh; overflow-y:auto;
    padding:24px 20px 32px;
    animation:panelUp .22s cubic-bezier(.4,0,.2,1);
}
@keyframes panelUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
.profile-modal h3 { font-size:1rem; font-weight:700; margin-bottom:18px; }
.profile-modal-close {
    float:right; background:none; border:none; cursor:pointer;
    font-size:1.3rem; color:var(--muted); line-height:1;
}
.profile-modal-close:hover { color:var(--text); }

.pm-section { margin-bottom:22px; }
.pm-label { font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin-bottom:10px; display:block; }
.pm-input {
    width:100%; padding:10px 14px; border:1.5px solid var(--border);
    border-radius:10px; font-size:0.9rem; outline:none; font-family:inherit;
    color:var(--text); background:var(--bg); transition:border .2s;
}
.pm-input:focus { border-color:var(--primary); background:var(--white); }

/* Avatar color swatches */
.color-swatches { display:flex; flex-wrap:wrap; gap:8px; }
.color-swatch {
    width:38px; height:38px; border-radius:50%; cursor:pointer;
    border:3px solid transparent; transition:transform .15s, border-color .15s;
    flex-shrink:0;
}
.color-swatch:hover  { transform:scale(1.12); }
.color-swatch.active { border-color:var(--text); }

/* Gradient swatches */
.gradient-swatches { display:flex; flex-wrap:wrap; gap:8px; }
.gradient-swatch {
    width:52px; height:32px; border-radius:8px; cursor:pointer;
    border:2px solid transparent; transition:transform .15s, border-color .15s;
}
.gradient-swatch:hover  { transform:scale(1.08); }
.gradient-swatch.active { border-color:var(--text); }

/* Animation picker */
.anim-options { display:flex; flex-wrap:wrap; gap:8px; }
.anim-option {
    padding:6px 16px; border-radius:20px; border:1.5px solid var(--border);
    cursor:pointer; font-size:0.82rem; font-weight:500; color:var(--text-2);
    background:var(--bg); transition:all .15s; font-family:inherit;
}
.anim-option:hover  { border-color:var(--primary); color:var(--primary); }
.anim-option.active { border-color:var(--primary); background:var(--primary-light); color:var(--primary); }

/* Emoji avatar options */
.emoji-options { display:flex; flex-wrap:wrap; gap:8px; }
.emoji-option {
    width:40px; height:40px; border-radius:50%; display:flex; align-items:center;
    justify-content:center; font-size:1.5rem; cursor:pointer; border:2px solid transparent;
    background:var(--bg); transition:all .15s;
}
.emoji-option:hover  { border-color:var(--primary); background:var(--primary-light); }
.emoji-option.active { border-color:var(--primary); }

/* Banner swatches */
.banner-swatches { display:flex; flex-wrap:wrap; gap:8px; }
.banner-swatch {
    width:52px; height:30px; border-radius:6px; cursor:pointer;
    border:2px solid transparent; transition:all .15s;
}
.banner-swatch:hover  { transform:scale(1.06); }
.banner-swatch.active { border-color:var(--text); }

/* Avatar preview in modal */
#pm-avatar-preview {
    width:72px; height:72px; border-radius:50%; margin:0 auto 16px;
    background:linear-gradient(135deg,#3b82f6,#8b5cf6);
    color:white; font-weight:700; font-size:1.8rem;
    display:flex; align-items:center; justify-content:center;
    text-transform:uppercase; transition:all .3s;
}

/* Save button */
.pm-save-btn {
    width:100%; padding:13px; background:var(--primary); color:white;
    border:none; border-radius:12px; font-size:0.95rem; font-weight:700;
    cursor:pointer; font-family:inherit; transition:background .15s;
    margin-top:8px;
}
.pm-save-btn:hover { background:var(--primary-dark); }
.pm-save-btn:disabled { opacity:.6; cursor:not-allowed; }
`;
document.head.appendChild(s);

// ── DATA ─────────────────────────────────────────────────────────────────────
const COLORS = [
    '#3b82f6','#8b5cf6','#ec4899','#ef4444','#f97316',
    '#22c55e','#14b8a6','#f59e0b','#64748b','#1a1a2e'
];
const GRADIENTS = [
    'linear-gradient(135deg,#3b82f6,#8b5cf6)',
    'linear-gradient(135deg,#ec4899,#f97316)',
    'linear-gradient(135deg,#22c55e,#3b82f6)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#8b5cf6,#ec4899)',
    'linear-gradient(135deg,#14b8a6,#22c55e)',
    'linear-gradient(135deg,#1a1a2e,#3b82f6)',
    'linear-gradient(135deg,#ef4444,#f97316)',
];
const BANNER_COLORS = [
    'linear-gradient(135deg,#3b82f6,#8b5cf6)',
    'linear-gradient(135deg,#ec4899,#f97316)',
    'linear-gradient(135deg,#22c55e,#14b8a6)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#1a1a2e,#3b82f6)',
    'linear-gradient(135deg,#8b5cf6,#ec4899)',
    'linear-gradient(90deg,#0f0c29,#302b63,#24243e)',
    '#1a1a2e',
];
const ANIMS = [
    { id:'none',   label:'None' },
    { id:'pulse',  label:'💓 Pulse' },
    { id:'glow',   label:'✨ Glow' },
    { id:'bounce', label:'🏀 Bounce' },
    { id:'spin',   label:'🌀 Spin' },
    { id:'rainbow',label:'🌈 Rainbow' },
];
const EMOJIS = ['👑','🔥','⚡','🌟','🦋','🎭','🚀','💎','🐉','🎨','🌊','🍀','🎵','🦊','🐙','🌺'];

let _draft = {}; // staging area before save

// ── HOOK INTO PROFILE VIEW ────────────────────────────────────────────────────
firebase.auth().onAuthStateChanged(user => {
    if (!user) return;
    // Patch the profile-view HTML once after auth
    setTimeout(() => _patchProfileHtml(user), 200);
});

function _patchProfileHtml(user) {
    const profileView = document.getElementById('profile-view');
    if (!profileView || document.getElementById('profile-banner')) return;

    // Restructure profile-card to add banner + avatar wrap
    const card = profileView.querySelector('.profile-card');
    if (!card) return;

    const banner = document.createElement('div');
    banner.id = 'profile-banner';
    banner.className = 'profile-banner';

    const avatarBig = document.getElementById('profile-avatar-big');
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'profile-avatar-wrap';

    // Move avatar into wrap
    if (avatarBig) {
        avatarBig.parentNode.insertBefore(avatarWrap, avatarBig);
        avatarWrap.appendChild(avatarBig);
        avatarBig.title = 'Customise profile';
        avatarBig.onclick = () => openProfileModal(user);
    }

    // Insert banner at top of card
    card.insertBefore(banner, card.firstChild);

    // Add display name + bio + edit button
    const emailEl = document.getElementById('profile-email');
    const nameEl  = document.createElement('div');
    nameEl.id = 'profile-display-name';
    nameEl.className = 'profile-display-name';
    nameEl.textContent = user.email.split('@')[0];

    const bioEl = document.createElement('div');
    bioEl.id = 'profile-bio-display';
    bioEl.className = 'profile-bio-display';

    const editBtn = document.createElement('button');
    editBtn.className = 'profile-edit-btn';
    editBtn.textContent = '✏️ Edit Profile';
    editBtn.onclick = () => openProfileModal(user);

    if (emailEl) {
        emailEl.after(nameEl);
        nameEl.after(bioEl);
        bioEl.after(editBtn);
    }
}

// ── OPEN MODAL ────────────────────────────────────────────────────────────────
function openProfileModal(user) {
    closeProfileModal();
    _draft = {};

    // Load current profile first
    db.collection('profiles').doc(user.uid).get().then(snap => {
        const pd = snap.exists ? snap.data() : {};
        _renderModal(user, pd);
    });
}
window.openProfileModal = openProfileModal;

function closeProfileModal() {
    const ov = document.getElementById('profile-modal-overlay');
    if (ov) ov.remove();
}
window.closeProfileModal = closeProfileModal;

function _renderModal(user, pd) {
    const initial = user.email[0].toUpperCase();
    const overlay = document.createElement('div');
    overlay.id = 'profile-modal-overlay';
    overlay.className = 'profile-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) closeProfileModal(); };

    overlay.innerHTML = `
        <div class="profile-modal">
            <h3>✏️ Edit Profile <button class="profile-modal-close" onclick="closeProfileModal()">✕</button></h3>

            <!-- Live preview avatar -->
            <div id="pm-avatar-preview" style="${_buildAvatarStyle(pd, initial)}">${pd.avatarEmoji || initial}</div>

            <!-- Display Name -->
            <div class="pm-section">
                <label class="pm-label">Display Name</label>
                <input class="pm-input" id="pm-name" maxlength="40"
                    placeholder="${escapeHtml(user.email.split('@')[0])}"
                    value="${escapeHtml(pd.displayName||'')}">
            </div>

            <!-- Bio -->
            <div class="pm-section">
                <label class="pm-label">Bio</label>
                <input class="pm-input" id="pm-bio" maxlength="120"
                    placeholder="Tell the world about yourself…"
                    value="${escapeHtml(pd.bio||'')}">
            </div>

            <!-- Avatar Emoji -->
            <div class="pm-section">
                <label class="pm-label">Avatar Icon</label>
                <div class="emoji-options">
                    <div class="emoji-option${!pd.avatarEmoji?' active':''}" data-emoji="" onclick="_pmPickEmoji(this,'${initial}')">${initial}</div>
                    ${EMOJIS.map(e=>`<div class="emoji-option${pd.avatarEmoji===e?' active':''}" data-emoji="${e}" onclick="_pmPickEmoji(this,'${e}')">${e}</div>`).join('')}
                </div>
            </div>

            <!-- Solid Colors -->
            <div class="pm-section">
                <label class="pm-label">Avatar Color</label>
                <div class="color-swatches">
                    ${COLORS.map(c=>`<div class="color-swatch${pd.avatarColor===c&&!pd.avatarGradient?' active':''}" style="background:${c}" onclick="_pmPickColor(this,'${c}')"></div>`).join('')}
                </div>
            </div>

            <!-- Gradients -->
            <div class="pm-section">
                <label class="pm-label">Avatar Gradient</label>
                <div class="gradient-swatches">
                    ${GRADIENTS.map(g=>`<div class="gradient-swatch${pd.avatarGradient===g?' active':''}" style="background:${g}" onclick="_pmPickGradient(this,'${g}')"></div>`).join('')}
                </div>
            </div>

            <!-- Animation -->
            <div class="pm-section">
                <label class="pm-label">Avatar Animation</label>
                <div class="anim-options">
                    ${ANIMS.map(a=>`<button class="anim-option${(pd.avatarAnim||'none')===a.id?' active':''}" onclick="_pmPickAnim(this,'${a.id}')">${a.label}</button>`).join('')}
                </div>
            </div>

            <!-- Profile Banner -->
            <div class="pm-section">
                <label class="pm-label">Profile Banner</label>
                <div class="banner-swatches">
                    ${BANNER_COLORS.map(b=>`<div class="banner-swatch${pd.bannerColor===b?' active':''}" style="background:${b}" onclick="_pmPickBanner(this,'${b}')"></div>`).join('')}
                </div>
            </div>

            <button class="pm-save-btn" id="pm-save-btn" onclick="_pmSave('${user.uid}')">Save Profile</button>
        </div>`;

    document.body.appendChild(overlay);

    // Pre-fill draft with current values
    _draft = {
        displayName:    pd.displayName  || '',
        bio:            pd.bio          || '',
        avatarEmoji:    pd.avatarEmoji  || '',
        avatarColor:    pd.avatarColor  || '',
        avatarGradient: pd.avatarGradient || '',
        avatarAnim:     pd.avatarAnim   || 'none',
        bannerColor:    pd.bannerColor  || '',
    };
}

function _buildAvatarStyle(pd, fallback) {
    let style = '';
    if (pd.avatarGradient) style += `background:${pd.avatarGradient};`;
    else if (pd.avatarColor) style += `background:${pd.avatarColor};`;
    return style;
}

// ── MODAL PICKERS (global so onclick= works) ──────────────────────────────────
window._pmPickEmoji = function(el, emoji) {
    document.querySelectorAll('#profile-modal-overlay .emoji-option').forEach(e=>e.classList.remove('active'));
    el.classList.add('active');
    _draft.avatarEmoji = emoji;
    const prev = document.getElementById('pm-avatar-preview');
    if (prev) prev.textContent = emoji || currentUser.email[0].toUpperCase();
};

window._pmPickColor = function(el, color) {
    document.querySelectorAll('#profile-modal-overlay .color-swatch').forEach(e=>e.classList.remove('active'));
    document.querySelectorAll('#profile-modal-overlay .gradient-swatch').forEach(e=>e.classList.remove('active'));
    el.classList.add('active');
    _draft.avatarColor = color;
    _draft.avatarGradient = '';
    const prev = document.getElementById('pm-avatar-preview');
    if (prev) { prev.style.background = color; prev.style.animation = ''; }
};

window._pmPickGradient = function(el, gradient) {
    document.querySelectorAll('#profile-modal-overlay .gradient-swatch').forEach(e=>e.classList.remove('active'));
    document.querySelectorAll('#profile-modal-overlay .color-swatch').forEach(e=>e.classList.remove('active'));
    el.classList.add('active');
    _draft.avatarGradient = gradient;
    _draft.avatarColor = '';
    const prev = document.getElementById('pm-avatar-preview');
    if (prev) { prev.style.background = gradient; prev.style.animation = ''; }
};

window._pmPickAnim = function(el, anim) {
    document.querySelectorAll('#profile-modal-overlay .anim-option').forEach(e=>e.classList.remove('active'));
    el.classList.add('active');
    _draft.avatarAnim = anim;
    const prev = document.getElementById('pm-avatar-preview');
    if (!prev) return;
    const anims = { pulse:'avatarPulse 2s infinite', glow:'avatarGlow 2s infinite', bounce:'avatarBounce 1s infinite', spin:'avatarSpin 3s linear infinite', rainbow:'avatarRainbow 4s linear infinite' };
    prev.style.animation = anim !== 'none' ? anims[anim] : '';
};

window._pmPickBanner = function(el, color) {
    document.querySelectorAll('#profile-modal-overlay .banner-swatch').forEach(e=>e.classList.remove('active'));
    el.classList.add('active');
    _draft.bannerColor = color;
    // Live preview
    const banner = document.getElementById('profile-banner');
    if (banner) banner.style.background = color;
};

window._pmSave = async function(uid) {
    const btn = document.getElementById('pm-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    _draft.displayName = document.getElementById('pm-name')?.value.trim() || '';
    _draft.bio         = document.getElementById('pm-bio')?.value.trim()  || '';

    try {
        await db.collection('profiles').doc(uid).set(_draft, { merge: true });
        closeProfileModal();
        if (typeof showToast === 'function') showToast('✅ Profile updated!');
        // Refresh profile view
        if (typeof loadProfile === 'function') loadProfile();
        // Clear avatar cache so feed updates
        delete _avatarCache[uid];
    } catch(e) {
        alert('Could not save: ' + e.message);
        if (btn) { btn.disabled = false; btn.textContent = 'Save Profile'; }
    }
};

})();
