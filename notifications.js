// ═══════════════════════════════════════════════════════
// notifications.js — In-App Notifications
// Tracks: likes on your posts, comments on your posts
// Uses Firestore 'notifications' collection
// ═══════════════════════════════════════════════════════

(function () {

    // ── STYLES ────────────────────────────────────────────────────────────────
    const s = document.createElement('style');
    s.id = 'notif-styles';
    s.textContent = `
/* Nav bell button */
#notif-btn {
    position: relative; background: none; border: none; cursor: pointer;
    padding: 9px; border-radius: 10px; color: var(--muted);
    transition: background 0.15s, color 0.15s; display: flex; align-items: center;
}
#notif-btn:hover { background: var(--bg); color: var(--text); }
#notif-btn.has-notifs { color: var(--primary); }
.notif-bell-badge {
    position: absolute; top: 4px; right: 4px;
    background: var(--danger); color: white; font-size: 0.5rem; font-weight: 700;
    min-width: 14px; height: 14px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center; padding: 0 3px;
    border: 1.5px solid var(--white);
}

/* Notifications panel */
#notif-panel {
    position: fixed; top: calc(var(--nav-h) + 8px); right: 12px;
    width: 320px; max-width: calc(100vw - 24px);
    background: var(--white); border: 1px solid var(--border);
    border-radius: 16px; box-shadow: var(--shadow-lg);
    z-index: 800; overflow: hidden;
    animation: notifPanelIn 0.18s cubic-bezier(.4,0,.2,1);
    max-height: 70vh; display: flex; flex-direction: column;
}
@keyframes notifPanelIn {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
}
.notif-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px 10px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.notif-panel-title { font-weight: 700; font-size: 0.92rem; }
.notif-mark-read-btn {
    background: none; border: none; cursor: pointer;
    font-size: 0.75rem; color: var(--primary); font-family: inherit; font-weight: 500;
}
.notif-mark-read-btn:hover { text-decoration: underline; }
.notif-list { overflow-y: auto; flex: 1; }
.notif-item {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background 0.12s;
}
.notif-item:hover { background: var(--bg); }
.notif-item.unread { background: var(--primary-light); }
.notif-item.unread:hover { background: #dbeafe; }
.notif-icon {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; color: white; font-weight: 700; text-transform: uppercase;
}
.notif-text { flex: 1; min-width: 0; }
.notif-body { font-size: 0.84rem; color: var(--text); line-height: 1.4; }
.notif-body strong { font-weight: 600; }
.notif-time { font-size: 0.7rem; color: var(--muted); margin-top: 3px; }
.notif-empty {
    padding: 40px 20px; text-align: center; color: var(--muted); font-size: 0.88rem;
}
`;
    document.head.appendChild(s);

    // ── BOOT ─────────────────────────────────────────────────────────────────
    firebase.auth().onAuthStateChanged(user => {
        if (!user) return;
        _initNotifBtn(user);
        _listenNotifications(user);
    });

    let _panelOpen = false;
    let _panelEl   = null;

    // ── INJECT BELL IN NAV ────────────────────────────────────────────────────
    function _initNotifBtn(user) {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks || document.getElementById('notif-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'notif-btn';
        btn.title = 'Notifications';
        btn.innerHTML = `
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>`;
        btn.onclick = (e) => { e.stopPropagation(); _togglePanel(user); };

        // Insert before first nav-btn
        const firstNavBtn = navLinks.querySelector('.nav-btn');
        if (firstNavBtn) navLinks.insertBefore(btn, firstNavBtn);
        else navLinks.appendChild(btn);

        // Close panel on outside click
        document.addEventListener('click', (e) => {
            if (_panelEl && !_panelEl.contains(e.target) && e.target !== btn) {
                _closePanel();
            }
        });
    }

    // ── LISTEN FOR NOTIFICATIONS ──────────────────────────────────────────────
    function _listenNotifications(user) {
        db.collection('notifications')
            .where('toUid', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(40)
            .onSnapshot(snap => {
                const unread = snap.docs.filter(d => !d.data().read).length;
                _updateBell(unread);
                if (_panelOpen && _panelEl) _renderPanel(snap.docs, user);
            }, err => console.warn('Notifications:', err.message));
    }

    function _updateBell(count) {
        const btn = document.getElementById('notif-btn');
        if (!btn) return;
        btn.classList.toggle('has-notifs', count > 0);
        const existing = btn.querySelector('.notif-bell-badge');
        if (count > 0) {
            if (existing) existing.textContent = count > 9 ? '9+' : count;
            else {
                const badge = document.createElement('span');
                badge.className = 'notif-bell-badge';
                badge.textContent = count > 9 ? '9+' : count;
                btn.appendChild(badge);
            }
        } else if (existing) {
            existing.remove();
        }
    }

    // ── PANEL ─────────────────────────────────────────────────────────────────
    function _togglePanel(user) {
        if (_panelOpen) { _closePanel(); return; }
        _openPanel(user);
    }

    function _openPanel(user) {
        _closePanel();
        _panelOpen = true;
        _panelEl = document.createElement('div');
        _panelEl.id = 'notif-panel';
        _panelEl.innerHTML = `
            <div class="notif-panel-header">
                <span class="notif-panel-title">🔔 Notifications</span>
                <button class="notif-mark-read-btn" onclick="_markAllRead()">Mark all read</button>
            </div>
            <div class="notif-list" id="notif-list-body">
                <div class="notif-empty">Loading…</div>
            </div>`;
        document.body.appendChild(_panelEl);

        // Fetch and render
        db.collection('notifications')
            .where('toUid', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(40)
            .get().then(snap => { if (_panelEl) _renderPanel(snap.docs, user); });
    }

    function _closePanel() {
        if (_panelEl) { _panelEl.remove(); _panelEl = null; }
        _panelOpen = false;
    }

    function _renderPanel(docs, user) {
        const body = document.getElementById('notif-list-body');
        if (!body) return;
        if (!docs.length) {
            body.innerHTML = '<div class="notif-empty">No notifications yet</div>';
            return;
        }
        body.innerHTML = '';
        docs.forEach(doc => {
            const n = doc.data();
            const item = document.createElement('div');
            item.className = 'notif-item' + (n.read ? '' : ' unread');
            const initial = (n.fromEmail || '?')[0].toUpperCase();
            let text = '';
            if (n.type === 'like')    text = `<strong>${escapeHtml(n.fromEmail)}</strong> liked your post`;
            if (n.type === 'comment') text = `<strong>${escapeHtml(n.fromEmail)}</strong> commented: "${escapeHtml((n.preview||'').substring(0,40))}"`;
            if (n.type === 'system')  text = n.body || 'Notification';
            item.innerHTML = `
                <div class="notif-icon">${initial}</div>
                <div class="notif-text">
                    <div class="notif-body">${text}</div>
                    <div class="notif-time">${timeAgo(n.createdAt)}</div>
                </div>`;
            item.onclick = () => {
                _markRead(doc.id);
                _closePanel();
                showView('feed');
            };
            body.appendChild(item);
        });
    }

    window._markAllRead = function () {
        const user = firebase.auth().currentUser;
        if (!user) return;
        db.collection('notifications').where('toUid', '==', user.uid).where('read', '==', false)
            .get().then(snap => {
                const batch = db.batch();
                snap.forEach(d => batch.update(d.ref, { read: true }));
                return batch.commit();
            }).then(() => {
                _updateBell(0);
                if (typeof showToast === 'function') showToast('All caught up ✓');
                _closePanel();
            });
    };

    function _markRead(docId) {
        db.collection('notifications').doc(docId).update({ read: true }).catch(() => {});
    }

    // ── WRITE NOTIFICATIONS (called from posts.js toggleLike / submitComment) ──
    // We patch those functions after they're defined
    window._notifyLike = function(postId, postOwnerUid, postOwnerEmail) {
        if (!currentUser || currentUser.uid === postOwnerUid) return;
        db.collection('notifications').add({
            toUid:     postOwnerUid,
            toEmail:   postOwnerEmail,
            fromUid:   currentUser.uid,
            fromEmail: currentUser.email,
            type:      'like',
            postId,
            read:      false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    };

    window._notifyComment = function(postId, postOwnerUid, postOwnerEmail, preview) {
        if (!currentUser || currentUser.uid === postOwnerUid) return;
        db.collection('notifications').add({
            toUid:     postOwnerUid,
            toEmail:   postOwnerEmail,
            fromUid:   currentUser.uid,
            fromEmail: currentUser.email,
            type:      'comment',
            postId,
            preview:   preview || '',
            read:      false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    };

})();
