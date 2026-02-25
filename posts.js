// ═══════════════════════════════════════════════════════
// posts.js — Feed, Create Post, Like, Delete, Comments, Bookmarks, Profile
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

// ── IMAGE FILE PREVIEW ────────────────────────────────────────────────────────
document.getElementById('post-image').addEventListener('change', function () {
    const file = this.files[0]; if (!file) return;
    // Clear any sticker/GIF selection first
    window._postGif = null;
    window._postSticker = null;
    const badge = document.getElementById('post-media-badge');
    if (badge) badge.remove();

    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('image-preview').src = e.target.result;
        document.getElementById('image-preview-wrap').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

function removeImage() {
    const imgEl = document.getElementById('post-image');
    if (imgEl) imgEl.value = '';
    const wrap = document.getElementById('image-preview-wrap');
    if (wrap) wrap.classList.add('hidden');
    const prev = document.getElementById('image-preview');
    if (prev) prev.src = '';
}

// ── CLEAR ALL POST MEDIA (called from media.js & internally) ─────────────────
function clearPostMedia() {
    window._postGif     = null;
    window._postSticker = null;
    const badge = document.getElementById('post-media-badge');
    if (badge) badge.remove();
    removeImage();
}

// ── SHOW SELECTED MEDIA BADGE (called from media.js) ─────────────────────────
// previewSrc = data URL or external URL to show as thumbnail
// label      = human-readable label e.g. "GIF" or "🎭 Sticker"
function showPostMediaBadge(previewSrc, label) {
    const old = document.getElementById('post-media-badge');
    if (old) old.remove();
    // Remove image file too if user switches to sticker/GIF
    removeImage();

    const badge = document.createElement('div');
    badge.id = 'post-media-badge';
    badge.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--primary-light);border-radius:12px;margin-bottom:10px;border:1.5px solid var(--primary);';
    badge.innerHTML = `
        <img src="${previewSrc}" alt="${label}" style="height:48px;max-width:80px;border-radius:8px;object-fit:contain;background:#fff;">
        <span style="font-size:0.85rem;color:var(--primary);font-weight:600;flex:1;">${label}</span>
        <button onclick="clearPostMedia()" style="background:none;border:none;cursor:pointer;color:var(--primary);font-size:1.2rem;line-height:1;" title="Remove">✕</button>`;

    const imagePreviewWrap = document.getElementById('image-preview-wrap');
    if (imagePreviewWrap && imagePreviewWrap.parentNode) {
        imagePreviewWrap.parentNode.insertBefore(badge, imagePreviewWrap);
    }
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

    const hasGif     = !!window._postGif;
    const hasSticker = !!window._postSticker;

    if (!text && !file && !hasGif && !hasSticker) {
        setStatus('Write something, or pick a photo, GIF or sticker!', '#ef4444');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Publishing…';
    setStatus('', '#94a3b8');

    try {
        // imageDataUrl = base64 data (photos compressed + sticker canvas)
        // imageUrl     = external URL (Giphy GIFs — not fetched as data)
        let imageDataUrl = '';
        let imageUrl     = '';
        let mediaType    = '';

        if (hasSticker) {
            imageDataUrl = window._postSticker; // canvas data URL from emojiToDataUrl()
            mediaType    = 'sticker';
        } else if (hasGif) {
            imageUrl  = window._postGif;        // Giphy CDN URL — stored as imageUrl
            mediaType = 'gif';
        } else if (file) {
            setStatus('Processing image…', '#94a3b8');
            imageDataUrl = await compressImage(file, 800, 0.75);
            mediaType    = 'image';
            setStatus('Saving…', '#94a3b8');
        }

        await db.collection('posts').add({
            uid:          currentUser.uid,
            email:        currentUser.email,
            text:         text || '',
            imageDataUrl: imageDataUrl,
            imageUrl:     imageUrl,
            mediaType:    mediaType,
            tags,
            views:        0,
            likes:        0,
            likedBy:      [],
            commentCount: 0,
            bookmarks:    [],
            createdAt:    firebase.firestore.FieldValue.serverTimestamp()
        });

        // Reset form
        if (textEl)  textEl.value = '';
        if (tagsEl)  { tagsEl.value = ''; tagsEl.classList.add('hidden'); }
        clearPostMedia();
        document.getElementById('char-counter').innerText = '300';

        setStatus('✓ Posted!', '#22c55e');
        setTimeout(() => { setStatus('', ''); showView('feed'); }, 900);

    } catch (err) {
        setStatus('Failed: ' + err.message, '#ef4444');
    }

    btn.disabled = false;
    btn.innerText = 'Publish';
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
            const post      = doc.data();
            const isOwn     = post.uid === currentUser.uid;
            const likedBy   = post.likedBy   || [];
            const bookmarks = post.bookmarks  || [];
            const hasLiked  = likedBy.includes(currentUser.uid);
            const hasSaved  = bookmarks.includes(currentUser.uid);
            const cCount    = post.commentCount || 0;
            const initial   = (post.email || '?')[0].toUpperCase();

            // Pick the right image source:
            //  - photos & stickers: imageDataUrl (base64)
            //  - GIFs:              imageUrl     (Giphy URL)
            const imgSrc = post.imageDataUrl || post.imageUrl || '';

            const div = document.createElement('div');
            div.className = 'post';
            div.setAttribute('data-post-id', doc.id);

            // ── Media HTML ────────────────────────────────────────────────────
            let mediaHtml = '';
            if (imgSrc) {
                const safeImgSrc = imgSrc.replace(/'/g, '%27');
                if (post.mediaType === 'sticker') {
                    mediaHtml = `
                        <div class="post-sticker-wrap">
                            <img src="${imgSrc}" class="post-sticker-img" loading="lazy"
                                 onclick="viewImage('${safeImgSrc}')">
                        </div>`;
                } else if (post.mediaType === 'gif') {
                    mediaHtml = `
                        <div class="post-gif-wrap">
                            <img src="${imgSrc}" class="post-img" loading="lazy"
                                 onclick="viewImage('${safeImgSrc}')">
                            <span class="gif-badge">GIF</span>
                        </div>`;
                } else {
                    mediaHtml = `
                        <img src="${imgSrc}" class="post-img" loading="lazy"
                             onclick="viewImage('${safeImgSrc}')">`;
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
                    ${isOwn ? `
                    <button class="post-delete-btn" onclick="deletePost('${doc.id}')" title="Delete post">
                        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>` : ''}
                </div>
                ${mediaHtml}
                <div class="post-content">
                    ${post.text ? `<p class="post-text">${escapeHtml(post.text)}</p>` : ''}
                    ${post.tags && post.tags.length
                        ? `<div class="post-tags">${post.tags.map(t =>
                            `<span class="tag" onclick="typeof filterByTag==='function'&&filterByTag('${escapeHtml(t)}')">#${escapeHtml(t)}</span>`
                          ).join('')}</div>`
                        : ''}
                </div>
                <div class="post-stats">
                    <span class="post-stat">❤️ <strong>${post.likes || 0}</strong></span>
                    <span class="post-stat">👁 <strong>${post.views || 0}</strong></span>
                    <span class="post-stat">💬 <strong>${cCount}</strong></span>
                    <span class="post-stat">🔖 <strong>${bookmarks.length}</strong></span>
                </div>
                <div class="post-actions">
                    <button class="action-btn ${hasLiked ? 'liked' : ''}" onclick="toggleLike('${doc.id}', ${hasLiked})">
                        ${hasLiked ? '❤️' : '🤍'} Like
                    </button>
                    <button class="action-btn" id="cmtbtn-${doc.id}" onclick="toggleComments('${doc.id}', this)">
                        💬 ${cCount > 0 ? cCount + (cCount === 1 ? ' Comment' : ' Comments') : 'Comment'}
                    </button>
                    <button class="action-btn ${hasSaved ? 'saved' : ''}" onclick="toggleBookmark('${doc.id}', ${hasSaved})" title="${hasSaved ? 'Unsave' : 'Save post'}">
                        ${hasSaved ? '🔖' : '🏷️'} Save
                    </button>
                    ${!isOwn ? `<button class="action-btn" onclick="startChat('${post.email}')">✉️ Chat</button>` : ''}
                </div>
                <div class="comments-section" id="comments-${doc.id}" style="display:none;">
                    <div class="comments-list" id="comments-list-${doc.id}"></div>
                    <div class="comment-input-row">
                        <div class="comment-avatar">${currentUser.email[0].toUpperCase()}</div>
                        <input class="comment-input" id="comment-input-${doc.id}"
                               placeholder="Write a comment…" maxlength="200"
                               onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitComment('${doc.id}');}">
                        <button class="comment-send-btn" onclick="submitComment('${doc.id}')">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                        </button>
                    </div>
                </div>`;

            list.appendChild(div);
        });
    });
}

