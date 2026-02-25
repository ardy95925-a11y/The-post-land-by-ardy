/**
 * extras.js — Post Land Add-ons
 * Features: Online Presence, Trending Tags, Tag Filter, Emoji Reactions,
 *           Toast Notifications, Dark Mode, Post Search
 */

(function () {

    // ── Toast Notifications ───────────────────────────────────────────────────
    const toastStyles = `
        #toast-container {
            position: fixed;
            bottom: 80px;
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
            background: #1a1a2e;
            color: white;
            padding: 10px 20px;
            border-radius: 24px;
            font-size: 0.85rem;
            font-family: 'Inter', sans-serif;
            box-shadow: 0 4px 20px rgba(0,0,0,0.25);
            animation: toastIn 0.3s ease, toastOut 0.3s ease 2.5s forwards;
            pointer-events: none;
            white-space: nowrap;
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

    // ── Extra Styles ──────────────────────────────────────────────────────────
    const extraStyles = `
        /* Dark mode */
        [data-dark] {
            --bg: #0f1117;
            --white: #1a1d27;
            --border: #2a2d3a;
            --text: #e8eaf0;
            --text-2: #9aa0b5;
            --muted: #5a6282;
            --primary-light: #1a2540;
            --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
            --shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        [data-dark] body { background: #0a0c12; }
        [data-dark] nav { background: rgba(26,29,39,0.95); }
        [data-dark] #msg-box { background: #0f1117; }
        [data-dark] .auth-card { background: #1a1d27; border-color: #2a2d3a; }
        [data-dark] .msg-row.theirs .msg-bubble { background: #2a2d3a; color: #e8eaf0; border-color: #3a3d4a; }
        [data-dark] #msg-input { background: #1a1d27; color: #e8eaf0; border-color: #2a2d3a; }
        [data-dark] .gif-search-input { background: #1a1d27; color: #e8eaf0; }
        [data-dark] .media-panel { background: #1a1d27; }
        [data-dark] .sticker-btn { background: #2a2d3a; }
        [data-dark] .sticker-btn:hover { background: #1a2540; }

        /* Dark mode toggle in nav */
        #dark-mode-btn {
            background: none; border: none; cursor: pointer;
            padding: 9px; border-radius: 10px; color: var(--muted);
            transition: background 0.15s, color 0.15s;
            display: flex; align-items: center; font-size: 1.1rem;
        }
        #dark-mode-btn:hover { background: var(--bg); color: var(--text); }

        /* ── SEARCH BAR ── */
        #search-bar {
            max-width: 520px;
            margin: 0 auto 12px;
            padding: 0 12px;
        }
        .search-wrap {
            position: relative;
        }
        .search-input {
            width: 100%; padding: 10px 16px 10px 38px;
            border: 1.5px solid var(--border); border-radius: 22px;
            font-size: 0.9rem; outline: none; font-family: inherit;
            background: var(--white); color: var(--text);
            transition: border 0.2s, box-shadow 0.2s;
            box-shadow: var(--shadow-sm);
        }
        .search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .search-icon {
            position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
            color: var(--muted); pointer-events: none;
        }
        .search-clear {
            position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
            background: var(--bg); border: none; cursor: pointer;
            width: 22px; height: 22px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.7rem; color: var(--muted); transition: all 0.15s;
        }
        .search-clear:hover { background: var(--border); color: var(--text); }

        /* ── ONLINE PRESENCE ── */
        #online-bar {
            max-width: 520px;
            margin: 0 auto 12px;
            padding: 0 12px;
        }
        .online-pill {
            background: var(--white);
            border: 1px solid var(--border);
            border-radius: 30px;
            padding: 7px 14px;
            font-size: 0.78rem;
            color: var(--text-2);
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: var(--shadow-sm);
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
        [data-dark] .online-name { background: #0d2a1a; border-color: #1a4a2e; color: #4ade80; }

        /* ── TRENDING TAGS ── */
        #trending-bar {
            max-width: 520px;
            margin: 0 auto 14px;
            padding: 0 12px;
        }
        .trending-card {
            background: var(--white);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px 16px;
            box-shadow: var(--shadow-sm);
        }
        .trending-title {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--muted);
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
            background: var(--primary-light);
            color: var(--primary);
            border: none;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            font-family: inherit;
            transition: background 0.15s;
        }
        .trending-tag:hover { opacity: 0.8; }
        .trending-tag .tag-count {
            font-size: 0.7rem;
            color: var(--primary);
            margin-left: 3px;
            opacity: 0.7;
        }

        /* ── REACTIONS ── */
        .reactions-row {
            padding: 6px 14px 10px;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        .reaction-btn {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 3px 10px;
            font-size: 0.82rem;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--text-2);
        }
        .reaction-btn:hover { border-color: var(--primary); }
        .reaction-btn.reacted { background: #fffbeb; border-color: #fde68a; color: #92400e; }
        [data-dark] .reaction-btn.reacted { background: #2a2000; border-color: #665500; color: #fde68a; }
        .reaction-add {
            background: none;
            border: 1px dashed var(--border);
            border-radius: 20px;
            padding: 3px 10px;
            font-size: 0.82rem;
            cursor: pointer;
            color: var(--muted);
            font-family: inherit;
            transition: all 0.15s;
        }
        .reaction-add:hover { border-color: var(--primary); color: var(--primary); }

        .reaction-picker {
            position: absolute;
            background: var(--white);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 10px;
            box-shadow: var(--shadow);
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
        .reaction-picker button:hover { background: var(--bg); transform: scale(1.2); }

        /* ── TAG FILTER ── */
        #tag-filter-bar {
            max-width: 520px;
            margin: 0 auto 10px;
            padding: 0 12px;
            display: none;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: var(--text-2);
        }
        #tag-filter-bar.visible { display: flex; }
        #tag-filter-label {
            background: var(--primary-light);
            color: var(--primary);
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: 600;
        }
        #clear-tag-filter {
            background: none;
            border: none;
            color: var(--danger);
            cursor: pointer;
            font-size: 0.82rem;
            font-family: inherit;
            padding: 4px 8px;
            border-radius: 8px;
        }
        #clear-tag-filter:hover { background: #fff5f5; }

        /* ── COMMENTS ── */
        .comments-section {
            border-top: 1px solid var(--border);
            padding: 10px 14px 4px;
            background: var(--bg);
        }
        .comments-list { margin-bottom: 10px; }
        .no-comments { font-size: 0.8rem; color: var(--muted); text-align: center; padding: 10px 0; }
        .comment-item {
            display: flex; align-items: flex-start; gap: 8px;
            margin-bottom: 10px;
        }
        .comment-avatar-sm {
            width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white; font-weight: 700; font-size: 0.7rem;
            display: flex; align-items: center; justify-content: center;
            text-transform: uppercase;
        }
        .comment-body { flex: 1; background: var(--white); border-radius: 10px; padding: 7px 10px; border: 1px solid var(--border); }
        .comment-author { font-size: 0.78rem; font-weight: 600; color: var(--primary); margin-bottom: 2px; }
        .comment-text { font-size: 0.86rem; color: var(--text); line-height: 1.4; word-break: break-word; }
        .comment-time { font-size: 0.7rem; color: var(--muted); margin-top: 3px; }
        .comment-delete-btn {
            background: none; border: none; cursor: pointer; color: var(--muted);
            font-size: 0.75rem; padding: 2px 6px; border-radius: 6px; align-self: flex-start;
            margin-top: 4px; transition: all 0.15s;
        }
        .comment-delete-btn:hover { background: #fef2f2; color: var(--danger); }
        .comment-input-row {
            display: flex; align-items: center; gap: 8px;
            padding-top: 4px;
        }
        .comment-avatar { 
            width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white; font-weight: 700; font-size: 0.7rem;
            display: flex; align-items: center; justify-content: center;
        }
        .comment-input {
            flex: 1; padding: 8px 12px; border: 1.5px solid var(--border);
            border-radius: 20px; font-size: 0.85rem; outline: none;
            font-family: inherit; background: var(--white); color: var(--text);
            transition: border 0.2s;
        }
        .comment-input:focus { border-color: var(--primary); }
        .comment-send-btn {
            background: var(--primary); color: white; border: none;
            border-radius: 50%; width: 30px; height: 30px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.15s; flex-shrink: 0;
        }
        .comment-send-btn:hover { background: var(--primary-dark); }

        /* ── YOU BADGE ── */
        .you-badge { font-size:0.7rem; color:var(--muted); font-weight:400; }

        /* ── POST STICKER/GIF ── */
        .post-sticker-wrap { padding: 4px 14px 8px; }
        .post-sticker { font-size: 2.8rem; line-height: 1; }
        .post-gif-wrap { position: relative; }
        .gif-badge {
            position: absolute; bottom: 6px; left: 6px;
            background: rgba(0,0,0,0.65); color: white;
            font-size: 0.6rem; font-weight: 700; padding: 2px 6px;
            border-radius: 4px; pointer-events: none; letter-spacing: 0.5px;
        }
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
    // BOOT
    // ═════════════════════════════════════════════════════════════════════════
    firebase.auth().onAuthStateChanged(user => {
        if (!user) return;
        initDarkModeBtn();
        initOnlinePresence(user);
        initSearchBar();
        initTrendingTags();
        initTagFilter();
        initReactions(user);
        patchShowView(user);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 0. DARK MODE BUTTON IN NAV
    // ═════════════════════════════════════════════════════════════════════════
    function initDarkModeBtn() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks || document.getElementById('dark-mode-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'dark-mode-btn';
        const isDark = document.documentElement.hasAttribute('data-dark');
        btn.title = isDark ? 'Light mode' : 'Dark mode';
        btn.innerHTML = isDark ? '☀️' : '🌙';
        btn.onclick = () => {
            toggleDarkMode();
            const nowDark = document.documentElement.hasAttribute('data-dark');
            btn.innerHTML = nowDark ? '☀️' : '🌙';
            btn.title = nowDark ? 'Light mode' : 'Dark mode';
        };
        navLinks.prepend(btn);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 1. ONLINE PRESENCE
    // ═════════════════════════════════════════════════════════════════════════
    function initOnlinePresence(user) {
        const db = getDB();
        const presenceRef = db.collection('presence').doc(user.uid);
        presenceRef.set({ email: user.email, online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { presenceRef.update({ online: false }); }
            else { presenceRef.update({ online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp() }); }
        });
        window.addEventListener('beforeunload', () => presenceRef.update({ online: false }));

        const feedView = document.getElementById('feed-view');
        const bar = document.createElement('div');
        bar.id = 'online-bar';
        bar.innerHTML = `<div class="online-pill"><span class="online-dot"></span><span id="online-list">Checking who's online...</span></div>`;
        feedView.insertBefore(bar, feedView.firstChild);

        db.collection('presence').where('online', '==', true).onSnapshot(snap => {
            const names = [];
            snap.forEach(doc => {
                const d = doc.data();
                if (d.email) { names.push(`<span class="online-name">${d.email.split('@')[0]}</span>`); }
            });
            const el = document.getElementById('online-list');
            if (el) el.innerHTML = names.length ? `${names.length} online: ${names.join(' ')}` : 'No one else online right now';
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2. SEARCH BAR
    // ═════════════════════════════════════════════════════════════════════════
    let _searchQuery = '';

    function initSearchBar() {
        const feedView = document.getElementById('feed-view');
        if (!feedView || document.getElementById('search-bar')) return;

        const bar = document.createElement('div');
        bar.id = 'search-bar';
        bar.innerHTML = `
            <div class="search-wrap">
                <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input class="search-input" id="post-search-input" placeholder="Search posts…" oninput="onPostSearch(this.value)">
                <button class="search-clear" id="search-clear-btn" style="display:none" onclick="clearPostSearch()">✕</button>
            </div>`;
        feedView.insertBefore(bar, feedView.firstChild);
    }

    window.onPostSearch = function(query) {
        _searchQuery = query.trim().toLowerCase();
        const clearBtn = document.getElementById('search-clear-btn');
        if (clearBtn) clearBtn.style.display = _searchQuery ? 'flex' : 'none';
        applyPostSearch();
    };

    window.clearPostSearch = function() {
        const inp = document.getElementById('post-search-input');
        if (inp) inp.value = '';
        _searchQuery = '';
        const clearBtn = document.getElementById('search-clear-btn');
        if (clearBtn) clearBtn.style.display = 'none';
        document.querySelectorAll('.post').forEach(p => p.style.display = '');
    };

    function applyPostSearch() {
        if (!_searchQuery) { document.querySelectorAll('.post').forEach(p => p.style.display = ''); return; }
        document.querySelectorAll('.post').forEach(post => {
            const textEl = post.querySelector('.post-text');
            const tagEls = post.querySelectorAll('.tag');
            const authorEl = post.querySelector('.post-author');
            const text   = (textEl?.innerText || '').toLowerCase();
            const author = (authorEl?.innerText || '').toLowerCase();
            const tags   = Array.from(tagEls).map(t => t.innerText.toLowerCase()).join(' ');
            const match  = text.includes(_searchQuery) || author.includes(_searchQuery) || tags.includes(_searchQuery);
            post.style.display = match ? '' : 'none';
        });
    }

    // Re-apply on post updates
    const _searchObserver = new MutationObserver(() => {
        if (_searchQuery) applyPostSearch();
        if (activeTagFilter) applyTagFilter(activeTagFilter);
    });
    const postsList = document.getElementById('posts-list');
    if (postsList) _searchObserver.observe(postsList, { childList: true });

    // ═════════════════════════════════════════════════════════════════════════
    // 3. TRENDING TAGS
    // ═════════════════════════════════════════════════════════════════════════
    function initTrendingTags() {
        const db = getDB();
        const feedView = document.getElementById('feed-view');
        if (!feedView) return;

        const trendBar = document.createElement('div');
        trendBar.id = 'trending-bar';
        trendBar.innerHTML = `
            <div class="trending-card">
                <div class="trending-title">🔥 Trending Tags</div>
                <div class="trending-tags" id="trending-tag-list">Loading...</div>
            </div>`;

        const onlineBar = document.getElementById('online-bar');
        const searchBar = document.getElementById('search-bar');
        const insertAfter = searchBar || onlineBar;
        if (insertAfter) feedView.insertBefore(trendBar, insertAfter.nextSibling);
        else feedView.insertBefore(trendBar, feedView.firstChild);

        db.collection('posts').onSnapshot(snap => {
            const counts = {};
            snap.forEach(doc => {
                (doc.data().tags || []).forEach(t => { if (t) counts[t] = (counts[t] || 0) + 1; });
            });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
            const list = document.getElementById('trending-tag-list');
            if (!list) return;
            if (!sorted.length) { list.innerHTML = '<span style="color:var(--muted);font-size:0.8rem;">No tags yet</span>'; return; }
            list.innerHTML = sorted.map(([tag, count]) =>
                `<button class="trending-tag" onclick="filterByTag('${tag}')">#${tag}<span class="tag-count">${count}</span></button>`
            ).join('');
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 4. TAG FILTER
    // ═════════════════════════════════════════════════════════════════════════
    let activeTagFilter = null;

    function initTagFilter() {
        const feedView = document.getElementById('feed-view');
        if (!feedView || document.getElementById('tag-filter-bar')) return;
        const filterBar = document.createElement('div');
        filterBar.id = 'tag-filter-bar';
        filterBar.innerHTML = `
            <span>Showing:</span>
            <span id="tag-filter-label"></span>
            <button id="clear-tag-filter" onclick="clearTagFilter()">✕ Clear</button>`;
        const trendBar = document.getElementById('trending-bar');
        if (trendBar) feedView.insertBefore(filterBar, trendBar.nextSibling);
        else feedView.insertBefore(filterBar, feedView.firstChild);
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
            const tags  = post.querySelectorAll('.tag');
            const match = Array.from(tags).some(t => t.innerText.replace('#', '') === tag);
            post.style.display = match ? '' : 'none';
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 5. EMOJI REACTIONS
    // ═════════════════════════════════════════════════════════════════════════
    const EMOJIS = ['🔥', '😂', '😮', '❤️', '👏', '💯'];

    function initReactions(user) {
        const postsList = document.getElementById('posts-list');
        if (!postsList) return;

        const reactObserver = new MutationObserver(() => {
            document.querySelectorAll('.post:not([data-reactions-added])').forEach(post => {
                const actions = post.querySelector('.post-actions');
                if (!actions) return;
                const postId = getPostIdFromPost(post);
                if (!postId) return;
                post.setAttribute('data-reactions-added', 'true');
                addReactionsUI(post, postId, user);
            });
        });
        reactObserver.observe(postsList, { childList: true, subtree: true });
    }

    function getPostIdFromPost(postEl) {
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

        const addBtn = document.createElement('button');
        addBtn.className = 'reaction-add';
        addBtn.innerText = '＋ React';
        addBtn.onclick = (e) => togglePicker(e, postId, user, reactRow);
        reactRow.appendChild(addBtn);

        const actions = postEl.querySelector('.post-actions');
        postEl.insertBefore(reactRow, actions);

        reactRef.onSnapshot(doc => {
            if (!doc.exists) return;
            renderReactions(reactRow, addBtn, doc.data() || {}, postId, user);
        });
    }

    function renderReactions(reactRow, addBtn, data, postId, user) {
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
        if (openPicker) { openPicker.remove(); openPicker = null; return; }

        const picker = document.createElement('div');
        picker.className = 'reaction-picker';
        picker.style.cssText = 'bottom:36px;left:0;';
        EMOJIS.forEach(emoji => {
            const btn = document.createElement('button');
            btn.innerText = emoji;
            btn.onclick = (ev) => {
                ev.stopPropagation();
                toggleReaction(postId, emoji, false, user);
                picker.remove(); openPicker = null;
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
            ref.set({ [emoji]: firebase.firestore.FieldValue.arrayRemove(user.uid) }, { merge: true });
        } else {
            ref.set({ [emoji]: firebase.firestore.FieldValue.arrayUnion(user.uid) }, { merge: true });
            showToast(`Reacted with ${emoji}`);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 6. PATCH showView
    // ═════════════════════════════════════════════════════════════════════════
    function patchShowView(user) {
        const origShowView = window.showView;
        window.showView = function (view) {
            origShowView(view);
            if (view === 'feed' && activeTagFilter) setTimeout(() => applyTagFilter(activeTagFilter), 100);
            if (view === 'feed' && _searchQuery) setTimeout(() => applyPostSearch(), 100);
        };
    }

})();
