/**
 * upload-fix.js — Bulletproof image upload
 * Compresses + converts any image to JPEG blob before uploading
 * so file format, size and naming can never break Storage.
 */

(function () {

    function waitForAuth(cb) {
        const interval = setInterval(() => {
            if (window.firebase && firebase.apps.length > 0 && window.storage && window.db) {
                firebase.auth().onAuthStateChanged(user => {
                    if (user) { clearInterval(interval); cb(user); }
                });
                clearInterval(interval);
            }
        }, 150);
    }

    // Compress and convert any image to a JPEG Blob using canvas
    function compressImage(file, maxWidth, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = function () {
                URL.revokeObjectURL(url);
                let w = img.width;
                let h = img.height;

                // Scale down if too wide
                if (w > maxWidth) {
                    h = Math.round(h * maxWidth / w);
                    w = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas compression failed'));
                }, 'image/jpeg', quality);
            };
            img.onerror = () => reject(new Error('Could not read image file'));
            img.src = url;
        });
    }

    waitForAuth(function (user) {

        window.uploadPost = async function () {
            const btn      = document.getElementById('upload-btn');
            const statusEl = document.getElementById('upload-status');
            const textEl   = document.getElementById('post-text');
            const tagsEl   = document.getElementById('post-tags');
            const imageEl  = document.getElementById('post-image');

            const text = textEl ? textEl.value.trim() : '';
            const file = imageEl && imageEl.files.length > 0 ? imageEl.files[0] : null;

            // Clean tags
            let tags = [];
            if (tagsEl && tagsEl.value.trim()) {
                tags = tagsEl.value
                    .split(',')
                    .map(t => t.trim().replace(/[^a-zA-Z0-9]/g, ''))
                    .filter(t => t.length > 0)
                    .slice(0, 10);
            }

            function setStatus(msg, color) {
                if (!statusEl) return;
                statusEl.innerText = msg;
                statusEl.style.color = color || '#888';
            }

            function resetBtn() {
                if (btn) { btn.disabled = false; btn.innerText = 'Publish'; }
            }

            if (!text) {
                setStatus('Please write something first!', '#e53e3e');
                return;
            }

            if (btn) { btn.disabled = true; btn.innerText = 'Publishing...'; }
            setStatus('', '#888');

            let imageUrl = '';

            // ── Upload image ──────────────────────────────────────────────────
            if (file) {
                try {
                    setStatus('Compressing image...', '#888');

                    // Convert to compressed JPEG blob — avoids ALL filename/format issues
                    const blob = await compressImage(file, 1200, 0.82);

                    setStatus('Uploading image...', '#888');

                    // Simple clean path — no original filename used at all
                    const path = `posts/${user.uid}_${Date.now()}.jpg`;
                    const ref = storage.ref(path);

                    const snap = await ref.put(blob, { contentType: 'image/jpeg' });
                    imageUrl = await snap.ref.getDownloadURL();

                    setStatus('Image ready! Saving post...', '#888');

                } catch (err) {
                    console.error('Image upload error:', err);
                    setStatus('Image failed: ' + err.message, '#e53e3e');
                    resetBtn();
                    return;
                }
            }

            // ── Save to Firestore ─────────────────────────────────────────────
            try {
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

                // Reset form
                if (textEl)  textEl.value  = '';
                if (tagsEl)  tagsEl.value  = '';
                if (imageEl) imageEl.value = '';

                const counter   = document.getElementById('char-counter');
                const preview   = document.getElementById('image-preview');
                const removeBtn = document.getElementById('remove-image-btn');
                if (counter)   counter.innerText = '0 / 300';
                if (preview)   preview.classList.add('hidden');
                if (removeBtn) removeBtn.classList.add('hidden');

                setStatus('✓ Posted!', '#38a169');
                setTimeout(() => {
                    setStatus('', '');
                    if (typeof showView === 'function') showView('feed');
                }, 900);

            } catch (err) {
                console.error('Firestore error:', err);
                setStatus('Could not save post: ' + err.message, '#e53e3e');
            }

            resetBtn();
        };

        console.log('[upload-fix.js] Loaded — bulletproof upload ready.');
    });

})();
