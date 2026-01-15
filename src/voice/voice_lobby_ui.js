

(() => {
  
  function mount(root, props) {
    const rid = String(props?.defaultRoomId || "").trim();
    root.innerHTML = `
      <div class="tv-voice-notice" id="tvVoiceNotice" style="position: relative; margin-top: 10px; margin-bottom: 10px; padding: 10px 14px; padding-right: 32px; border-radius: 10px; background: rgba(0, 0, 0, 0.42); border: 1px solid rgba(255, 255, 255, 0.12); color: rgba(255, 255, 255, 0.92); font-size: 12px; line-height: 1.6; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);">
        <span style="display: inline-block; margin-right: 6px;">⚠️</span>
        弹幕/评论区功能已经植入交易页面，请在 OKX/GMGN/BN/Pumpfun 查看
        <button id="tvVoiceNoticeClose" type="button" style="position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; padding: 0; border: none; background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.7); border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; transition: all 0.2s ease; font-weight: 600;" title="关闭">×</button>
      </div>
            <div class="tv-danmaku-chat-hint">ChatRoom</div>

      <div class="tv-voice-grid">
        <div class="tv-voice-card">
          <div class="tv-voice-card-title">Create trench</div>
          <div class="tv-danmaku-muted" style="margin-top:6px;">Each address can create one room</div>
          <div class="tv-voice-form">
          <div class="tv-danmaku-muted">Name</div>
            <input id="tvVoiceCreateName" class="tv-danmaku-modal-input" placeholder="eg：枯坐小队" maxlength="24" />

            <div class="tv-danmaku-muted">Room ID</div>
            <input id="tvVoiceCreateRoomId" class="tv-danmaku-modal-input" placeholder="自动填充" />
            <div class="tv-danmaku-muted">Password(*)</div>
            <input id="tvVoiceCreatePwd" class="tv-danmaku-modal-input" placeholder="eg：123456" maxlength="24" type="password" />
            <button id="tvVoiceCreateBtn" class="tv-danmaku-modal-btn" type="button" style="margin-top:10px;">Create & Join</button>
          </div>
          <div class="tv-danmaku-muted" id="tvVoiceCreateTip" style="margin-top:8px;"></div>
        </div>

        <div class="tv-voice-card">
          <div class="tv-voice-card-title">Join trench</div>
          <div class="tv-danmaku-muted" style="margin-top:6px;">Just enter room id & password to join</div>
          <div class="tv-voice-form">
            <div class="tv-danmaku-muted">Room ID</div>
            <input id="tvVoiceJoinRoomId" class="tv-danmaku-modal-input" placeholder="0x..." />
            <div class="tv-danmaku-muted">Password(*)</div>
            <input id="tvVoiceJoinPwd" class="tv-danmaku-modal-input" placeholder="eg：123456" maxlength="24" type="password" />
            <button id="tvVoiceJoinBtn" class="tv-danmaku-modal-btn tv-danmaku-modal-btn-ghost" type="button" style="margin-top:10px;">Join</button>
          </div>
          <div class="tv-danmaku-muted" id="tvVoiceJoinTip" style="margin-top:8px;"></div>
        </div>
      </div>
    `;

    const createRoomId =  (root.querySelector("#tvVoiceCreateRoomId"));
    const createName =  (root.querySelector("#tvVoiceCreateName"));
    const createPwd =  (root.querySelector("#tvVoiceCreatePwd"));
    const createBtn = root.querySelector("#tvVoiceCreateBtn");
    const createTip = root.querySelector("#tvVoiceCreateTip");

    const joinRoomId =  (root.querySelector("#tvVoiceJoinRoomId"));
    const joinPwd =  (root.querySelector("#tvVoiceJoinPwd"));
    const joinBtn = root.querySelector("#tvVoiceJoinBtn");
    const joinTip = root.querySelector("#tvVoiceJoinTip");

    const noticeEl = root.querySelector("#tvVoiceNotice");
    const noticeCloseBtn = root.querySelector("#tvVoiceNoticeClose");

    if (createRoomId) createRoomId.value = rid;
    
    if (joinRoomId) joinRoomId.value = "";

    // 关闭提醒框
    noticeCloseBtn?.addEventListener("click", () => {
      if (noticeEl instanceof HTMLElement) {
        noticeEl.style.display = "none";
      }
    });

    // 关闭按钮悬停效果
    if (noticeCloseBtn instanceof HTMLElement) {
      noticeCloseBtn.addEventListener("mouseenter", () => {
        noticeCloseBtn.style.background = "rgba(255, 255, 255, 0.15)";
        noticeCloseBtn.style.color = "rgba(255, 255, 255, 0.9)";
      });
      noticeCloseBtn.addEventListener("mouseleave", () => {
        noticeCloseBtn.style.background = "rgba(255, 255, 255, 0.1)";
        noticeCloseBtn.style.color = "rgba(255, 255, 255, 0.7)";
      });
    }

    function setTip(el, text, isError = false) {
      if (!(el instanceof HTMLElement)) return;
      el.textContent = String(text || "");
      if (isError) {
        el.style.color = "rgba(255, 100, 100, 0.9)";
      } else {
        el.style.color = "rgba(255, 255, 255, 0.65)";
      }
    }

    createBtn?.addEventListener("click", async () => {
      setTip(createTip, "该功能暂时关闭", true);
      return;
      
      // 以下代码已禁用
      /*
      setTip(createTip, "");
      const roomId = String(createRoomId?.value || "").trim();
      const name = String(createName?.value || "").trim();
      const password = String(createPwd?.value || "").trim();
      if (!roomId) {
        setTip(createTip, "Room id is required.", true);
        return;
      }
      if (!password) {
        setTip(createTip, "Password is required.", true);
        return;
      }
      
      
      setTip(createTip, "Creating...");
      if (createBtn instanceof HTMLButtonElement) {
        createBtn.disabled = true;
      }
      
      try {
        await props?.onCreate?.({ roomId, name, password });
        
      } catch (e) {
        
        console.error("[voice_lobby_ui] Create error:", e);
      } finally {
        
        if (createBtn instanceof HTMLButtonElement) {
          createBtn.disabled = false;
        }
      }
      */
    });

    joinBtn?.addEventListener("click", async () => {
      setTip(joinTip, "该功能暂时关闭", true);
      return;
      
      // 以下代码已禁用
      /*
      setTip(joinTip, "");
      const roomId = String(joinRoomId?.value || "").trim();
      const password = String(joinPwd?.value || "").trim();
      if (!roomId) {
        setTip(joinTip, "Please enter room id.", true);
        return;
      }
      if (!password) {
        setTip(joinTip, "Password is required.", true);
        return;
      }
      
      
      setTip(joinTip, "Joining...");
      if (joinBtn instanceof HTMLButtonElement) {
        joinBtn.disabled = true;
      }
      
      try {
        await props?.onJoin?.({ roomId, password });
        
      } catch (e) {
        
        console.error("[voice_lobby_ui] Join error:", e);
      } finally {
        
        if (joinBtn instanceof HTMLButtonElement) {
          joinBtn.disabled = false;
        }
      }
      */
    });
  }

  
  window.__tvVoiceLobbyUI = { mount };
})();


