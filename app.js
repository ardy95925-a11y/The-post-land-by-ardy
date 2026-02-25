// ═══════════════════════════════════════════════════════
// app.js — Core: Firebase, Auth, Navigation, Helpers
// ═══════════════════════════════════════════════════════

const firebaseConfig = {
    apiKey: "AIzaSyDHD8A6I7hqECe5mg1XBb39HcFIu0tyB4c",
    authDomain: "social-globe.firebaseapp.com",
    projectId: "social-globe",
    storageBucket: "social-globe.firebasestorage.app",
    messagingSenderId: "986186459032",
    appId: "1:986186459032:web:6ab6ce3a2be54bcb04aded",
    measurementId: "G-FP1CJH5KF5"
};

firebase.initializeApp(firebaseConfig);
const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;

// ── AUTH ──────────────────────────────────────────────────────────────────────
function handleAuth(type) {
    const email   = document.getElementById('auth-email').value.trim();
    const pass    = document.getElementById('auth-pass').value.trim();
    const errorEl = document.getElementById('auth-error');
    if (!email || !pass) { errorEl.innerText = 'Please enter email and password.'; return; }
    errorEl.style.color = '#888';
    errorEl.innerText   = type === 'signup' ? 'Creating account...' : 'Signing in...';
    const action = type === 'signup'
        ? auth.createUserWithEmailAndPassword(email, pass)
        : auth.signInWithEmailAndPassword(email, pass);
    action.catch(e => { errorEl.style.color = '#ef4444'; errorEl.innerText = e.message; });
}

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').style.display = 'none';
        const initial = user.email[0].toUpperCase();
        const ca = document.getElementById('create-avatar');
        if (ca) ca.innerText = initial;
        showView('feed');
        loadPosts();
        listenInbox();
        setOnlinePresence(user);
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
});

function logout() { auth.signOut(); location.reload(); }

// ── ONLINE PRESENCE ───────────────────────────────────────────────────────────
function setOnlinePresence(user) {
    const ref = db.collection('presence').doc(user.uid);
    ref.set({ email: user.email, online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    document.addEventListener('visibilitychange', () => {
        ref.update({ online: !document.hidden, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    });
    window.addEventListener('beforeunload', () => ref.update({ online: false }));
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function showView(view) {
    ['feed', 'create', 'dm', 'profile'].forEach(v => {
        document.getElementById(v + '-view').style.display = v === view ? 'block' : 'none';
    });
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    if (view === 'profile') loadProfile();
    if (view !== 'dm') closeChatView();
}

// ── TIME AGO ──────────────────────────────────────────────────────────────────
function timeAgo(ts) {
    if (!ts) return '';
    const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
    if (s < 60)    return 'just now';
    if (s < 3600)  return Math.floor(s / 60)   + 'm ago';
    if (s < 86400) return Math.floor(s / 3600)  + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(ts.toMillis()).toLocaleDateString();
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getChatId(a, b) { return [a, b].sort().join('__'); }

// ── IMAGE LIGHTBOX ────────────────────────────────────────────────────────────
function viewImage(src) {
    const lb = document.createElement('div');
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    lb.innerHTML = `<img src="${src}" style="max-width:95%;max-height:95vh;border-radius:12px;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,0.5);">`;
    lb.onclick = () => lb.remove();
    document.body.appendChild(lb);
}

// Alias for backwards compatibility
function startChat(email) { openChat(email); showView('dm'); }

// ── DARK MODE ─────────────────────────────────────────────────────────────────
(function() {
    const saved = localStorage.getItem('pl-dark');
    if (saved === '1') document.documentElement.setAttribute('data-dark', '');
})();

function toggleDarkMode() {
    const isDark = document.documentElement.hasAttribute('data-dark');
    if (isDark) {
        document.documentElement.removeAttribute('data-dark');
        localStorage.setItem('pl-dark', '0');
    } else {
        document.documentElement.setAttribute('data-dark', '');
        localStorage.setItem('pl-dark', '1');
    }
    const btn = document.getElementById('dark-mode-btn');
    if (btn) btn.title = isDark ? 'Dark mode' : 'Light mode';
}
