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
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let activeChatFriend = null;
let messageListener = null;

// ── AUTH ──────────────────────────────────────────────────────────────────────
function handleAuth(type) {
    const email   = document.getElementById('auth-email').value.trim();
    const pass    = document.getElementById('auth-pass').value.trim();
    const errorEl = document.getElementById('auth-error');

    if (!email || !pass) { errorEl.innerText = "Please enter your email and password."; return; }

    errorEl.style.color = '#888';
    errorEl.innerText = type === 'signup' ? "Creating account..." : "Logging in...";

    const action = type === 'signup'
        ? auth.createUserWithEmailAndPassword(email, pass)
        : auth.signInWithEmailAndPassword(email, pass);

    action.catch(e => { errorEl.style.color = '#e53e3e'; errorEl.innerText = e.message; });
}

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').style.display = 'none';
        showView('feed');
        loadPosts();
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
});

function logout() { auth.signOut(); location.reload(); }

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function showView(view) {
    document.getElementById('feed-view').style.display   = view === 'feed'   ? 'block' : 'none';
    document.getElementById('create-view').style.display = view === 'create' ? 'block' : 'none';
    document.getElementById('dm-view').style.display     = view === 'dm'     ? 'block' : 'none';

    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (view !== 'dm') {
        activeChatFriend = null;
        if (messageListener) { messageListener(); messageListener = null; }
        document.getElementById('chat-container').classList.add('hidden');
        document.getElementById('dm-placeholder').classList.remove('hidden');
    }
}

// ── CHARACTER COUNTER ─────────────────────────────────────────────────────────
document.getElementById('post-text').addEventListener('input', function () {
    const len     = this.value.length;
    const counter = document.getElementById('char-counter');
    counter.innerText    = len + ' / 300';
    counter.style.color  = len > 280 ? '#e53e3e' : '#888';
    if (len > 300) this.value = this.value.substring(0, 300);
});

