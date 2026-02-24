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
        // Set avatar initials
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

// ── CHAR COUNTER ──────────────────────────────────────────────────────────────
document.getElementById('post-text').addEventListener('input', function () {
    const remaining = 300 - this.value.length;
    const counter   = document.getElementById('char-counter');
    counter.innerText   = remaining;
    counter.style.color = remaining < 20 ? '#ef4444' : '#94a3b8';
});

// ── TAGS INPUT TOGGLE ─────────────────────────────────────────────────────────
function focusTags() {
    const t = document.getElementById('post-tags');
    t.classList.remove('hidden');
    t.focus();
}

// ── IMAGE HANDLING ────────────────────────────────────────────────────────────
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
    setStatus('', '#94a3b8');

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
    if (s < 60)    return 'just now';
    if (s < 3600)  return Math.floor(s / 60)   + 'm ago';
    if (s < 86400) return Math.floor(s / 3600)  + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(ts.toMillis()).toLocaleDateString();
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
            const initial  = (post.email || '?')[0].toUpperCase();

            const div = document.createElement('div');
            div.className = 'post';
            div.innerHTML = `
                <div class="post-header">
                    <div class="avatar post-avatar">${initial}</div>
                    <div class="post-header-info">
                        <div class="post-author ${isOwn ? '' : 'clickable'}"
                             onclick="${isOwn ? '' : `startChat('${post.email}')`}">
                            ${post.email}
                            ${isOwn ? '<span style="font-size:0.7rem;color:#94a3b8;font-weight:400">(you)</span>' : ''}
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
    const email   = currentUser.email;
    const initial = email[0].toUpperCase();

    document.getElementById('profile-avatar-big').innerText = initial;
    document.getElementById('profile-email').innerText      = email;

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
// DM SYSTEM — completely rebuilt from scratch
// ══════════════════════════════════════════════════════════════════════════════

function getChatId(a, b) { return [a, b].sort().join('__'); }

// ── INBOX ─────────────────────────────────────────────────────────────────────
function listenInbox() {
    if (inboxListener) { inboxListener(); inboxListener = null; }

    inboxListener = db.collection('conversations')
        .where('members', 'array-contains', currentUser.email)
        .orderBy('lastAt', 'desc')
        .onSnapshot(snap => {
            const inboxEl = document.getElementById('inbox-list');
            if (!inboxEl) return;

            if (snap.empty) {
                inboxEl.innerHTML = `
                    <div class="inbox-list-empty">
                        <div class="icon">💬</div>
                        <p>No messages yet.<br>Tap someone's name on a post to start chatting.</p>
                    </div>`;
                updateUnreadBadge(0);
                return;
            }

            let totalUnread = 0;
            inboxEl.innerHTML = '';

            snap.forEach(doc => {
                const c       = doc.data();
                const other   = (c.members || []).find(m => m !== currentUser.email) || '';
                const unread  = (c.unread && c.unread[currentUser.email]) || 0;
                const preview = c.lastText || '';
                const time    = c.lastAt ? timeAgo(c.lastAt) : '';
                const initial = other[0] ? other[0].toUpperCase() : '?';
                totalUnread  += unread;

                const item = document.createElement('div');
                item.className = 'inbox-item' + (unread > 0 ? ' has-unread' : '');
                item.onclick   = () => openChat(other);
                item.innerHTML = `
                    <div class="inbox-avatar">${initial}</div>
                    <div class="inbox-info">
                        <div class="inbox-name">${other}</div>
                        <div class="inbox-preview">${preview ? (c.lastSender === currentUser.email ? 'You: ' : '') + preview : 'Tap to chat'}</div>
                    </div>
                    <div class="inbox-right">
                        <div class="inbox-time">${time}</div>
                        ${unread > 0 ? `<div class="inbox-unread-dot">${unread}</div>` : ''}
                    </div>`;
                inboxEl.appendChild(item);
            });

            updateUnreadBadge(totalUnread);

            // Update inbox count label
            const countEl = document.getElementById('inbox-count');
            if (countEl) {
                countEl.innerText   = snap.size + ' chat' + (snap.size !== 1 ? 's' : '');
                countEl.classList.toggle('hidden', snap.size === 0);
            }
        }, err => {
            // Index not ready yet — show plain inbox without ordering
            console.warn('Inbox needs index, falling back:', err.message);
            loadInboxFallback();
        });
}

function loadInboxFallback() {
    db.collection('conversations')
        .where('members', 'array-contains', currentUser.email)
        .get().then(snap => {
            const inboxEl = document.getElementById('inbox-list');
            if (!inboxEl || snap.empty) return;
            inboxEl.innerHTML = '';
            snap.forEach(doc => {
                const c       = doc.data();
                const other   = (c.members || []).find(m => m !== currentUser.email) || '';
                const initial = other[0] ? other[0].toUpperCase() : '?';
                const item    = document.createElement('div');
                item.className = 'inbox-item';
                item.onclick   = () => openChat(other);
                item.innerHTML = `
                    <div class="inbox-avatar">${initial}</div>
                    <div class="inbox-info">
                        <div class="inbox-name">${other}</div>
                        <div class="inbox-preview">${c.lastText || 'Tap to chat'}</div>
                    </div>`;
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

// ── OPEN CHAT ─────────────────────────────────────────────────────────────────
function openChat(friendEmail) {
    if (!friendEmail || friendEmail === currentUser.email) return;
    activeChatFriend = friendEmail;

    // Show chat, hide inbox
    document.getElementById('dm-inbox-view').classList.add('hidden');
    document.getElementById('dm-chat-view').classList.remove('hidden');

    // Set topbar info
    const initial = friendEmail[0].toUpperCase();
    document.getElementById('chat-topbar-avatar').innerText = initial;
    document.getElementById('chat-topbar-name').innerText   = friendEmail;

    // Mark as read
    const chatId = getChatId(currentUser.email, friendEmail);
    db.collection('conversations').doc(chatId).set(
        { [`unread.${currentUser.email}`]: 0 }, { merge: true }
    );

    // Check if friend is online
    db.collection('presence').where('email', '==', friendEmail).limit(1).get().then(snap => {
        const status = document.getElementById('chat-topbar-status');
        if (!snap.empty && snap.docs[0].data().online) {
            if (status) { status.innerText = '🟢 Online now'; status.style.color = '#22c55e'; }
        } else {
            if (status) { status.innerText = 'Active recently'; status.style.color = '#94a3b8'; }
        }
    });

    loadMessages();
}

// Alias for backwards compatibility with extras.js and admin.js
function startChat(email) { openChat(email); showView('dm'); }

// ── CLOSE CHAT ────────────────────────────────────────────────────────────────
function closeChatView() {
    activeChatFriend = null;
    if (messageListener) { messageListener(); messageListener = null; }
    const chat  = document.getElementById('dm-chat-view');
    const inbox = document.getElementById('dm-inbox-view');
    if (chat)  chat.classList.add('hidden');
    if (inbox) inbox.classList.remove('hidden');
    // clear typing
    clearTypingIndicator();
}

function backToDMList() { closeChatView(); }

// ── SEND TEXT DM ──────────────────────────────────────────────────────────────
function sendDM() {
    const input = document.getElementById('msg-input');
    const text  = input.value.trim();
    if (!text || !activeChatFriend) return;

    input.value = '';
    saveMessage({ type: 'text', text });
    clearTypingStatus();
}

// ── SEND IMAGE DM ─────────────────────────────────────────────────────────────
async function sendImageDM(inputEl) {
    const file = inputEl.files[0]; if (!file) return;
    inputEl.value = '';
    try {
        const dataUrl = await compressImage(file, 600, 0.7);
        saveMessage({ type: 'image', imageDataUrl: dataUrl, text: '📷 Image' });
    } catch (e) { alert('Could not send image: ' + e.message); }
}

// ── SAVE MESSAGE TO FIRESTORE ─────────────────────────────────────────────────
function saveMessage(data) {
    const chatId = getChatId(currentUser.email, activeChatFriend);
    const now    = firebase.firestore.FieldValue.serverTimestamp();

    db.collection('chats').doc(chatId).collection('messages').add({
        sender: currentUser.email,
        createdAt: now,
        ...data
    });

    // Update conversation index
    db.collection('conversations').doc(chatId).set({
        members:    [currentUser.email, activeChatFriend],
        lastText:   data.text || '',
        lastAt:     now,
        lastSender: currentUser.email,
        [`unread.${activeChatFriend}`]:   firebase.firestore.FieldValue.increment(1),
        [`unread.${currentUser.email}`]:  0
    }, { merge: true });
}

// ── TYPING INDICATOR ──────────────────────────────────────────────────────────
document.getElementById('msg-input').addEventListener('input', function () {
    if (!activeChatFriend) return;
    const chatId = getChatId(currentUser.email, activeChatFriend);
    db.collection('typing').doc(chatId).set(
        { [currentUser.email]: true }, { merge: true }
    );
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(clearTypingStatus, 2500);
});

function clearTypingStatus() {
    if (!activeChatFriend) return;
    const chatId = getChatId(currentUser.email, activeChatFriend);
    db.collection('typing').doc(chatId).set(
        { [currentUser.email]: false }, { merge: true }
    );
}

function clearTypingIndicator() {
    const box = document.getElementById('msg-box');
    if (box) { const t = box.querySelector('.typing-row'); if (t) t.remove(); }
}

document.getElementById('msg-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDM(); }
});

// ── LOAD MESSAGES ─────────────────────────────────────────────────────────────
function loadMessages() {
    if (messageListener) { messageListener(); messageListener = null; }

    const box    = document.getElementById('msg-box');
    const chatId = getChatId(currentUser.email, activeChatFriend);
    box.innerHTML = '';

    // Listen for typing
    let typingListener = db.collection('typing').doc(chatId).onSnapshot(doc => {
        const data     = doc.data() || {};
        const isTyping = data[activeChatFriend] === true;
        const existing = box.querySelector('.typing-row');
        if (isTyping && !existing) {
            const row = document.createElement('div');
            row.className = 'msg-row theirs typing-row';
            row.innerHTML = `
                <div class="msg-row-avatar">${activeChatFriend[0].toUpperCase()}</div>
                <div class="msg-bubble-col">
                    <div class="msg-bubble" style="padding:10px 14px;">
                        <div class="typing-indicator">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        </div>
                    </div>
                </div>`;
            box.appendChild(row);
            box.scrollTop = box.scrollHeight;
        } else if (!isTyping && existing) {
            existing.remove();
        }
    });

    messageListener = db.collection('chats').doc(chatId)
        .collection('messages').orderBy('createdAt', 'asc')
        .onSnapshot(snap => {
            const typingRow = box.querySelector('.typing-row');
            box.innerHTML   = '';

            let lastDate = '';
            snap.forEach(doc => {
                const m      = doc.data();
                const isMine = m.sender === currentUser.email;

                // Date divider
                if (m.createdAt) {
                    const dateStr = new Date(m.createdAt.toMillis()).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
                    if (dateStr !== lastDate) {
                        lastDate = dateStr;
                        const div = document.createElement('div');
                        div.className = 'date-divider';
                        div.innerText = dateStr;
                        box.appendChild(div);
                    }
                }

                const row = document.createElement('div');
                row.className = `msg-row ${isMine ? 'mine' : 'theirs'}`;

                let content = '';
                if (m.type === 'image' && m.imageDataUrl) {
                    content = `<img src="${m.imageDataUrl}" class="msg-img" onclick="viewImage(this.src)">`;
                } else {
                    content = `<div class="msg-bubble">${escapeHtml(m.text || '')}</div>`;
                }

                row.innerHTML = `
                    ${!isMine ? `<div class="msg-row-avatar">${m.sender[0].toUpperCase()}</div>` : ''}
                    <div class="msg-bubble-col">
                        ${content}
                        <div class="msg-time-label">${m.createdAt ? timeAgo(m.createdAt) : ''}</div>
                    </div>`;
                box.appendChild(row);
            });

            // Re-add typing row at bottom
            if (typingRow) box.appendChild(typingRow);
            box.scrollTop = box.scrollHeight;

            // Unsubscribe old typing listener if messages unsubscribed
        }, () => { typingListener && typingListener(); });
}

// ── IMAGE LIGHTBOX ────────────────────────────────────────────────────────────
function viewImage(src) {
    const lb = document.createElement('div');
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    lb.innerHTML     = `<img src="${src}" style="max-width:95%;max-height:95vh;border-radius:10px;object-fit:contain;">`;
    lb.onclick       = () => lb.remove();
    document.body.appendChild(lb);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