// ── TOGGLE LIKE ───────────────────────────────────────────────────────────────
function toggleLike(id, hasLiked) {
    const ref = db.collection('posts').doc(id);
    if (hasLiked) {
        ref.update({ likes: firebase.firestore.FieldValue.increment(-1), likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
    } else {
        ref.update({ likes: firebase.firestore.FieldValue.increment(1),  likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
        if (typeof showToast === 'function') showToast('❤️ Liked!');
    }
}

// ── BOOKMARK ─────────────────────────────────────────────────────────────────
function toggleBookmark(id, hasSaved) {
    const ref = db.collection('posts').doc(id);
    if (hasSaved) {
        ref.update({ bookmarks: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
        if (typeof showToast === 'function') showToast('Removed from saved');
    } else {
        ref.update({ bookmarks: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
        if (typeof showToast === 'function') showToast('🔖 Post saved!');
    }
}

// ── DELETE POST ───────────────────────────────────────────────────────────────
async function deletePost(id) {
    if (!confirm('Delete this post?')) return;
    try { await db.collection('posts').doc(id).delete(); }
    catch (e) { alert('Could not delete: ' + e.message); }
}

// ── COMMENTS ─────────────────────────────────────────────────────────────────
const _commentListeners = {};

function toggleComments(postId, btnEl) {
    const section = document.getElementById('comments-' + postId);
    if (!section) return;
    const isOpen = section.style.display === 'block';

    if (isOpen) {
        section.style.display = 'none';
        if (_commentListeners[postId]) { _commentListeners[postId](); delete _commentListeners[postId]; }
    } else {
        section.style.display = 'block';
        loadComments(postId);
        const input = document.getElementById('comment-input-' + postId);
        if (input) setTimeout(() => input.focus(), 100);
    }
}

function loadComments(postId) {
    if (_commentListeners[postId]) return;
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;
    listEl.innerHTML = '<div class="comments-loading">Loading…</div>';

    _commentListeners[postId] = db.collection('posts').doc(postId)
        .collection('comments').orderBy('createdAt', 'asc')
        .onSnapshot(snap => {
            listEl.innerHTML = '';
            if (snap.empty) {
                listEl.innerHTML = '<div class="no-comments">No comments yet — be the first!</div>';
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
                        <div class="comment-author">${escapeHtml(c.email||'')}${isMine ? ' <span class="you-badge">(you)</span>' : ''}</div>
                        <div class="comment-text">${escapeHtml(c.text||'')}</div>
                        <div class="comment-time">${timeAgo(c.createdAt)}</div>
                    </div>
                    ${isMine ? `<button class="comment-delete-btn" onclick="deleteComment('${postId}','${doc.id}')">✕</button>` : ''}`;
                listEl.appendChild(item);
            });
            // Sync button label
            const btn = document.getElementById('cmtbtn-' + postId);
            if (btn) {
                const n = snap.size;
                btn.textContent = '💬 ' + (n > 0 ? n + (n === 1 ? ' Comment' : ' Comments') : 'Comment');
            }
        }, err => {
            listEl.innerHTML = `<div class="no-comments" style="color:var(--danger)">Error: ${err.message}</div>`;
        });
}

async function submitComment(postId) {
    const input = document.getElementById('comment-input-' + postId);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.disabled = true;
    try {
        await db.collection('posts').doc(postId).collection('comments').add({
            uid: currentUser.uid, email: currentUser.email,
            text, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        db.collection('posts').doc(postId).update({
            commentCount: firebase.firestore.FieldValue.increment(1)
        });
    } catch (e) { alert('Could not comment: ' + e.message); }
    input.disabled = false;
    input.focus();
}

async function deleteComment(postId, commentId) {
    try {
        await db.collection('posts').doc(postId).collection('comments').doc(commentId).delete();
        db.collection('posts').doc(postId).update({
            commentCount: firebase.firestore.FieldValue.increment(-1)
        });
    } catch (e) { alert('Could not delete: ' + e.message); }
}

// ── PROFILE VIEW ──────────────────────────────────────────────────────────────
function loadProfile() {
    if (!currentUser) return;
    const email   = currentUser.email;
    const initial = email[0].toUpperCase();

    document.getElementById('profile-avatar-big').innerText = initial;
    document.getElementById('profile-email').innerText      = email;

    db.collection('posts').where('uid', '==', currentUser.uid)
        .orderBy('createdAt', 'desc').get().then(snap => {
            let totalLikes = 0, totalViews = 0, totalSaves = 0;
            const posts = [];
            snap.forEach(doc => {
                const d = doc.data();
                totalLikes  += d.likes || 0;
                totalViews  += d.views || 0;
                totalSaves  += (d.bookmarks || []).length;
                posts.push({ id: doc.id, ...d });
            });

            document.getElementById('profile-stats').innerHTML = `
                <div class="profile-stat"><div class="profile-stat-num">${snap.size}</div><div class="profile-stat-label">Posts</div></div>
                <div class="profile-stat"><div class="profile-stat-num">${totalLikes}</div><div class="profile-stat-label">Likes</div></div>
                <div class="profile-stat"><div class="profile-stat-num">${totalViews}</div><div class="profile-stat-label">Views</div></div>
                <div class="profile-stat"><div class="profile-stat-num">${totalSaves}</div><div class="profile-stat-label">Saves</div></div>
            `;

            const postsEl = document.getElementById('profile-posts');
            if (!posts.length) {
                postsEl.innerHTML = '<p class="profile-empty">No posts yet</p>';
                return;
            }
            postsEl.innerHTML = `
                <h4 class="profile-posts-title">Your Posts</h4>
                <div class="profile-grid">
                    ${posts.slice(0, 9).map(p => {
                        const src = p.imageDataUrl || p.imageUrl || '';
                        return `<div class="profile-grid-item" title="${escapeHtml((p.text||'').substring(0,60))}">
                            ${src
                                ? `<img src="${src}" alt="" loading="lazy">`
                                : `<div class="profile-grid-text">${escapeHtml((p.text||'📝').substring(0,40))}</div>`
                            }
                        </div>`;
                    }).join('')}
                </div>`;
        }).catch(e => console.warn('Profile load:', e));
}