// ── IMAGE — compress to small JPEG using canvas ───────────────────────────────
// This converts ANY image (HEIC, PNG, WEBP, etc.) into a small JPEG data URL
// and stores it directly — no Firebase Storage needed at all.
function compressImageToDataURL(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.onload = function (e) {
            const img = new Image();
            img.onerror = () => reject(new Error('Could not decode image'));
            img.onload = function () {
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }

                const canvas = document.createElement('canvas');
                canvas.width  = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                // Rough size check — Firestore docs max 1MB
                const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
                if (sizeKB > 950) {
                    // Try again at lower quality
                    const smaller = canvas.toDataURL('image/jpeg', 0.5);
                    resolve(smaller);
                } else {
                    resolve(dataUrl);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Image preview on file select
document.getElementById('post-image').addEventListener('change', function () {
    const file      = this.files[0];
    const preview   = document.getElementById('image-preview');
    const removeBtn = document.getElementById('remove-image-btn');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        removeBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

function removeImage() {
    document.getElementById('post-image').value = '';
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('remove-image-btn').classList.add('hidden');
}

// ── UPLOAD POST ───────────────────────────────────────────────────────────────
async function uploadPost() {
    const btn      = document.getElementById('upload-btn');
    const statusEl = document.getElementById('upload-status');
    const textEl   = document.getElementById('post-text');
    const tagsEl   = document.getElementById('post-tags');
    const imageEl  = document.getElementById('post-image');

    const text = textEl ? textEl.value.trim() : '';
    const file = imageEl && imageEl.files.length > 0 ? imageEl.files[0] : null;

    // Clean tags — strip anything that could cause issues
    let tags = [];
    if (tagsEl && tagsEl.value.trim()) {
        tags = tagsEl.value
            .split(',')
            .map(t => t.trim().replace(/[^a-zA-Z0-9]/g, ''))
            .filter(t => t.length > 0)
            .slice(0, 10);
    }

    function setStatus(msg, color) {
        if (!statusEl) return;
        statusEl.innerText    = msg;
        statusEl.style.color  = color || '#888';
    }

    if (!text) { setStatus('Please write something first!', '#e53e3e'); return; }

    btn.disabled    = true;
    btn.innerText   = 'Publishing...';
    setStatus('', '#888');

    try {
        let imageDataUrl = '';

        if (file) {
            setStatus('Processing image...', '#888');
            // Compress to max 800px wide, 0.75 quality JPEG — keeps it under Firestore 1MB limit
            imageDataUrl = await compressImageToDataURL(file, 800, 0.75);
            setStatus('Saving post...', '#888');
        }

        await db.collection('posts').add({
            uid:          currentUser.uid,
            email:        currentUser.email,
            text:         text,
            imageDataUrl: imageDataUrl,   // stored directly — no Storage needed
            imageUrl:     '',             // kept for backwards compatibility
            tags:         tags,
            views:        0,
            likes:        0,
            likedBy:      [],
            createdAt:    firebase.firestore.FieldValue.serverTimestamp()
        });

        // Reset form
        if (textEl)  textEl.value  = '';
        if (tagsEl)  tagsEl.value  = '';
        if (imageEl) imageEl.value = '';
        const counter = document.getElementById('char-counter');
        if (counter) counter.innerText = '0 / 300';
        removeImage();

        setStatus('✓ Posted!', '#38a169');
        setTimeout(() => { setStatus('', ''); showView('feed'); }, 900);

    } catch (err) {
        console.error('Post failed:', err);
        setStatus('Failed: ' + err.message, '#e53e3e');
    }

    btn.disabled  = false;
    btn.innerText = 'Publish';
}

// ── TIME AGO ──────────────────────────────────────────────────────────────────
function timeAgo(timestamp) {
    if (!timestamp) return '';
    const s = Math.floor((Date.now() - timestamp.toMillis()) / 1000);
    if (s < 60)    return 'just now';
    if (s < 3600)  return Math.floor(s / 60)   + 'm ago';
    if (s < 86400) return Math.floor(s / 3600)  + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
}

// ── LOAD POSTS ────────────────────────────────────────────────────────────────
function loadPosts() {
    db.collection('posts').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const list = document.getElementById('posts-list');
        list.innerHTML = '';

        if (snapshot.empty) {
            list.innerHTML = '<p style="text-align:center;color:#888;padding:40px;font-size:0.9rem;">No posts yet. Be the first!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const post     = doc.data();
            const isOwn    = post.uid === currentUser.uid;
            const likedBy  = post.likedBy || [];
            const hasLiked = likedBy.includes(currentUser.uid);
            const likes    = post.likes || 0;

            // Support both old imageUrl (Storage) and new imageDataUrl (base64)
            const imgSrc = post.imageDataUrl || post.imageUrl || '';

            const div = document.createElement('div');
            div.className = 'post';
            div.innerHTML = `
                <div class="post-header">
                    <span class="post-author ${isOwn ? 'own' : ''}"
                          onclick="${isOwn ? '' : `startChat('${post.email}')`}"
                          title="${isOwn ? 'You' : 'Message ' + post.email}">
                        ${post.email}${isOwn ? ' (you)' : ''}
                    </span>
                    <div class="post-meta">
                        <span class="post-time">${timeAgo(post.createdAt)}</span>
                        <span class="views-count">👁 ${post.views || 0}</span>
                    </div>
                </div>
                ${imgSrc ? `<img src="${imgSrc}" class="post-img" loading="lazy">` : ''}
                <div class="post-content">
                    <p class="post-text">${post.text}</p>
                    ${post.tags && post.tags.length ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
                </div>
                <div class="post-actions">
                    <button class="action-btn like-btn ${hasLiked ? 'liked' : ''}" onclick="toggleLike('${doc.id}', ${hasLiked})">
                        ${hasLiked ? '❤️' : '🤍'} ${likes}
                    </button>
                    <button class="action-btn" onclick="incrementView('${doc.id}')">👁 View</button>
                    ${!isOwn ? `<button class="action-btn" onclick="startChat('${post.email}')">✉️ Message</button>` : ''}
                    ${isOwn  ? `<button class="action-btn delete-btn" onclick="deletePost('${doc.id}')">🗑 Delete</button>` : ''}
                </div>
            `;
            list.appendChild(div);
        });
    });
}

function incrementView(postId) {
    db.collection('posts').doc(postId).update({ views: firebase.firestore.FieldValue.increment(1) });
}

// ── LIKES ─────────────────────────────────────────────────────────────────────
function toggleLike(postId, hasLiked) {
    const ref = db.collection('posts').doc(postId);
    if (hasLiked) {
        ref.update({ likes: firebase.firestore.FieldValue.increment(-1), likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
    } else {
        ref.update({ likes: firebase.firestore.FieldValue.increment(1),  likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
    }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
async function deletePost(postId) {
    if (!confirm('Delete this post?')) return;
    try {
        await db.collection('posts').doc(postId).delete();
    } catch (e) {
        alert('Could not delete: ' + e.message);
    }
}

// ── DMs ───────────────────────────────────────────────────────────────────────
function getChatId(a, b) { return [a, b].sort().join('__'); }

function startChat(friendEmail) {
    if (!friendEmail || friendEmail === currentUser.email) return;
    activeChatFriend = friendEmail;
    document.getElementById('dm-placeholder').classList.add('hidden');
    document.getElementById('chat-container').classList.remove('hidden');
    document.getElementById('chatting-with').innerText = friendEmail;
    showView('dm');
    loadMessages();
}

function sendDM() {
    const input = document.getElementById('msg-input');
    const text  = input.value.trim();
    if (!text || !activeChatFriend) return;
    db.collection('chats').doc(getChatId(currentUser.email, activeChatFriend)).collection('messages').add({
        sender: currentUser.email, text, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
}

document.getElementById('msg-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDM(); }
});

function loadMessages() {
    if (messageListener) { messageListener(); messageListener = null; }
    const box = document.getElementById('msg-box');
    box.innerHTML = '';
    messageListener = db.collection('chats').doc(getChatId(currentUser.email, activeChatFriend))
        .collection('messages').orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
            box.innerHTML = '';
            snapshot.forEach(doc => {
                const m     = doc.data();
                const isMine = m.sender === currentUser.email;
                const wrap  = document.createElement('div');
                wrap.className = `msg-bubble-wrap ${isMine ? 'mine' : 'theirs'}`;
                wrap.innerHTML = `<div>${!isMine ? `<div class="msg-sender">${m.sender}</div>` : ''}<div class="msg-bubble ${isMine ? 'mine' : 'theirs'}">${m.text}</div></div>`;
                box.appendChild(wrap);
            });
            box.scrollTop = box.scrollHeight;
        });
}

function backToDMList() {
    activeChatFriend = null;
    if (messageListener) { messageListener(); messageListener = null; }
    document.getElementById('chat-container').classList.add('hidden');
    document.getElementById('dm-placeholder').classList.remove('hidden');
}
