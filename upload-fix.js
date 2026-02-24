/**
 * upload-fix.js — Replaces the broken uploadPost() with a bulletproof version.
 * Add <script src="upload-fix.js"></script> AFTER app.js in index.html.
 * No other files need changing.
 */

(function () {

    // Wait until Firebase + auth are ready
    function waitForAuth(cb) {
        const interval = setInterval(() => {
            if (
                window.firebase &&
                firebase.apps.length > 0 &&
                window.storage &&
                window.db
            ) {
                firebase.auth().onAuthStateChanged(user => {
                    if (user) { clearInterval(interval); cb(user); }
                });
                clearInterval(interval);
            }
        }, 150);
    }

    waitForAuth(function (user) {

        // ── Override uploadPost completely ────────────────────────────────────
        window.uploadPost = async function () {
            const btn       = document.getElementById('upload-btn');
            const statusEl  = document.getElementById('upload-status');
            const textEl    = document.getElementById('post-text');
            const tagsEl    = document.getElementById('post-tags');
            const imageEl   = document.getElementById('post-image');

            const text = textEl ? textEl.value.trim() : '';
            const file = imageEl && imageEl.files.length > 0 ? imageEl.files[0] : null;

            // Parse tags safely — handles empty string, spaces, extra commas
            let tags = [];
            if (tagsEl && tagsEl.value.trim()) {
                tags = tagsEl.value
                    .split(',')
                    .map(t => t.trim().replace(/[^a-zA-Z0-9_]/g, ''))
                    .filter(t => t.length > 0)
                    .slice(0, 10); // max 10 tags
            }

            function setStatus(msg, color) {
                if (!statusEl) return;
                statusEl.innerText = msg;
                statusEl.style.color = color || '#888';
            }

            function resetBtn() {
                if (btn) { btn.disabled = false; btn.innerText = 'Publish'; }
            }

            // Validate
            if (!text) {
                setStatus('Please write something before posting!', '#e53e3e');
                return;
            }

            if (btn) { btn.disabled = true; btn.innerText = 'Publishing...'; }
            setStatus('Starting...', '#888');

            // ── Step 1: Upload image if present ──────────────────────────────
            let imageUrl = '';

            if (file) {
                setStatus('Uploading image... please wait', '#888');

                // Validate file type
                const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowed.includes(file.type)) {
                    setStatus('Only JPG, PNG, GIF or WEBP images allowed.', '#e53e3e');
                    resetBtn();
                    return;
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    setStatus('Image is too large. Max size is 5MB.', '#e53e3e');
                    resetBtn();
                    return;
                }

                try {
                    // Build a clean, safe storage path
                    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
                    const path = `posts/${user.uid}_${Date.now()}.${ext}`;
                    const ref = storage.ref(path);

                    // Upload
                    const uploadSnap = await ref.put(file, { contentType: file.type });
                    imageUrl = await uploadSnap.ref.getDownloadURL();

                    setStatus('Image uploaded! Saving post...', '#888');
                } catch (imgErr) {
                    console.error('Image upload failed:', imgErr);

                    // Give a specific helpful message based on error code
                    let errMsg = 'Image upload failed: ' + imgErr.message;
                    if (imgErr.code === 'storage/unauthorized') {
                        errMsg = 'Image upload blocked. Please update your Firebase Storage rules — see instructions below.';
                        showStorageRulesHelp();
                    } else if (imgErr.code === 'storage/canceled') {
                        errMsg = 'Upload was cancelled. Please try again.';
                    } else if (imgErr.code === 'storage/unknown') {
                        errMsg = 'Network error during upload. Check your connection and try again.';
                    }

                    setStatus(errMsg, '#e53e3e');
                    resetBtn();
                    return; // Stop — don't post without the image
                }
            }

            // ── Step 2: Save post to Firestore ────────────────────────────────
            try {
                setStatus('Saving post...', '#888');

                await db.collection('posts').add({
                    uid:       user.uid,
                    email:     user.email,
                    text:      text,
                    imageUrl:  imageUrl,
                    tags:      tags,
                    views:     0,
                    likes:     0,
                    likedBy:   [],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // ── Reset form ────────────────────────────────────────────────
                if (textEl)  textEl.value  = '';
                if (tagsEl)  tagsEl.value  = '';
                if (imageEl) imageEl.value = '';

                const counter = document.getElementById('char-counter');
                if (counter) counter.innerText = '0 / 300';

                const preview = document.getElementById('image-preview');
                const removeBtn = document.getElementById('remove-image-btn');
                if (preview)   preview.classList.add('hidden');
                if (removeBtn) removeBtn.classList.add('hidden');

                setStatus('✓ Posted!', '#38a169');

                setTimeout(() => {
                    setStatus('', '');
                    if (typeof showView === 'function') showView('feed');
                }, 900);

            } catch (dbErr) {
                console.error('Firestore save failed:', dbErr);
                setStatus('Failed to save post: ' + dbErr.message, '#e53e3e');
            }

            resetBtn();
        };

        console.log('[upload-fix.js] uploadPost() replaced successfully.');
    });

    // ── Storage Rules Helper ─────────────────────────────────────────────────
    function showStorageRulesHelp() {
        // Remove existing if any
        const existing = document.getElementById('storage-rules-help');
        if (existing) { existing.remove(); return; }

        const box = document.createElement('div');
        box.id = 'storage-rules-help';
        box.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.5);
            z-index: 9999; display: flex; align-items: center; justify-content: center;
            font-family: 'DM Sans', sans-serif;
        `;
        box.innerHTML = `
            <div style="background:white; border-radius:14px; padding:28px; max-width:400px; width:90%; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
                <h3 style="margin-bottom:12px; font-size:1.1rem;">📦 Fix Image Uploads</h3>
                <p style="font-size:0.88rem; color:#555; margin-bottom:14px; line-height:1.5;">
                    Firebase Storage is blocking uploads. To fix it:
                </p>
                <ol style="font-size:0.85rem; color:#333; line-height:2; padding-left:18px; margin-bottom:16px;">
                    <li>Go to <b>console.firebase.google.com</b></li>
                    <li>Tap <b>Build → Storage → Rules</b></li>
                    <li>Replace everything with the code below</li>
                    <li>Tap <b>Publish</b></li>
                </ol>
                <div style="background:#1a1a1a; color:#86efac; border-radius:8px; padding:12px; font-family:monospace; font-size:0.78rem; line-height:1.7; margin-bottom:16px; white-space:pre;">rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}</div>
                <button onclick="document.getElementById('storage-rules-help').remove()"
                    style="width:100%;padding:11px;background:#0095f6;color:white;border:none;border-radius:8px;font-weight:600;font-size:0.95rem;cursor:pointer;font-family:inherit;">
                    Got it
                </button>
            </div>
        `;
        document.body.appendChild(box);
    }

})();
