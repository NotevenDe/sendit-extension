

const STORAGE_KEY = "tv_danmaku_settings_v1";


function checkAllModules() {
  if (window.__popupInit) {
    
    window.__popupInit.checkLiveKitSDK();
    
    window.__popupInit.checkVoiceLivekit();
    window.__popupInit.checkVoiceLobbyUI();
    window.__popupInit.checkVoiceRoomUI();
    window.__popupInit.checkVoiceUI();
  }
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    
    setTimeout(checkAllModules, 50);
  });
} else {
  
  setTimeout(checkAllModules, 50);
}


async function load() {
  const res = await chrome.storage.local.get([STORAGE_KEY]);
  return res?.[STORAGE_KEY] || {};
}


function setBadge(addr) {
  const el = document.getElementById("badge");
  if (!el) return;
  const short = shortAddr(addr);
  el.textContent = short;
  el.title = String(addr || "");
  el.style.color = addr ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.4)";
}


function setTip(msg) {
  const el = document.getElementById("tip");
  if (!el) return;
  el.textContent = String(msg || "");
}


function shortAddr(s) {
  const v = String(s || "").trim();
  if (!v) return "-";
  if (v.length <= 16) return v;
  return `${v.slice(0, 6)}…${v.slice(-6)}`;
}


function setAddr(addr) {
  const el = document.getElementById("addr");
  if (!el) return;
  el.textContent = shortAddr(addr);
  
  el.title = String(addr || "");
}


function ensureToastContainer() {
  let container = document.querySelector(".tv-danmaku-toast-container");
  if (container instanceof HTMLElement) return container;
  
  container = document.createElement("div");
  container.className = "tv-danmaku-toast-container";
  document.body.appendChild(container);
  return container;
}


function showToast(message, type = "success", duration = 3000) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = `tv-danmaku-toast tv-danmaku-toast-${type}`;
  
  
  const iconSvg = type === "success" 
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  
  toast.innerHTML = `
    <div class="tv-danmaku-toast-icon">${iconSvg}</div>
    <div class="tv-danmaku-toast-content">${String(message)}</div>
  `;
  
  container.appendChild(toast);
  
  
  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}


document.getElementById("pinToSidePanel")?.addEventListener("click", async () => {
  
  
  
  
  const sp = chrome.sidePanel;
  if (!sp?.open || !sp?.setOptions) {
    setTip("打开 Side Panel 失败：sidePanel API 不可用（Chrome 版本或策略限制）。");
    return;
  }

  
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      
      const err = chrome.runtime?.lastError;
      if (err) {
        setTip(`打开 Side Panel 失败：${String(err.message || err)}`);
        return;
      }
      const tabId = tabs?.[0]?.id;
      if (!tabId) {
        setTip("打开 Side Panel 失败：no_active_tab");
        return;
      }
      sp
        .setOptions({ tabId, enabled: true, path: "src/ui/popup.html" })
        .then(() => sp.open({ tabId }))
        .catch((e) => {
          
        });
    });
  } catch (e) {
    setTip(`打开 Side Panel 失败：${String(e?.message || e)}`);
  }
});

