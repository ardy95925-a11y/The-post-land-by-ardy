// ═══════════════════════════════════════════════════════
// calls.js — Voice & Video Calling via WebRTC + Firestore
// ═══════════════════════════════════════════════════════
// Requires: app.js (db, currentUser, getChatId, escapeHtml)
// Hooked into: dm.js (chat topbar)
// ═══════════════════════════════════════════════════════

// ── STYLES ────────────────────────────────────────────────────────────────────
(function injectCallStyles() {
    if (document.getElementById('call-styles')) return;
    const s = document.createElement('style');
    s.id = 'call-styles';
    s.textContent = `
/* Call buttons in chat topbar */
.call-btn {
    background: none; border: none; cursor: pointer;
    padding: 7px 8px; border-radius: 8px; color: var(--muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; flex-shrink: 0;
}
.call-btn:hover { background: var(--bg); color: var(--primary); }
.call-btn.video-btn:hover { color: #8b5cf6; background: #f5f3ff; }

/* ── CALL OVERLAY ── */
#call-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: linear-gradient(160deg, #0f1117 0%, #1a1d27 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    animation: callFadeIn 0.25s ease;
}
@keyframes callFadeIn { from { opacity: 0; } to { opacity: 1; } }

.call-videos {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
}
#call-remote-video, #call-local-video {
    border-radius: 16px; background: #1a1d27; display: block;
}
#call-remote-video {
    width: 100%; height: 100%; object-fit: cover; border-radius: 0;
}
#call-local-video {
    position: absolute; bottom: 130px; right: 16px;
    width: 100px; height: 140px; object-fit: cover;
    border: 2px solid rgba(255,255,255,0.2);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

.call-info {
    position: absolute; top: 60px; left: 0; right: 0;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    z-index: 1;
}
.call-avatar-ring {
    width: 88px; height: 88px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-size: 2.2rem; font-weight: 700; color: white;
    text-transform: uppercase;
    box-shadow: 0 0 0 0 rgba(59,130,246,0.6);
    animation: callPulse 1.8s infinite;
}
@keyframes callPulse {
    0%   { box-shadow: 0 0 0 0   rgba(59,130,246,0.5); }
    60%  { box-shadow: 0 0 0 18px rgba(59,130,246,0); }
    100% { box-shadow: 0 0 0 0   rgba(59,130,246,0); }
}
.call-peer-name {
    font-size: 1.2rem; font-weight: 700; color: #fff;
    letter-spacing: -0.3px;
}
.call-status {
    font-size: 0.85rem; color: rgba(255,255,255,0.6);
}
#call-timer {
    font-size: 0.88rem; color: rgba(255,255,255,0.5);
    font-variant-numeric: tabular-nums;
    margin-top: 2px;
}

.call-controls {
    position: absolute; bottom: 40px; left: 0; right: 0;
    display: flex; align-items: center; justify-content: center; gap: 20px;
    z-index: 1;
}
.ctrl-btn {
    width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem; transition: all 0.15s; flex-shrink: 0;
}
.ctrl-btn:active { transform: scale(0.92); }
.ctrl-btn.end { background: #ef4444; color: white; transform: rotate(135deg); }
.ctrl-btn.end:active { transform: rotate(135deg) scale(0.92); }
.ctrl-btn.toggle { background: rgba(255,255,255,0.12); color: white; }
.ctrl-btn.toggle.off { background: rgba(255,255,255,0.25); }
.ctrl-btn.toggle:hover { background: rgba(255,255,255,0.22); }

/* Incoming call toast */
.incoming-call-toast {
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: #1a1d27; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px; padding: 16px 20px;
    display: flex; align-items: center; gap: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    z-index: 1900; min-width: 290px; max-width: 94vw;
    animation: toastSlideUp 0.3s cubic-bezier(.4,0,.2,1);
}
@keyframes toastSlideUp { from { opacity:0; transform: translateX(-50%) translateY(20px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
.incoming-avatar {
    width: 46px; height: 46px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; font-weight: 700; color: white; flex-shrink: 0;
    text-transform: uppercase;
}
.incoming-info { flex: 1; min-width: 0; }
.incoming-name { font-weight: 700; font-size: 0.95rem; color: #fff; }
.incoming-label { font-size: 0.78rem; color: rgba(255,255,255,0.5); margin-top: 2px; }
.incoming-actions { display: flex; gap: 10px; }
.inc-btn {
    width: 42px; height: 42px; border-radius: 50%; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
    transition: all 0.15s;
}
.inc-btn:active { transform: scale(0.9); }
.inc-btn.accept { background: #22c55e; color: white; }
.inc-btn.decline { background: #ef4444; color: white; transform: rotate(135deg); }
.inc-btn.decline:active { transform: rotate(135deg) scale(0.9); }

/* Pulse ring on incoming call avatar */
.call-avatar-ring.ringing {
    animation: callPulse 0.9s infinite;
}

/* Chat topbar call buttons area */
.chat-topbar-actions { display: flex; align-items: center; gap: 2px; margin-left: auto; }
`;
    document.head.appendChild(s);
})();

