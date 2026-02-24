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

let currentUser      = null;
let activeChatFriend = null;
let messageListener  = null;
let inboxListener    = null;
let typingTimeout    = null;

const OWNER_EMAIL = 'oleksandr.lahoza.24@phcol.ie';

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
        showView('feed');
        loadPosts();
        listenInbox();
        setOnlinePresence(user);
        initAdmin(user);
        loadAnnouncementBanner();
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

// ── CHAR COUNTER ──────────────────────────────────────────────────────────────
document.getElementById('post-text').addEventListener('input', function () {
    const remaining = 300 - this.value.length;
    const counter   = document.getElementById('char-counter');
    counter.innerText   = remaining;
    counter.style.color = remaining < 20 ? '#ef4444' : '#94a3b8';
});

function focusTags() {
    const t = document.getElementById('post-tags');
    t.classList.remove('hidden');
    t.focus();
}

// ── IMAGE COMPRESSION ─────────────────────────────────────────────────────────
function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.onload = e => {
            const img = new Image();
            img.onerror = () => reject(new Error('Could not decode image'));
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const kb      = Math.round((dataUrl.length * 3) / 4 / 1024);
                resolve(kb > 950 ? canvas.toDataURL('image/jpeg', 0.5) : dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

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

// ── UPLOAD POST ───────────────────────────────────────────────────────────────
async function uploadPost() {
    const btn      = document.getElementById('upload-btn');
    const statusEl = document.getElementById('upload-status');
    const textEl   = document.getElementById('post-text');
    const tagsEl   = document.getElementById('post-tags');
    const imageEl  = document.getElementById('post-image');
    const text     = textEl ? textEl.value.trim() : '';
    const file     = imageEl && imageEl.files.length > 0 ? imageEl.files[0] : null;

    let tags = [];
    if (tagsEl && tagsEl.value.trim()) {
        tags = tagsEl.value.split(',')
            .map(t => t.trim().replace(/[^a-zA-Z0-9]/g, ''))
            .filter(t => t.length > 0).slice(0, 10);
    }

    const setStatus = (msg, color) => {
        if (statusEl) { statusEl.innerText = msg; statusEl.style.color = color || '#94a3b8'; }
    };

    if (!text) { setStatus('Please write something!', '#ef4444'); return; }
    btn.disabled = true; btn.innerText = 'Publishing...';

    try {
        let imageDataUrl = '';
        if (file) {
            setStatus('Processing image...', '#94a3b8');
            imageDataUrl = await compressImage(file, 800, 0.75);
            setStatus('Saving...', '#94a3b8');
        }
        await db.collection('posts').add({
            uid: currentUser.uid, email: currentUser.email,
            text, imageDataUrl, imageUrl: '',
            tags, views: 0, likes: 0, likedBy: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (textEl)  textEl.value  = '';
        if (tagsEl)  { tagsEl.value = ''; tagsEl.classList.add('hidden'); }
        if (imageEl) imageEl.value = '';
        document.getElementById('char-counter').innerText = '300';
        removeImage();
        setStatus('✓ Posted!', '#22c55e');
        setTimeout(() => { setStatus('', ''); showView('feed'); }, 800);
    } catch (err) {
        setStatus('Failed: ' + err.message, '#ef4444');
    }

    btn.disabled = false; btn.innerText = 'Publish';
}

// ── TIME AGO ──────────────────────────────────────────────────────────────────
function timeAgo(ts) {
    if (!ts) return '';
    const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
    if (s < 60)     return 'just now';
    if (s < 3600)   return Math.floor(s / 60)    + 'm ago';
    if (s < 86400)  return Math.floor(s / 3600)  + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(ts.toMillis()).toLocaleDateString();
}

// ── RENDER AVATAR (used by posts + profile) ───────────────────────────────────
// Returns either an <img> tag if user has a profile pic, or a coloured initial
function renderAvatarEl(email, size, picUrl) {
    const el = document.createElement('div');
    el.className = 'avatar post-avatar';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.fontSize = (size * 0.38) + 'px';
    if (picUrl) {
        el.style.backgroundImage = `url(${picUrl})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.style.backgroundRepeat = 'no-repeat';
    } else {
        el.innerText = (email || '?')[0].toUpperCase();
    }
    return el;
}

// Cache of profile data so we don't spam Firestore
const profileCache = {};

function getProfile(email) {
    if (profileCache[email]) return Promise.resolve(profileCache[email]);
    return db.collection('profiles').doc(email).get().then(doc => {
        const data = doc.exists ? doc.data() : {};
        profileCache[email] = data;
        return data;
    });
}

// ── LOAD POSTS ────────────────────────────────────────────────────────────────
function loadPosts() {
    db.collection('posts').orderBy('createdAt', 'desc').onSnapshot(snap => {
        const list = document.getElementById('posts-list');
        list.innerHTML = '';
        if (snap.empty) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌍</div><p>No posts yet.<br>Be the first to share something!</p></div>`;
            return;
        }
        snap.forEach(doc => {
            const post     = doc.data();
            const isOwn    = post.uid === currentUser.uid;
            const likedBy  = post.likedBy || [];
            const hasLiked = likedBy.includes(currentUser.uid);
            const imgSrc   = post.imageDataUrl || post.imageUrl || '';
            const isOwner  = post.email.toLowerCase() === OWNER_EMAIL.toLowerCase();

            const div = document.createElement('div');
            div.className = 'post';

            // Build post shell first, then hydrate avatar async
            div.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar-wrap" id="pav-${doc.id}"></div>
                    <div class="post-header-info">
                        <div class="post-author ${isOwn ? '' : 'clickable'}"
                             onclick="${isOwn ? '' : `startChat('${post.email}')`}">
                            ${post.email}
                            ${isOwner ? '<span class="owner-badge">👑 Owner</span>' : ''}
                            <span class="admin-badge-placeholder" data-email="${post.email}"></span>
                            ${isOwn ? '<span style="font-size:0.7rem;color:#94a3b8;font-weight:400;margin-left:4px">(you)</span>' : ''}
                        </div>
                        <div class="post-time">${timeAgo(post.createdAt)}</div>
                    </div>
                </div>
                ${imgSrc ? `<img src="${imgSrc}" class="post-img" loading="lazy">` : ''}
                <div class="post-content">
                    <p class="post-text">${post.text}</p>
                    ${post.tags && post.tags.length ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
                </div>
                <div class="post-stats">
                    <span class="post-stat">❤️ ${post.likes || 0} likes</span>
                    <span class="post-stat">👁 ${post.views || 0} views</span>
                </div>
                <div class="post-actions">
                    <button class="action-btn ${hasLiked ? 'liked' : ''}" onclick="toggleLike('${doc.id}', ${hasLiked})">
                        ${hasLiked ? '❤️' : '🤍'} Like
                    </button>
                    <button class="action-btn" onclick="incrementView('${doc.id}')">👁 View</button>
                    ${!isOwn ? `<button class="action-btn" onclick="startChat('${post.email}')">✉️ Message</button>` : ''}
                    ${isOwn  ? `<button class="action-btn delete-btn" onclick="deletePost('${doc.id}')">🗑 Delete</button>` : ''}
                </div>`;

            list.appendChild(div);

            // Async: load profile pic + admin badge
            getProfile(post.email).then(profile => {
                const wrap = div.querySelector(`#pav-${doc.id}`);
                if (wrap) {
                    const avatarEl = renderAvatarEl(post.email, 38, profile.picUrl || '');
                    wrap.appendChild(avatarEl);
                }
                // Admin badge
                if (!isOwner) {
                    db.collection('admins').doc(post.email).get().then(adoc => {
                        const placeholder = div.querySelector(`.admin-badge-placeholder[data-email="${post.email}"]`);
                        if (adoc.exists && placeholder) {
                            placeholder.outerHTML = '<span class="admin-badge">🛡 Admin</span>';
                        }
                    });
                }
            });
        });
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

async function deletePost(id) {
    if (!confirm('Delete this post?')) return;
    try { await db.collection('posts').doc(id).delete(); }
    catch (e) { alert('Could not delete: ' + e.message); }
}

// ── PROFILE VIEW ──────────────────────────────────────────────────────────────
function loadProfile() {
    const email = currentUser.email;
    document.getElementById('profile-email').innerText = email;

    // Load profile data (populated by profiles.js)
    getProfile(email).then(profile => {
        const bigAv = document.getElementById('profile-avatar-big');
        if (bigAv) {
            if (profile.picUrl) {
                bigAv.style.backgroundImage = `url(${profile.picUrl})`;
                bigAv.style.backgroundSize  = 'cover';
                bigAv.style.backgroundPosition = 'center';
                bigAv.innerText = '';
            } else {
                bigAv.innerText = email[0].toUpperCase();
            }
        }
        const nameEl = document.getElementById('profile-display-name');
        if (nameEl) nameEl.innerText = profile.displayName || '';
        const bioEl = document.getElementById('profile-bio-display');
        if (bioEl) bioEl.innerText = profile.bio || '';
    });

    db.collection('posts').where('uid', '==', currentUser.uid).get().then(snap => {
        let totalLikes = 0, totalViews = 0;
        const posts = [];
        snap.forEach(doc => {
            const d = doc.data();
            totalLikes += d.likes || 0;
            totalViews += d.views || 0;
            posts.push(d);
        });
        document.getElementById('profile-stats').innerHTML = `
            <div class="profile-stat"><div class="profile-stat-num">${snap.size}</div><div class="profile-stat-label">Posts</div></div>
            <div class="profile-stat"><div class="profile-stat-num">${totalLikes}</div><div class="profile-stat-label">Likes</div></div>
            <div class="profile-stat"><div class="profile-stat-num">${totalViews}</div><div class="profile-stat-label">Views</div></div>
        `;
        const postsEl = document.getElementById('profile-posts');
        if (!posts.length) { postsEl.innerHTML = ''; return; }
        postsEl.innerHTML = '<h4>Your Posts</h4>' + posts.slice(0, 5).map(p =>
            `<div class="profile-mini-post">${p.text ? p.text.substring(0, 80) + (p.text.length > 80 ? '…' : '') : ''}</div>`
        ).join('');
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// DM SYSTEM
// ══════════════════════════════════════════════════════════════════════════════
function getChatId(a, b) { return [a, b].sort().join('__'); }

function listenInbox() {
    if (inboxListener) { inboxListener(); inboxListener = null; }
    inboxListener = db.collection('conversations')
        .where('members', 'array-contains', currentUser.email)
        .orderBy('lastAt', 'desc')
        .onSnapshot(snap => {
            const inboxEl = document.getElementById('inbox-list');
            if (!inboxEl) return;
            if (snap.empty) {
                inboxEl.innerHTML = `<div class="inbox-list-empty"><div class="icon">💬</div><p>No messages yet.<br>Tap a name on a post to start chatting.</p></div>`;
                updateUnreadBadge(0); return;
            }
            let totalUnread = 0;
            inboxEl.innerHTML = '';
            snap.forEach(doc => {
                const c       = doc.data();
                const other   = (c.members || []).find(m => m !== currentUser.email) || '';
                const unread  = (c.unread && c.unread[currentUser.email]) || 0;
                const preview = c.lastText || '';
                const time    = c.lastAt ? timeAgo(c.lastAt) : '';
                totalUnread  += unread;

                const item = document.createElement('div');
                item.className = 'inbox-item' + (unread > 0 ? ' has-unread' : '');
                item.onclick   = () => openChat(other);

                // Avatar area — will be hydrated with profile pic if available
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'inbox-avatar';
                avatarDiv.innerText = other[0] ? other[0].toUpperCase() : '?';

                getProfile(other).then(profile => {
                    if (profile.picUrl) {
                        avatarDiv.style.backgroundImage = `url(${profile.picUrl})`;
                        avatarDiv.style.backgroundSize = 'cover';
                        avatarDiv.style.backgroundPosition = 'center';
                        avatarDiv.innerText = '';
                    }
                });

                item.appendChild(avatarDiv);
                item.insertAdjacentHTML('beforeend', `
                    <div class="inbox-info">
                        <div class="inbox-name">${other}</div>
                        <div class="inbox-preview">${preview ? (c.lastSender === currentUser.email ? 'You: ' : '') + preview : 'Tap to chat'}</div>
                    </div>
                    <div class="inbox-right">
                        <div class="inbox-time">${time}</div>
                        ${unread > 0 ? `<div class="inbox-unread-dot">${unread}</div>` : ''}
                    </div>`);
                inboxEl.appendChild(item);
            });
            updateUnreadBadge(totalUnread);
            const countEl = document.getElementById('inbox-count');
            if (countEl) {
                countEl.innerText = snap.size + ' chat' + (snap.size !== 1 ? 's' : '');
                countEl.classList.toggle('hidden', snap.size === 0);
            }
        }, () => loadInboxFallback());
}

function loadInboxFallback() {
    db.collection('conversations').where('members', 'array-contains', currentUser.email).get().then(snap => {
        const inboxEl = document.getElementById('inbox-list');
        if (!inboxEl || snap.empty) return;
        inboxEl.innerHTML = '';
        snap.forEach(doc => {
            const c = doc.data();
            const other = (c.members || []).find(m => m !== currentUser.email) || '';
            const item = document.createElement('div');
            item.className = 'inbox-item';
            item.onclick   = () => openChat(other);
            item.innerHTML = `<div class="inbox-avatar">${other[0]?.toUpperCase() || '?'}</div>
                <div class="inbox-info"><div class="inbox-name">${other}</div>
                <div class="inbox-preview">${c.lastText || 'Tap to chat'}</div></div>`;
            inboxEl.appendChild(item);
        });
    });
}

function updateUnreadBadge(count) {
    const badge = document.getElementById('unread-badge');
    if (!badge) return;
    badge.innerText = count > 9 ? '9+' : count;
    badge.classList.toggle('hidden', count === 0);
}

function openChat(friendEmail) {
    if (!friendEmail || friendEmail === currentUser.email) return;
    activeChatFriend = friendEmail;
    document.getElementById('dm-inbox-view').classList.add('hidden');
    document.getElementById('dm-chat-view').classList.remove('hidden');

    // Topbar — try to show profile pic
    const topAv = document.getElementById('chat-topbar-avatar');
    topAv.innerText = friendEmail[0].toUpperCase();
    topAv.style.backgroundImage = '';
    getProfile(friendEmail).then(profile => {
        if (profile.picUrl) {
            topAv.style.backgroundImage = `url(${profile.picUrl})`;
            topAv.style.backgroundSize = 'cover';
            topAv.style.backgroundPosition = 'center';
            topAv.innerText = '';
        }
        const nameEl = document.getElementById('chat-topbar-name');
        nameEl.innerText = profile.displayName || friendEmail;
    });

    document.getElementById('chat-topbar-name').innerText = friendEmail;

    const chatId = getChatId(currentUser.email, friendEmail);
    db.collection('conversations').doc(chatId).set({ [`unread.${currentUser.email}`]: 0 }, { merge: true });

    db.collection('presence').where('email', '==', friendEmail).limit(1).get().then(snap => {
        const statusEl = document.getElementById('chat-topbar-status');
        if (!snap.empty && snap.docs[0].data().online) {
            statusEl.innerText = '🟢 Online now'; statusEl.style.color = '#22c55e';
        } else {
            statusEl.innerText = 'Active recently'; statusEl.style.color = '#94a3b8';
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
    if (!text || !activeChatFriend) return;
    input.value = '';
    saveMessage({ type: 'text', text });
    clearTypingStatus();
}

async function sendImageDM(inputEl) {
    const file = inputEl.files[0]; if (!file) return;
    inputEl.value = '';
    try {
        const dataUrl = await compressImage(file, 600, 0.7);
        saveMessage({ type: 'image', imageDataUrl: dataUrl, text: '📷 Image' });
    } catch (e) { alert('Could not send image: ' + e.message); }
}

function saveMessage(data) {
    const chatId = getChatId(currentUser.email, activeChatFriend);
    const now    = firebase.firestore.FieldValue.serverTimestamp();
    db.collection('chats').doc(chatId).collection('messages').add({ sender: currentUser.email, createdAt: now, ...data });
    db.collection('conversations').doc(chatId).set({
        members: [currentUser.email, activeChatFriend],
        lastText: data.text || '',
        lastAt: now,
        lastSender: currentUser.email,
        [`unread.${activeChatFriend}`]:  firebase.firestore.FieldValue.increment(1),
        [`unread.${currentUser.email}`]: 0
    }, { merge: true });
}

document.getElementById('msg-input').addEventListener('input', function () {
    if (!activeChatFriend) return;
    const chatId = getChatId(currentUser.email, activeChatFriend);
    db.collection('typing').doc(chatId).set({ [currentUser.email]: true }, { merge: true });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(clearTypingStatus, 2500);
});

function clearTypingStatus() {
    if (!activeChatFriend) return;
    const chatId = getChatId(currentUser.email, activeChatFriend);
    db.collection('typing').doc(chatId).set({ [currentUser.email]: false }, { merge: true });
}

document.getElementById('msg-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDM(); }
});

function loadMessages() {
    if (messageListener) { messageListener(); messageListener = null; }
    const box    = document.getElementById('msg-box');
    const chatId = getChatId(currentUser.email, activeChatFriend);
    box.innerHTML = '';

    // Typing listener
    let typingUnsub = db.collection('typing').doc(chatId).onSnapshot(doc => {
        const isTyping = (doc.data() || {})[activeChatFriend] === true;
        const existing = box.querySelector('.typing-row');
        if (isTyping && !existing) {
            const row = document.createElement('div');
            row.className = 'msg-row theirs typing-row';
            row.innerHTML = `<div class="msg-row-avatar">${activeChatFriend[0].toUpperCase()}</div>
                <div class="msg-bubble-col"><div class="msg-bubble" style="padding:10px 14px;">
                <div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
                </div></div>`;
            box.appendChild(row);
            box.scrollTop = box.scrollHeight;
        } else if (!isTyping && existing) { existing.remove(); }
    });

    messageListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snap => {
            const typingRow = box.querySelector('.typing-row');
            box.innerHTML = '';
            let lastDate = '';

            snap.forEach(doc => {
                const m      = doc.data();
                const isMine = m.sender === currentUser.email;
                if (m.createdAt) {
                    const ds = new Date(m.createdAt.toMillis()).toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });
                    if (ds !== lastDate) {
                        lastDate = ds;
                        const dv = document.createElement('div');
                        dv.className = 'date-divider'; dv.innerText = ds;
                        box.appendChild(dv);
                    }
                }
                const row = document.createElement('div');
                row.className = `msg-row ${isMine ? 'mine' : 'theirs'}`;
                const content = m.type === 'image' && m.imageDataUrl
                    ? `<img src="${m.imageDataUrl}" class="msg-img" onclick="viewImage(this.src)">`
                    : `<div class="msg-bubble">${escapeHtml(m.text || '')}</div>`;
                row.innerHTML = `${!isMine ? `<div class="msg-row-avatar">${m.sender[0].toUpperCase()}</div>` : ''}
                    <div class="msg-bubble-col">${content}
                    <div class="msg-time-label">${m.createdAt ? timeAgo(m.createdAt) : ''}</div></div>`;
                box.appendChild(row);
            });

            if (typingRow) box.appendChild(typingRow);
            box.scrollTop = box.scrollHeight;
        }, () => { typingUnsub && typingUnsub(); });
}

function viewImage(src) {
    const lb = document.createElement('div');
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    lb.innerHTML = `<img src="${src}" style="max-width:95%;max-height:95vh;border-radius:10px;object-fit:contain;">`;
    lb.onclick = () => lb.remove();
    document.body.appendChild(lb);
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN SYSTEM (merged from admin.js)
// ══════════════════════════════════════════════════════════════════════════════
function initAdmin(user) {
    const isOwner = user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
    if (!isOwner) return;
    injectAdminButton();
}

function injectAdminButton() {
    const style = document.createElement('style');
    style.textContent = `
        #admin-nav-btn { background:linear-gradient(135deg,#f6d365,#fda085); color:white; border:none; padding:6px 11px; border-radius:8px; font-size:0.8rem; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity 0.2s; }
        #admin-nav-btn:hover { opacity:0.85; }
        .owner-badge { display:inline-flex;align-items:center;gap:3px;background:linear-gradient(135deg,#f6d365,#fda085);color:white;font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:10px;letter-spacing:0.3px;vertical-align:middle;margin-left:5px;text-transform:uppercase;box-shadow:0 1px 4px rgba(253,160,133,0.5); }
        .admin-badge { display:inline-flex;align-items:center;gap:3px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:10px;letter-spacing:0.3px;vertical-align:middle;margin-left:5px;text-transform:uppercase;box-shadow:0 1px 4px rgba(118,75,162,0.4); }
        #admin-panel { position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:5000;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif; }
        .admin-modal { background:white;border-radius:16px;width:92%;max-width:480px;max-height:88vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.25); }
        .admin-modal-header { padding:20px 22px 14px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:white;z-index:1;border-radius:16px 16px 0 0; }
        .admin-modal-header h2 { font-size:1.1rem;font-weight:700; }
        .admin-close { background:#f5f5f5;border:none;border-radius:8px;width:30px;height:30px;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center; }
        .admin-tabs { display:flex;border-bottom:1px solid #eee;padding:0 22px;gap:4px; }
        .admin-tab { background:none;border:none;padding:10px 12px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;color:#888;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s; }
        .admin-tab.active { color:#3b82f6;border-bottom-color:#3b82f6; }
        .admin-tab-content { padding:18px 22px;display:none; }
        .admin-tab-content.active { display:block; }
        .stats-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px; }
        .stat-card { background:#f9f9f9;border:1px solid #eee;border-radius:10px;padding:14px;text-align:center; }
        .stat-num { font-size:1.8rem;font-weight:700;color:#3b82f6; }
        .stat-label { font-size:0.75rem;color:#888;margin-top:2px; }
        .admin-user-row { display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0;gap:10px; }
        .admin-user-row:last-child { border-bottom:none; }
        .admin-user-info { flex:1;min-width:0; }
        .admin-user-email { font-size:0.83rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .admin-user-meta { font-size:0.72rem;color:#888;margin-top:2px; }
        .admin-actions { display:flex;gap:6px;flex-shrink:0; }
        .admin-btn { background:none;border:1px solid #ddd;border-radius:6px;padding:4px 10px;font-size:0.75rem;cursor:pointer;font-family:inherit;transition:all 0.15s;white-space:nowrap; }
        .admin-btn:hover { background:#f5f5f5; }
        .admin-btn.danger { color:#ef4444;border-color:#fca5a5; }
        .admin-btn.danger:hover { background:#fff5f5; }
        .admin-btn.promote { color:#7c3aed;border-color:#c4b5fd; }
        .admin-btn.promote:hover { background:#f5f3ff; }
        .admin-post-row { padding:10px 0;border-bottom:1px solid #f0f0f0;display:flex;align-items:flex-start;gap:10px; }
        .admin-post-row:last-child { border-bottom:none; }
        .admin-post-text { flex:1;font-size:0.83rem;color:#333;line-height:1.4; }
        .admin-post-meta { font-size:0.7rem;color:#aaa;margin-top:3px; }
        .admin-announce-box textarea { width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-family:inherit;font-size:0.9rem;resize:vertical;min-height:80px;outline:none;margin-bottom:10px; }
        .admin-announce-btn { background:#3b82f6;color:white;border:none;padding:9px 16px;border-radius:8px;font-weight:600;cursor:pointer;font-family:inherit;font-size:0.88rem;width:100%;transition:background 0.2s; }
        .admin-announce-btn:hover { background:#2563eb; }
        .admin-search { width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-family:inherit;font-size:0.85rem;outline:none;margin-bottom:14px; }
        .admin-empty { text-align:center;color:#aaa;padding:20px;font-size:0.85rem; }
        #announcement-banner { max-width:540px;margin:0 auto 14px; }
        .announcement-card { background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:12px;padding:14px 16px;font-size:0.88rem;line-height:1.5;display:flex;align-items:flex-start;gap:10px;box-shadow:0 2px 8px rgba(102,126,234,0.3); }
        .announcement-icon { font-size:1.2rem;flex-shrink:0;margin-top:1px; }
        .announcement-text { flex:1; }
        .announcement-label { font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;opacity:0.8;margin-bottom:3px; }
        .announcement-dismiss { background:rgba(255,255,255,0.2);border:none;color:white;border-radius:6px;padding:2px 8px;font-size:0.75rem;cursor:pointer;flex-shrink:0;font-family:inherit; }
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'admin-nav-btn'; btn.innerText = '👑 Admin'; btn.onclick = openAdminPanel;
    document.querySelector('.nav-links').insertBefore(btn, document.querySelector('.nav-links').firstChild);
}

function openAdminPanel() {
    if (document.getElementById('admin-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'admin-panel';
    panel.innerHTML = `<div class="admin-modal">
        <div class="admin-modal-header">
            <h2>👑 Admin Panel</h2>
            <button class="admin-close" onclick="document.getElementById('admin-panel').remove()">✕</button>
        </div>
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
                <div class="stat-card"><div class="stat-num" id="stat-likes">…</div><div class="stat-label">Total Likes</div></div>
                <div class="stat-card"><div class="stat-num" id="stat-msgs">…</div><div class="stat-label">Messages</div></div>
            </div>
        </div>
        <div id="admin-tab-users" class="admin-tab-content">
            <input class="admin-search" placeholder="Search users..." oninput="filterAdminUsers(this.value)">
            <div id="admin-user-list"><div class="admin-empty">Loading...</div></div>
        </div>
        <div id="admin-tab-posts" class="admin-tab-content">
            <input class="admin-search" placeholder="Search posts..." oninput="filterAdminPosts(this.value)">
            <div id="admin-post-list"><div class="admin-empty">Loading...</div></div>
        </div>
        <div id="admin-tab-announce" class="admin-tab-content">
            <div class="admin-announce-box">
                <textarea id="announce-text" placeholder="Write your announcement..."></textarea>
                <button class="admin-announce-btn" onclick="sendAnnouncement()">📢 Post Announcement</button>
            </div>
            <button class="admin-btn danger" style="margin-top:10px;width:100%" onclick="clearAnnouncement()">🗑 Clear Announcement</button>
        </div>
    </div>`;
    document.body.appendChild(panel);
    panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });
    loadAdminStats(); loadAdminUsers(); loadAdminPosts();
}

window.switchAdminTab = function(tab) {
    document.querySelectorAll('.admin-tab').forEach((t,i) => t.classList.toggle('active', ['stats','users','posts','announce'][i] === tab));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    const el = document.getElementById('admin-tab-' + tab);
    if (el) el.classList.add('active');
};

function loadAdminStats() {
    db.collection('posts').get().then(snap => {
        let likes = 0; const emails = new Set();
        snap.forEach(doc => { likes += doc.data().likes || 0; emails.add(doc.data().email); });
        document.getElementById('stat-posts').innerText = snap.size;
        document.getElementById('stat-users').innerText = emails.size;
        document.getElementById('stat-likes').innerText = likes;
    });
    db.collection('chats').get().then(async snap => {
        let total = 0;
        await Promise.all([...snap.docs].map(doc => db.collection('chats').doc(doc.id).collection('messages').get().then(m => total += m.size)));
        document.getElementById('stat-msgs').innerText = total;
    });
}

let allAdminUsers = [], allAdminPosts = [];

function loadAdminUsers() {
    db.collection('posts').get().then(snap => {
        const map = {};
        snap.forEach(doc => {
            const d = doc.data(); if (!d.email) return;
            if (!map[d.email]) map[d.email] = { email: d.email, posts: 0, likes: 0 };
            map[d.email].posts++; map[d.email].likes += d.likes || 0;
        });
        allAdminUsers = Object.values(map);
        renderAdminUsers(allAdminUsers);
    });
}

function renderAdminUsers(users) {
    const list = document.getElementById('admin-user-list'); if (!list) return;
    if (!users.length) { list.innerHTML = '<div class="admin-empty">No users</div>'; return; }
    list.innerHTML = '';
    users.forEach(u => {
        const isOwnerAcc = u.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
        const row = document.createElement('div'); row.className = 'admin-user-row';
        db.collection('admins').doc(u.email).get().then(adoc => {
            const isAdmin = adoc.exists;
            row.innerHTML = `<div class="admin-user-info">
                <div class="admin-user-email">${u.email}${isOwnerAcc ? ' <span class="owner-badge">👑 Owner</span>' : ''}${isAdmin && !isOwnerAcc ? ' <span class="admin-badge">🛡 Admin</span>' : ''}</div>
                <div class="admin-user-meta">${u.posts} posts · ${u.likes} likes</div>
            </div>
            <div class="admin-actions">${!isOwnerAcc ? `${isAdmin
                ? `<button class="admin-btn" onclick="toggleAdmin('${u.email}',false)">Remove Admin</button>`
                : `<button class="admin-btn promote" onclick="toggleAdmin('${u.email}',true)">Make Admin</button>`}
                <button class="admin-btn danger" onclick="adminDeleteUserPosts('${u.email}')">🗑</button>`
                : '<span style="font-size:0.75rem;color:#aaa">Owner</span>'}</div>`;
        });
        list.appendChild(row);
    });
}

window.filterAdminUsers = q => renderAdminUsers(allAdminUsers.filter(u => u.email.toLowerCase().includes(q.toLowerCase())));
window.toggleAdmin = function(email, make) {
    const action = make
        ? db.collection('admins').doc(email).set({ email, grantedAt: firebase.firestore.FieldValue.serverTimestamp() })
        : db.collection('admins').doc(email).delete();
    action.then(() => { alert(make ? `✅ ${email} is now Admin` : `${email} removed`); loadAdminUsers(); });
};
window.adminDeleteUserPosts = function(email) {
    if (!confirm(`Delete ALL posts by ${email}?`)) return;
    db.collection('posts').where('email','==',email).get().then(snap => {
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
    }).then(() => { alert('Done'); loadAdminPosts(); });
};

function loadAdminPosts() {
    db.collection('posts').orderBy('createdAt','desc').get().then(snap => {
        allAdminPosts = [];
        snap.forEach(doc => allAdminPosts.push({ id: doc.id, ...doc.data() }));
        renderAdminPosts(allAdminPosts);
    });
}
function renderAdminPosts(posts) {
    const list = document.getElementById('admin-post-list'); if (!list) return;
    if (!posts.length) { list.innerHTML = '<div class="admin-empty">No posts</div>'; return; }
    list.innerHTML = '';
    posts.forEach(p => {
        const row = document.createElement('div'); row.className = 'admin-post-row';
        row.innerHTML = `<div class="admin-post-text"><div>${(p.text||'').substring(0,100)}${p.text?.length>100?'...':''}</div>
            <div class="admin-post-meta">by ${p.email} · 👁 ${p.views||0} · ❤️ ${p.likes||0}</div></div>
            <button class="admin-btn danger" onclick="adminDeletePost('${p.id}')">🗑</button>`;
        list.appendChild(row);
    });
}
window.filterAdminPosts = q => renderAdminPosts(allAdminPosts.filter(p => (p.text||'').toLowerCase().includes(q.toLowerCase()) || (p.email||'').toLowerCase().includes(q.toLowerCase())));
window.adminDeletePost = function(id) {
    if (!confirm('Delete this post?')) return;
    db.collection('posts').doc(id).delete().then(() => { allAdminPosts = allAdminPosts.filter(p => p.id !== id); renderAdminPosts(allAdminPosts); });
};

window.sendAnnouncement = function() {
    const text = document.getElementById('announce-text').value.trim();
    if (!text) { alert('Write something first!'); return; }
    db.collection('announcements').doc('current').set({ text, id: Date.now().toString(), createdAt: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => { alert('📢 Posted!'); document.getElementById('announce-text').value = ''; });
};
window.clearAnnouncement = function() {
    if (!confirm('Clear announcement?')) return;
    db.collection('announcements').doc('current').delete().then(() => alert('Cleared'));
};

function loadAnnouncementBanner() {
    db.collection('announcements').doc('current').onSnapshot(doc => {
        let banner = document.getElementById('announcement-banner');
        if (!doc.exists || !doc.data().text) { if (banner) banner.remove(); return; }
        const data = doc.data();
        if (sessionStorage.getItem('ann-dismissed') === data.id) return;
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'announcement-banner';
            const fv = document.getElementById('feed-view');
            if (fv) fv.insertBefore(banner, fv.firstChild);
        }
        banner.innerHTML = `<div class="announcement-card">
            <div class="announcement-icon">📢</div>
            <div class="announcement-text"><div class="announcement-label">Announcement</div>${data.text}</div>
            <button class="announcement-dismiss" onclick="sessionStorage.setItem('ann-dismissed','${data.id}');this.closest('#announcement-banner').remove()">✕</button>
        </div>`;
    });
}
