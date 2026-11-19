/**
 * GOSH PHASE 8 WEBRTC CALLING & SIGNALING TEST SUITE
 * Tests WebRTC P2P setup, Google STUN configuration, timer, media controls,
 * call history persistence, signaling dispatch, and CallsModule rendering.
 */

// Setup Mock Environment for Node.js
if (typeof localStorage === 'undefined') {
  const storage = {};
  global.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
}

if (typeof sessionStorage === 'undefined') {
  const sessionStorageStore = {};
  global.sessionStorage = {
    getItem: (k) => sessionStorageStore[k] || null,
    setItem: (k, v) => { sessionStorageStore[k] = String(v); },
    removeItem: (k) => { delete sessionStorageStore[k]; },
    clear: () => { Object.keys(sessionStorageStore).forEach(k => delete sessionStorageStore[k]); }
  };
}

if (typeof window === 'undefined') {
  global.window = {
    screen: { width: 1920, height: 1080 },
    addEventListener: () => {},
    location: { hash: '' }
  };
}

try {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    value: 'NodeTest/1.0 (Windows NT 10.0)',
    configurable: true
  });
} catch {}

// Import dependencies
const { Auth } = await import('../services/auth.service.js');
const { DB } = await import('../services/db.service.js');
const { WebRTC } = await import('../services/webrtc.service.js');
const { CallsModule } = await import('../modules/calls/calls.module.js');