// ── STATE ─────────────────────────────────────────────────────────────────────
let _pc         = null;          // RTCPeerConnection
let _localStream = null;         // MediaStream (mic + optional camera)
let _callMode   = null;          // 'voice' | 'video'
let _callChatId = null;          // Firestore signaling doc ID
let _callUnsub  = [];            // Firestore listeners to clean up
let _inCallWith = null;          // peer email
let _timerInterval = null;
let _callSeconds   = 0;
let _micMuted   = false;
let _camOff     = false;
let _incomingToast = null;

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// ── UTILITY ───────────────────────────────────────────────────────────────────
function _callDocId(a, b) { return 'call__' + [a, b].sort().join('__'); }

// ── INJECT CALL BUTTONS INTO CHAT TOPBAR ─────────────────────────────────────
// Called by dm.js openChat() after topbar is populated, or we hook via MutationObserver
(function hookCallButtons() {
    // We observe the topbar for name changes and inject buttons
    const observer = new MutationObserver(() => {
        const topbar = document.querySelector('.chat-topbar');
        if (!topbar || topbar.querySelector('.chat-topbar-actions')) return;

        const actions = document.createElement('div');
        actions.className = 'chat-topbar-actions';
        actions.innerHTML = `
            <button class="call-btn" title="Voice call" onclick="startCall('voice')">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91A16 16 0 0015 17.09l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
            </button>
            <button class="call-btn video-btn" title="Video call" onclick="startCall('video')">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
            </button>`;
        topbar.appendChild(actions);
    });

    const chatTopbar = document.querySelector('.chat-topbar');
    const target = chatTopbar || document.body;
    observer.observe(target, { childList: true, subtree: true, characterData: true });
})();

