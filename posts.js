// ═══════════════════════════════════════════════════════════════
// posts.js — Feed, Create, Comments, Bookmarks, Link Previews
// ═══════════════════════════════════════════════════════════════

// ── CHAR COUNTER ──────────────────────────────────────────────────────────────
document.getElementById('post-text').addEventListener('input', function () {
    const rem = 300 - this.value.length;
    const c   = document.getElementById('char-counter');
    c.textContent  = rem;
    c.style.color  = rem < 20 ? '#ef4444' : '#94a3b8';
    // Live link detection
    _detectLink(this.value);
});

// ── TAGS ─────────────────────────────────────────────────────────────────────
function focusTags() {
    const t = document.getElementById('post-tags');
    t.classList.remove('hidden');
    t.focus();
}

// ── IMAGE FILE PREVIEW ────────────────────────────────────────────────────────
document.getElementById('post-image').addEventListener('change', function () {
    const file = this.files[0]; if (!file) return;
    window._postGif = null; window._postSticker = null;
    const b = document.getElementById('post-media-badge'); if (b) b.remove();
    const r = new FileReader();
    r.onload = e => {
        document.getElementById('image-preview').src = e.target.result;
        document.getElementById('image-preview-wrap').classList.remove('hidden');
    };
    r.readAsDataURL(file);
});

function removeImage() {
    const i = document.getElementById('post-image'); if (i) i.value = '';
    const w = document.getElementById('image-preview-wrap'); if (w) w.classList.add('hidden');
    const p = document.getElementById('image-preview'); if (p) p.src = '';
}

function clearPostMedia() {
    window._postGif = null; window._postSticker = null;
    const b = document.getElementById('post-media-badge'); if (b) b.remove();
    removeImage();
}

// ── SHOW MEDIA BADGE (called from media.js) ───────────────────────────────────
function showPostMediaBadge(previewSrc, label) {
    const old = document.getElementById('post-media-badge'); if (old) old.remove();
    removeImage();
    const badge = document.createElement('div');
    badge.id = 'post-media-badge';
    badge.className = 'post-media-badge';
    badge.innerHTML = `
        <img src="${previewSrc}" alt="">
        <span>${label}</span>
        <button onclick="clearPostMedia()" title="Remove">✕</button>`;
    const wrap = document.getElementById('image-preview-wrap');
    if (wrap && wrap.parentNode) wrap.parentNode.insertBefore(badge, wrap);
}

// ── LINK DETECTION ────────────────────────────────────────────────────────────
let _detectedLink = null;

function _detectLink(text) {
    const urlRe = /https?:\/\/[^\s]+/i;
    const match = text.match(urlRe);
    const preview = document.getElementById('link-preview-box');
    if (match) {
        _detectedLink = match[0];
        if (preview) preview.style.display = 'block';
        _renderLinkPreview(_detectedLink, preview);
    } else {
        _detectedLink = null;
        if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    }
}

function _ytId(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
}

