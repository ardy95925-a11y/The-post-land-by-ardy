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

// ---- AUTH ----
function handleAuth(type) {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const errorEl = document.getElementById('auth-error');

    if (!email || !pass) {
        errorEl.innerText = "Please enter your email and password.";
        return;
    }

    errorEl.style.color = '#888';
    errorEl.innerText = type === 'signup' ? "Creating account..." : "Logging in...";

    if (type === 'signup') {
        auth.createUserWithEmailAndPassword(email, pass)
            .catch(e => {
                errorEl.style.color = '#e53e3e';
                errorEl.innerText = e.message;
            });
    } else {
        auth.signInWithEmailAndPassword(email, pass)
            .catch(e => {
                errorEl.style.color = '#e53e3e';
                errorEl.innerText = e.message;
            });
    }
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

function logout() {
    auth.signOut();
    location.reload();
}

// ---- NAVIGATION ----
function showView(view) {
    document.getElementById('feed-view').style.display = view === 'feed' ? 'block' : 'none';
    document.getElementById('create-view').style.display = view === 'create' ? 'block' : 'none';
    document.getElementById('dm-view').style.display = view === 'dm' ? 'block' : 'none';

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

// ---- CHARACTER COUNTER ----
document.getElementById('post-text').addEventListener('input', function () {
    const len = this.value.length;
    const counter = document.getElementById('char-counter');
    counter.innerText = len + ' / 300';
    counter.style.color = len > 280 ? '#e53e3e' : '#888';
    if (len > 300) this.value = this.value.substring(0, 300);
});

// ---- IMAGE PREVIEW ----
document.getElementById('post-image').addEventListener('change', function () {
    const file = this.files[0];
    const preview = document.getElementById('image-preview');
    const removeBtn = document.getElementById('remove-image-btn');
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            removeBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

function removeImage() {
    document.getElementById('post-image').value = "";
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('remove-image-btn').classList.add('hidden');
}

// ---- POSTS ----
async function uploadPost() {
    const btn = document.getElementById('upload-btn');
    const statusEl = document.getElementById('upload-status');
    const text = document.getElementById('post-text').value.trim();
    const tagsRaw = document.getElementById('post-tags').value;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const file = document.getElementById('post-image').files[0];

    if (!text) {
        statusEl.style.color = '#e53e3e';
        statusEl.innerText = "Please write something first!";
        return;
    }

    btn.disabled = true;
    btn.innerText = "Publishing...";
    statusEl.style.color = '#888';
    statusEl.innerText = "";

    try {
        let imageUrl = "";

        if (file) {
            statusEl.innerText = "Uploading image...";
            // Sanitize filename to avoid storage path errors
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const storageRef = storage.ref().child(`posts/${currentUser.uid}_${Date.now()}_${safeName}`);
            const metadata = { contentType: file.type };
            const snapshot = await storageRef.put(file, metadata);
            imageUrl = await snapshot.ref.getDownloadURL();
            statusEl.innerText = "Image uploaded! Saving post...";
        }

        await db.collection('posts').add({
            uid: currentUser.uid,
            email: currentUser.email,
            text: text,
            imageUrl: imageUrl,
            tags: tags,
            views: 0,
            likes: 0,
            likedBy: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Reset form
        document.getElementById('post-text').value = "";
        document.getElementById('post-tags').value = "";
        document.getElementById('post-image').value = "";
        document.getElementById('char-counter').innerText = '0 / 300';
        removeImage();

        statusEl.style.color = '#38a169';
        statusEl.innerText = "✓ Posted!";
        setTimeout(() => { statusEl.innerText = ""; showView('feed'); }, 800);

    } catch (err) {
        console.error("Upload error:", err);
        statusEl.style.color = '#e53e3e';
        statusEl.innerText = "Error: " + err.message;
    } finally {
        btn.disabled = false;
        btn.innerText = "Publish";
    }
}

function timeAgo(timestamp) {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp.toMillis()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
}

function loadPosts() {
    db.collection('posts').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const list = document.getElementById('posts-list');
        list.innerHTML = "";

        if (snapshot.empty) {
            list.innerHTML = '<p style="text-align:center;color:#888;padding:40px;font-size:0.9rem;">No posts yet. Be the first!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const post = doc.data();
            const isOwn = post.uid === currentUser.uid;
            const likedBy = post.likedBy || [];
            const hasLiked = likedBy.includes(currentUser.uid);
            const likes = post.likes || 0;

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
                ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-img" loading="lazy">` : ''}
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
                    ${isOwn ? `<button class="action-btn delete-btn" onclick="deletePost('${doc.id}', '${post.imageUrl}')">🗑 Delete</button>` : ''}
                </div>
            `;
            list.appendChild(div);
        });
    });
}

function incrementView(postId) {
    db.collection('posts').doc(postId).update({
        views: firebase.firestore.FieldValue.increment(1)
    });
}

// ---- LIKES ----
function toggleLike(postId, hasLiked) {
    const ref = db.collection('posts').doc(postId);
    if (hasLiked) {
        ref.update({
            likes: firebase.firestore.FieldValue.increment(-1),
            likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
    } else {
        ref.update({
            likes: firebase.firestore.FieldValue.increment(1),
            likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
    }
}

// ---- DELETE POST ----
async function deletePost(postId, imageUrl) {
    if (!confirm("Delete this post?")) return;
    try {
        await db.collection('posts').doc(postId).delete();
        if (imageUrl) {
            try { await storage.refFromURL(imageUrl).delete(); } catch (e) { /* silent */ }
        }
    } catch (e) {
        alert("Could not delete: " + e.message);
    }
}

// ---- DMs ----
function getChatId(emailA, emailB) {
    return [emailA, emailB].sort().join('__');
}

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
    const text = input.value.trim();
    if (!text || !activeChatFriend) return;

    const chatId = getChatId(currentUser.email, activeChatFriend);
    db.collection('chats').doc(chatId).collection('messages').add({
        sender: currentUser.email,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    input.value = "";
}

document.getElementById('msg-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendDM();
    }
});

function loadMessages() {
    if (messageListener) { messageListener(); messageListener = null; }

    const chatId = getChatId(currentUser.email, activeChatFriend);
    const box = document.getElementById('msg-box');
    box.innerHTML = "";

    messageListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
            box.innerHTML = "";
            snapshot.forEach(doc => {
                const m = doc.data();
                const isMine = m.sender === currentUser.email;
                const wrap = document.createElement('div');
                wrap.className = `msg-bubble-wrap ${isMine ? 'mine' : 'theirs'}`;
                wrap.innerHTML = `
                    <div>
                        ${!isMine ? `<div class="msg-sender">${m.sender}</div>` : ''}
                        <div class="msg-bubble ${isMine ? 'mine' : 'theirs'}">${m.text}</div>
                    </div>
                `;
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