// ── START A CALL (caller side) ─────────────────────────────────────────────────
async function startCall(mode) {
    if (!activeChatFriend) return;
    if (_pc) { if (typeof showToast === 'function') showToast('Already in a call'); return; }

    _callMode   = mode;
    _inCallWith = activeChatFriend;
    _callChatId = _callDocId(currentUser.email, activeChatFriend);

    try {
        _localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: mode === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false
        });
    } catch (e) {
        if (typeof showToast === 'function') showToast('Could not access microphone/camera');
        return;
    }

    _pc = new RTCPeerConnection(ICE_SERVERS);
    _localStream.getTracks().forEach(t => _pc.addTrack(t, _localStream));

    // Write call offer doc
    const callRef = db.collection('calls').doc(_callChatId);
    await callRef.set({
        caller:    currentUser.email,
        callee:    activeChatFriend,
        mode:      mode,
        status:    'ringing',
        offer:     null,
        answer:    null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // ICE candidates
    const iceSub = [];
    _pc.onicecandidate = e => {
        if (e.candidate) {
            callRef.collection('callerICE').add(e.candidate.toJSON());
        }
    };

    // Create offer
    const offer = await _pc.createOffer();
    await _pc.setLocalDescription(offer);
    await callRef.update({ offer: { sdp: offer.sdp, type: offer.type } });

    // Show calling overlay
    _showCallOverlay('Calling…', true);

    // Listen for answer
    const unsub1 = callRef.onSnapshot(async snap => {
        const d = snap.data();
        if (!d) return;
        if (d.status === 'declined' || d.status === 'ended') {
            _hangUp(false); return;
        }
        if (d.answer && _pc && _pc.signalingState === 'have-local-offer') {
            await _pc.setRemoteDescription(new RTCSessionDescription(d.answer));
        }
    });

    // Listen for callee ICE
    const unsub2 = callRef.collection('calleeICE').onSnapshot(snap => {
        snap.docChanges().forEach(change => {
            if (change.type === 'added' && _pc) {
                _pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
            }
        });
    });

    _callUnsub = [unsub1, unsub2];

    _pc.ontrack = e => {
        const remoteVideo = document.getElementById('call-remote-video');
        if (remoteVideo) remoteVideo.srcObject = e.streams[0];
        _startTimer();
        const statusEl = document.getElementById('call-status-label');
        if (statusEl) statusEl.textContent = mode === 'video' ? '📹 Video call' : '🎙 Voice call';
    };
    _pc.onconnectionstatechange = () => {
        if (_pc && (_pc.connectionState === 'disconnected' || _pc.connectionState === 'failed')) _hangUp(false);
    };
}

// ── ANSWER INCOMING CALL ──────────────────────────────────────────────────────
async function answerCall(callerEmail, mode) {
    _dismissIncoming();
    if (_pc) _hangUp(false);

    _callMode   = mode;
    _inCallWith = callerEmail;
    _callChatId = _callDocId(currentUser.email, callerEmail);

    try {
        _localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: mode === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false
        });
    } catch (e) {
        if (typeof showToast === 'function') showToast('Could not access microphone/camera');
        db.collection('calls').doc(_callChatId).update({ status: 'declined' });
        return;
    }

    _pc = new RTCPeerConnection(ICE_SERVERS);
    _localStream.getTracks().forEach(t => _pc.addTrack(t, _localStream));

    const callRef = db.collection('calls').doc(_callChatId);
    const snap    = await callRef.get();
    const data    = snap.data();
    if (!data || !data.offer) { if (typeof showToast === 'function') showToast('Call expired'); return; }

    await _pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await _pc.createAnswer();
    await _pc.setLocalDescription(answer);
    await callRef.update({
        answer: { sdp: answer.sdp, type: answer.type },
        status: 'connected'
    });

    _pc.onicecandidate = e => {
        if (e.candidate) callRef.collection('calleeICE').add(e.candidate.toJSON());
    };

    // Caller ICE
    const unsub1 = callRef.collection('callerICE').onSnapshot(snap => {
        snap.docChanges().forEach(change => {
            if (change.type === 'added' && _pc) {
                _pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
            }
        });
    });

    const unsub2 = callRef.onSnapshot(snap => {
        const d = snap.data();
        if (d && (d.status === 'ended')) _hangUp(false);
    });

    _callUnsub = [unsub1, unsub2];

    _pc.ontrack = e => {
        const remoteVideo = document.getElementById('call-remote-video');
        if (remoteVideo) remoteVideo.srcObject = e.streams[0];
        _startTimer();
        const statusEl = document.getElementById('call-status-label');
        if (statusEl) statusEl.textContent = mode === 'video' ? '📹 Video call' : '🎙 Voice call';
    };
    _pc.onconnectionstatechange = () => {
        if (_pc && (_pc.connectionState === 'disconnected' || _pc.connectionState === 'failed')) _hangUp(false);
    };

    _showCallOverlay('Connected', false);
    _startTimer();
}

// ── HANG UP ───────────────────────────────────────────────────────────────────
function hangUp() { _hangUp(true); }

function _hangUp(writeEnd) {
    if (writeEnd && _callChatId) {
        db.collection('calls').doc(_callChatId).update({ status: 'ended' }).catch(() => {});
    }
    _callUnsub.forEach(u => { try { u(); } catch(e) {} });
    _callUnsub = [];
    if (_pc) { try { _pc.close(); } catch(e) {} _pc = null; }
    if (_localStream) { _localStream.getTracks().forEach(t => t.stop()); _localStream = null; }
    _stopTimer();
    _callChatId = null;
    _inCallWith = null;
    _callMode   = null;
    _micMuted   = false;
    _camOff     = false;
    _removeCallOverlay();
}

// ── CALL CONTROLS ─────────────────────────────────────────────────────────────
function toggleMic() {
    if (!_localStream) return;
    _micMuted = !_micMuted;
    _localStream.getAudioTracks().forEach(t => { t.enabled = !_micMuted; });
    const btn = document.getElementById('call-mic-btn');
    if (btn) {
        btn.classList.toggle('off', _micMuted);
        btn.innerHTML = _micMuted ? '🔇' : '🎙';
        btn.title = _micMuted ? 'Unmute' : 'Mute';
    }
}

function toggleCam() {
    if (!_localStream) return;
    _camOff = !_camOff;
    _localStream.getVideoTracks().forEach(t => { t.enabled = !_camOff; });
    const btn = document.getElementById('call-cam-btn');
    if (btn) {
        btn.classList.toggle('off', _camOff);
        btn.innerHTML = _camOff ? '🚫' : '📹';
        btn.title = _camOff ? 'Turn camera on' : 'Turn camera off';
    }
    const localVideo = document.getElementById('call-local-video');
    if (localVideo) localVideo.style.opacity = _camOff ? '0.3' : '1';
}