function _renderLinkPreview(url, el) {
    if (!el) return;
    const ytId = _ytId(url);
    if (ytId) {
        el.innerHTML = `
            <div class="lp-yt">
                <img src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg" alt="YouTube thumbnail">
                <div class="lp-yt-play">▶</div>
                <div class="lp-yt-label">YouTube Video</div>
            </div>`;
        return;
    }
    // Generic link card
    let domain = '';
    try { domain = new URL(url).hostname.replace('www.',''); } catch(e) { domain = url; }
    el.innerHTML = `
        <div class="lp-generic">
            <div class="lp-icon">🔗</div>
            <div class="lp-info">
                <div class="lp-domain">${escapeHtml(domain)}</div>
                <div class="lp-url">${escapeHtml(url.substring(0,60))}${url.length>60?'…':''}</div>
            </div>
        </div>`;
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
            .map(t => t.trim().replace(/[^a-zA-Z0-9]/g,''))
            .filter(t => t).slice(0, 10);
    }

    const setStatus = (msg, color) => { if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color || '#94a3b8'; } };

    const hasGif     = !!window._postGif;
    const hasSticker = !!window._postSticker;

    if (!text && !file && !hasGif && !hasSticker) {
        setStatus('Write something, or add a photo, GIF or sticker!', '#ef4444');
        return;
    }

    btn.disabled = true; btn.textContent = 'Publishing…'; setStatus('','#94a3b8');

    try {
        let imageDataUrl = '';
        let imageUrl     = '';
        let mediaType    = '';
        let linkUrl      = '';
        let linkType     = '';  // 'youtube' | 'link' | ''
        let ytId         = '';

        if (hasSticker) {
            imageDataUrl = window._postSticker;
            mediaType    = 'sticker';
        } else if (hasGif) {
            imageUrl  = window._postGif;
            mediaType = 'gif';
        } else if (file) {
            setStatus('Processing image…','#94a3b8');
            imageDataUrl = await compressImage(file, 800, 0.75);
            mediaType    = 'image';
        }

        // Detect links in text
        if (text) {
            const urlMatch = text.match(/https?:\/\/[^\s]+/i);
            if (urlMatch) {
                linkUrl = urlMatch[0];
                const yt = _ytId(linkUrl);
                if (yt) { linkType = 'youtube'; ytId = yt; }
                else    { linkType = 'link'; }
            }
        }

        await db.collection('posts').add({
            uid: currentUser.uid, email: currentUser.email,
            text:         text || '',
            imageDataUrl, imageUrl, mediaType,
            linkUrl, linkType, ytId,
            tags,
            views:        0, likes: 0, likedBy: [],
            commentCount: 0, bookmarks: [],
            createdAt:    firebase.firestore.FieldValue.serverTimestamp()
        });

        textEl.value = '';
        if (tagsEl) { tagsEl.value = ''; tagsEl.classList.add('hidden'); }
        clearPostMedia();
        document.getElementById('char-counter').textContent = '300';
        const lp = document.getElementById('link-preview-box');
        if (lp) { lp.style.display = 'none'; lp.innerHTML = ''; }
        _detectedLink = null;

        setStatus('✓ Posted!','#22c55e');
        setTimeout(() => { setStatus('',''); showView('feed'); }, 900);

    } catch (err) {
        setStatus('Failed: ' + err.message, '#ef4444');
    }
    btn.disabled = false; btn.textContent = 'Publish';
}

