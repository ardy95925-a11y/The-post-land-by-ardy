// ── Firebase ──────────────────────────────────────────────────────────────────
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

// ── Global state ──────────────────────────────────────────────────────────────
let currentUser      = null;
let activeChatFriend = null;
let messageListener  = null;
let inboxListener    = null;
let typingTimeout    = null;

const OWNER_EMAIL = 'oleksandr.lahoza.24@phcol.ie';

// ── Profile cache (shared with profiles.js) ───────────────────────────────────
window.profileCache = {};

function getProfile(email) {
    if (window.profileCache[email]) return Promise.resolve(window.profileCache[email]);
    return db.collection('profiles').doc(email).get().then(doc => {
        const data = doc.exists ? doc.data() : {};
        window.profileCache[email] = data;
        return data;
    });
}

// Apply a profile pic to any avatar element
function applyPic(el, email, picUrl) {
    if (picUrl) {
        el.style.backgroundImage    = `url(${picUrl})`;
        el.style.backgroundSize     = 'cover';
        el.style.backgroundPosition = 'center';
        el.innerText = '';
    } else {
        el.style.backgroundImage = '';
        el.innerText = (email || '?')[0].toUpperCase();
    }
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function handleAuth(type) {
    const email   = document.getElementById('auth-email').value.trim();
    const pass    = document.getElementById('auth-pass').value.trim();
    const errorEl = document.getElementById('auth-error');
    if (!email || !pass) { errorEl.innerText = 'Please fill in both fields.'; return; }
    errorEl.style.color = '#888';
    errorEl.innerText   = type === 'signup' ? 'Creating account…' : 'Signing in…';
    const p = type === 'signup'
        ? auth.createUserWithEmailAndPassword(email, pass)
        : auth.signInWithEmailAndPassword(email, pass);
    p.catch(e => { errorEl.style.color = '#ef4444'; errorEl.innerText = e.message; });
}

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').style.display = 'none';
        setOnlinePresence(user);
        initAdmin(user);
        loadAnnouncementBanner();
        listenInbox();
        showView('feed');
        loadPosts();
        refreshNavAvatar();
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

// ── NAV AVATAR ────────────────────────────────────────────────────────────────
function refreshNavAvatar() {
    if (!currentUser) return;
    const el = document.getElementById('nav-avatar');
    if (!el) return;
    getProfile(currentUser.email).then(p => applyPic(el, currentUser.email, p.picUrl));
}

// Called by profiles.js after save
window.onProfileSaved = function() {
    refreshNavAvatar();
    // Refresh create avatar too
    const ca = document.getElementById('create-avatar-pic');
    if (ca) getProfile(currentUser.email).then(p => applyPic(ca, currentUser.email, p.picUrl));
};

// ── NAVIGATION ────────────────────────────────────────────────────────────────
const VIEWS = ['feed','create','dm','search','profile'];

function showView(view) {
    VIEWS.forEach(v => {
        document.getElementById(v + '-view').style.display = v === view ? 'block' : 'none';
    });
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    if (view !== 'dm')      closeChatView();
    if (view === 'profile') renderProfileView();
    if (view === 'create')  refreshCreateAvatar();
    if (view === 'search')  document.getElementById('search-input')?.focus();
}

function refreshCreateAvatar() {
    if (!currentUser) return;
    const ca = document.getElementById('create-avatar-pic');
    if (!ca) return;
    getProfile(currentUser.email).then(p => applyPic(ca, currentUser.email, p.picUrl));
}

// ── IMAGE COMPRESSION ─────────────────────────────────────────────────────────
function compressImage(file, maxW, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Read failed'));
        reader.onload  = e => {
            const img = new Image();
            img.onerror = () => reject(new Error('Decode failed'));
            img.onload  = () => {
                let w = img.width, h = img.height;
                if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
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

// ── CREATE POST ───────────────────────────────────────────────────────────────
document.getElementById('post-text').addEventListener('input', function () {
    const left = 300 - this.value.length;
    const el   = document.getElementById('char-counter');
    el.innerText   = left;
    el.style.color = left < 20 ? '#ef4444' : '#94a3b8';
});

document.getElementById('post-image').addEventListener('change', function () {
    const file = this.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('image-preview').src = e.target.result;
        document.getElementById('image-preview-wrap').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

function removeImage() {
    document.getElementById('post-image').value = '';
    document.getElementById('image-preview-wrap').classList.add('hidden');
    document.getElementById('image-preview').src = '';
}

async function uploadPost() {
    const btn    = document.getElementById('upload-btn');
    const status = document.getElementById('upload-status');
    const text   = document.getElementById('post-text').value.trim();
    const tagsEl = document.getElementById('post-tags');
    const imgEl  = document.getElementById('post-image');
    const file   = imgEl && imgEl.files.length ? imgEl.files[0] : null;

    const tags = tagsEl && tagsEl.value.trim()
        ? tagsEl.value.split(',').map(t => t.trim().replace(/[^a-zA-Z0-9]/g,'')).filter(Boolean).slice(0,10)
        : [];

    const st = (msg, col) => { if(status){status.innerText=msg;status.style.color=col||'#94a3b8';} };

    if (!text) { st('Please write something!','#ef4444'); return; }
    btn.disabled = true; btn.innerText = 'Posting…';

    try {
        let imageDataUrl = '';
        if (file) { st('Processing image…'); imageDataUrl = await compressImage(file, 800, 0.75); }

        await db.collection('posts').add({
            uid: currentUser.uid, email: currentUser.email,
            text, imageDataUrl, imageUrl: '',
            tags, views: 0, likes: 0, likedBy: [], bookmarks: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('post-text').value = '';
        if (tagsEl) tagsEl.value = '';
        if (imgEl)  imgEl.value  = '';
        document.getElementById('char-counter').innerText = '300';
        removeImage();
        st('✓ Posted!','#22c55e');
        setTimeout(() => { st(''); showView('feed'); }, 800);
    } catch(e) { st('Failed: '+e.message,'#ef4444'); }

    btn.disabled = false; btn.innerText = 'Post';
}

// ── TIME ──────────────────────────────────────────────────────────────────────
function timeAgo(ts) {
    if (!ts) return '';
    const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
    if (s < 60)     return 'just now';
    if (s < 3600)   return Math.floor(s/60)    + 'm ago';
    if (s < 86400)  return Math.floor(s/3600)  + 'h ago';
    if (s < 604800) return Math.floor(s/86400) + 'd ago';
    return new Date(ts.toMillis()).toLocaleDateString();
}

// ── LOAD POSTS ────────────────────────────────────────────────────────────────
function loadPosts() {
    db.collection('posts').orderBy('createdAt','desc').onSnapshot(snap => {
        const list = document.getElementById('posts-list');
        list.innerHTML = '';

        if (snap.empty) {
            list.innerHTML = `<div class="empty-state"><div class="ei">🌍</div><p>No posts yet.<br>Be the first to share something!</p></div>`;
            return;
        }

        snap.forEach(doc => buildPostCard(doc, list));
    });
}

function buildPostCard(doc, container) {
    const post      = doc.data();
    const isOwn     = post.uid === currentUser.uid;
    const likedBy   = post.likedBy   || [];
    const bookmarks = post.bookmarks  || [];
    const hasLiked  = likedBy.includes(currentUser.uid);
    const hasBookmarked = bookmarks.includes(currentUser.uid);
    const imgSrc    = post.imageDataUrl || post.imageUrl || '';
    const isOwner   = post.email.toLowerCase() === OWNER_EMAIL.toLowerCase();

    const div = document.createElement('div');
    div.className = 'post';
    div.dataset.postId = doc.id;

    div.innerHTML = `
        <div class="post-header">
            <div class="post-avatar" id="pav-${doc.id}"></div>
            <div class="post-header-info">
                <div class="post-author ${isOwn?'':'clickable'}" onclick="${isOwn?'':'openUserProfile(\''+post.email+'\')'}">
                    <span id="pname-${doc.id}">${post.email}</span>
                    ${isOwner ? '<span class="owner-badge">👑 Owner</span>' : ''}
                    <span class="badge-slot" data-email="${post.email}"></span>
                    ${isOwn ? '<span style="font-size:.68rem;color:#94a3b8;font-weight:400">(you)</span>' : ''}
                </div>
                <div class="post-time">${timeAgo(post.createdAt)}</div>
            </div>
        </div>
        ${imgSrc ? `<img src="${imgSrc}" class="post-img" loading="lazy" onclick="viewImage(this.src)">` : ''}
        <div class="post-content">
            <p class="post-text">${escHtml(post.text)}</p>
            ${post.tags && post.tags.length ? `<div class="post-tags">${post.tags.map(t=>`<span class="tag" onclick="searchByTag('${t}')">#${t}</span>`).join('')}</div>` : ''}
        </div>
        <div class="post-stats">
            <span class="post-stat">❤️ ${post.likes||0}</span>
            <span class="post-stat">👁 ${post.views||0}</span>
            <span class="post-stat">🔖 ${bookmarks.length}</span>
        </div>
        <div class="post-actions">
            <button class="action-btn ${hasLiked?'liked':''}" onclick="toggleLike('${doc.id}',${hasLiked})">
                ${hasLiked?'❤️':'🤍'} Like
            </button>
            <button class="action-btn" onclick="incrementView('${doc.id}')">👁 View</button>
            <button class="action-btn ${hasBookmarked?'bookmarked':''}" onclick="toggleBookmark('${doc.id}',${hasBookmarked})">
                ${hasBookmarked?'🔖':'🔖'} ${hasBookmarked?'Saved':'Save'}
            </button>
            ${!isOwn ? `<button class="action-btn" onclick="startChat('${post.email}')">✉️ Msg</button>` : ''}
            ${isOwn  ? `<button class="action-btn delete-btn" onclick="deletePost('${doc.id}')">🗑</button>` : ''}
        </div>`;

    container.appendChild(div);

    // Async: load avatar + display name + admin badge
    getProfile(post.email).then(profile => {
        const av = div.querySelector(`#pav-${doc.id}`);
        if (av) applyPic(av, post.email, profile.picUrl);

        const nm = div.querySelector(`#pname-${doc.id}`);
        if (nm && profile.displayName) nm.innerText = profile.displayName;

        if (!isOwner) {
            db.collection('admins').doc(post.email).get().then(adoc => {
                const slot = div.querySelector(`.badge-slot[data-email="${post.email}"]`);
                if (adoc.exists && slot) slot.outerHTML = '<span class="admin-badge">🛡 Admin</span>';
            });
        }
    });
}

function incrementView(id) {
    db.collection('posts').doc(id).update({ views: firebase.firestore.FieldValue.increment(1) });
}

function toggleLike(id, hasLiked) {
    const ref = db.collection('posts').doc(id);
    if (hasLiked) {
        ref.update({ likes: firebase.firestore.FieldValue.increment(-1), likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
    } else {
        ref.update({ likes: firebase.firestore.FieldValue.increment(1),  likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
    }
}

function toggleBookmark(id, hasBookmarked) {
    const ref = db.collection('posts').doc(id);
    if (hasBookmarked) {
        ref.update({ bookmarks: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
    } else {
        ref.update({ bookmarks: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
    }
}

async function deletePost(id) {
    if (!confirm('Delete this post?')) return;
    try { await db.collection('posts').doc(id).delete(); }
    catch(e) { alert('Could not delete: '+e.message); }
}

// ── SEARCH ────────────────────────────────────────────────────────────────────
let searchTimeout = null;

function runSearch(query) {
    clearTimeout(searchTimeout);
    const q = query.trim().toLowerCase();
    const el = document.getElementById('search-results');
    if (!q) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="loading-state">Searching…</div>';
    searchTimeout = setTimeout(() => doSearch(q, el), 350);
}

function doSearch(q, el) {
    el.innerHTML = '';
    // Search posts
    db.collection('posts').orderBy('createdAt','desc').get().then(snap => {
        const postResults = [];
        const peopleMap   = {};
        snap.forEach(doc => {
            const d = doc.data();
            if ((d.text||'').toLowerCase().includes(q) ||
                (d.email||'').toLowerCase().includes(q) ||
                (d.tags||[]).some(t => t.toLowerCase().includes(q))) {
                postResults.push({ id: doc.id, ...d });
            }
            if ((d.email||'').toLowerCase().includes(q)) peopleMap[d.email] = d.email;
        });

        if (!postResults.length && !Object.keys(peopleMap).length) {
            el.innerHTML = '<div class="empty-state"><div class="ei">🔍</div><p>No results for "'+escHtml(q)+'"</p></div>';
            return;
        }

        // People section
        const people = Object.keys(peopleMap);
        if (people.length) {
            const sec = document.createElement('div');
            sec.innerHTML = `<div class="search-section-title">People</div>`;
            people.slice(0,5).forEach(email => {
                getProfile(email).then(profile => {
                    const row = document.createElement('div');
                    row.className = 'search-person-row';
                    row.onclick   = () => openUserProfile(email);
                    row.innerHTML = `
                        <div class="search-person-av" id="sav-${email.replace(/[^a-z0-9]/gi,'_')}"></div>
                        <div class="search-person-info">
                            <div class="search-person-name">${profile.displayName || email}</div>
                            <div class="search-person-email">${email}</div>
                        </div>`;
                    sec.appendChild(row);
                    const av = row.querySelector(`#sav-${email.replace(/[^a-z0-9]/gi,'_')}`);
                    if (av) applyPic(av, email, profile.picUrl);
                });
            });
            el.appendChild(sec);
        }

        // Posts section
        if (postResults.length) {
            const sec = document.createElement('div');
            sec.innerHTML = `<div class="search-section-title" style="margin-top:14px">Posts</div>`;
            postResults.slice(0,10).forEach(post => {
                const fakeDoc = { id: post.id, data: () => post };
                buildPostCard(fakeDoc, sec);
            });
            el.appendChild(sec);
        }
    });
}

function searchByTag(tag) {
    showView('search');
    const input = document.getElementById('search-input');
    if (input) { input.value = tag; runSearch(tag); }
}

// ── USER PROFILE MODAL ────────────────────────────────────────────────────────
function openUserProfile(email) {
    if (email === currentUser.email) { showView('profile'); return; }

    const modal = document.createElement('div');
    modal.id = 'user-profile-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:5500;display:flex;align-items:flex-end;justify-content:center;font-family:Inter,sans-serif;';
    modal.innerHTML = `
        <div style="background:white;border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:22px 20px 34px;box-shadow:0 -8px 40px rgba(0,0,0,.2);animation:slideUp .22s ease;max-height:80vh;overflow-y:auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
                <h3 style="font-size:1rem;font-weight:700">Profile</h3>
                <button onclick="document.getElementById('user-profile-modal').remove()" style="background:#f1f5f9;border:none;border-radius:8px;width:30px;height:30px;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
                <div id="upm-av" style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:white;font-weight:700;font-size:1.2rem;display:flex;align-items:center;justify-content:center;text-transform:uppercase;flex-shrink:0;background-size:cover;background-position:center;overflow:hidden;"></div>
                <div>
                    <div id="upm-name" style="font-weight:700;font-size:1rem;"></div>
                    <div id="upm-email" style="font-size:.76rem;color:#94a3b8;margin-top:2px;"></div>
                </div>
            </div>
            <div id="upm-bio" style="font-size:.87rem;color:#475569;line-height:1.5;margin-bottom:16px;white-space:pre-wrap;"></div>
            <div id="upm-stats" style="display:flex;gap:12px;margin-bottom:16px;"></div>
            <button onclick="startChat('${email}');document.getElementById('user-profile-modal').remove()" style="background:#3b82f6;color:white;border:none;width:100%;padding:11px;border-radius:10px;font-weight:600;font-size:.93rem;cursor:pointer;font-family:inherit;">✉️ Send Message</button>
        </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    // Load profile
    getProfile(email).then(p => {
        const av = document.getElementById('upm-av');
        applyPic(av, email, p.picUrl);
        document.getElementById('upm-name').innerText  = p.displayName || email;
        document.getElementById('upm-email').innerText = email;
        document.getElementById('upm-bio').innerText   = p.bio || '';
    });

    // Load stats
    db.collection('posts').where('email','==',email).get().then(snap => {
        let likes = 0; snap.forEach(d => likes += d.data().likes||0);
        const st = document.getElementById('upm-stats');
        st.innerHTML = `
            <div style="background:#f1f5f9;border-radius:9px;padding:10px 16px;text-align:center;flex:1"><div style="font-size:1.1rem;font-weight:700;color:#3b82f6">${snap.size}</div><div style="font-size:.68rem;color:#94a3b8;text-transform:uppercase;margin-top:2px">Posts</div></div>
            <div style="background:#f1f5f9;border-radius:9px;padding:10px 16px;text-align:center;flex:1"><div style="font-size:1.1rem;font-weight:700;color:#3b82f6">${likes}</div><div style="font-size:.68rem;color:#94a3b8;text-transform:uppercase;margin-top:2px">Likes</div></div>`;
    });
}

// ── PROFILE VIEW (your own) ───────────────────────────────────────────────────
function renderProfileView() {
    // profiles.js takes over rendering — we just provide the data hooks
    if (typeof window.renderOwnProfile === 'function') {
        window.renderOwnProfile();
    }
}

// ── DM SYSTEM ─────────────────────────────────────────────────────────────────
function getChatId(a,b) { return [a,b].sort().join('__'); }

// New message modal — lets you start a chat with anyone who's posted
function showNewMessageModal() {
    if (document.getElementById('new-msg-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'new-msg-modal';
    modal.innerHTML = `
        <div class="new-msg-sheet">
            <div class="edit-header" style="margin-bottom:14px">
                <h3 style="font-size:1rem;font-weight:700">New Message</h3>
                <button class="edit-close" onclick="document.getElementById('new-msg-modal').remove()">✕</button>
            </div>
            <input class="new-msg-search" placeholder="Search people…" oninput="searchNewMsg(this.value)" autofocus>
            <div id="new-msg-list"><div class="loading-state">Loading…</div></div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    loadNewMsgList('');
}

function searchNewMsg(q) { loadNewMsgList(q.toLowerCase()); }

function loadNewMsgList(q) {
    const list = document.getElementById('new-msg-list');
    if (!list) return;
    db.collection('posts').get().then(snap => {
        const seen = new Set();
        const people = [];
        snap.forEach(doc => {
            const d = doc.data();
            if (d.email !== currentUser.email && !seen.has(d.email)) {
                if (!q || d.email.toLowerCase().includes(q)) {
                    seen.add(d.email);
                    people.push(d.email);
                }
            }
        });
        if (!people.length) { list.innerHTML = '<div class="empty-state" style="padding:20px"><p>No people found</p></div>'; return; }
        list.innerHTML = '';
        people.slice(0,20).forEach(email => {
            getProfile(email).then(profile => {
                const row = document.createElement('div');
                row.className = 'new-msg-person';
                row.onclick   = () => { document.getElementById('new-msg-modal').remove(); startChat(email); };
                row.innerHTML = `
                    <div class="new-msg-av" id="nma-${email.replace(/[^a-z0-9]/gi,'_')}"></div>
                    <div><div class="new-msg-name">${profile.displayName||email}</div><div class="new-msg-email">${email}</div></div>`;
                list.appendChild(row);
                const av = row.querySelector(`#nma-${email.replace(/[^a-z0-9]/gi,'_')}`);
                if (av) applyPic(av, email, profile.picUrl);
            });
        });
    });
}

// Inbox
function listenInbox() {
    if (inboxListener) { inboxListener(); inboxListener = null; }
    inboxListener = db.collection('conversations')
        .where('members','array-contains',currentUser.email)
        .orderBy('lastAt','desc')
        .onSnapshot(snap => {
            const el = document.getElementById('inbox-list');
            if (!el) return;
            if (snap.empty) {
                el.innerHTML = `<div class="inbox-empty"><div class="ei">💬</div><p>No messages yet.<br>Start a conversation from a post or use the + button.</p></div>`;
                updateUnreadBadge(0); return;
            }
            let totalUnread = 0;
            el.innerHTML = '';
            snap.forEach(doc => {
                const c      = doc.data();
                const other  = (c.members||[]).find(m=>m!==currentUser.email)||'';
                const unread = (c.unread&&c.unread[currentUser.email])||0;
                totalUnread += unread;

                const item = document.createElement('div');
                item.className = 'inbox-item'+(unread>0?' has-unread':'');
                item.onclick   = () => openChat(other);

                const av = document.createElement('div');
                av.className = 'inbox-avatar';
                av.innerText = other[0]?.toUpperCase()||'?';
                getProfile(other).then(p => applyPic(av, other, p.picUrl));
                item.appendChild(av);

                const preview = c.lastText||'';
                const mine    = c.lastSender===currentUser.email;
                item.insertAdjacentHTML('beforeend',`
                    <div class="inbox-info">
                        <div class="inbox-name" id="inb-n-${doc.id}">${other}</div>
                        <div class="inbox-preview">${preview?(mine?'You: ':'')+preview:'Tap to chat'}</div>
                    </div>
                    <div class="inbox-right">
                        <div class="inbox-time">${c.lastAt?timeAgo(c.lastAt):''}</div>
                        ${unread>0?`<div class="inbox-unread-dot">${unread}</div>`:''}
                    </div>`);

                // Display name
                getProfile(other).then(p => {
                    const nm = item.querySelector(`#inb-n-${doc.id}`);
                    if (nm && p.displayName) nm.innerText = p.displayName;
                });

                el.appendChild(item);
            });
            updateUnreadBadge(totalUnread);
        }, () => {
            // Index not ready — fallback
            db.collection('conversations').where('members','array-contains',currentUser.email).get()
                .then(snap => {
                    const el = document.getElementById('inbox-list'); if(!el) return;
                    el.innerHTML='';
                    snap.forEach(doc => {
                        const c=doc.data(), other=(c.members||[]).find(m=>m!==currentUser.email)||'';
                        const item=document.createElement('div'); item.className='inbox-item'; item.onclick=()=>openChat(other);
                        item.innerHTML=`<div class="inbox-avatar">${other[0]?.toUpperCase()||'?'}</div><div class="inbox-info"><div class="inbox-name">${other}</div><div class="inbox-preview">${c.lastText||'Tap to chat'}</div></div>`;
                        el.appendChild(item);
                    });
                });
        });
}

function updateUnreadBadge(n) {
    const b = document.getElementById('unread-badge'); if(!b) return;
    b.innerText = n>9?'9+':n;
    b.classList.toggle('hidden',n===0);
}

function openChat(friendEmail) {
    if (!friendEmail||friendEmail===currentUser.email) return;
    activeChatFriend = friendEmail;
    document.getElementById('dm-inbox-view').classList.add('hidden');
    document.getElementById('dm-chat-view').classList.remove('hidden');

    // Topbar
    const topAv = document.getElementById('chat-topbar-avatar');
    applyPic(topAv, friendEmail, '');
    getProfile(friendEmail).then(p => {
        applyPic(topAv, friendEmail, p.picUrl);
        const nm = document.getElementById('chat-topbar-name');
        if (nm) nm.innerText = p.displayName||friendEmail;
    });
    document.getElementById('chat-topbar-name').innerText   = friendEmail;
    document.getElementById('chat-topbar-status').innerText = '';

    // Mark read
    const chatId = getChatId(currentUser.email, friendEmail);
    db.collection('conversations').doc(chatId).set({[`unread.${currentUser.email}`]:0},{merge:true});

    // Online status
    db.collection('presence').where('email','==',friendEmail).limit(1).get().then(snap => {
        const s = document.getElementById('chat-topbar-status');
        if (!snap.empty && snap.docs[0].data().online) {
            s.innerText='🟢 Online now'; s.style.color='#22c55e';
        } else {
            s.innerText='Active recently'; s.style.color='#94a3b8';
        }
    });

    loadMessages();
}

function startChat(email) { openChat(email); showView('dm'); }

function closeChatView() {
    activeChatFriend = null;
    if (messageListener) { messageListener(); messageListener = null; }
    const chat  = document.getElementById('dm-chat-view');
    const inbox = document.getElementById('dm-inbox-view');
    if (chat)  chat.classList.add('hidden');
    if (inbox) inbox.classList.remove('hidden');
}
function backToDMList() { closeChatView(); }

function sendDM() {
    const input = document.getElementById('msg-input');
    const text  = input.value.trim();
    if (!text||!activeChatFriend) return;
    input.value = '';
    saveMessage({type:'text',text});
    clearTypingStatus();
}

async function sendImageDM(inputEl) {
    const file = inputEl.files[0]; if(!file) return;
    inputEl.value = '';
    try {
        const dataUrl = await compressImage(file, 600, 0.7);
        saveMessage({type:'image',imageDataUrl:dataUrl,text:'📷 Image'});
    } catch(e) { alert('Could not send image: '+e.message); }
}

function saveMessage(data) {
    const chatId = getChatId(currentUser.email, activeChatFriend);
    const now    = firebase.firestore.FieldValue.serverTimestamp();
    db.collection('chats').doc(chatId).collection('messages').add({sender:currentUser.email,createdAt:now,...data});
    db.collection('conversations').doc(chatId).set({
        members:[currentUser.email,activeChatFriend],
        lastText:data.text||'',lastAt:now,lastSender:currentUser.email,
        [`unread.${activeChatFriend}`]:firebase.firestore.FieldValue.increment(1),
        [`unread.${currentUser.email}`]:0
    },{merge:true});
}

document.getElementById('msg-input').addEventListener('input', function() {
    if (!activeChatFriend) return;
    db.collection('typing').doc(getChatId(currentUser.email,activeChatFriend)).set({[currentUser.email]:true},{merge:true});
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(clearTypingStatus, 2500);
});

function clearTypingStatus() {
    if (!activeChatFriend) return;
    db.collection('typing').doc(getChatId(currentUser.email,activeChatFriend)).set({[currentUser.email]:false},{merge:true});
}

document.getElementById('msg-input').addEventListener('keydown', e => {
    if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendDM(); }
});

function loadMessages() {
    if (messageListener) { messageListener(); messageListener=null; }
    const box    = document.getElementById('msg-box');
    const chatId = getChatId(currentUser.email, activeChatFriend);
    box.innerHTML = '';

    // Load friend avatar for message rows
    let friendPic = '';
    getProfile(activeChatFriend).then(p => { friendPic = p.picUrl||''; });

    // Typing
    let typingUnsub = db.collection('typing').doc(chatId).onSnapshot(doc => {
        const isTyping = (doc.data()||{})[activeChatFriend]===true;
        const existing = box.querySelector('.typing-row');
        if (isTyping&&!existing) {
            const row=document.createElement('div'); row.className='msg-row theirs typing-row';
            const av = `<div class="msg-row-avatar" style="${friendPic?`background-image:url(${friendPic});background-size:cover;background-position:center`:''}">`;
            row.innerHTML=av+'</div><div class="msg-bubble-col"><div class="msg-bubble" style="padding:10px 14px"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>';
            box.appendChild(row); box.scrollTop=box.scrollHeight;
        } else if (!isTyping&&existing) { existing.remove(); }
    });

    messageListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('createdAt','asc')
        .onSnapshot(snap => {
            const tRow = box.querySelector('.typing-row');
            box.innerHTML = '';
            let lastDate = '';

            snap.forEach(doc => {
                const m      = doc.data();
                const isMine = m.sender===currentUser.email;

                if (m.createdAt) {
                    const ds = new Date(m.createdAt.toMillis()).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
                    if (ds!==lastDate) {
                        lastDate=ds;
                        const dv=document.createElement('div'); dv.className='date-divider'; dv.innerText=ds;
                        box.appendChild(dv);
                    }
                }

                const row = document.createElement('div');
                row.className = `msg-row ${isMine?'mine':'theirs'}`;

                const avStyle = !isMine && friendPic
                    ? `style="background-image:url(${friendPic});background-size:cover;background-position:center"`
                    : '';

                const content = m.type==='image'&&m.imageDataUrl
                    ? `<img src="${m.imageDataUrl}" class="msg-img" onclick="viewImage(this.src)">`
                    : `<div class="msg-bubble">${escHtml(m.text||'')}</div>`;

                row.innerHTML = `${!isMine?`<div class="msg-row-avatar" ${avStyle}></div>`:''}
                    <div class="msg-bubble-col">${content}
                    <div class="msg-time-label">${m.createdAt?timeAgo(m.createdAt):''}</div></div>`;
                box.appendChild(row);
            });

            if (tRow) box.appendChild(tRow);
            box.scrollTop = box.scrollHeight;
        }, () => { typingUnsub&&typingUnsub(); });
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────
function viewImage(src) {
    const lb=document.createElement('div');
    lb.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    lb.innerHTML=`<img src="${src}" style="max-width:95%;max-height:95vh;border-radius:10px;object-fit:contain;">`;
    lb.onclick=()=>lb.remove();
    document.body.appendChild(lb);
}

function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════════════════════════
function initAdmin(user) {
    if (user.email.toLowerCase()!==OWNER_EMAIL.toLowerCase()) return;
    const btn=document.createElement('button');
    btn.id='admin-nav-btn'; btn.innerText='👑 Admin'; btn.onclick=openAdminPanel;
    document.querySelector('.nav-links').insertBefore(btn,document.querySelector('.nav-links').firstChild);
}

function openAdminPanel() {
    if (document.getElementById('admin-panel')) return;
    const p=document.createElement('div'); p.id='admin-panel';
    p.innerHTML=`<div class="admin-modal">
        <div class="admin-modal-header"><h2>👑 Admin Panel</h2><button class="admin-close" onclick="document.getElementById('admin-panel').remove()">✕</button></div>
        <div class="admin-tabs">
            <button class="admin-tab active" onclick="switchAdminTab('stats')">📊 Stats</button>
            <button class="admin-tab" onclick="switchAdminTab('users')">👥 Users</button>
            <button class="admin-tab" onclick="switchAdminTab('posts')">📝 Posts</button>
            <button class="admin-tab" onclick="switchAdminTab('announce')">📢 Announce</button>
        </div>
        <div id="admin-tab-stats" class="admin-tab-content active">
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-num" id="stat-posts">…</div><div class="stat-label">Posts</div></div>
                <div class="stat-card"><div class="stat-num" id="stat-users">…</div><div class="stat-label">Users</div></div>
                <div class="stat-card"><div class="stat-num" id="stat-likes">…</div><div class="stat-label">Likes</div></div>
                <div class="stat-card"><div class="stat-num" id="stat-msgs">…</div><div class="stat-label">Messages</div></div>
            </div>
        </div>
        <div id="admin-tab-users" class="admin-tab-content">
            <input class="admin-search" placeholder="Search users…" oninput="filterAdminUsers(this.value)">
            <div id="admin-user-list"><div class="admin-empty">Loading…</div></div>
        </div>
        <div id="admin-tab-posts" class="admin-tab-content">
            <input class="admin-search" placeholder="Search posts…" oninput="filterAdminPosts(this.value)">
            <div id="admin-post-list"><div class="admin-empty">Loading…</div></div>
        </div>
        <div id="admin-tab-announce" class="admin-tab-content">
            <div class="admin-announce-box">
                <textarea id="announce-text" placeholder="Write your announcement…"></textarea>
                <button class="admin-announce-btn" onclick="sendAnnouncement()">📢 Post Announcement</button>
            </div>
            <button class="admin-btn danger" style="margin-top:10px;width:100%" onclick="clearAnnouncement()">🗑 Clear Announcement</button>
        </div>
    </div>`;
    document.body.appendChild(p);
    p.addEventListener('click',e=>{if(e.target===p)p.remove();});
    loadAdminStats(); loadAdminUsers(); loadAdminPosts();
}

window.switchAdminTab=function(tab){
    document.querySelectorAll('.admin-tab').forEach((t,i)=>t.classList.toggle('active',['stats','users','posts','announce'][i]===tab));
    document.querySelectorAll('.admin-tab-content').forEach(c=>c.classList.remove('active'));
    const el=document.getElementById('admin-tab-'+tab); if(el)el.classList.add('active');
};

function loadAdminStats(){
    db.collection('posts').get().then(snap=>{
        let likes=0; const emails=new Set();
        snap.forEach(d=>{likes+=d.data().likes||0;emails.add(d.data().email);});
        document.getElementById('stat-posts').innerText=snap.size;
        document.getElementById('stat-users').innerText=emails.size;
        document.getElementById('stat-likes').innerText=likes;
    });
    db.collection('chats').get().then(async snap=>{
        let total=0;
        await Promise.all([...snap.docs].map(d=>db.collection('chats').doc(d.id).collection('messages').get().then(m=>total+=m.size)));
        document.getElementById('stat-msgs').innerText=total;
    });
}

let allAdminUsers=[],allAdminPosts=[];

function loadAdminUsers(){
    db.collection('posts').get().then(snap=>{
        const map={};
        snap.forEach(doc=>{const d=doc.data();if(!d.email)return;if(!map[d.email])map[d.email]={email:d.email,posts:0,likes:0};map[d.email].posts++;map[d.email].likes+=d.likes||0;});
        allAdminUsers=Object.values(map); renderAdminUsers(allAdminUsers);
    });
}

function renderAdminUsers(users){
    const list=document.getElementById('admin-user-list');if(!list)return;
    if(!users.length){list.innerHTML='<div class="admin-empty">No users</div>';return;}
    list.innerHTML='';
    users.forEach(u=>{
        const isOwnerAcc=u.email.toLowerCase()===OWNER_EMAIL.toLowerCase();
        const row=document.createElement('div');row.className='admin-user-row';
        db.collection('admins').doc(u.email).get().then(adoc=>{
            const isAdmin=adoc.exists;
            row.innerHTML=`<div class="admin-user-info"><div class="admin-user-email">${u.email}${isOwnerAcc?' <span class="owner-badge">👑 Owner</span>':''}${isAdmin&&!isOwnerAcc?' <span class="admin-badge">🛡 Admin</span>':''}</div><div class="admin-user-meta">${u.posts} posts · ${u.likes} likes</div></div>
            <div class="admin-actions">${!isOwnerAcc?`${isAdmin?`<button class="admin-btn" onclick="toggleAdmin('${u.email}',false)">Remove</button>`:`<button class="admin-btn promote" onclick="toggleAdmin('${u.email}',true)">Make Admin</button>`}<button class="admin-btn danger" onclick="adminDeleteUserPosts('${u.email}')">🗑</button>`:'<span style="font-size:.73rem;color:#aaa">Owner</span>'}</div>`;
        });
        list.appendChild(row);
    });
}

window.filterAdminUsers=q=>renderAdminUsers(allAdminUsers.filter(u=>u.email.toLowerCase().includes(q.toLowerCase())));
window.toggleAdmin=function(email,make){
    (make?db.collection('admins').doc(email).set({email,grantedAt:firebase.firestore.FieldValue.serverTimestamp()}):db.collection('admins').doc(email).delete())
        .then(()=>{alert(make?`✅ ${email} is now Admin`:`${email} removed`);loadAdminUsers();});
};
window.adminDeleteUserPosts=function(email){
    if(!confirm(`Delete ALL posts by ${email}?`))return;
    db.collection('posts').where('email','==',email).get().then(snap=>{const b=db.batch();snap.forEach(d=>b.delete(d.ref));return b.commit();}).then(()=>{alert('Done');loadAdminPosts();});
};

function loadAdminPosts(){
    db.collection('posts').orderBy('createdAt','desc').get().then(snap=>{
        allAdminPosts=[];snap.forEach(doc=>allAdminPosts.push({id:doc.id,...doc.data()}));renderAdminPosts(allAdminPosts);
    });
}
function renderAdminPosts(posts){
    const list=document.getElementById('admin-post-list');if(!list)return;
    if(!posts.length){list.innerHTML='<div class="admin-empty">No posts</div>';return;}
    list.innerHTML='';
    posts.forEach(p=>{
        const row=document.createElement('div');row.className='admin-post-row';
        row.innerHTML=`<div class="admin-post-text"><div>${(p.text||'').substring(0,100)}${(p.text||'').length>100?'…':''}</div><div class="admin-post-meta">by ${p.email} · 👁 ${p.views||0} · ❤️ ${p.likes||0}</div></div><button class="admin-btn danger" onclick="adminDeletePost('${p.id}')">🗑</button>`;
        list.appendChild(row);
    });
}
window.filterAdminPosts=q=>renderAdminPosts(allAdminPosts.filter(p=>(p.text||'').toLowerCase().includes(q.toLowerCase())||(p.email||'').toLowerCase().includes(q.toLowerCase())));
window.adminDeletePost=function(id){
    if(!confirm('Delete?'))return;
    db.collection('posts').doc(id).delete().then(()=>{allAdminPosts=allAdminPosts.filter(p=>p.id!==id);renderAdminPosts(allAdminPosts);});
};
window.sendAnnouncement=function(){
    const text=document.getElementById('announce-text').value.trim();
    if(!text){alert('Write something!');return;}
    db.collection('announcements').doc('current').set({text,id:Date.now().toString(),createdAt:firebase.firestore.FieldValue.serverTimestamp()}).then(()=>{alert('📢 Posted!');document.getElementById('announce-text').value='';});
};
window.clearAnnouncement=function(){
    if(!confirm('Clear?'))return;
    db.collection('announcements').doc('current').delete().then(()=>alert('Cleared'));
};

function loadAnnouncementBanner(){
    db.collection('announcements').doc('current').onSnapshot(doc=>{
        const area=document.getElementById('announcement-area'); if(!area)return;
        if(!doc.exists||!doc.data().text){area.innerHTML='';return;}
        const data=doc.data();
        if(sessionStorage.getItem('ann-dismissed')===data.id){area.innerHTML='';return;}
        area.innerHTML=`<div class="announcement-card"><div class="announcement-icon">📢</div><div class="announcement-text"><div class="announcement-label">Announcement</div>${escHtml(data.text)}</div><button class="announcement-dismiss" onclick="sessionStorage.setItem('ann-dismissed','${data.id}');document.getElementById('announcement-area').innerHTML=''">✕</button></div>`;
    });
}
