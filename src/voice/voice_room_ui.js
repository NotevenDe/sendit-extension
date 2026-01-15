

(() => {
  
  const STORAGE_KEY = "tv_danmaku_settings_v1";
  
  /**
   * 加载设置
   * @returns {Promise<Object>}
   */
  async function loadSettings() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        const res = await chrome.storage.local.get([STORAGE_KEY]);
        const raw = res?.[STORAGE_KEY];
        if (raw && typeof raw === "object") return raw;
      }
    } catch {
      
    }
    return {};
  }
  
  function short(s) {
    const v = String(s || "");
    if (v.length <= 12) return v;
    return `${v.slice(0, 6)}…${v.slice(-4)}`;
  }

  
  function render(root, state, view) {
    root.innerHTML = `
      <div class="tv-danmaku-chat-hint">电话房：${state.roomId ? short(state.roomId) : "-"}</div>
      <div class="tv-voice-room-actions">
        <button class="tv-danmaku-chat-close" type="button" id="tvVoiceLeaveBtn">${state.joined ? "离开" : "加入"}</button>
        <button class="tv-danmaku-chat-close" type="button" id="tvVoiceMicBtn">${state.micEnabled ? "静音" : "开麦"}</button>
        <button class="tv-danmaku-chat-close" type="button" id="tvVoiceCloseBtn" style="display:${view.isOwner ? "inline-block" : "none"};">关闭房间</button>
      </div>
      <div class="tv-voice-split">
        <div class="tv-voice-peers">
          <div class="tv-danmaku-muted">所有人${state.peers && state.peers.length > 0 ? ` (${state.peers.length})` : ""}</div>
          <div class="tv-voice-peerlist">
            ${(state.peers || []).map((p) => {
              const isSelf = p === state.peerId;
              return `<div class="tv-voice-peer"${isSelf ? ' style="color: rgba(100, 200, 255, 0.9);"' : ""}>${short(p)}${isSelf ? " (我)" : ""}</div>`;
            }).join("") || `<div class="tv-danmaku-muted">暂无</div>`}
          </div>
        </div>
        <div class="tv-voice-logs">
          <div class="tv-danmaku-muted">记录</div>
          <div class="tv-voice-logbox tv-danmaku-chat-messages"></div>
          <div class="tv-voice-inputrow">
            <input id="tvVoiceMsgInput" class="tv-danmaku-dock-input" placeholder="房内消息…" />
            <button id="tvVoiceMsgSend" class="tv-danmaku-dock-send" type="button">发送</button>
          </div>
        </div>
      </div>
    `;
  }

  
  function bind(root, api, view) {
    const logBox = root.querySelector(".tv-voice-logbox");
    const leaveBtn = root.querySelector("#tvVoiceLeaveBtn");
    const micBtn = root.querySelector("#tvVoiceMicBtn");
    const closeBtn = root.querySelector("#tvVoiceCloseBtn");
    const input = root.querySelector("#tvVoiceMsgInput");
    const sendBtn = root.querySelector("#tvVoiceMsgSend");

    function appendLine(text) {
      if (!(logBox instanceof HTMLElement)) return;
      const line = document.createElement("div");
      line.style.padding = "6px 0";
      line.style.borderBottom = "1px solid rgba(255,255,255,0.06)";
      line.style.whiteSpace = "pre-wrap"; 
      line.style.wordBreak = "break-word"; 
      line.textContent = text;
      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
    }

    leaveBtn?.addEventListener("click", async () => {
      try {
        const st = api.getState();
        if (st.joined) api.leave();
        else await api.join();
      } catch (e) {
        appendLine(`错误: ${String(e?.message || e)}`);
      }
    });

    micBtn?.addEventListener("click", async () => {
      try {
        const st = api.getState();
        const targetState = !st.micEnabled; 
        console.log("[voice_room_ui] Clicking mic button", { current: st.micEnabled, target: targetState });
        await api.setMicEnabled(targetState);
        console.log("[voice_room_ui] setMicEnabled completed");
      } catch (e) {
        console.error("[voice_room_ui] setMicEnabled error:", e);
        const st = api.getState();
        appendLine(`错误: 无法${st.micEnabled ? "静音" : "开麦"} - ${String(e?.message || e)}`);
      }
    });

    closeBtn?.addEventListener("click", () => {
      try {
        api.closeRoom?.();
      } catch {}
      try {
        api.leave();
      } catch {}
      appendLine("已关闭房间。");
      view.onExit?.();
    });

    function doSend() {
      if (!(input instanceof HTMLInputElement)) return;
      const t = input.value.trim();
      if (!t) return;
      input.value = "";
      api.sendText?.(t);
      appendLine(`我: ${t}`);
    }
    sendBtn?.addEventListener("click", doSend);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSend();
    });
    
    
    if (input instanceof HTMLInputElement) {
      let settingsCache = null;
      let settingsCacheTime = 0;
      const CACHE_DURATION = 1000; 
      
      input.addEventListener("input", async (e) => {
        
        if (typeof confetti === "undefined") return;
        
        const inputEl = e.target;
        if (!(inputEl instanceof HTMLInputElement)) return;
        
        const now = Date.now();
        if (!settingsCache || now - settingsCacheTime > CACHE_DURATION) {
          settingsCache = await loadSettings();
          settingsCacheTime = now;
        }
        
        if (settingsCache?.confettiEnabled === false) return;
        
        const cursorPos = inputEl.selectionStart ?? inputEl.value.length;
        if (cursorPos === 0) return; 
        
        
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        const computedStyle = window.getComputedStyle(inputEl);
        ctx.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
        
        
        const textBeforeCursor = inputEl.value.substring(0, cursorPos);
        const textWidth = ctx.measureText(textBeforeCursor).width;
        
        
        const rect = inputEl.getBoundingClientRect();
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const x = rect.left + paddingLeft + textWidth;
        const y = rect.top + rect.height / 2;
        
        
        
        confetti({
          particleCount: 50,
          angle: 90, 
          spread: 55,
          origin: { x: x / window.innerWidth, y: y / window.innerHeight },
          colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"],
        });
      });
    }

    api.on?.("chat", (m) => {
      const name = m?.nickname ? String(m.nickname) : m?.peerId ? short(m.peerId) : "peer";
      appendLine(`${name}: ${String(m?.text || "")}`);
    });
    api.on?.("error", (e) => {
      const code = String(e?.error || "");
      const detail = String(e?.detail || "");
      const isWarning = e?.warning === true;
      
      if (isWarning) {
        
        if (code === "mic_permission_failed") {
          appendLine(`⚠️ 警告: 无法获取麦克风权限，您只能听不能说。请在浏览器设置中允许此扩展访问麦克风。`);
        } else {
          appendLine(`⚠️ 警告: ${code || detail || String(e || "")}${code && detail ? ` (${detail})` : ""}`);
        }
      } else {
        
        let displayMsg = detail || code || String(e || "");
        
        
        if (code === "getUserMedia_failed" || detail.includes("getUserMedia_failed")) {
          
          const match = detail.match(/getUserMedia_failed:\s*(.+)/s); 
          if (match && match[1]) {
            displayMsg = match[1].trim();
          } else {
            displayMsg = "无法访问麦克风。\n\n对于浏览器扩展，请：\n1. 关闭当前弹窗\n2. 点击地址栏右侧的扩展图标\n3. 在扩展菜单中允许麦克风权限\n4. 重新打开弹窗并点击\"开麦\"";
          }
        }
        
        appendLine(`错误: ${displayMsg}`);
        if (code === "room_closed") view.onExit?.();
      }
    });
  }

  
  function mount(root, api, view) {
    const st = api.getState?.() || {};
    console.log("[voice_room_ui] mount called with initial state:", st);
    render(root, st, view);
    bind(root, api, view);
    
    
    api.on?.("state", (state) => {
      console.log("[voice_room_ui] state event received:", state);
      
      const leaveBtn = root.querySelector("#tvVoiceLeaveBtn");
      const micBtn = root.querySelector("#tvVoiceMicBtn");
      if (leaveBtn) {
        leaveBtn.textContent = state.joined ? "离开" : "加入";
      }
      if (micBtn) {
        micBtn.textContent = state.micEnabled ? "静音" : "开麦";
      }
      
      
      const peersTitle = root.querySelector(".tv-voice-peers .tv-danmaku-muted");
      if (peersTitle) {
        const peerIds = state.peers || [];
        peersTitle.textContent = `所有人${peerIds.length > 0 ? ` (${peerIds.length})` : ""}`;
      }
      
      
      const peerlist = root.querySelector(".tv-voice-peerlist");
      if (peerlist) {
        const peerIds = state.peers || [];
        if (peerIds.length === 0) {
          peerlist.innerHTML = `<div class="tv-danmaku-muted">暂无</div>`;
        } else {
          peerlist.innerHTML = peerIds.map((p) => {
            const isSelf = p === state.peerId;
            return `<div class="tv-voice-peer"${isSelf ? ' style="color: rgba(100, 200, 255, 0.9);"' : ""}>${short(p)}${isSelf ? " (我)" : ""}</div>`;
          }).join("");
        }
      }
    });
    
    
    setTimeout(() => {
      const currentState = api.getState?.() || {};
      console.log("[voice_room_ui] Checking state after mount:", currentState);
      
      
      const peersTitle = root.querySelector(".tv-voice-peers .tv-danmaku-muted");
      if (peersTitle) {
        const peerIds = currentState.peers || [];
        peersTitle.textContent = `所有人${peerIds.length > 0 ? ` (${peerIds.length})` : ""}`;
      }
      
      
      const peerlist = root.querySelector(".tv-voice-peerlist");
      if (peerlist) {
        const peerIds = currentState.peers || [];
        if (peerIds.length === 0) {
          peerlist.innerHTML = `<div class="tv-danmaku-muted">暂无</div>`;
        } else {
          peerlist.innerHTML = peerIds.map((p) => {
            const isSelf = p === currentState.peerId;
            return `<div class="tv-voice-peer"${isSelf ? ' style="color: rgba(100, 200, 255, 0.9);"' : ""}>${short(p)}${isSelf ? " (我)" : ""}</div>`;
          }).join("");
        }
      }
      
      
      const leaveBtn = root.querySelector("#tvVoiceLeaveBtn");
      const micBtn = root.querySelector("#tvVoiceMicBtn");
      if (leaveBtn) {
        leaveBtn.textContent = currentState.joined ? "离开" : "加入";
      }
      if (micBtn) {
        micBtn.textContent = currentState.micEnabled ? "静音" : "开麦";
      }
    }, 100);
  }

  
  window.__tvVoiceRoomUI = { mount };
})();