// ── LOAD POSTS ────────────────────────────────────────────────────────────────
function loadPosts() {
    db.collection('posts').orderBy('createdAt','desc').onSnapshot(snap => {
        const list = document.getElementById('posts-list');
        if (!list) return;
        list.innerHTML = '';

        if (snap.empty) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌍</div><p>No posts yet.<br>Be the first to share!</p></div>`;
            return;
        }

        snap.forEach(doc => {
            const p         = doc.data();
            const isOwn     = p.uid === currentUser.uid;
            const likedBy   = p.likedBy   || [];
            const bookmarks = p.bookmarks  || [];
            const hasLiked  = likedBy.includes(currentUser.uid);
            const hasSaved  = bookmarks.includes(currentUser.uid);
            const cCount    = p.commentCount || 0;
            const initial   = (p.email || '?')[0].toUpperCase();
            const imgSrc    = p.imageDataUrl || p.imageUrl || '';

            // ── Media HTML ─────────────────────────────────────────────────
            let mediaHtml = '';
            if (imgSrc) {
                const safe = imgSrc.replace(/'/g,'%27');
                if (p.mediaType === 'sticker') {
                    mediaHtml = `<div class="post-sticker-wrap"><img src="${imgSrc}" class="post-sticker-img" loading="lazy" onclick="viewImage('${safe}')"></div>`;
                } else if (p.mediaType === 'gif') {
                    mediaHtml = `<div class="post-gif-wrap"><img src="${imgSrc}" class="post-img" loading="lazy" onclick="viewImage('${safe}')"><span class="gif-badge">GIF</span></div>`;
                } else {
                    mediaHtml = `<img src="${imgSrc}" class="post-img" loading="lazy" onclick="viewImage('${safe}')">`;
                }
            }

            // ── Link Preview HTML ──────────────────────────────────────────
            let linkHtml = '';
            if (p.linkType === 'youtube' && p.ytId) {
                linkHtml = `
                    <div class="post-link-preview yt" onclick="_openYt('${p.ytId}')">
                        <div class="lp-thumb-wrap">
                            <img src="https://img.youtube.com/vi/${p.ytId}/mqdefault.jpg" alt="YouTube" loading="lazy">
                            <div class="lp-play-btn">▶</div>
                        </div>
                        <div class="lp-meta">
                            <div class="lp-source"><span class="lp-yt-badge">▶ YouTube</span></div>
                            <div class="lp-link-url">${escapeHtml(p.linkUrl || '')}</div>
                        </div>
                    </div>`;
            } else if (p.linkType === 'link' && p.linkUrl) {
                let domain = '';
                try { domain = new URL(p.linkUrl).hostname.replace('www.',''); } catch(e) { domain = p.linkUrl; }
                linkHtml = `
                    <a class="post-link-preview generic" href="${escapeHtml(p.linkUrl)}" target="_blank" rel="noopener noreferrer">
                        <div class="lp-link-icon">🔗</div>
                        <div class="lp-meta">
                            <div class="lp-source">${escapeHtml(domain)}</div>
                            <div class="lp-link-url">${escapeHtml((p.linkUrl||'').substring(0,60))}${(p.linkUrl||'').length>60?'…':''}</div>
                        </div>
                    </a>`;
            }

            // ── Post text (auto-linkify) ───────────────────────────────────
            let textHtml = '';
            if (p.text) {
                textHtml = escapeHtml(p.text).replace(
                    /(https?:\/\/[^\s&lt;&gt;"]+)/gi,
                    `<a href="$1" target="_blank" rel="noopener noreferrer" class="post-link" onclick="event.stopPropagation()">$1</a>`
                );
            }

            // ── Avatar / color from profile ────────────────────────────────
            const avatarStyle = _getAvatarStyle(p.uid);

            const div = document.createElement('div');
            div.className = 'post';
            div.setAttribute('data-post-id', doc.id);

            div.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar avatar" style="${avatarStyle}">${initial}</div>
                    <div class="post-header-info">
                        <div class="post-author${isOwn ? '' : ' clickable'}" onclick="${isOwn ? '' : `startChat('${p.email}')`}">
                            ${escapeHtml(p.email)}${isOwn ? ' <span class="you-badge">(you)</span>' : ''}
                        </div>
                        <div class="post-time">${timeAgo(p.createdAt)}</div>
                    </div>
                    ${isOwn ? `<button class="post-delete-btn" onclick="deletePost('${doc.id}')" title="Delete">
                        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                    </button>` : ''}
                </div>
                ${mediaHtml}
                ${textHtml ? `<div class="post-content"><p class="post-text">${textHtml}</p></div>` : ''}
                ${p.tags && p.tags.length ? `<div class="post-tags-row">${p.tags.map(t=>`<span class="tag" onclick="typeof filterByTag==='function'&&filterByTag('${escapeHtml(t)}')">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
                ${linkHtml}
                <div class="post-stats">
                    <span class="post-stat">❤️ ${p.likes||0}</span>
                    <span class="post-stat">👁 ${p.views||0}</span>
                    <span class="post-stat">💬 ${cCount}</span>
                    <span class="post-stat">🔖 ${bookmarks.length}</span>
                </div>
                <div class="post-actions">
                    <button class="action-btn${hasLiked?' liked':''}" onclick="toggleLike('${doc.id}',${hasLiked})">${hasLiked?'❤️':'🤍'} Like</button>
                    <button class="action-btn" id="cmtbtn-${doc.id}" onclick="toggleComments('${doc.id}',this)">💬 ${cCount>0?cCount+(cCount===1?' Comment':' Comments'):'Comment'}</button>
                    <button class="action-btn${hasSaved?' saved':''}" onclick="toggleBookmark('${doc.id}',${hasSaved})">${hasSaved?'🔖':'🏷️'} Save</button>
                    ${!isOwn?`<button class="action-btn" onclick="startChat('${p.email}')">✉️ Chat</button>`:''}
                </div>
                <div class="comments-section" id="comments-${doc.id}" style="display:none;">
                    <div class="comments-list" id="comments-list-${doc.id}"></div>
                    <div class="comment-input-row">
                        <div class="comment-avatar">${currentUser.email[0].toUpperCase()}</div>
                        <input class="comment-input" id="comment-input-${doc.id}" placeholder="Write a comment…" maxlength="200"
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

// avatar cache to avoid repeated Firestore calls
const _avatarCache = {};
function _getAvatarStyle(uid) {
    if (_avatarCache[uid]) return _avatarCache[uid];
    // Load asynchronously and update elements
    db.collection('profiles').doc(uid).get().then(snap => {
        if (!snap.exists) return;
        const d = snap.data();
        let style = '';
        if (d.avatarGradient) style = `background:${d.avatarGradient};`;
        else if (d.avatarColor) style = `background:${d.avatarColor};`;
        if (d.avatarAnim === 'pulse')  style += 'animation:avatarPulse 2s infinite;';
        if (d.avatarAnim === 'spin')   style += 'animation:avatarSpin 3s linear infinite;';
        if (d.avatarAnim === 'bounce') style += 'animation:avatarBounce 1s infinite;';
        if (d.avatarAnim === 'glow')   style += 'animation:avatarGlow 2s infinite;';
        _avatarCache[uid] = style;
        // Retroactively update all avatars for this uid in the feed
        document.querySelectorAll(`.post-avatar[data-uid="${uid}"]`).forEach(el => el.style.cssText = style);
    }).catch(()=>{});
    return '';
}

// ── OPEN YOUTUBE ──────────────────────────────────────────────────────────────
function _openYt(ytId) {
    const lb = document.createElement('div');
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;';
    lb.innerHTML = `
        <iframe width="560" height="315" style="max-width:95vw;max-height:55vh;border-radius:12px;border:none;"
            src="https://www.youtube.com/embed/${ytId}?autoplay=1" allow="autoplay;fullscreen" allowfullscreen></iframe>
        <button style="margin-top:16px;background:rgba(255,255,255,0.12);border:none;color:white;padding:8px 24px;border-radius:20px;font-size:0.9rem;cursor:pointer;" onclick="this.closest('div').remove()">✕ Close</button>`;
    lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
    document.body.appendChild(lb);
}

// ── LIKE / BOOKMARK ───────────────────────────────────────────────────────────
function toggleLike(id, hasLiked) {
    const ref = db.collection('posts').doc(id);
    if (hasLiked) {
        ref.update({ likes: firebase.firestore.FieldValue.increment(-1), likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
    } else {
        ref.update({ likes: firebase.firestore.FieldValue.increment(1), likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
        if (typeof showToast === 'function') showToast('❤️ Liked!');
    }
}

function toggleBookmark(id, hasSaved) {
    const ref = db.collection('posts').doc(id);
    if (hasSaved) {
        ref.update({ bookmarks: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
        if (typeof showToast === 'function') showToast('Removed from saved');
    } else {
        ref.update({ bookmarks: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
        if (typeof showToast === 'function') showToast('🔖 Saved!');
    }
}

async function deletePost(id) {
    if (!confirm('Delete this post?')) return;
    try { await db.collection('posts').doc(id).delete(); }
    catch (e) { alert('Could not delete: ' + e.message); }
}

// ── COMMENTS ─────────────────────────────────────────────────────────────────
const _commentListeners = {};

function toggleComments(postId) {
    const section = document.getElementById('comments-' + postId);
    if (!section) return;
    if (section.style.display === 'block') {
        section.style.display = 'none';
        if (_commentListeners[postId]) { _commentListeners[postId](); delete _commentListeners[postId]; }
    } else {
        section.style.display = 'block';
        loadComments(postId);
        const inp = document.getElementById('comment-input-' + postId);
        if (inp) setTimeout(() => inp.focus(), 100);
    }
}

function loadComments(postId) {
    if (_commentListeners[postId]) return;
    const listEl = document.getElementById('comments-list-' + postId);
    if (!listEl) return;
    listEl.innerHTML = '<div class="comments-loading">Loading…</div>';

    _commentListeners[postId] = db.collection('posts').doc(postId)
        .collection('comments').orderBy('createdAt','asc')
        .onSnapshot(snap => {
            listEl.innerHTML = '';
            if (snap.empty) { listEl.innerHTML = '<div class="no-comments">No comments yet — be first!</div>'; }
            else snap.forEach(doc => {
                const c = doc.data(); const isMine = c.uid === currentUser.uid;
                const item = document.createElement('div');
                item.className = 'comment-item';
                item.innerHTML = `
                    <div class="comment-avatar-sm">${(c.email||'?')[0].toUpperCase()}</div>
                    <div class="comment-body">
                        <div class="comment-author">${escapeHtml(c.email||'')}${isMine?' <span class="you-badge">(you)</span>':''}</div>
                        <div class="comment-text">${escapeHtml(c.text||'')}</div>
                        <div class="comment-time">${timeAgo(c.createdAt)}</div>
                    </div>
                    ${isMine?`<button class="comment-delete-btn" onclick="deleteComment('${postId}','${doc.id}')">✕</button>`:''}`;
                listEl.appendChild(item);
            });
            const btn = document.getElementById('cmtbtn-'+postId);
            if (btn) { const n=snap.size; btn.textContent='💬 '+(n>0?n+(n===1?' Comment':' Comments'):'Comment'); }
        }, err => { listEl.innerHTML = `<div class="no-comments" style="color:#ef4444">Error: ${err.message}</div>`; });
}

async function submitComment(postId) {
    const inp = document.getElementById('comment-input-'+postId); if (!inp) return;
    const text = inp.value.trim(); if (!text) return;
    inp.value = ''; inp.disabled = true;
    try {
        await db.collection('posts').doc(postId).collection('comments').add({
            uid: currentUser.uid, email: currentUser.email, text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        db.collection('posts').doc(postId).update({ commentCount: firebase.firestore.FieldValue.increment(1) });
    } catch(e) { alert('Could not comment: '+e.message); }
    inp.disabled = false; inp.focus();
}

async function deleteComment(postId, commentId) {
    try {
        await db.collection('posts').doc(postId).collection('comments').doc(commentId).delete();
        db.collection('posts').doc(postId).update({ commentCount: firebase.firestore.FieldValue.increment(-1) });
    } catch(e) { alert('Could not delete: '+e.message); }
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
function loadProfile() {
    if (!currentUser) return;
    const email = currentUser.email;
    document.getElementById('profile-email').textContent = email;

    // Load profile data
    db.collection('profiles').doc(currentUser.uid).get().then(snap => {
        const pd = snap.exists ? snap.data() : {};
        _renderProfileAvatar(pd);
        _renderProfileBio(pd);
    });

    db.collection('posts').where('uid','==',currentUser.uid).orderBy('createdAt','desc').get().then(snap => {
        let totalLikes=0, totalViews=0, totalSaves=0;
        const posts=[];
        snap.forEach(doc => {
            const d=doc.data();
            totalLikes  += d.likes||0;
            totalViews  += d.views||0;
            totalSaves  += (d.bookmarks||[]).length;
            posts.push({id:doc.id,...d});
        });
        document.getElementById('profile-stats').innerHTML = `
            <div class="profile-stat"><div class="profile-stat-num">${snap.size}</div><div class="profile-stat-label">Posts</div></div>
            <div class="profile-stat"><div class="profile-stat-num">${totalLikes}</div><div class="profile-stat-label">Likes</div></div>
            <div class="profile-stat"><div class="profile-stat-num">${totalViews}</div><div class="profile-stat-label">Views</div></div>
            <div class="profile-stat"><div class="profile-stat-num">${totalSaves}</div><div class="profile-stat-label">Saves</div></div>`;
        _renderPostGrid(posts);
    }).catch(()=>{});
}

function _renderProfileAvatar(pd) {
    const el = document.getElementById('profile-avatar-big');
    if (!el) return;
    const initial = currentUser.email[0].toUpperCase();
    el.textContent = pd.avatarEmoji || initial;
    let style = '';
    if (pd.avatarGradient) style += `background:${pd.avatarGradient};`;
    else if (pd.avatarColor) style += `background:${pd.avatarColor};`;
    if (pd.avatarAnim) {
        const anims = { pulse:'avatarPulse 2s infinite', spin:'avatarSpin 3s linear infinite', bounce:'avatarBounce 1s infinite', glow:'avatarGlow 2s infinite', rainbow:'avatarRainbow 4s linear infinite' };
        if (anims[pd.avatarAnim]) style += `animation:${anims[pd.avatarAnim]};`;
    }
    el.style.cssText = style;
}

function _renderProfileBio(pd) {
    const bioEl = document.getElementById('profile-bio-display');
    if (bioEl) bioEl.textContent = pd.bio || '';
    const nameEl = document.getElementById('profile-display-name');
    if (nameEl) nameEl.textContent = pd.displayName || currentUser.email.split('@')[0];
    const bannerEl = document.getElementById('profile-banner');
    if (bannerEl && pd.bannerColor) bannerEl.style.background = pd.bannerColor;
}

function _renderPostGrid(posts) {
    const el = document.getElementById('profile-posts');
    if (!el) return;
    if (!posts.length) { el.innerHTML = '<p class="profile-empty">No posts yet</p>'; return; }
    el.innerHTML = `
        <div class="profile-posts-title">Your Posts</div>
        <div class="profile-grid">
            ${posts.slice(0,9).map(p => {
                const src = p.imageDataUrl || p.imageUrl || '';
                return `<div class="profile-grid-item" title="${escapeHtml((p.text||'').substring(0,60))}">
                    ${src ? `<img src="${src}" loading="lazy">` : `<div class="profile-grid-text">${escapeHtml((p.text||'📝').substring(0,30))}</div>`}
                </div>`;
            }).join('')}
        </div>`;
}