async function runCallsTests() {
  console.log('--- GOSH PHASE 8 WEBRTC CALLING TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate user
    localStorage.clear();
    const loginRes = await Auth.initiateLogin('user1@gosh.internal', 'securepassword123');
    await Auth.verifyOtp(loginRes.debugCode);
    assert(Auth.isAuthenticated(), 'User 1 authenticated for WebRTC testing');

    // 2. STUN Server Configuration
    assert(WebRTC.iceServers.length >= 3, 'Google STUN servers configured (>= 3 endpoints)');
    const googleStunFound = WebRTC.iceServers.some(s => s.urls.includes('stun.l.google.com'));
    assert(googleStunFound, 'Primary Google STUN server stun.l.google.com:19302 present');

    // 3. Zero-Cost STUN Verification
    const hasTurnOrPaid = WebRTC.iceServers.some(s => s.urls.includes('turn:') || s.urls.includes('twilio'));
    assert(!hasTurnOrPaid, 'Zero-Cost compliance: Only free public STUN used, 0 paid TURN relays');

    // 4. Timer Formatting Utility
    assert(WebRTC.formatDuration(0) === '00:00', 'formatDuration(0) returns "00:00"');
    assert(WebRTC.formatDuration(75) === '01:15', 'formatDuration(75) returns "01:15"');
    assert(WebRTC.formatDuration(3665) === '61:05', 'formatDuration(3665) returns "61:05"');

    // 5. Unauthenticated Call Rejection
    const savedSession = localStorage.getItem('gosh_auth_session');
    localStorage.removeItem('gosh_auth_session');
    const { State } = await import('../state.js');
    const savedUserState = State.get('user');
    State.set('user', null);
    let unauthCaught = false;
    try {
      await WebRTC.startCall('video');
    } catch {
      unauthCaught = true;
    }
    assert(unauthCaught, 'WebRTC rejects startCall when unauthenticated');
    localStorage.setItem('gosh_auth_session', savedSession);
    State.set('user', savedUserState);

    // 6. Event Subscription System
    let signalingEventFired = false;
    let signalingData = null;
    const unsub = WebRTC.subscribe('signaling', (data) => {
      signalingEventFired = true;
      signalingData = data;
    });

    WebRTC.emitSignaling('test-ping', { test: true });
    assert(signalingEventFired, 'WebRTC event emitter dispatches signaling event');
    assert(signalingData?.type === 'test-ping' && signalingData?.payload?.test === true, 'Signaling payload preserved intact');
    unsub();

    // 7. Initiate Outgoing Voice Call
    let callStartedEvent = false;
    WebRTC.subscribe('callStarted', (data) => {
      callStartedEvent = true;
    });

    const callResult = await WebRTC.startCall('audio', 'u2-auth-0000-0000-000000000002');
    assert(WebRTC.callActive === true, 'startCall sets callActive = true');
    assert(WebRTC.callType === 'audio', 'startCall correctly sets callType = audio');
    assert(callStartedEvent, 'callStarted event successfully notified');

    // 8. Media Controls - Mic Muting
    let mediaControlFired = false;
    WebRTC.subscribe('mediaControls', () => { mediaControlFired = true; });

    const muteState1 = WebRTC.toggleMute();
    assert(muteState1 === true, 'toggleMute() toggles microphone to muted');
    assert(mediaControlFired === true, 'mediaControls listener notified on mute toggle');

    const muteState2 = WebRTC.toggleMute();
    assert(muteState2 === false, 'toggleMute() untoggles microphone back to unmuted');

    // 9. Media Controls - Camera Toggle
    const camState1 = WebRTC.toggleCamera();
    assert(camState1 === true, 'toggleCamera() toggles video off');
    const camState2 = WebRTC.toggleCamera();
    assert(camState2 === false, 'toggleCamera() toggles video back on');

    // 10. Call Timer Tracking
    WebRTC.startTimer();
    assert(WebRTC.timerInterval !== null, 'startTimer activates timer interval');
    WebRTC.callDurationSec = 42; // simulate 42 seconds in call

    // 11. End Call & History Persistence
    let callEndedEvent = false;
    WebRTC.subscribe('callEnded', (data) => {
      callEndedEvent = true;
      assert(data.duration === 42, 'callEnded event payload contains exact duration');
    });

    await WebRTC.endCall();
    assert(WebRTC.callActive === false, 'endCall sets callActive = false');
    assert(WebRTC.timerInterval === null, 'endCall stops timer interval');
    assert(callEndedEvent, 'callEnded event successfully triggered');

    // 12. Verify Database History Persistence
    const historyRecords = await DB.query('call_history', (c) => c.caller_id === 'u1-auth-0000-0000-000000000001');
    assert(historyRecords.length > 0, 'Call history record persisted in database');
    const lastCall = historyRecords[historyRecords.length - 1];
    assert(lastCall.call_type === 'audio', 'Call history record has correct call_type');
    assert(lastCall.duration_seconds === 42, 'Call history record has duration of 42 seconds');
    assert(lastCall.status === 'completed', 'Call status marked completed');

    // 13. Calls Module View Rendering (Lobby)
    const lobbyHtml = await CallsModule.render();
    assert(typeof lobbyHtml === 'string', 'CallsModule.render() returns HTML string');
    assert(lobbyHtml.includes('GOSH Calls'), 'CallsModule includes "GOSH Calls" title');
    assert(lobbyHtml.includes('start-voice-call-btn'), 'CallsModule includes Voice Call start button');
    assert(lobbyHtml.includes('start-video-call-btn'), 'CallsModule includes Video Call start button');
    assert(lobbyHtml.includes('Call History') || lobbyHtml.includes('Recent Calls'), 'CallsModule renders Call History section');

    // 14. Calls Module View Rendering (Active Call Stage)
    WebRTC.callActive = true;
    WebRTC.callType = 'video';
    const activeHtml = await CallsModule.render();
    assert(activeHtml.includes('active-call-stage'), 'Active call renders full screen call stage');
    assert(activeHtml.includes('hangup-call-btn'), 'Active call stage provides Hangup Call action button');
    assert(activeHtml.includes('toggle-screen-btn'), 'Active call stage provides Screen Sharing toggle');
    WebRTC.callActive = false;

    console.log(`\nPHASE 8 TESTS COMPLETED: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);

  } catch (err) {
    console.error('Test Suite Exception:', err);
    process.exit(1);
  }
}

runCallsTests();
