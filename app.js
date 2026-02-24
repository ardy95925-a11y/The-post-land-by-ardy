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

    // Reset DM view when navigating away
    if (view !== 'dm') {
        activeChatFriend = null;
        if (messageListener) { messageListener(); messageListener = null; }
        document.getElementById('chat-container').classList.add('hidden');
        document.getElementById('dm-placeholder').classList.remove('hidden');
    }
}

// ---- POSTS ----
async function uploadPost() {
    const btn = document.getElementById('upload-btn');
    const text = document.getElementById('post-text').value.trim();
    const tagsRaw = document.getElementById('post-tags').value;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const file = document.getElementById('post-image').files[0];

    if (!text) return alert("Please write something first!");

    btn.disabled = true;
    btn.innerText = "Publishing...";

    let imageUrl = "";
    if (file) {
        const ref = storage.ref(`posts/${Date.now()}_${file.name}`);
        await ref.put(file);
        imageUrl = await ref.getDownloadURL();
    }

    await db.collection('posts').add({
        uid: currentUser.uid,
        email: currentUser.email,
        text: text,
        imageUrl: imageUrl,
        tags: tags,
        views: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('post-text').value = "";
    document.getElementById('post-tags').value = "";
    document.getElementById('post-image').value = "";
    btn.disabled = false;
    btn.innerText = "Publish";
    showView('feed');
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
            list.innerHTML = '<p style="text-align:center;color:#888;padding:30px;font-size:0.9rem;">No posts yet. Be the first to post!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const post = doc.data();
            const isOwn = post.email === currentUser.email;
            const div = document.createElement('div');
            div.className = 'post';
            div.innerHTML = `
                <div class="post-header">
                    <span class="post-author" onclick="${isOwn ? '' : `startChat('${post.email}')`}" 
                          style="${isOwn ? 'cursor:default;color:#333' : ''}"
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
                    <button class="action-btn" onclick="incrementView('${doc.id}')">👁 View</button>
                    ${!isOwn ? `<button class="action-btn" onclick="startChat('${post.email}')">✉️ Message</button>` : ''}
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

// ---- DMs ----
function getChatId(emailA, emailB) {
    // Consistent chat ID regardless of who starts the chat
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

// Also allow sending with Enter key
document.getElementById('msg-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendDM();
    }
});

function loadMessages() {
    // Cancel any previous listener
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
