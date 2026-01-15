


window.addEventListener('error', (e) => {
  console.error('[popup] Global error:', e.error, e.message, e.filename, e.lineno);
  const root = document.getElementById('voiceRoot');
  if (root && !root.innerHTML.includes('错误')) {
    root.innerHTML = `<div style="padding: 20px; color: rgba(255, 100, 100, 0.9);">页面加载错误：${String(e.message || e.error || '未知错误')}</div>`;
  }
});


window.addEventListener('unhandledrejection', (e) => {
  console.error('[popup] Unhandled promise rejection:', e.reason);
  const root = document.getElementById('voiceRoot');
  if (root && !root.innerHTML.includes('错误')) {
    root.innerHTML = `<div style="padding: 20px; color: rgba(255, 100, 100, 0.9);">未处理的错误：${String(e.reason?.message || e.reason || '未知错误')}</div>`;
  }
});


console.log('[popup] Starting script load...');


function checkLiveKitSDK() {
  console.log('[popup] LiveKit SDK loaded:', {
    hasLivekitClient: typeof window !== 'undefined' && !!window.LivekitClient,
    hasLiveKit: typeof window !== 'undefined' && !!window.LiveKit,
  });
}

function checkVoiceLivekit() {
  console.log('[popup] voice_livekit.js loaded:', {
    hasModule: typeof window !== 'undefined' && !!window.__tvVoiceRoom,
    hasCreate: typeof window !== 'undefined' && window.__tvVoiceRoom && typeof window.__tvVoiceRoom.create === 'function',
  });
}

function checkVoiceLobbyUI() {
  console.log('[popup] voice_lobby_ui.js loaded:', {
    hasModule: typeof window !== 'undefined' && !!window.__tvVoiceLobbyUI,
  });
}

function checkVoiceRoomUI() {
  console.log('[popup] voice_room_ui.js loaded:', {
    hasModule: typeof window !== 'undefined' && !!window.__tvVoiceRoomUI,
  });
}

function checkVoiceUI() {
  console.log('[popup] voice_ui.js loaded:', {
    hasModule: typeof window !== 'undefined' && !!window.__tvVoiceUI,
  });
}


window.__popupInit = {
  checkLiveKitSDK,
  checkVoiceLivekit,
  checkVoiceLobbyUI,
  checkVoiceRoomUI,
  checkVoiceUI,
};


function setupScriptErrorHandling() {
  const scripts = document.querySelectorAll('script[src]');
  scripts.forEach((script) => {
    script.addEventListener('error', (e) => {
      const src = script.getAttribute('src');
      console.error(`[popup] Failed to load script: ${src}`);
    });
  });
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupScriptErrorHandling);
} else {
  setupScriptErrorHandling();
}

