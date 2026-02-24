/**
 * admin.js — Owner & Admin Panel for Post Land
 * Only activates for: oleksandr.lahoza.24@phcol.ie
 * Add <script src="admin.js"></script> after app.js — no other files need editing.
 */

(function () {

    const OWNER_EMAIL = 'oleksandr.lahoza.24@phcol.ie';

    // ── Wait for Firebase auth ────────────────────────────────────────────────
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

    // ── Styles ────────────────────────────────────────────────────────────────
    const css = `
        /* Owner badge */
        .owner-badge {
            display: inline-flex; align-items: center; gap: 3px;
            background: linear-gradient(135deg, #f6d365, #fda085);
            color: white; font-size: 0.65rem; font-weight: 700;
            padding: 2px 7px; border-radius: 10px;
            letter-spacing: 0.3px; vertical-align: middle;
            margin-left: 5px; text-transform: uppercase;
            box-shadow: 0 1px 4px rgba(253,160,133,0.5);
        }
        .admin-badge {
            display: inline-flex; align-items: center; gap: 3px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white; font-size: 0.65rem; font-weight: 700;
            padding: 2px 7px; border-radius: 10px;
            letter-spacing: 0.3px; vertical-align: middle;
            margin-left: 5px; text-transform: uppercase;
            box-shadow: 0 1px 4px rgba(118,75,162,0.4);
        }

        /* Admin nav button */
        #admin-nav-btn {
            background: linear-gradient(135deg, #f6d365, #fda085);
            color: white; border: none; padding: 6px 12px;
            border-radius: 8px; font-size: 0.82rem; font-weight: 700;
            cursor: pointer; font-family: inherit; transition: opacity 0.2s;
        }
        #admin-nav-btn:hover { opacity: 0.85; }

        /* Admin panel overlay */
        #admin-panel {
            position: fixed; inset: 0; background: rgba(0,0,0,0.55);
            z-index: 5000; display: flex; align-items: center; justify-content: center;
            font-family: 'DM Sans', sans-serif;
        }
        .admin-modal {
            background: white; border-radius: 16px; width: 92%; max-width: 480px;
            max-height: 88vh; overflow-y: auto;
            box-shadow: 0 8px 40px rgba(0,0,0,0.25);
        }
        .admin-modal-header {
            padding: 20px 22px 16px;
            border-bottom: 1px solid #eee;
            display: flex; align-items: center; justify-content: space-between;
            position: sticky; top: 0; background: white; z-index: 1;
            border-radius: 16px 16px 0 0;
        }
        .admin-modal-header h2 { font-size: 1.1rem; font-weight: 700; }
        .admin-close {
            background: #f5f5f5; border: none; border-radius: 8px;
            width: 30px; height: 30px; font-size: 1rem; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        .admin-close:hover { background: #eee; }

        /* Tabs */
        .admin-tabs {
            display: flex; border-bottom: 1px solid #eee;
            padding: 0 22px; gap: 4px;
        }
        .admin-tab {
            background: none; border: none; padding: 10px 14px;
            font-size: 0.85rem; font-weight: 600; cursor: pointer;
            font-family: inherit; color: #888; border-bottom: 2px solid transparent;
            margin-bottom: -1px; transition: all 0.15s;
        }
        .admin-tab.active { color: #0095f6; border-bottom-color: #0095f6; }

        /* Tab content */
        .admin-tab-content { padding: 18px 22px; display: none; }
        .admin-tab-content.active { display: block; }

        /* Stats grid */
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
        .stat-card {
            background: #f9f9f9; border: 1px solid #eee; border-radius: 10px;
            padding: 14px; text-align: center;
        }
        .stat-num { font-size: 1.8rem; font-weight: 700; color: #0095f6; }
        .stat-label { font-size: 0.75rem; color: #888; margin-top: 2px; }

        /* User list */
        .admin-user-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 0; border-bottom: 1px solid #f0f0f0; gap: 10px;
        }
        .admin-user-row:last-child { border-bottom: none; }
        .admin-user-info { flex: 1; min-width: 0; }
        .admin-user-email { font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-user-meta { font-size: 0.72rem; color: #888; margin-top: 2px; }
        .admin-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .admin-btn {
            background: none; border: 1px solid #ddd; border-radius: 6px;
            padding: 4px 10px; font-size: 0.75rem; cursor: pointer;
            font-family: inherit; transition: all 0.15s; white-space: nowrap;
        }
        .admin-btn:hover { background: #f5f5f5; }
        .admin-btn.danger { color: #e53e3e; border-color: #fca5a5; }
        .admin-btn.danger:hover { background: #fff5f5; }
        .admin-btn.promote { color: #7c3aed; border-color: #c4b5fd; }
        .admin-btn.promote:hover { background: #f5f3ff; }
        .admin-btn.demote { color: #888; border-color: #ddd; }

        /* Post list in admin */
        .admin-post-row {
            padding: 10px 0; border-bottom: 1px solid #f0f0f0;
            display: flex; align-items: flex-start; gap: 10px;
        }
        .admin-post-row:last-child { border-bottom: none; }
        .admin-post-text { flex: 1; font-size: 0.83rem; color: #333; line-height: 1.4; }
        .admin-post-meta { font-size: 0.7rem; color: #aaa; margin-top: 3px; }

        /* Announce */
        .admin-announce-box textarea {
            width: 100%; padding: 10px 12px; border: 1px solid #ddd;
            border-radius: 8px; font-family: inherit; font-size: 0.9rem;
            resize: vertical; min-height: 80px; outline: none;
            margin-bottom: 10px; transition: border 0.2s;
        }
        .admin-announce-box textarea:focus { border-color: #0095f6; }
        .admin-announce-btn {
            background: #0095f6; color: white; border: none;
            padding: 9px 16px; border-radius: 8px; font-weight: 600;
            cursor: pointer; font-family: inherit; font-size: 0.88rem;
            width: 100%; transition: background 0.2s;
        }
        .admin-announce-btn:hover { background: #0077c2; }

        /* Announcement banner in feed */
        #announcement-banner {
            max-width: 520px; margin: 0 auto 14px; padding: 0 12px;
        }
        .announcement-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white; border-radius: 12px; padding: 14px 16px;
            font-size: 0.88rem; line-height: 1.5;
            box-shadow: 0 2px 8px rgba(102,126,234,0.35);
            display: flex; align-items: flex-start; gap: 10px;
        }
        .announcement-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 1px; }
        .announcement-text { flex: 1; }
        .announcement-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; margin-bottom: 3px; }
        .announcement-dismiss {
            background: rgba(255,255,255,0.2); border: none; color: white;
            border-radius: 6px; padding: 2px 8px; font-size: 0.75rem;
            cursor: pointer; flex-shrink: 0; font-family: inherit;
        }
        .announcement-dismiss:hover { background: rgba(255,255,255,0.3); }

        /* Search bar in admin */
        .admin-search {
            width: 100%; padding: 8px 12px; border: 1px solid #ddd;
            border-radius: 8px; font-family: inherit; font-size: 0.85rem;
            outline: none; margin-bottom: 14px; transition: border 0.2s;
        }
        .admin-search:focus { border-color: #0095f6; }

        .admin-empty { text-align: center; color: #aaa; padding: 20px; font-size: 0.85rem; }
        .admin-section-title { font-size: 0.75rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // ── Boot ──────────────────────────────────────────────────────────────────
    waitForAuth(function (user) {
        const isOwner = user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();

        // Add owner badge to all posts by this user (via MutationObserver)
        observeAndBadgePosts(user.email, isOwner);

        // Watch admin list to badge promoted admins too
        watchAdminBadges();

        // Load announcement banner for everyone
        loadAnnouncementBanner();

        if (!isOwner) return; // Everything below is owner-only

        // Inject admin button into nav
        injectAdminNav();
    });

    // ── Badge posts ───────────────────────────────────────────────────────────
    function observeAndBadgePosts(ownerEmail, isOwner) {
        const db = firebase.firestore();

        function applyBadges() {
            document.querySelectorAll('.post-author:not([data-badged])').forEach(el => {
                el.setAttribute('data-badged', 'true');
                const email = el.innerText.replace(' (you)', '').trim();
                if (email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
                    if (!el.querySelector('.owner-badge')) {
                        el.insertAdjacentHTML('beforeend', '<span class="owner-badge">👑 Owner</span>');
                    }
                } else {
                    // Check if this user is an admin
                    db.collection('admins').doc(email).get().then(doc => {
                        if (doc.exists && !el.querySelector('.admin-badge')) {
                            el.insertAdjacentHTML('beforeend', '<span class="admin-badge">🛡 Admin</span>');
                        }
                    });
                }
            });
        }

        const observer = new MutationObserver(applyBadges);
        const postsList = document.getElementById('posts-list');
        if (postsList) observer.observe(postsList, { childList: true, subtree: true });
        applyBadges();
    }

    function watchAdminBadges() {
        // Re-run badge check whenever posts update
        setInterval(() => {
            document.querySelectorAll('.post-author[data-badged]').forEach(el => {
                el.removeAttribute('data-badged');
            });
        }, 5000);
    }

    // ── Announcement Banner ───────────────────────────────────────────────────
    function loadAnnouncementBanner() {
        const db = firebase.firestore();
        db.collection('announcements').doc('current').onSnapshot(doc => {
            let banner = document.getElementById('announcement-banner');
            if (!doc.exists || !doc.data().text) {
                if (banner) banner.remove();
                return;
            }
            const data = doc.data();
            const dismissed = sessionStorage.getItem('announcement-dismissed');
            if (dismissed === data.id) return;

            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'announcement-banner';
                const feedView = document.getElementById('feed-view');
                if (feedView) feedView.insertBefore(banner, feedView.firstChild);
            }

            banner.innerHTML = `
                <div class="announcement-card">
                    <div class="announcement-icon">📢</div>
                    <div class="announcement-text">
                        <div class="announcement-label">Announcement from Owner</div>
                        ${data.text}
                    </div>
                    <button class="announcement-dismiss" onclick="dismissAnnouncement('${data.id}')">✕</button>
                </div>
            `;
        });
    }

    window.dismissAnnouncement = function (id) {
        sessionStorage.setItem('announcement-dismissed', id);
        const banner = document.getElementById('announcement-banner');
        if (banner) banner.remove();
    };

    // ── Inject Admin Nav Button ───────────────────────────────────────────────
    function injectAdminNav() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        const btn = document.createElement('button');
        btn.id        = 'admin-nav-btn';
        btn.innerText = '👑 Admin';
        btn.onclick   = openAdminPanel;
        navLinks.insertBefore(btn, navLinks.firstChild);
    }

    // ── Admin Panel ───────────────────────────────────────────────────────────
    function openAdminPanel() {
        if (document.getElementById('admin-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'admin-panel';
        panel.innerHTML = `
            <div class="admin-modal">
                <div class="admin-modal-header">
                    <h2>👑 Admin Panel</h2>
                    <button class="admin-close" onclick="document.getElementById('admin-panel').remove()">✕</button>
                </div>
                <div class="admin-tabs">
                    <button class="admin-tab active" onclick="switchAdminTab('stats')">📊 Stats</button>
                    <button class="admin-tab" onclick="switchAdminTab('users')">👥 Users</button>
                    <button class="admin-tab" onclick="switchAdminTab('posts')">📝 Posts</button>
                    <button class="admin-tab" onclick="switchAdminTab('announce')">📢 Announce</button>
                </div>
                <div id="admin-tab-stats" class="admin-tab-content active">
                    <div class="stats-grid" id="admin-stats-grid">
                        <div class="stat-card"><div class="stat-num" id="stat-posts">…</div><div class="stat-label">Total Posts</div></div>
                        <div class="stat-card"><div class="stat-num" id="stat-users">…</div><div class="stat-label">Registered Users</div></div>
                        <div class="stat-card"><div class="stat-num" id="stat-likes">…</div><div class="stat-label">Total Likes</div></div>
                        <div class="stat-card"><div class="stat-num" id="stat-msgs">…</div><div class="stat-label">Messages Sent</div></div>
                    </div>
                </div>
                <div id="admin-tab-users" class="admin-tab-content">
                    <input class="admin-search" placeholder="Search users..." oninput="filterAdminUsers(this.value)">
                    <div class="admin-section-title">All Users</div>
                    <div id="admin-user-list"><div class="admin-empty">Loading...</div></div>
                </div>
                <div id="admin-tab-posts" class="admin-tab-content">
                    <input class="admin-search" placeholder="Search posts..." oninput="filterAdminPosts(this.value)">
                    <div class="admin-section-title">All Posts</div>
                    <div id="admin-post-list"><div class="admin-empty">Loading...</div></div>
                </div>
                <div id="admin-tab-announce" class="admin-tab-content">
                    <div class="admin-section-title">Send Announcement to All Users</div>
                    <div class="admin-announce-box">
                        <textarea id="announce-text" placeholder="Write your announcement..."></textarea>
                        <button class="admin-announce-btn" onclick="sendAnnouncement()">📢 Post Announcement</button>
                    </div>
                    <div style="margin-top:14px;">
                        <button class="admin-btn danger" style="width:100%" onclick="clearAnnouncement()">🗑 Clear Current Announcement</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Close on backdrop click
        panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });

        loadAdminStats();
        loadAdminUsers();
        loadAdminPosts();
    }

    // ── Tab switching ─────────────────────────────────────────────────────────
    window.switchAdminTab = function (tab) {
        document.querySelectorAll('.admin-tab').forEach((t, i) => {
            t.classList.toggle('active', ['stats','users','posts','announce'][i] === tab);
        });
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        const el = document.getElementById(`admin-tab-${tab}`);
        if (el) el.classList.add('active');
    };

    // ── Stats ─────────────────────────────────────────────────────────────────
    function loadAdminStats() {
        const db = firebase.firestore();

        db.collection('posts').get().then(snap => {
            document.getElementById('stat-posts').innerText = snap.size;
            let totalLikes = 0;
            snap.forEach(doc => { totalLikes += (doc.data().likes || 0); });
            document.getElementById('stat-likes').innerText = totalLikes;
        });

        // Count unique users from posts
        db.collection('posts').get().then(snap => {
            const emails = new Set();
            snap.forEach(doc => { if (doc.data().email) emails.add(doc.data().email); });
            document.getElementById('stat-users').innerText = emails.size;
        });

        // Count messages across all chats
        db.collection('chats').get().then(async snap => {
            let total = 0;
            const promises = [];
            snap.forEach(doc => {
                promises.push(
                    db.collection('chats').doc(doc.id).collection('messages').get()
                        .then(msgs => { total += msgs.size; })
                );
            });
            await Promise.all(promises);
            document.getElementById('stat-msgs').innerText = total;
        });
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    let allAdminUsers = [];

    function loadAdminUsers() {
        const db = firebase.firestore();
        db.collection('posts').get().then(snap => {
            const userMap = {};
            snap.forEach(doc => {
                const d = doc.data();
                if (!d.email) return;
                if (!userMap[d.email]) userMap[d.email] = { email: d.email, posts: 0, likes: 0 };
                userMap[d.email].posts++;
                userMap[d.email].likes += (d.likes || 0);
            });
            allAdminUsers = Object.values(userMap);
            renderAdminUsers(allAdminUsers);
        });
    }

    function renderAdminUsers(users) {
        const db   = firebase.firestore();
        const list = document.getElementById('admin-user-list');
        if (!list) return;

        if (!users.length) { list.innerHTML = '<div class="admin-empty">No users found</div>'; return; }

        list.innerHTML = '';
        users.forEach(u => {
            const isOwnerAcc = u.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
            const row = document.createElement('div');
            row.className = 'admin-user-row';

            db.collection('admins').doc(u.email).get().then(doc => {
                const isAdmin = doc.exists;
                row.innerHTML = `
                    <div class="admin-user-info">
                        <div class="admin-user-email">
                            ${u.email}
                            ${isOwnerAcc ? '<span class="owner-badge">👑 Owner</span>' : ''}
                            ${isAdmin && !isOwnerAcc ? '<span class="admin-badge">🛡 Admin</span>' : ''}
                        </div>
                        <div class="admin-user-meta">${u.posts} posts · ${u.likes} likes</div>
                    </div>
                    <div class="admin-actions">
                        ${!isOwnerAcc ? `
                            ${isAdmin
                                ? `<button class="admin-btn demote" onclick="toggleAdmin('${u.email}', false)">Remove Admin</button>`
                                : `<button class="admin-btn promote" onclick="toggleAdmin('${u.email}', true)">Make Admin</button>`
                            }
                            <button class="admin-btn danger" onclick="adminDeleteUserPosts('${u.email}')">🗑 Posts</button>
                        ` : '<span style="font-size:0.75rem;color:#aaa;">Owner</span>'}
                    </div>
                `;
            });

            list.appendChild(row);
        });
    }

    window.filterAdminUsers = function (query) {
        const filtered = allAdminUsers.filter(u => u.email.toLowerCase().includes(query.toLowerCase()));
        renderAdminUsers(filtered);
    };

    window.toggleAdmin = function (email, makeAdmin) {
        const db = firebase.firestore();
        if (makeAdmin) {
            db.collection('admins').doc(email).set({ email, grantedAt: firebase.firestore.FieldValue.serverTimestamp() })
                .then(() => { alert(`✅ ${email} is now an Admin!`); loadAdminUsers(); });
        } else {
            db.collection('admins').doc(email).delete()
                .then(() => { alert(`${email} is no longer an Admin.`); loadAdminUsers(); });
        }
    };

    window.adminDeleteUserPosts = function (email) {
        if (!confirm(`Delete ALL posts by ${email}?`)) return;
        const db = firebase.firestore();
        db.collection('posts').where('email', '==', email).get().then(snap => {
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            return batch.commit();
        }).then(() => { alert(`All posts by ${email} deleted.`); loadAdminPosts(); });
    };

    // ── Posts ─────────────────────────────────────────────────────────────────
    let allAdminPosts = [];

    function loadAdminPosts() {
        const db = firebase.firestore();
        db.collection('posts').orderBy('createdAt', 'desc').get().then(snap => {
            allAdminPosts = [];
            snap.forEach(doc => allAdminPosts.push({ id: doc.id, ...doc.data() }));
            renderAdminPosts(allAdminPosts);
        });
    }

    function renderAdminPosts(posts) {
        const list = document.getElementById('admin-post-list');
        if (!list) return;
        if (!posts.length) { list.innerHTML = '<div class="admin-empty">No posts found</div>'; return; }

        list.innerHTML = '';
        posts.forEach(post => {
            const row = document.createElement('div');
            row.className = 'admin-post-row';
            row.innerHTML = `
                <div class="admin-post-text">
                    <div>${post.text ? post.text.substring(0, 100) + (post.text.length > 100 ? '...' : '') : ''}</div>
                    <div class="admin-post-meta">by ${post.email} · 👁 ${post.views || 0} · ❤️ ${post.likes || 0}</div>
                </div>
                <button class="admin-btn danger" onclick="adminDeletePost('${post.id}')">🗑</button>
            `;
            list.appendChild(row);
        });
    }

    window.filterAdminPosts = function (query) {
        const q = query.toLowerCase();
        const filtered = allAdminPosts.filter(p =>
            (p.text || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
        );
        renderAdminPosts(filtered);
    };

    window.adminDeletePost = function (postId) {
        if (!confirm('Delete this post?')) return;
        const db = firebase.firestore();
        db.collection('posts').doc(postId).delete().then(() => {
            allAdminPosts = allAdminPosts.filter(p => p.id !== postId);
            renderAdminPosts(allAdminPosts);
        });
    };

    // ── Announcements ─────────────────────────────────────────────────────────
    window.sendAnnouncement = function () {
        const text = document.getElementById('announce-text').value.trim();
        if (!text) { alert('Please write something first!'); return; }
        const db = firebase.firestore();
        db.collection('announcements').doc('current').set({
            text,
            id: Date.now().toString(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert('📢 Announcement posted!');
            document.getElementById('announce-text').value = '';
        });
    };

    window.clearAnnouncement = function () {
        if (!confirm('Clear the current announcement?')) return;
        firebase.firestore().collection('announcements').doc('current').delete()
            .then(() => alert('Announcement cleared.'));
    };

})();
