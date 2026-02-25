// ═══════════════════════════════════════════════════════
// dm.js — Direct Messages, Inbox, Chat, Typing
// ═══════════════════════════════════════════════════════

let activeChatFriend = null;
let messageListener  = null;
let inboxListener    = null;
let typingTimeout    = null;

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
                        <div class="inbox-name">${escapeHtml(other)}</div>
                        <div class="inbox-preview">${preview ? (c.lastSender === currentUser.email ? 'You: ' : '') + escapeHtml(preview) : 'Tap to chat'}</div>
                    </div>
                    <div class="inbox-right">
                        <div class="inbox-time">${time}</div>
                        ${unread > 0 ? `<div class="inbox-unread-dot">${unread}</div>` : ''}
                    </div>`;
                inboxEl.appendChild(item);
            });

            updateUnreadBadge(totalUnread);

            const countEl = document.getElementById('inbox-count');
            if (countEl) {
                countEl.innerText   = snap.size + ' chat' + (snap.size !== 1 ? 's' : '');
                countEl.classList.toggle('hidden', snap.size === 0);
            }
        }, err => {
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
                        <div class="inbox-name">${escapeHtml(other)}</div>
                        <div class="inbox-preview">${escapeHtml(c.lastText || 'Tap to chat')}</div>
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

    document.getElementById('dm-inbox-view').classList.add('hidden');
    document.getElementById('dm-chat-view').classList.remove('hidden');

    const initial = friendEmail[0].toUpperCase();
    document.getElementById('chat-topbar-avatar').innerText = initial;
    document.getElementById('chat-topbar-name').innerText   = friendEmail;

    const chatId = getChatId(currentUser.email, friendEmail);
    db.collection('conversations').doc(chatId).set(
        { [`unread.${currentUser.email}`]: 0 }, { merge: true }
    );

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

// ── CLOSE CHAT ────────────────────────────────────────────────────────────────
function closeChatView() {
    activeChatFriend = null;
    if (messageListener) { messageListener(); messageListener = null; }
    const chat  = document.getElementById('dm-chat-view');
    const inbox = document.getElementById('dm-inbox-view');
    if (chat)  chat.classList.add('hidden');
    if (inbox) inbox.classList.remove('hidden');
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

// ── SEND STICKER/GIF DM ───────────────────────────────────────────────────────
function sendStickerDM(url, label) {
    if (!activeChatFriend) return;
    saveMessage({ type: 'sticker', imageDataUrl: url, text: label || '🎭 Sticker' });
    closeStickerPanel();
}

function sendGifDM(url) {
    if (!activeChatFriend) return;
    saveMessage({ type: 'gif', imageDataUrl: url, text: '🎞 GIF' });
    closeGifPanel();
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
                if ((m.type === 'image' || m.type === 'gif') && m.imageDataUrl) {
                    const cls = m.type === 'gif' ? 'msg-img msg-gif' : 'msg-img';
                    content = `<div style="position:relative;display:inline-block">
                        <img src="${m.imageDataUrl}" class="${cls}" onclick="viewImage(this.src)">
                        ${m.type === 'gif' ? '<span class="gif-badge msg-gif-badge">GIF</span>' : ''}
                    </div>`;
                } else if (m.type === 'sticker' && m.imageDataUrl) {
                    content = `<img src="${m.imageDataUrl}" class="msg-sticker" onclick="viewImage(this.src)">`;
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

            if (typingRow) box.appendChild(typingRow);
            box.scrollTop = box.scrollHeight;
        }, () => { typingListener && typingListener(); });
}