function declineCall() {
    if (_callChatId) db.collection('calls').doc(_callChatId).update({ status: 'declined' }).catch(() => {});
    _dismissIncoming();
}

// ── OVERLAY ───────────────────────────────────────────────────────────────────
function _showCallOverlay(statusText, isCalling) {
    _removeCallOverlay();
    const peerInitial = (_inCallWith || '?')[0].toUpperCase();
    const isVideo = _callMode === 'video';

    const overlay = document.createElement('div');
    overlay.id = 'call-overlay';
    overlay.innerHTML = `
        <div class="call-videos" style="${isVideo ? '' : 'display:none;'}">
            <video id="call-remote-video" autoplay playsinline></video>
            <video id="call-local-video"  autoplay playsinline muted></video>
        </div>
        <div class="call-info">
            <div class="call-avatar-ring ${isCalling ? 'ringing' : ''}">${peerInitial}</div>
            <div class="call-peer-name">${escapeHtml(_inCallWith || '')}</div>
            <div class="call-status" id="call-status-label">${statusText}</div>
            <div id="call-timer" style="display:none;"></div>
        </div>
        <div class="call-controls">
            <button class="ctrl-btn toggle" id="call-mic-btn" onclick="toggleMic()" title="Mute">🎙</button>
            ${isVideo ? `<button class="ctrl-btn toggle" id="call-cam-btn" onclick="toggleCam()" title="Camera">📹</button>` : ''}
            <button class="ctrl-btn end" onclick="hangUp()" title="End call">📞</button>
        </div>`;
    document.body.appendChild(overlay);

    // Attach local stream to video element
    if (isVideo && _localStream) {
        const lv = document.getElementById('call-local-video');
        if (lv) lv.srcObject = _localStream;
    }
}

function _removeCallOverlay() {
    const ov = document.getElementById('call-overlay');
    if (ov) ov.remove();
}

// ── TIMER ─────────────────────────────────────────────────────────────────────
function _startTimer() {
    _callSeconds = 0;
    _stopTimer();
    const timerEl = document.getElementById('call-timer');
    if (timerEl) timerEl.style.display = 'block';
    _timerInterval = setInterval(() => {
        _callSeconds++;
        const m = String(Math.floor(_callSeconds / 60)).padStart(2, '0');
        const s = String(_callSeconds % 60).padStart(2, '0');
        const el = document.getElementById('call-timer');
        if (el) el.textContent = m + ':' + s;
    }, 1000);
}

function _stopTimer() {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
}

// ── LISTEN FOR INCOMING CALLS ─────────────────────────────────────────────────
function listenForIncomingCalls() {
    // Listen for calls where we're the callee
    db.collection('calls')
        .where('callee', '==', currentUser.email)
        .where('status', '==', 'ringing')
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (!_pc) _showIncomingCall(data.caller, data.mode || 'voice');
                }
            });
        });
}

// ── INCOMING CALL TOAST ───────────────────────────────────────────────────────
function _showIncomingCall(callerEmail, mode) {
    _dismissIncoming();
    _callChatId = _callDocId(currentUser.email, callerEmail);

    const toast = document.createElement('div');
    toast.className = 'incoming-call-toast';
    toast.id = 'incoming-call-toast';
    const initial = callerEmail[0].toUpperCase();
    const modeLabel = mode === 'video' ? '📹 Video call' : '🎙 Voice call';
    toast.innerHTML = `
        <div class="incoming-avatar">${initial}</div>
        <div class="incoming-info">
            <div class="incoming-name">${escapeHtml(callerEmail)}</div>
            <div class="incoming-label">${modeLabel}</div>
        </div>
        <div class="incoming-actions">
            <button class="inc-btn accept" onclick="answerCall('${callerEmail}','${mode}')" title="Accept">📞</button>
            <button class="inc-btn decline" onclick="declineCall()" title="Decline">📞</button>
        </div>`;
    document.body.appendChild(toast);
    _incomingToast = toast;

    // Auto-dismiss after 30s if not answered
    setTimeout(() => _dismissIncoming(), 30000);
}

function _dismissIncoming() {
    if (_incomingToast) { _incomingToast.remove(); _incomingToast = null; }
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
// Wait for auth then start listening for incoming calls
firebase.auth().onAuthStateChanged(user => {
    if (user) listenForIncomingCalls();
});
