/**
 * profiles.js — Profile system for Post Land
 * Works in full sync with app.js:
 *   - Calls window.onProfileSaved() after saving so app.js can refresh nav/create avatars
 *   - Uses window.profileCache and window.getProfile from app.js
 *   - Implements window.renderOwnProfile() which app.js calls on showView('profile')
 *   - Implements window.openEditModal() so the Edit Profile button works
 */

(function () {

    // ── Constants ─────────────────────────────────────────────────────────────
    const BANNERS = [
        'linear-gradient(135deg,#3b82f6,#8b5cf6)',
        'linear-gradient(135deg,#f43f5e,#fb923c)',
        'linear-gradient(135deg,#06b6d4,#22d3ee)',
        'linear-gradient(135deg,#10b981,#3b82f6)',
        'linear-gradient(135deg,#f59e0b,#ef4444)',
        'linear-gradient(135deg,#8b5cf6,#ec4899)',
        'linear-gradient(135deg,#0f172a,#334155)',
        'linear-gradient(135deg,#065f46,#10b981)',
        'linear-gradient(135deg,#7c3aed,#db2777)',
        'linear-gradient(135deg,#1d4ed8,#0ea5e9)',
    ];

    // ── State ─────────────────────────────────────────────────────────────────
    let myProfileData = {};
    let pendingPic    = null;   // null | '__remove__' | dataUrl string
    let myUser        = null;

    // ── Inject CSS ────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        /* ── Profile page ── */
        .profile-card { padding: 0; }
        .p-banner {
            height: 120px; width: 100%; position: relative;
            background: linear-gradient(135deg,#3b82f6,#8b5cf6);
            cursor: pointer;
        }
        .p-banner-hint {
            position: absolute; bottom: 8px; right: 10px;
            background: rgba(0,0,0,.38); color: white; border: none;
            border-radius: 6px; padding: 4px 10px; font-size: .7rem;
            cursor: pointer; font-family: inherit; pointer-events: none;
        }
        .p-top-row {
            display: flex; align-items: flex-end;
            justify-content: space-between;
            padding: 0 16px; margin-top: -38px; margin-bottom: 10px;
        }
        .p-avatar {
            width: 76px; height: 76px; border-radius: 50%;
            border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,.12);
            background: linear-gradient(135deg,#3b82f6,#8b5cf6);
            color: white; font-weight: 700; font-size: 1.8rem;
            display: flex; align-items: center; justify-content: center;
            text-transform: uppercase; cursor: pointer;
            background-size: cover; background-position: center;
            overflow: hidden; flex-shrink: 0; position: relative;
        }
        .p-avatar:hover::after {
            content: '📷'; position: absolute; inset: 0; border-radius: 50%;
            background: rgba(0,0,0,.45); display: flex; align-items: center;
            justify-content: center; font-size: 1.3rem;
        }
        .p-edit-btn {
            background: none; border: 1.5px solid #e2e8f0;
            border-radius: 20px; padding: 7px 16px; font-size: .82rem;
            font-weight: 600; cursor: pointer; font-family: inherit;
            color: #0f172a; transition: background .15s; margin-bottom: 4px;
        }
        .p-edit-btn:hover { background: #f1f5f9; }
        .p-info { padding: 0 16px 14px; }
        .p-name {
            font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 2px;
        }
        .p-handle { font-size: .76rem; color: #94a3b8; margin-bottom: 8px; }
        .p-bio {
            font-size: .87rem; color: #475569; line-height: 1.55;
            margin-bottom: 12px; white-space: pre-wrap;
        }
        .p-links { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .p-link-tag {
            font-size: .78rem; color: #3b82f6; background: #eff6ff;
            padding: 3px 10px; border-radius: 20px; font-weight: 500;
            display: flex; align-items: center; gap: 4px;
        }
        .p-stats-row {
            display: flex; border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0; margin-bottom: 16px;
        }
        .p-stat {
            flex: 1; text-align: center; padding: 11px 4px;
            border-right: 1px solid #e2e8f0;
        }
        .p-stat:last-child { border-right: none; }
        .p-stat-n { font-size: 1.15rem; font-weight: 700; color: #3b82f6; }
        .p-stat-l {
            font-size: .64rem; color: #94a3b8; margin-top: 2px;
            text-transform: uppercase; letter-spacing: .3px;
        }
        .p-section-title {
            font-size: .72rem; font-weight: 700; color: #94a3b8;
            text-transform: uppercase; letter-spacing: .5px;
            margin: 0 16px 10px; display: flex; align-items: center; gap: 6px;
        }
        .p-mini-post {
            margin: 0 16px 8px; background: #f8fafc; border-radius: 10px;
            padding: 10px 12px; font-size: .84rem; line-height: 1.4;
            color: #475569; border: 1px solid #e2e8f0;
        }
        .p-mini-post-img {
            width: 100%; max-height: 120px; object-fit: cover;
            border-radius: 8px; margin-top: 6px;
        }
        .p-bookmarks { margin: 0 16px; }
        .p-bookmark-item {
            background: #f8fafc; border-radius: 10px; padding: 10px 12px;
            font-size: .84rem; line-height: 1.4; color: #475569;
            border: 1px solid #e2e8f0; margin-bottom: 8px;
        }
        .p-bookmark-meta { font-size: .7rem; color: #94a3b8; margin-top: 4px; }
        .p-actions { padding: 14px 16px 20px; display: flex; flex-direction: column; gap: 8px; }
        .p-tab-bar {
            display: flex; border-bottom: 1px solid #e2e8f0; margin-bottom: 14px;
        }
        .p-tab {
            flex: 1; background: none; border: none; padding: 11px 4px;
            font-size: .82rem; font-weight: 600; cursor: pointer; font-family: inherit;
            color: #94a3b8; border-bottom: 2px solid transparent; margin-bottom: -1px;
            transition: all .15s;
        }
        .p-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }

        /* ── Edit modal ── */
        #profile-edit-modal {
            position: fixed; inset: 0; background: rgba(0,0,0,.5);
            z-index: 7000; display: flex; align-items: flex-end;
            justify-content: center; font-family: 'Inter', sans-serif;
        }
        @media(min-width:520px) { #profile-edit-modal { align-items: center; } }
        .pe-sheet {
            background: white; border-radius: 22px 22px 0 0; width: 100%;
            max-width: 480px; max-height: 92vh; overflow-y: auto;
            padding: 22px 20px 36px;
            box-shadow: 0 -10px 50px rgba(0,0,0,.18);
            animation: peSlide .22s ease;
        }
        @media(min-width:520px) { .pe-sheet { border-radius: 22px; } }
        @keyframes peSlide {
            from { transform: translateY(28px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }
        .pe-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 20px;
        }
        .pe-header h3 { font-size: 1.05rem; font-weight: 700; }
        .pe-close {
            background: #f1f5f9; border: none; border-radius: 8px;
            width: 32px; height: 32px; font-size: 1rem; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        .pe-pic-row {
            display: flex; align-items: center; gap: 14px;
            margin-bottom: 20px; padding-bottom: 18px;
            border-bottom: 1px solid #f1f5f9;
        }
        .pe-pic-prev {
            width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0;
            background: linear-gradient(135deg,#3b82f6,#8b5cf6); color: white;
            font-weight: 700; font-size: 1.4rem; display: flex;
            align-items: center; justify-content: center; text-transform: uppercase;
            border: 2px solid #e2e8f0; background-size: cover;
            background-position: center; overflow: hidden;
        }
        .pe-pic-actions { display: flex; flex-direction: column; gap: 7px; }
        .pe-upload-btn {
            background: #3b82f6; color: white; border: none;
            border-radius: 8px; padding: 7px 16px; font-size: .82rem;
            font-weight: 600; cursor: pointer; font-family: inherit;
        }
        .pe-remove-btn {
            background: none; border: 1.5px solid #e2e8f0; color: #ef4444;
            border-radius: 8px; padding: 6px 16px; font-size: .82rem;
            font-weight: 600; cursor: pointer; font-family: inherit;
        }
        .pe-remove-btn:hover { background: #fef2f2; }
        .pe-label {
            font-size: .72rem; font-weight: 700; color: #94a3b8;
            text-transform: uppercase; letter-spacing: .4px; margin-bottom: 6px;
        }
        .pe-input, .pe-textarea {
            width: 100%; padding: 10px 13px; border: 1.5px solid #e2e8f0;
            border-radius: 9px; font-size: .92rem; font-family: inherit;
            outline: none; transition: border .2s; color: #0f172a;
            background: #f8fafc; margin-bottom: 14px;
        }
        .pe-input:focus, .pe-textarea:focus {
            border-color: #3b82f6; background: white;
        }
        .pe-textarea { resize: none; min-height: 76px; line-height: 1.5; }
        .pe-banner-label { font-size: .72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 8px; }
        .pe-swatches { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .pe-swatch {
            width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
            border: 2.5px solid transparent; transition: transform .15s, border-color .15s;
        }
        .pe-swatch:hover { transform: scale(1.15); }
        .pe-swatch.sel { border-color: #0f172a; transform: scale(1.18); }
        .pe-save-btn {
            background: #3b82f6; color: white; border: none; width: 100%;
            padding: 13px; border-radius: 10px; font-size: .94rem; font-weight: 700;
            cursor: pointer; font-family: inherit; transition: background .2s; margin-top: 4px;
        }
        .pe-save-btn:hover { background: #2563eb; }
        .pe-save-btn:disabled { opacity: .6; cursor: not-allowed; }
        .pe-status { text-align: center; font-size: .82rem; margin-top: 8px; min-height: 18px; }
    `;
    document.head.appendChild(style);

    // ── Wait for Firebase auth ────────────────────────────────────────────────
    function waitForReady(cb) {
        const iv = setInterval(() => {
            if (window.firebase && firebase.apps.length && window.db && window.currentUser) {
                clearInterval(iv);
                cb(window.currentUser);
            }
        }, 100);
    }

    waitForReady(user => {
        myUser = user;
        listenToMyProfile();
    });

    // ── Listen to own profile in realtime ────────────────────────────────────
    function listenToMyProfile() {
        firebase.firestore().collection('profiles').doc(myUser.email)
            .onSnapshot(doc => {
                myProfileData = doc.exists ? doc.data() : {};
                // Keep cache in sync
                if (window.profileCache) window.profileCache[myUser.email] = myProfileData;
                // Refresh everywhere
                refreshNavAvatar();
                refreshCreateAvatar();
                // Re-render profile page if visible
                const pv = document.getElementById('profile-view');
                if (pv && pv.style.display !== 'none') renderOwnProfile();
            });
    }

    // ── Refresh nav avatar (mirrors app.js refreshNavAvatar) ─────────────────
    function refreshNavAvatar() {
        const el = document.getElementById('nav-avatar'); if (!el) return;
        if (myProfileData.picUrl) {
            el.style.backgroundImage    = `url(${myProfileData.picUrl})`;
            el.style.backgroundSize     = 'cover';
            el.style.backgroundPosition = 'center';
            el.innerText = '';
        } else {
            el.style.backgroundImage = '';
            el.innerText = myUser.email[0].toUpperCase();
        }
    }

    // ── Refresh create post avatar ────────────────────────────────────────────
    function refreshCreateAvatar() {
        const el = document.getElementById('create-avatar-pic'); if (!el) return;
        if (myProfileData.picUrl) {
            el.style.backgroundImage    = `url(${myProfileData.picUrl})`;
            el.style.backgroundSize     = 'cover';
            el.style.backgroundPosition = 'center';
            el.innerText = '';
        } else {
            el.style.backgroundImage = '';
            el.innerText = myUser.email[0].toUpperCase();
        }
    }

    // ── Exposed: called by app.js showView('profile') ────────────────────────
    window.renderOwnProfile = function () {
        const card = document.getElementById('profile-card'); if (!card) return;
        const d    = myProfileData;
        const banner = d.banner || BANNERS[0];

        card.innerHTML = '';

        // Banner
        const bannerEl = div('p-banner');
        bannerEl.style.background = banner;
        bannerEl.innerHTML = `<span class="p-banner-hint">🖼 Change banner</span>`;
        bannerEl.onclick = openEditModal;
        card.appendChild(bannerEl);

        // Avatar + edit button row
        const topRow = div('p-top-row');
        const avatar = div('p-avatar');
        avatar.id = 'profile-avatar-big';
        if (d.picUrl) {
            avatar.style.backgroundImage    = `url(${d.picUrl})`;
            avatar.style.backgroundSize     = 'cover';
            avatar.style.backgroundPosition = 'center';
        } else {
            avatar.innerText = myUser.email[0].toUpperCase();
        }
        avatar.onclick = openEditModal;

        const editBtn  = document.createElement('button');
        editBtn.className = 'p-edit-btn'; editBtn.innerText = 'Edit Profile';
        editBtn.onclick = openEditModal;

        topRow.appendChild(avatar);
        topRow.appendChild(editBtn);
        card.appendChild(topRow);

        // Info block
        const info = div('p-info');
        info.innerHTML = `
            <div class="p-name">${esc(d.displayName || myUser.email.split('@')[0])}</div>
            <div class="p-handle">${esc(myUser.email)}</div>
            ${d.bio ? `<div class="p-bio">${esc(d.bio)}</div>` : ''}
            ${d.website ? `<div class="p-links"><span class="p-link-tag">🔗 ${esc(d.website)}</span></div>` : ''}
        `;
        card.appendChild(info);

        // Tab bar
        const tabBar = div('p-tab-bar');
        tabBar.innerHTML = `
            <button class="p-tab active" onclick="switchProfileTab('posts',this)">Posts</button>
            <button class="p-tab" onclick="switchProfileTab('bookmarks',this)">Saved</button>
        `;
        card.appendChild(tabBar);

        // Stats (inline, between tabs and content)
        const statsRow = div('p-stats-row');
        statsRow.id = 'p-stats-row';
        card.appendChild(statsRow);

        // Content area
        const content = div('');
        content.id = 'p-content';
        card.appendChild(content);

        // Actions
        const actions = div('p-actions');
        actions.innerHTML = `<button class="btn btn-ghost btn-sm" style="border-radius:8px;padding:9px 16px;width:100%" onclick="logout()">Sign Out</button>`;
        card.appendChild(actions);

        loadProfileStats();
        loadProfilePosts();
    };

    window.switchProfileTab = function(tab, btn) {
        document.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        if (tab === 'posts') loadProfilePosts();
        else loadProfileBookmarks();
    };

    function loadProfileStats() {
        const statsEl = document.getElementById('p-stats-row'); if (!statsEl) return;
        firebase.firestore().collection('posts').where('uid','==',myUser.uid).get().then(snap => {
            let likes = 0, views = 0;
            snap.forEach(d => { likes += d.data().likes||0; views += d.data().views||0; });
            statsEl.innerHTML = `
                <div class="p-stat"><div class="p-stat-n">${snap.size}</div><div class="p-stat-l">Posts</div></div>
                <div class="p-stat"><div class="p-stat-n">${likes}</div><div class="p-stat-l">Likes</div></div>
                <div class="p-stat"><div class="p-stat-n">${views}</div><div class="p-stat-l">Views</div></div>
            `;
        });
    }

    function loadProfilePosts() {
        const content = document.getElementById('p-content'); if (!content) return;
        content.innerHTML = `<div class="loading-state" style="padding:20px">Loading…</div>`;
        firebase.firestore().collection('posts')
            .where('uid','==',myUser.uid)
            .orderBy('createdAt','desc')
            .get().then(snap => {
                if (snap.empty) {
                    content.innerHTML = `<div class="empty-state" style="padding:30px 20px"><div class="ei">📝</div><p>No posts yet</p></div>`;
                    return;
                }
                content.innerHTML = '<div class="p-section-title">Your Posts</div>';
                snap.forEach(doc => {
                    const p = doc.data();
                    const m = div('p-mini-post');
                    m.innerHTML = `
                        <div style="font-size:.82rem;color:#94a3b8;margin-bottom:5px;display:flex;justify-content:space-between">
                            <span>${p.likes||0} ❤️  ${p.views||0} 👁</span>
                            <span>${p.createdAt ? timeAgoLocal(p.createdAt) : ''}</span>
                        </div>
                        <div>${esc((p.text||'').substring(0,120))}${(p.text||'').length>120?'…':''}</div>
                        ${(p.imageDataUrl||p.imageUrl) ? `<img class="p-mini-post-img" src="${p.imageDataUrl||p.imageUrl}" loading="lazy">` : ''}
                    `;
                    content.appendChild(m);
                });
            });
    }

    function loadProfileBookmarks() {
        const content = document.getElementById('p-content'); if (!content) return;
        content.innerHTML = `<div class="loading-state" style="padding:20px">Loading…</div>`;
        firebase.firestore().collection('posts')
            .where('bookmarks','array-contains',myUser.uid)
            .orderBy('createdAt','desc')
            .get().then(snap => {
                if (snap.empty) {
                    content.innerHTML = `<div class="empty-state" style="padding:30px 20px"><div class="ei">🔖</div><p>No saved posts yet</p></div>`;
                    return;
                }
                content.innerHTML = '<div class="p-section-title">Saved Posts</div>';
                snap.forEach(doc => {
                    const p = doc.data();
                    const m = div('p-bookmark-item');
                    m.innerHTML = `
                        <div>${esc((p.text||'').substring(0,120))}${(p.text||'').length>120?'…':''}</div>
                        <div class="p-bookmark-meta">by ${esc(p.email)} · ${p.createdAt?timeAgoLocal(p.createdAt):''}</div>
                    `;
                    content.appendChild(m);
                });
            }).catch(() => {
                // Index not ready — fetch without order
                firebase.firestore().collection('posts')
                    .where('bookmarks','array-contains',myUser.uid)
                    .get().then(snap => {
                        if (snap.empty) {
                            content.innerHTML = `<div class="empty-state" style="padding:30px 20px"><div class="ei">🔖</div><p>No saved posts yet</p></div>`;
                            return;
                        }
                        content.innerHTML = '<div class="p-section-title">Saved Posts</div>';
                        snap.forEach(doc => {
                            const p = doc.data();
                            const m = div('p-bookmark-item');
                            m.innerHTML = `<div>${esc((p.text||'').substring(0,120))}</div><div class="p-bookmark-meta">by ${esc(p.email)}</div>`;
                            content.appendChild(m);
                        });
                    });
            });
    }

    // ── EDIT MODAL ────────────────────────────────────────────────────────────
    window.openEditModal = function () {
        if (document.getElementById('profile-edit-modal')) return;
        pendingPic = null;

        const d     = myProfileData;
        const modal = document.createElement('div');
        modal.id    = 'profile-edit-modal';

        modal.innerHTML = `
            <div class="pe-sheet">
                <div class="pe-header">
                    <h3>Edit Profile</h3>
                    <button class="pe-close" id="pe-close-btn">✕</button>
                </div>

                <!-- Avatar -->
                <div class="pe-pic-row">
                    <div class="pe-pic-prev" id="pe-pic-prev"></div>
                    <div class="pe-pic-actions">
                        <button class="pe-upload-btn" id="pe-upload-btn">📷 Change Photo</button>
                        <button class="pe-remove-btn" id="pe-remove-btn">Remove Photo</button>
                        <input type="file" id="pe-file" accept="image/*" style="display:none">
                    </div>
                </div>

                <!-- Display name -->
                <div class="pe-label">Display Name</div>
                <input class="pe-input" id="pe-name" placeholder="Your name" maxlength="40" value="${esc(d.displayName||'')}">

                <!-- Bio -->
                <div class="pe-label">Bio</div>
                <textarea class="pe-textarea" id="pe-bio" placeholder="Tell people about yourself…" maxlength="200">${esc(d.bio||'')}</textarea>

                <!-- Website -->
                <div class="pe-label">Website / Link</div>
                <input class="pe-input" id="pe-website" placeholder="yourwebsite.com" maxlength="80" value="${esc(d.website||'')}">

                <!-- Banner -->
                <div class="pe-banner-label">Banner Colour</div>
                <div class="pe-swatches" id="pe-swatches"></div>

                <button class="pe-save-btn" id="pe-save-btn">Save Changes</button>
                <div class="pe-status" id="pe-status"></div>
            </div>
        `;

        document.body.appendChild(modal);

        // Wire up close
        document.getElementById('pe-close-btn').onclick = closeEditModal;
        modal.addEventListener('click', e => { if (e.target === modal) closeEditModal(); });

        // Pic preview
        syncPicPreview();

        // File input
        const fileInput = document.getElementById('pe-file');
        document.getElementById('pe-upload-btn').onclick = () => fileInput.click();
        fileInput.onchange = () => { handlePicFile(fileInput.files[0]); };

        document.getElementById('pe-remove-btn').onclick = () => {
            pendingPic = '__remove__';
            syncPicPreview();
        };

        // Banner swatches
        const grid = document.getElementById('pe-swatches');
        const currentBanner = d.banner || BANNERS[0];
        BANNERS.forEach(b => {
            const sw = document.createElement('div');
            sw.className  = 'pe-swatch' + (b === currentBanner ? ' sel' : '');
            sw.style.background = b;
            sw.dataset.b  = b;
            sw.onclick    = () => {
                grid.querySelectorAll('.pe-swatch').forEach(s => s.classList.remove('sel'));
                sw.classList.add('sel');
            };
            grid.appendChild(sw);
        });

        // Save
        document.getElementById('pe-save-btn').onclick = saveProfile;
    };

    function closeEditModal() {
        document.getElementById('profile-edit-modal')?.remove();
        pendingPic = null;
    }

    function syncPicPreview() {
        const prev = document.getElementById('pe-pic-prev'); if (!prev) return;
        const src  = (pendingPic && pendingPic !== '__remove__') ? pendingPic : (myProfileData.picUrl || '');
        const remove = pendingPic === '__remove__';
        if (src && !remove) {
            prev.style.backgroundImage    = `url(${src})`;
            prev.style.backgroundSize     = 'cover';
            prev.style.backgroundPosition = 'center';
            prev.innerText = '';
        } else {
            prev.style.backgroundImage = '';
            prev.innerText = myUser.email[0].toUpperCase();
        }
    }

    function handlePicFile(file) {
        if (!file) return;
        compressAvatar(file).then(url => {
            pendingPic = url;
            syncPicPreview();
        }).catch(e => alert('Could not load image: ' + e.message));
    }

    async function saveProfile() {
        const btn    = document.getElementById('pe-save-btn');
        const status = document.getElementById('pe-status');
        const name   = document.getElementById('pe-name')?.value.trim()    || '';
        const bio    = document.getElementById('pe-bio')?.value.trim()     || '';
        const site   = document.getElementById('pe-website')?.value.trim() || '';
        const selSw  = document.querySelector('.pe-swatch.sel');
        const banner = selSw ? selSw.dataset.b : (myProfileData.banner || BANNERS[0]);

        btn.disabled = true; btn.innerText = 'Saving…';
        if (status) { status.innerText = ''; }

        try {
            const update = {
                displayName: name, bio, website: site, banner,
                email: myUser.email,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (pendingPic === '__remove__') {
                update.picUrl = '';
            } else if (pendingPic) {
                update.picUrl = pendingPic;
            }

            await firebase.firestore().collection('profiles').doc(myUser.email).set(update, { merge: true });

            // Update local cache immediately
            myProfileData = { ...myProfileData, ...update };
            if (window.profileCache) window.profileCache[myUser.email] = myProfileData;

            if (status) { status.innerText = '✓ Saved!'; status.style.color = '#22c55e'; }

            // Tell app.js
            if (typeof window.onProfileSaved === 'function') window.onProfileSaved();

            setTimeout(closeEditModal, 700);
        } catch (e) {
            if (status) { status.innerText = 'Error: ' + e.message; status.style.color = '#ef4444'; }
        }

        btn.disabled = false; btn.innerText = 'Save Changes';
    }

    // ── Avatar compression (square crop, 200×200) ─────────────────────────────
    function compressAvatar(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Read failed'));
            reader.onload  = e => {
                const img = new Image();
                img.onerror = () => reject(new Error('Decode failed'));
                img.onload  = () => {
                    const size = 220;
                    const c    = document.createElement('canvas');
                    c.width = size; c.height = size;
                    const ctx = c.getContext('2d');
                    const s   = Math.min(img.width, img.height);
                    const sx  = (img.width  - s) / 2;
                    const sy  = (img.height - s) / 2;
                    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
                    resolve(c.toDataURL('image/jpeg', 0.84));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function div(cls) {
        const el = document.createElement('div');
        if (cls) el.className = cls;
        return el;
    }

    function esc(s) {
        return String(s || '')
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function timeAgoLocal(ts) {
        if (!ts || !ts.toMillis) return '';
        const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
        if (s < 60)     return 'just now';
        if (s < 3600)   return Math.floor(s/60)    + 'm ago';
        if (s < 86400)  return Math.floor(s/3600)  + 'h ago';
        if (s < 604800) return Math.floor(s/86400) + 'd ago';
        return new Date(ts.toMillis()).toLocaleDateString();
    }

})();