load().then((s) => {
  try {
    const token = String(s?.accessToken || s?.jawKey || "").trim();
    const addr = String(s?.address || "").trim();
    const httpBaseUrl = String(s?.httpBaseUrl || "https://sendit.opsat.io").trim();

    const expiresAt = Number(s?.expiresAt || 0);
    const loggedIn = Boolean(token) && Boolean(addr) && expiresAt > Date.now();
    setBadge(addr);
    setAddr(addr);

    const root = document.getElementById("voiceRoot");
    if (!(root instanceof HTMLElement)) {
      console.error("[popup] voiceRoot element not found");
      return;
    }

    
    
    const Lobby = window.__tvVoiceLobbyUI;
    
    const VoiceUI = window.__tvVoiceUI;
    
    const VoiceRoom = window.__tvVoiceRoom;
    
    console.log("[popup] Checking modules:", {
      hasLobby: !!Lobby,
      hasVoiceUI: !!VoiceUI,
      hasVoiceRoom: !!VoiceRoom,
      loggedIn,
    });

    
    if (!Lobby?.mount) {
      const errorMsg = "电话房模块加载失败：voice_lobby_ui.js 未就绪。";
      console.error("[popup]", errorMsg);
      root.innerHTML = `<div style="padding: 20px; color: rgba(255, 100, 100, 0.9);">${errorMsg}</div>`;
      return;
    }

    if (!loggedIn) {
      console.log("[popup] User not logged in, showing lobby with login prompt");
      Lobby.mount(root, {
        defaultRoomId: addr || "",
        onCreate: () => {
          const msg = expiresAt ? "登录已过期：请先在支持页面重新登录。" : "未登录：请先在支持页面完成 OKX 登录。";
          console.log("[popup] onCreate called but not logged in");
          
          showToast(msg, "error", 4000);
        },
        onJoin: () => {
          const msg = expiresAt ? "登录已过期：请先在支持页面重新登录。" : "未登录：请先在支持页面完成 OKX 登录。";
          console.log("[popup] onJoin called but not logged in");
          
          showToast(msg, "error", 4000);
        },
      });
      return;
    }

    if (!VoiceUI?.mount) {
      const errorMsg = "电话房模块加载失败：voice_ui.js 未就绪。";
      console.error("[popup]", errorMsg);
      root.innerHTML = `<div style="padding: 20px; color: rgba(255, 100, 100, 0.9);">${errorMsg}</div>`;
      return;
    }

    if (!VoiceRoom?.create) {
      const errorMsg = "电话房模块加载失败：voice_livekit.js 未就绪。";
      console.error("[popup]", errorMsg, {
        hasVoiceRoom: !!VoiceRoom,
        hasCreate: VoiceRoom && typeof VoiceRoom.create === "function",
        windowKeys: typeof window !== "undefined" ? Object.keys(window).filter(k => k.includes("Voice") || k.includes("tv")) : [],
      });
      
      
      setTimeout(() => {
        
        const VoiceRoomRetry = window.__tvVoiceRoom;
        if (VoiceRoomRetry?.create) {
          console.log("[popup] VoiceRoom loaded after delay, retrying...");
          VoiceUI.mount(root, {
            token,
            httpBaseUrl,
            nickname: String(s?.nickname || ""),
            defaultRoomId: addr,
            myAddr: addr,
          });
        } else {
          root.innerHTML = `<div style="padding: 20px; color: rgba(255, 100, 100, 0.9);">${errorMsg}<br/><br/>请检查：<br/>1. vendor/livekit-client.umd.js 是否正确加载<br/>2. voice_livekit.js 是否有语法错误<br/>3. 查看浏览器控制台的错误信息</div>`;
        }
      }, 100);
      return;
    }

    console.log("[popup] Mounting VoiceUI");
    
    VoiceUI.mount(root, {
      token,
      httpBaseUrl,
      nickname: String(s?.nickname || ""),
      defaultRoomId: addr,
      myAddr: addr,
    });
    console.log("[popup] VoiceUI mounted successfully");
  } catch (e) {
    console.error("[popup] Error initializing voice room:", e);
    const root = document.getElementById("voiceRoot");
    if (root) {
      showToast(`电话房初始化失败：${String(e?.message || e)}`, "error", 4000);
      root.innerHTML = `<div style="padding: 20px; color: rgba(255, 100, 100, 0.9);">电话房初始化失败：${String(e?.message || e)}</div>`;
    }
  }
}).catch((e) => {
  console.error("[popup] Failed to load settings:", e);
  const root = document.getElementById("voiceRoot");
  if (root) {
    showToast(`加载设置失败：${String(e?.message || e)}`, "error", 4000);
    root.innerHTML = `<div style="padding: 20px; color: rgba(255, 100, 100, 0.9);">加载设置失败：${String(e?.message || e)}</div>`;
  }
});


