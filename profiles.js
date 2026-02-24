/**
 * profiles.js — Profile customisation for Post Land
 * Adds: profile picture, display name, bio, profile banner colour
 * Completely standalone — no edits to other files needed.
 * Add <script src="profiles.js"></script> after app.js in index.html.
 */

(function () {

    // ── Inject styles ─────────────────────────────────────────────────────────
    const css = `
        /* Nav profile pic */
        .nav-profile-pic {
            width: 26px; height: 26px; border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            display: flex; align-items: center; justify-content: center;
            font-size: 0.72rem; font-weight: 700; color: white;
            background-size: cover; background-position: center;
            text-transform: uppercase; overflow: hidden;
        }

        /* Profile page redesign */
        .profile-card {
            background: var(--white, #fff);
            border-radius: 16px; overflow: hidden;
            border: 1px solid var(--border, #e2e8f0);
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .profile-banner {
            height: 110px; width: 100%;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            position: relative;
        }
        .profile-banner-change {
            position: absolute; bottom: 8px; right: 10px;
            background: rgba(0,0,0,0.4); color: white; border: none;
            border-radius: 6px; padding: 4px 10px; font-size: 0.72rem;
            cursor: pointer; font-family: inherit;
        }
        .profile-banner-change:hover { background: rgba(0,0,0,0.6); }

        .profile-pic-wrapper {
            display: flex; align-items: flex-end; justify-content: space-between;
            padding: 0 18px; margin-top: -36px; margin-bottom: 10px;
        }
        .profile-avatar-big {
            width: 72px; height: 72px; border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white; font-weight: 700; font-size: 1.8rem;
            display: flex; align-items: center; justify-content: center;
            border: 3px solid white; text-transform: uppercase;
            background-size: cover; background-position: center;
            flex-shrink: 0; overflow: hidden; cursor: pointer;
            position: relative;
        }
        .profile-avatar-big:hover::after {
            content: '📷'; position: absolute; inset: 0;
            background: rgba(0,0,0,0.45); display: flex;
            align-items: center; justify-content: center;
            font-size: 1.4rem; border-radius: 50%;
        }
        .profile-edit-btn {
            background: none; border: 1.5px solid var(--border, #e2e8f0);
            border-radius: 8px; padding: 6px 14px; font-size: 0.82rem;
            font-weight: 600; cursor: pointer; font-family: inherit;
            color: var(--text, #0f172a); transition: background 0.15s;
            margin-bottom: 4px;
        }
        .profile-edit-btn:hover { background: #f1f5f9; }

        .profile-info-section { padding: 0 18px 16px; }
        .profile-display-name {
            font-size: 1.1rem; font-weight: 700; color: var(--text, #0f172a);
            margin-bottom: 2px;
        }
        .profile-email {
            font-size: 0.78rem; color: var(--muted, #94a3b8); margin-bottom: 8px;
        }
        .profile-bio-display {
            font-size: 0.88rem; color: var(--text-2, #475569);
            line-height: 1.5; margin-bottom: 12px; white-space: pre-wrap;
        }
        .profile-stats {
            display: flex; gap: 0; border-top: 1px solid var(--border, #e2e8f0);
            border-bottom: 1px solid var(--border, #e2e8f0);
            margin: 0 0 14px;
        }
        .profile-stat {
            flex: 1; text-align: center; padding: 12px 6px;
            border-right: 1px solid var(--border, #e2e8f0);
        }
        .profile-stat:last-child { border-right: none; }
        .profile-stat-num { font-size: 1.2rem; font-weight: 700; color: var(--primary, #3b82f6); }
        .profile-stat-label { font-size: 0.68rem; color: var(--muted, #94a3b8); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.3px; }
        .profile-posts { padding: 0 18px; }
        .profile-posts h4 { font-size: 0.78rem; font-weight: 700; color: var(--muted, #94a3b8); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .profile-mini-post {
            background: var(--bg, #f1f5f9); border-radius: 10px; padding: 10px 12px;
            margin-bottom: 8px; font-size: 0.85rem; line-height: 1.4;
            color: var(--text-2, #475569); border: 1px solid var(--border, #e2e8f0);
        }

        /* Edit modal */
        #profile-edit-modal {
            position: fixed; inset: 0; background: rgba(0,0,0,0.5);
            z-index: 6000; display: flex; align-items: flex-end; justify-content: center;
            font-family: 'Inter', sans-serif;
        }
        @media (min-width: 500px) {
            #profile-edit-modal { align-items: center; }
        }
        .profile-edit-sheet {
            background: white; border-radius: 20px 20px 0 0; width: 100%; max-width: 480px;
            padding: 24px 22px 34px; box-shadow: 0 -8px 40px rgba(0,0,0,0.2);
            animation: slideUp 0.22s ease;
        }
        @media (min-width: 500px) {
            .profile-edit-sheet { border-radius: 20px; padding: 28px 26px; }
        }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .edit-sheet-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 22px;
        }
        .edit-sheet-header h3 { font-size: 1.05rem; font-weight: 700; }
        .edit-sheet-close {
            background: #f1f5f9; border: none; border-radius: 8px;
            width: 30px; height: 30px; font-size: 1rem; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }

        /* Profile pic picker inside modal */
        .edit-pic-row {
            display: flex; align-items: center; gap: 14px; margin-bottom: 22px;
            padding-bottom: 18px; border-bottom: 1px solid #f0f0f0;
        }
        .edit-pic-preview {
            width: 62px; height: 62px; border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white; font-weight: 700; font-size: 1.4rem;
            display: flex; align-items: center; justify-content: center;
            text-transform: uppercase; overflow: hidden;
            background-size: cover; background-position: center;
            flex-shrink: 0; border: 2px solid #e2e8f0;
        }
        .edit-pic-btns { display: flex; flex-direction: column; gap: 7px; }
        .edit-pic-upload-btn {
            background: #3b82f6; color: white; border: none;
            border-radius: 8px; padding: 7px 14px; font-size: 0.82rem;
            font-weight: 600; cursor: pointer; font-family: inherit;
        }
        .edit-pic-remove-btn {
            background: none; border: 1.5px solid #e2e8f0; color: #ef4444;
            border-radius: 8px; padding: 6px 14px; font-size: 0.82rem;
            font-weight: 600; cursor: pointer; font-family: inherit;
        }
        .edit-pic-remove-btn:hover { background: #fef2f2; }

        .edit-field-label {
            font-size: 0.75rem; font-weight: 600; color: #94a3b8;
            text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;
        }
        .edit-field-input {
            width: 100%; padding: 10px 13px; border: 1.5px solid #e2e8f0;
            border-radius: 9px; font-size: 0.92rem; font-family: inherit;
            outline: none; margin-bottom: 16px; transition: border 0.2s;
            color: #0f172a; background: #f8fafc;
        }
        .edit-field-input:focus { border-color: #3b82f6; background: white; }
        .edit-field-textarea {
            width: 100%; padding: 10px 13px; border: 1.5px solid #e2e8f0;
            border-radius: 9px; font-size: 0.92rem; font-family: inherit;
            outline: none; margin-bottom: 16px; resize: none; min-height: 80px;
            transition: border 0.2s; color: #0f172a; background: #f8fafc;
            line-height: 1.5;
        }
        .edit-field-textarea:focus { border-color: #3b82f6; background: white; }

        /* Banner colour picker */
        .banner-colour-label { font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 8px; }
        .banner-colour-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .banner-swatch {
            width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
            border: 2.5px solid transparent; transition: transform 0.15s, border-color 0.15s;
            flex-shrink: 0;
        }
        .banner-swatch:hover { transform: scale(1.15); }
        .banner-swatch.selected { border-color: #0f172a; transform: scale(1.15); }

        .edit-save-btn {
            background: #3b82f6; color: white; border: none; width: 100%;
            padding: 12px; border-radius: 10px; font-size: 0.95rem;
            font-weight: 600; cursor: pointer; font-family: inherit;
            transition: background 0.2s; margin-top: 4px;
        }
        .edit-save-btn:hover { background: #2563eb; }
        .edit-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .edit-status { text-align: center; font-size: 0.82rem; margin-top: 8px; min-height: 18px; }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ── Banner colour presets ─────────────────────────────────────────────────
    const BANNERS = [
        'linear-gradient(135deg,#3b82f6,#8b5cf6)',
        'linear-gradient(135deg,#f43f5e,#fb923c)',
        'linear-gradient(135deg,#06b6d4,#3b82f6)',
        'linear-gradient(135deg,#10b981,#3b82f6)',
        'linear-gradient(135deg,#f59e0b,#ef4444)',
        'linear-gradient(135deg,#8b5cf6,#ec4899)',
        'linear-gradient(135deg,#0f172a,#334155)',
        'linear-gradient(135deg,#065f46,#10b981)',
    ];

    // ── State ─────────────────────────────────────────────────────────────────
    let currentUser  = null;
    let profileData  = {};
    let pendingPicDataUrl = null;

    // ── Wait for app.js to set auth ───────────────────────────────────────────
    function waitForAuth(cb) {
        const iv = setInterval(() => {
            if (window.firebase && firebase.apps.length && window.db) {
                firebase.auth().onAuthStateChanged(user => {
                    if (user) { clearInterval(iv); cb(user); }
                });
                clearInterval(iv);
            }
        }, 150);
    }

    waitForAuth(user => {
        currentUser = user;
        loadMyProfile();
        overrideProfileView();
    });

    // ── Load my profile from Firestore ────────────────────────────────────────
    function loadMyProfile() {
        firebase.firestore().collection('profiles').doc(currentUser.email).onSnapshot(doc => {
            profileData = doc.exists ? doc.data() : {};
            applyNavPic();
            // Invalidate cache so posts repaint
            if (window.profileCache) delete window.profileCache[currentUser.email];
            // Refresh profile view if open
            const pv = document.getElementById('profile-view');
            if (pv && pv.style.display !== 'none') renderProfilePage();
        });
    }

    // ── Nav profile picture ───────────────────────────────────────────────────
    function applyNavPic() {
        const el = document.getElementById('nav-profile-pic');
        if (!el) return;
        if (profileData.picUrl) {
            el.style.backgroundImage = `url(${profileData.picUrl})`;
            el.style.backgroundSize  = 'cover';
            el.style.backgroundPosition = 'center';
            el.innerText = '';
        } else {
            el.style.backgroundImage = '';
            el.innerText = currentUser.email[0].toUpperCase();
        }
    }

    // ── Override profile view render ──────────────────────────────────────────
    function overrideProfileView() {
        // Hook into showView
        const origShowView = window.showView;
        window.showView = function(view) {
            origShowView(view);
            if (view === 'profile') renderProfilePage();
        };
    }

    function renderProfilePage() {
        const card = document.querySelector('.profile-card');
        if (!card) return;
        card.innerHTML = '';

        // Banner
        const banner = document.createElement('div');
        banner.className = 'profile-banner';
        banner.style.background = profileData.banner || BANNERS[0];
        card.appendChild(banner);

        // Pic + edit button row
        const picRow = document.createElement('div');
        picRow.className = 'profile-pic-wrapper';

        const bigAv = document.createElement('div');
        bigAv.className = 'profile-avatar-big';
        bigAv.id = 'profile-avatar-big';
        if (profileData.picUrl) {
            bigAv.style.backgroundImage = `url(${profileData.picUrl})`;
            bigAv.style.backgroundSize  = 'cover';
            bigAv.style.backgroundPosition = 'center';
        } else {
            bigAv.innerText = currentUser.email[0].toUpperCase();
        }
        bigAv.onclick = () => openEditModal();

        const editBtn = document.createElement('button');
        editBtn.className = 'profile-edit-btn';
        editBtn.innerText = 'Edit Profile';
        editBtn.onclick   = () => openEditModal();

        picRow.appendChild(bigAv);
        picRow.appendChild(editBtn);
        card.appendChild(picRow);

        // Info section
        const info = document.createElement('div');
        info.className = 'profile-info-section';

        const nameEl = document.createElement('div');
        nameEl.className = 'profile-display-name';
        nameEl.id = 'profile-display-name';
        nameEl.innerText = profileData.displayName || '';

        const emailEl = document.createElement('div');
        emailEl.className = 'profile-email';
        emailEl.id = 'profile-email';
        emailEl.innerText = currentUser.email;

        const bioEl = document.createElement('div');
        bioEl.className = 'profile-bio-display';
        bioEl.id = 'profile-bio-display';
        bioEl.innerText = profileData.bio || '';

        info.appendChild(nameEl);
        info.appendChild(emailEl);
        info.appendChild(bioEl);
        card.appendChild(info);

        // Stats
        const statsEl = document.createElement('div');
        statsEl.className = 'profile-stats';
        statsEl.id = 'profile-stats';
        card.appendChild(statsEl);

        // Posts
        const postsEl = document.createElement('div');
        postsEl.className = 'profile-posts';
        postsEl.id = 'profile-posts';
        card.appendChild(postsEl);

        // Sign out
        const signOut = document.createElement('div');
        signOut.style.padding = '0 18px 20px';
        signOut.innerHTML = '<button class="btn btn-outline" onclick="logout()" style="width:100%">Sign Out</button>';
        card.appendChild(signOut);

        // Load stats & posts via the original loadProfile logic
        loadProfileStats();
    }

    function loadProfileStats() {
        firebase.firestore().collection('posts').where('uid', '==', currentUser.uid).get().then(snap => {
            let likes = 0, views = 0;
            const posts = [];
            snap.forEach(doc => {
                const d = doc.data();
                likes += d.likes || 0; views += d.views || 0; posts.push(d);
            });
            const statsEl = document.getElementById('profile-stats');
            if (statsEl) statsEl.innerHTML = `
                <div class="profile-stat"><div class="profile-stat-num">${snap.size}</div><div class="profile-stat-label">Posts</div></div>
                <div class="profile-stat"><div class="profile-stat-num">${likes}</div><div class="profile-stat-label">Likes</div></div>
                <div class="profile-stat"><div class="profile-stat-num">${views}</div><div class="profile-stat-label">Views</div></div>
            `;
            const postsEl = document.getElementById('profile-posts');
            if (!postsEl) return;
            if (!posts.length) { postsEl.innerHTML = ''; return; }
            postsEl.innerHTML = '<h4>Your Posts</h4>' + posts.slice(0, 5).map(p =>
                `<div class="profile-mini-post">${(p.text || '').substring(0, 80)}${p.text?.length > 80 ? '…' : ''}</div>`
            ).join('');
        });
    }

    // ── Edit Modal ────────────────────────────────────────────────────────────
    function openEditModal() {
        if (document.getElementById('profile-edit-modal')) return;
        pendingPicDataUrl = null;

        const modal = document.createElement('div');
        modal.id = 'profile-edit-modal';
        modal.innerHTML = `
            <div class="profile-edit-sheet">
                <div class="edit-sheet-header">
                    <h3>Edit Profile</h3>
                    <button class="edit-sheet-close" onclick="document.getElementById('profile-edit-modal').remove()">✕</button>
                </div>

                <!-- Profile picture -->
                <div class="edit-pic-row">
                    <div class="edit-pic-preview" id="edit-pic-preview"></div>
                    <div class="edit-pic-btns">
                        <button class="edit-pic-upload-btn" onclick="document.getElementById('profile-pic-file').click()">📷 Change Photo</button>
                        <button class="edit-pic-remove-btn" onclick="removePic()">Remove Photo</button>
                        <input type="file" id="profile-pic-file" accept="image/*" style="display:none" onchange="handlePicFile(this)">
                    </div>
                </div>

                <!-- Display name -->
                <div class="edit-field-label">Display Name</div>
                <input class="edit-field-input" id="edit-display-name" placeholder="Your name" maxlength="40" value="${escHtml(profileData.displayName || '')}">

                <!-- Bio -->
                <div class="edit-field-label">Bio</div>
                <textarea class="edit-field-textarea" id="edit-bio" placeholder="Tell people a bit about yourself..." maxlength="160">${escHtml(profileData.bio || '')}</textarea>

                <!-- Banner colour -->
                <div class="banner-colour-label">Banner Colour</div>
                <div class="banner-colour-grid" id="banner-colour-grid"></div>

                <button class="edit-save-btn" onclick="saveProfile()">Save Changes</button>
                <div class="edit-status" id="edit-status"></div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        // Set preview pic
        updateEditPreview();

        // Render banner swatches
        const grid = document.getElementById('banner-colour-grid');
        BANNERS.forEach((b, i) => {
            const sw = document.createElement('div');
            sw.className = 'banner-swatch' + ((profileData.banner || BANNERS[0]) === b ? ' selected' : '');
            sw.style.background = b;
            sw.dataset.banner = b;
            sw.onclick = () => {
                document.querySelectorAll('.banner-swatch').forEach(s => s.classList.remove('selected'));
                sw.classList.add('selected');
            };
            grid.appendChild(sw);
        });
    }

    function updateEditPreview() {
        const prev = document.getElementById('edit-pic-preview');
        if (!prev) return;
        const src = pendingPicDataUrl || profileData.picUrl || '';
        if (src) {
            prev.style.backgroundImage = `url(${src})`;
            prev.style.backgroundSize  = 'cover';
            prev.style.backgroundPosition = 'center';
            prev.innerText = '';
        } else {
            prev.style.backgroundImage = '';
            prev.innerText = currentUser.email[0].toUpperCase();
        }
    }

    window.handlePicFile = function(input) {
        const file = input.files[0]; if (!file) return;
        compressForProfile(file).then(dataUrl => {
            pendingPicDataUrl = dataUrl;
            updateEditPreview();
        }).catch(e => alert('Could not load image: ' + e.message));
    };

    window.removePic = function() {
        pendingPicDataUrl = '__remove__';
        const prev = document.getElementById('edit-pic-preview');
        if (prev) {
            prev.style.backgroundImage = '';
            prev.innerText = currentUser.email[0].toUpperCase();
        }
    };

    window.saveProfile = async function() {
        const btn      = document.querySelector('.edit-save-btn');
        const statusEl = document.getElementById('edit-status');
        const name     = (document.getElementById('edit-display-name')?.value || '').trim();
        const bio      = (document.getElementById('edit-bio')?.value || '').trim();
        const selected = document.querySelector('.banner-swatch.selected');
        const banner   = selected ? selected.dataset.banner : (profileData.banner || BANNERS[0]);

        btn.disabled = true; btn.innerText = 'Saving...';
        statusEl.innerText = ''; statusEl.style.color = '#94a3b8';

        try {
            const update = {
                displayName: name,
                bio:         bio,
                banner:      banner,
                email:       currentUser.email,
                updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
            };

            if (pendingPicDataUrl === '__remove__') {
                update.picUrl = '';
            } else if (pendingPicDataUrl) {
                update.picUrl = pendingPicDataUrl;
            }

            await firebase.firestore().collection('profiles').doc(currentUser.email).set(update, { merge: true });

            // Update local cache
            profileData = { ...profileData, ...update };
            if (window.profileCache) window.profileCache[currentUser.email] = profileData;

            statusEl.innerText = '✓ Saved!'; statusEl.style.color = '#22c55e';
            setTimeout(() => {
                document.getElementById('profile-edit-modal')?.remove();
                renderProfilePage();
                applyNavPic();
            }, 700);
        } catch (e) {
            statusEl.innerText = 'Error: ' + e.message; statusEl.style.color = '#ef4444';
        }

        btn.disabled = false; btn.innerText = 'Save Changes';
    };

    // ── Compress profile pic — smaller than post images ───────────────────────
    function compressForProfile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Read failed'));
            reader.onload = e => {
                const img = new Image();
                img.onerror = () => reject(new Error('Decode failed'));
                img.onload = () => {
                    const size   = 200; // square crop
                    const canvas = document.createElement('canvas');
                    canvas.width = size; canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    // Centre-crop
                    const s  = Math.min(img.width, img.height);
                    const sx = (img.width  - s) / 2;
                    const sy = (img.height - s) / 2;
                    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function escHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

})();
