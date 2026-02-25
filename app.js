// ═══════════════════════════════════════════════════════════════
// app.js — Core: Firebase, Auth, Navigation, Global Helpers
// ═══════════════════════════════════════════════════════════════

const firebaseConfig = {
    apiKey:            "AIzaSyDHD8A6I7hqECe5mg1XBb39HcFIu0tyB4c",
    authDomain:        "social-globe.firebaseapp.com",
    projectId:         "social-globe",
    storageBucket:     "social-globe.firebasestorage.app",
    messagingSenderId: "986186459032",
    appId:             "1:986186459032:web:6ab6ce3a2be54bcb04aded",
    measurementId:     "G-FP1CJH5KF5"
};

firebase.initializeApp(firebaseConfig);
const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;

// ── DARK MODE (applied before paint) ─────────────────────────────────────────
(function () {
    if (localStorage.getItem('pl-dark') === '1')
        document.documentElement.setAttribute('data-dark', '');
})();

// ── AUTH ─────────────────────────────────────────────────────────────────────
function handleAuth(type) {
    const email   = document.getElementById('auth-email').value.trim();
    const pass    = document.getElementById('auth-pass').value.trim();
    const errorEl = document.getElementById('auth-error');
    if (!email || !pass) { errorEl.textContent = 'Please enter email and password.'; return; }
    errorEl.style.color = '#888';
    errorEl.textContent = type === 'signup' ? 'Creating account…' : 'Signing in…';
    const action = type === 'signup'
        ? auth.createUserWithEmailAndPassword(email, pass)
        : auth.signInWithEmailAndPassword(email, pass);
    action.catch(e => { errorEl.style.color = '#ef4444'; errorEl.textContent = e.message; });
}

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').style.display = 'none';
        const ca = document.getElementById('create-avatar');
        if (ca) ca.textContent = user.email[0].toUpperCase();
        setOnlinePresence(user);
        loadPosts();
        listenInbox();
        showView('feed');
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
});

function logout() { auth.signOut(); location.reload(); }

// ── ONLINE PRESENCE ───────────────────────────────────────────────────────────
function setOnlinePresence(user) {
    const ref = db.collection('presence').doc(user.uid);
    ref.set({ email: user.email, online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    document.addEventListener('visibilitychange', () =>
        ref.update({ online: !document.hidden, lastSeen: firebase.firestore.FieldValue.serverTimestamp() }));
    window.addEventListener('beforeunload', () => ref.update({ online: false }));
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function showView(view) {
    ['feed','create','dm','profile'].forEach(v => {
        const el = document.getElementById(v + '-view');
        if (el) el.style.display = v === view ? 'block' : 'none';
    });
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.view === view));
    if (view === 'profile') loadProfile();
    if (view !== 'dm') closeChatView();
}

// ── TIME AGO ──────────────────────────────────────────────────────────────────
function timeAgo(ts) {
    if (!ts) return '';
    const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
    if (s < 60)     return 'just now';
    if (s < 3600)   return Math.floor(s / 60) + 'm ago';
    if (s < 86400)  return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(ts.toMillis()).toLocaleDateString();
}

// ── HTML ESCAPE ───────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── CHAT ID ───────────────────────────────────────────────────────────────────
function getChatId(a, b) { return [a, b].sort().join('__'); }

// ── IMAGE LIGHTBOX ────────────────────────────────────────────────────────────
function viewImage(src) {
    const lb = document.createElement('div');
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;animation:fadeIn .15s ease';
    lb.innerHTML = `<img src="${src}" style="max-width:96vw;max-height:92vh;border-radius:12px;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.6)">`;
    lb.onclick = () => lb.remove();
    document.body.appendChild(lb);
}

// ── START CHAT (alias used in posts) ─────────────────────────────────────────
function startChat(email) { openChat(email); showView('dm'); }

// ── DARK MODE TOGGLE ─────────────────────────────────────────────────────────
function toggleDarkMode() {
    const isDark = document.documentElement.hasAttribute('data-dark');
    if (isDark) { document.documentElement.removeAttribute('data-dark'); localStorage.setItem('pl-dark','0'); }
    else        { document.documentElement.setAttribute('data-dark','');  localStorage.setItem('pl-dark','1'); }
    const btn = document.getElementById('dark-mode-btn');
    if (btn) { btn.innerHTML = isDark ? '🌙' : '☀️'; btn.title = isDark ? 'Dark mode' : 'Light mode'; }
}

// ── IMAGE COMPRESSION (shared by posts + DMs) ─────────────────────────────────
function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Cannot read file'));
        reader.onload  = e => {
            const img = new Image();
            img.onerror = () => reject(new Error('Cannot decode image'));
            img.onload  = () => {
                let w = img.width, h = img.height;
                if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                const url = c.toDataURL('image/jpeg', quality);
                const kb  = Math.round(url.length * 3 / 4 / 1024);
                resolve(kb > 950 ? c.toDataURL('image/jpeg', 0.5) : url);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
