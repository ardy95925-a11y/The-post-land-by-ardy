/**
 * extras.js — Post Land Add-ons
 * Adds: Live Online Presence, Emoji Reactions, Trending Tags, Toast Notifications
 * Works standalone alongside app.js — no edits to other files needed.
 * Just add <script src="extras.js"></script> after app.js in index.html
 */

(function () {

    // ── Wait for Firebase + Auth to be ready ──────────────────────────────────
    function waitForReady(cb) {
        const check = setInterval(() => {
            if (window.firebase && firebase.apps.length && typeof currentUser !== 'undefined') {
                // Wait for the user to actually be logged in
                firebase.auth().onAuthStateChanged(user => {
                    if (user) { clearInterval(check); cb(user); }
                });
                clearInterval(check);
            }
        }, 200);
    }

    // ── Toast Notifications ───────────────────────────────────────────────────
    const toastStyles = `
        #toast-container {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            pointer-events: none;
        }
        .toast {
            background: #1a1a1a;
            color: white;
            padding: 10px 20px;
            border-radius: 24px;
            font-size: 0.85rem;
            font-family: 'DM Sans', sans-serif;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            animation: toastIn 0.3s ease, toastOut 0.3s ease 2.5s forwards;
            pointer-events: none;
        }
        @keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateY(6px); } }
    `;
    injectStyle(toastStyles, 'toast-styles');

    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);

    window.showToast = function (msg) {
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerText = msg;
        toastContainer.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    };

    // ── Styles for all extras ─────────────────────────────────────────────────
    const extraStyles = `
        /* ── ONLINE PRESENCE ── */
        #online-bar {
            max-width: 520px;
            margin: 0 auto 12px;
            padding: 0 12px;
        }
        .online-pill {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 30px;
            padding: 7px 14px;
            font-size: 0.78rem;
            color: #555;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            font-family: 'DM Sans', sans-serif;
            flex-wrap: wrap;
        }
        .online-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: #38a169;
            box-shadow: 0 0 0 2px #c6f6d5;
            animation: pulse-green 2s infinite;
            flex-shrink: 0;
        }
        @keyframes pulse-green {
            0%, 100% { box-shadow: 0 0 0 2px #c6f6d5; }
            50% { box-shadow: 0 0 0 4px #9ae6b4; }
        }
        .online-name {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
            padding: 2px 9px;
            border-radius: 12px;
            font-size: 0.74rem;
            font-weight: 500;
        }

        /* ── TRENDING TAGS ── */
        #trending-bar {
            max-width: 520px;
            margin: 0 auto 14px;
            padding: 0 12px;
        }
        .trending-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 12px 16px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            font-family: 'DM Sans', sans-serif;
        }
        .trending-title {
            font-size: 0.75rem;
            font-weight: 600;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        .trending-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
        }
        .trending-tag {
            background: #e8f4fd;
            color: #0077c2;
            border: none;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            font-family: inherit;
            transition: background 0.15s;
        }
        .trending-tag:hover { background: #bfdbfe; }
        .trending-tag .tag-count {
            font-size: 0.7rem;
            color: #60a5fa;
            margin-left: 3px;
        }

        /* ── REACTIONS ── */
        .reactions-row {
            padding: 6px 14px 10px;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        .reaction-btn {
            background: #f5f5f5;
            border: 1px solid #e0e0e0;
            border-radius: 20px;
            padding: 3px 10px;
            font-size: 0.82rem;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 4px;
            color: #555;
        }
        .reaction-btn:hover { background: #e8f4fd; border-color: #bfdbfe; }
        .reaction-btn.reacted { background: #fffbeb; border-color: #fde68a; color: #92400e; }
        .reaction-add {
            background: none;
            border: 1px dashed #ccc;
            border-radius: 20px;
            padding: 3px 10px;
            font-size: 0.82rem;
            cursor: pointer;
            color: #aaa;
            font-family: inherit;
            transition: all 0.15s;
        }
        .reaction-add:hover { border-color: #0095f6; color: #0095f6; background: #e8f4fd; }

        /* Reaction picker popup */
        .reaction-picker {
            position: absolute;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.12);
            display: flex;
            gap: 8px;
            z-index: 500;
            animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }
        .reaction-picker button {
            background: none;
            border: none;
            font-size: 1.4rem;
            cursor: pointer;
            padding: 4px;
            border-radius: 8px;
            transition: background 0.1s;
            line-height: 1;
        }
        .reaction-picker button:hover { background: #f5f5f5; transform: scale(1.2); }

        /* ── TAG FILTER BANNER ── */
        #tag-filter-bar {
            max-width: 520px;
            margin: 0 auto 10px;
            padding: 0 12px;
            display: none;
            align-items: center;
            gap: 8px;
            font-family: 'DM Sans', sans-serif;
            font-size: 0.85rem;
            color: #555;
        }
        #tag-filter-bar.visible { display: flex; }
        #tag-filter-label {
            background: #e8f4fd;
            color: #0077c2;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: 600;
        }
        #clear-tag-filter {
            background: none;
            border: none;
            color: #e53e3e;
            cursor: pointer;
            font-size: 0.82rem;
            font-family: inherit;
            padding: 4px 8px;
            border-radius: 8px;
        }
        #clear-tag-filter:hover { background: #fff5f5; }
    `;
    injectStyle(extraStyles, 'extras-styles');

    // ── Helper ────────────────────────────────────────────────────────────────
    function injectStyle(css, id) {
        if (document.getElementById(id)) return;
        const s = document.createElement('style');
        s.id = id;
        s.textContent = css;
        document.head.appendChild(s);
    }

    function getDB() { return firebase.firestore(); }

    // ═════════════════════════════════════════════════════════════════════════
    // BOOT — wait for login then initialise everything
    // ═════════════════════════════════════════════════════════════════════════
    firebase.auth().onAuthStateChanged(user => {
        if (!user) return;
        initOnlinePresence(user);
        initTrendingTags();
        initTagFilter();
        initReactions(user);
        patchPostsForExtras(user);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 1. ONLINE PRESENCE
    // ═════════════════════════════════════════════════════════════════════════
    function initOnlinePresence(user) {
        const db = getDB();
        const presenceRef = db.collection('presence').doc(user.uid);

        // Write presence
        presenceRef.set({
            email: user.email,
            online: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Mark offline on page hide
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                presenceRef.update({ online: false });
            } else {
                presenceRef.update({ online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
            }
        });

        window.addEventListener('beforeunload', () => {
            presenceRef.update({ online: false });
        });

        // Inject online bar into feed view
        const feedView = document.getElementById('feed-view');
        const bar = document.createElement('div');
        bar.id = 'online-bar';
        bar.innerHTML = `<div class="online-pill"><span class="online-dot"></span><span id="online-list">Checking who's online...</span></div>`;
        feedView.insertBefore(bar, feedView.firstChild);

        // Listen for online users (seen in last 5 mins)
        db.collection('presence').where('online', '==', true).onSnapshot(snap => {
            const names = [];
            snap.forEach(doc => {
                const d = doc.data();
                if (d.email) {
                    const short = d.email.split('@')[0];
                    names.push(`<span class="online-name">${short}</span>`);
                }
            });
            const el = document.getElementById('online-list');
            if (el) {
                el.innerHTML = names.length
                    ? `${names.length} online: ${names.join(' ')}`
                    : 'No one else online right now';
            }
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2. TRENDING TAGS
    // ═════════════════════════════════════════════════════════════════════════
    function initTrendingTags() {
        const db = getDB();
        const feedView = document.getElementById('feed-view');

        const trendBar = document.createElement('div');
        trendBar.id = 'trending-bar';
        trendBar.innerHTML = `
            <div class="trending-card">
                <div class="trending-title">🔥 Trending Tags</div>
                <div class="trending-tags" id="trending-tag-list">Loading...</div>
            </div>
        `;
        // Insert after online bar
        const onlineBar = document.getElementById('online-bar');
        feedView.insertBefore(trendBar, onlineBar ? onlineBar.nextSibling : feedView.firstChild);

        db.collection('posts').onSnapshot(snap => {
            const counts = {};
            snap.forEach(doc => {
                const tags = doc.data().tags || [];
                tags.forEach(t => {
                    if (t) counts[t] = (counts[t] || 0) + 1;
                });
            });

            const sorted = Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

            const list = document.getElementById('trending-tag-list');
            if (!list) return;

            if (!sorted.length) {
                list.innerHTML = '<span style="color:#aaa;font-size:0.8rem;">No tags yet</span>';
                return;
            }

            list.innerHTML = sorted.map(([tag, count]) =>
                `<button class="trending-tag" onclick="filterByTag('${tag}')">#${tag}<span class="tag-count">${count}</span></button>`
            ).join('');
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 3. TAG FILTER
    // ═════════════════════════════════════════════════════════════════════════
    let activeTagFilter = null;

    function initTagFilter() {
        const feedView = document.getElementById('feed-view');
        const filterBar = document.createElement('div');
        filterBar.id = 'tag-filter-bar';
        filterBar.innerHTML = `
            <span>Showing:</span>
            <span id="tag-filter-label"></span>
            <button id="clear-tag-filter" onclick="clearTagFilter()">✕ Clear</button>
        `;
        const trendBar = document.getElementById('trending-bar');
        feedView.insertBefore(filterBar, trendBar ? trendBar.nextSibling : feedView.firstChild);
    }

    window.filterByTag = function (tag) {
        activeTagFilter = tag;
        document.getElementById('tag-filter-label').innerText = '#' + tag;
        document.getElementById('tag-filter-bar').classList.add('visible');
        applyTagFilter(tag);
        showToast(`Showing posts tagged #${tag}`);
    };

    window.clearTagFilter = function () {
        activeTagFilter = null;
        document.getElementById('tag-filter-bar').classList.remove('visible');
        document.querySelectorAll('.post').forEach(p => p.style.display = '');
        showToast('Showing all posts');
    };

    function applyTagFilter(tag) {
        document.querySelectorAll('.post').forEach(post => {
            const tags = post.querySelectorAll('.tag');
            const match = Array.from(tags).some(t => t.innerText.replace('#', '') === tag);
            post.style.display = match ? '' : 'none';
        });
    }

    // Re-apply filter whenever posts reload
    const observer = new MutationObserver(() => {
        if (activeTagFilter) applyTagFilter(activeTagFilter);
    });
    const postsList = document.getElementById('posts-list');
    if (postsList) observer.observe(postsList, { childList: true });

    // ═════════════════════════════════════════════════════════════════════════
    // 4. EMOJI REACTIONS
    // ═════════════════════════════════════════════════════════════════════════
    const EMOJIS = ['🔥', '😂', '😮', '❤️', '👏', '💯'];

    function initReactions(user) {
        // We hook into post rendering via MutationObserver
        const postsList = document.getElementById('posts-list');
        if (!postsList) return;

        const reactObserver = new MutationObserver(() => {
            document.querySelectorAll('.post:not([data-reactions-added])').forEach(post => {
                const actions = post.querySelector('.post-actions');
                if (!actions) return;

                // Get post ID from delete or view button
                const postId = getPostIdFromPost(post);
                if (!postId) return;

                post.setAttribute('data-reactions-added', 'true');
                addReactionsUI(post, postId, user);
            });
        });

        reactObserver.observe(postsList, { childList: true, subtree: true });
    }

    function getPostIdFromPost(postEl) {
        // Extract postId from the delete button onclick or view button onclick
        const btns = postEl.querySelectorAll('.action-btn');
        for (const btn of btns) {
            const match = btn.getAttribute('onclick')?.match(/'([a-zA-Z0-9]+)'/);
            if (match) return match[1];
        }
        return null;
    }

    function addReactionsUI(postEl, postId, user) {
        const db = getDB();
        const reactRef = db.collection('reactions').doc(postId);

        const reactRow = document.createElement('div');
        reactRow.className = 'reactions-row';
        reactRow.setAttribute('data-post-id', postId);

        // Add picker button
        const addBtn = document.createElement('button');
        addBtn.className = 'reaction-add';
        addBtn.innerText = '＋ React';
        addBtn.onclick = (e) => togglePicker(e, postId, user, reactRow);
        reactRow.appendChild(addBtn);

        // Insert before post-actions
        const actions = postEl.querySelector('.post-actions');
        postEl.insertBefore(reactRow, actions);

        // Listen to reactions in real time
        reactRef.onSnapshot(doc => {
            if (!doc.exists) return;
            const data = doc.data() || {};
            renderReactions(reactRow, addBtn, data, postId, user);
        });
    }

    function renderReactions(reactRow, addBtn, data, postId, user) {
        // Remove old reaction buttons (keep addBtn)
        reactRow.querySelectorAll('.reaction-btn').forEach(b => b.remove());

        Object.entries(data).forEach(([emoji, uids]) => {
            if (!Array.isArray(uids) || !uids.length) return;
            const hasReacted = uids.includes(user.uid);
            const btn = document.createElement('button');
            btn.className = 'reaction-btn' + (hasReacted ? ' reacted' : '');
            btn.innerHTML = `${emoji} <span>${uids.length}</span>`;
            btn.onclick = () => toggleReaction(postId, emoji, hasReacted, user);
            reactRow.insertBefore(btn, addBtn);
        });
    }

    let openPicker = null;

    function togglePicker(e, postId, user, reactRow) {
        e.stopPropagation();

        // Close if already open
        if (openPicker) { openPicker.remove(); openPicker = null; return; }

        const picker = document.createElement('div');
        picker.className = 'reaction-picker';
        picker.style.bottom = '36px';
        picker.style.left = '0';

        EMOJIS.forEach(emoji => {
            const btn = document.createElement('button');
            btn.innerText = emoji;
            btn.onclick = (ev) => {
                ev.stopPropagation();
                toggleReaction(postId, emoji, false, user);
                picker.remove();
                openPicker = null;
            };
            picker.appendChild(btn);
        });

        reactRow.style.position = 'relative';
        reactRow.appendChild(picker);
        openPicker = picker;

        setTimeout(() => {
            document.addEventListener('click', () => {
                if (openPicker) { openPicker.remove(); openPicker = null; }
            }, { once: true });
        }, 0);
    }

    function toggleReaction(postId, emoji, hasReacted, user) {
        const db = getDB();
        const ref = db.collection('reactions').doc(postId);
        if (hasReacted) {
            ref.set({
                [emoji]: firebase.firestore.FieldValue.arrayRemove(user.uid)
            }, { merge: true });
        } else {
            ref.set({
                [emoji]: firebase.firestore.FieldValue.arrayUnion(user.uid)
            }, { merge: true });
            showToast(`Reacted with ${emoji}`);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 5. PATCH showView to re-apply tag filter on feed
    // ═════════════════════════════════════════════════════════════════════════
    function patchPostsForExtras() {
        const origShowView = window.showView;
        window.showView = function (view) {
            origShowView(view);
            if (view === 'feed' && activeTagFilter) {
                setTimeout(() => applyTagFilter(activeTagFilter), 100);
            }
        };
    }

})();
