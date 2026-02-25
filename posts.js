// ═══════════════════════════════════════════════════════
// posts.js — Feed, Create Post, Like, Delete, Comments, Profile
// ═══════════════════════════════════════════════════════

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
    // Also clear selected GIF/sticker
    window._postGif = null;
    window._postSticker = null;
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

    if (!text && !file && !window._postGif && !window._postSticker) {
        setStatus('Please write something!', '#ef4444'); return;
    }
    btn.disabled = true; btn.innerText = 'Publishing...';
    setStatus('', '#94a3b8');

    try {
        let imageDataUrl = window._postSticker || window._postGif || '';
        let mediaType = window._postSticker ? 'sticker' : (window._postGif ? 'gif' : '');

        if (file && !imageDataUrl) {
            setStatus('Processing image...', '#94a3b8');
            imageDataUrl = await compressImage(file, 800, 0.75);
            mediaType = 'image';
            setStatus('Saving...', '#94a3b8');
        }

        await db.collection('posts').add({
            uid: currentUser.uid, email: currentUser.email,
            text: text || '', imageDataUrl, imageUrl: '',
            mediaType: mediaType || '',
            tags, views: 0, likes: 0, likedBy: [], commentCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (textEl)  textEl.value  = '';
        if (tagsEl)  { tagsEl.value = ''; tagsEl.classList.add('hidden'); }
        if (imageEl) imageEl.value = '';
        document.getElementById('char-counter').innerText = '300';
        removeImage();
        window._postGif = null;
        window._postSticker = null;
        setStatus('✓ Posted!', '#22c55e');
        setTimeout(() => { setStatus('', ''); showView('feed'); }, 800);
    } catch (err) {
        setStatus('Failed: ' + err.message, '#ef4444');
    }

    btn.disabled = false; btn.innerText = 'Publish';
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
            div.setAttribute('data-post-id', doc.id);

            // Media rendering — stickers smaller, GIFs labeled
            let mediaHtml = '';
            if (imgSrc) {
                if (post.mediaType === 'sticker') {
                    mediaHtml = `<div class="post-sticker-wrap"><img src="${imgSrc}" class="post-sticker" loading="lazy"></div>`;
                } else if (post.mediaType === 'gif') {
                    mediaHtml = `<div class="post-gif-wrap"><img src="${imgSrc}" class="post-img" loading="lazy"><span class="gif-badge">GIF</span></div>`;
                } else {
                    mediaHtml = `<img src="${imgSrc}" class="post-img" loading="lazy">`;
                }
            }

            div.innerHTML = `
                <div class="post-header">
                    <div class="avatar post-avatar">${initial}</div>
                    <div class="post-header-info">
                        <div class="post-author ${isOwn ? '' : 'clickable'}"
                             onclick="${isOwn ? '' : `startChat('${post.email}')`}">
                            ${escapeHtml(post.email)}
                            ${isOwn ? '<span class="you-badge">(you)</span>' : ''}
                        </div>
                        <div class="post-time">${timeAgo(post.createdAt)}</div>
                    </div>
                </div>
                ${mediaHtml}
                <div class="post-content">
                    ${post.text ? `<p class="post-text">${escapeHtml(post.text)}</p>` : ''}
                    ${post.tags && post.tags.length ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
                </div>
                <div class="post-stats">
                    <span class="post-stat">❤️ ${post.likes || 0} likes</span>
                    <span class="post-stat">👁 ${post.views || 0} views</span>
                    <span class="post-stat">💬 ${post.commentCount || 0} comments</span>
                </div>
                <div class="post-actions">
                    <button class="action-btn ${hasLiked ? 'liked' : ''}" onclick="toggleLike('${doc.id}', ${hasLiked})">
                        ${hasLiked ? '❤️' : '🤍'} Like
                    </button>
                    <button class="action-btn" onclick="toggleComments('${doc.id}', this)">💬 Comment</button>
                    ${!isOwn ? `<button class="action-btn" onclick="startChat('${post.email}')">✉️ Message</button>` : ''}
                    ${isOwn  ? `<button class="action-btn delete-btn" onclick="deletePost('${doc.id}')">🗑 Delete</button>` : ''}
                </div>
                <div class="comments-section hidden" id="comments-${doc.id}">
                    <div class="comments-list" id="comments-list-${doc.id}"></div>
                    <div class="comment-input-row">
                        <div class="comment-avatar">${currentUser.email[0].toUpperCase()}</div>
                        <input class="comment-input" id="comment-input-${doc.id}" placeholder="Write a comment…" maxlength="200"
                               onkeydown="if(event.key==='Enter')submitComment('${doc.id}')">
                        <button class="comment-send-btn" onclick="submitComment('${doc.id}')">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                        </button>
                    </div>
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
        if (typeof showToast === 'function') showToast('❤️ Liked!');
    }
}

async function deletePost(id) {
    if (!confirm('Delete this post?')) return;
    try { await db.collection('posts').doc(id).delete(); }
    catch (e) { alert('Could not delete: ' + e.message); }
}

// ── COMMENTS ──────────────────────────────────────────────────────────────────
const _commentListeners = {};

function toggleComments(postId, btn) {
    const section = document.getElementById('comments-' + postId);
    if (!section) return;
    const isHidden = section.classList.contains('hidden');
    section.classList.toggle('hidden', !isHidden);
    if (isHidden) {
        loadComments(postId);
        const input = document.getElementById('comment-input-' + postId);
        if (input) setTimeout(() => input.focus(), 100);
    } else {
        if (_commentListeners[postId]) { _commentListeners[postId](); delete _commentListeners[postId]; }
    }
}

function loadComments(postId) {
    if (_commentListeners[postId]) return; // already listening
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;

    _commentListeners[postId] = db.collection('posts').doc(postId)
        .collection('comments').orderBy('createdAt', 'asc')
        .onSnapshot(snap => {
            listEl.innerHTML = '';
            if (snap.empty) {
                listEl.innerHTML = '<div class="no-comments">Be the first to comment!</div>';
                return;
            }
            snap.forEach(doc => {
                const c = doc.data();
                const isMine = c.uid === currentUser.uid;
                const item = document.createElement('div');
                item.className = 'comment-item';
                item.innerHTML = `
                    <div class="comment-avatar-sm">${(c.email||'?')[0].toUpperCase()}</div>
                    <div class="comment-body">
                        <div class="comment-author">${escapeHtml(c.email)}${isMine ? ' <span class="you-badge">(you)</span>' : ''}</div>
                        <div class="comment-text">${escapeHtml(c.text)}</div>
                        <div class="comment-time">${timeAgo(c.createdAt)}</div>
                    </div>
                    ${isMine ? `<button class="comment-delete-btn" onclick="deleteComment('${postId}','${doc.id}')">✕</button>` : ''}`;
                listEl.appendChild(item);
            });
        });
}

async function submitComment(postId) {
    const input = document.getElementById('comment-input-' + postId);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
        await db.collection('posts').doc(postId).collection('comments').add({
            uid: currentUser.uid, email: currentUser.email,
            text, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        db.collection('posts').doc(postId).update({
            commentCount: firebase.firestore.FieldValue.increment(1)
        });
    } catch (e) { alert('Could not post comment: ' + e.message); }
}

async function deleteComment(postId, commentId) {
    try {
        await db.collection('posts').doc(postId).collection('comments').doc(commentId).delete();
        db.collection('posts').doc(postId).update({
            commentCount: firebase.firestore.FieldValue.increment(-1)
        });
    } catch (e) { alert('Could not delete comment: ' + e.message); }
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
            `<div class="profile-mini-post">${p.text ? escapeHtml(p.text.substring(0, 80)) + (p.text.length > 80 ? '…' : '') : '📷 Media post'}</div>`
        ).join('');
    });
}
