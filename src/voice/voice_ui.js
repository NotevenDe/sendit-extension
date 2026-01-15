

(() => {
  
  let roomApi = null;

  
  async function createRoom(httpBaseUrl, token, payload) {
    const u = new URL(httpBaseUrl || "https://sendit.opsat.io");
    u.pathname = "/livekit/rooms/create";
    const res = await fetch(u.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  }

  
  async function fetchLiveKitToken(httpBaseUrl, token, payload) {
    const u = new URL(httpBaseUrl || "https://sendit.opsat.io");
    u.pathname = "/livekit/token";
    const res = await fetch(u.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  }

  
  function mount(container, options) {
    try {
      
      const VoiceRoom = window.__tvVoiceRoom;
      
      const Lobby = window.__tvVoiceLobbyUI;
      
      const RoomUI = window.__tvVoiceRoomUI;
      
      console.log("[voice_ui] mount called", {
        hasVoiceRoom: !!VoiceRoom,
        hasLobby: !!Lobby,
        hasRoomUI: !!RoomUI,
      });
      
      if (!VoiceRoom?.create) {
        const error = new Error("voice_room_missing");
        console.error("[voice_ui]", error);
        throw error;
      }
      if (!Lobby?.mount) {
        const error = new Error("voice_lobby_missing");
        console.error("[voice_ui]", error);
        throw error;
      }
      if (!RoomUI?.mount) {
        const error = new Error("voice_room_ui_missing");
        console.error("[voice_ui]", error);
        throw error;
      }

    const token = String(options.token || "");
    const httpBaseUrl = String(options.httpBaseUrl || "https://sendit.opsat.io");
    const nickname = String(options.nickname || "");
    const defaultRoomId = String(options.defaultRoomId || "").trim();
    const myAddr = String(options.myAddr || "");

    roomApi = VoiceRoom.create({
      roomId: "",
      token,
      nickname,
      httpBaseUrl,
      myAddr,
    });

    
    async function enterRoom(roomId, password, isOwner, livekitToken, livekitHost) {
      roomApi.setRoomId?.(roomId, password);
      roomApi.setLiveKitInfo?.(livekitToken, livekitHost);
      
      
      RoomUI.mount(container, roomApi, {
        isOwner,
        onExit: () => {
          
          renderLobby();
        },
      });
      
      
      await roomApi.join();
      
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      
      const currentState = roomApi.getState?.() || {};
      console.log("[voice_ui] enterRoom completed, current state:", currentState);
      
      
      if (roomApi.on && typeof roomApi.emit === "function") {
        roomApi.emit("state", currentState);
      }
    }

    async function onCreate(p) {
      const roomId = String(p.roomId || "").trim();
      const name = String(p.name || "").trim();
      const password = String(p.password || "").trim();
      if (!roomId) return;
      if (!password) throw new Error("password_required");

      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          
          stream.getTracks().forEach(track => track.stop());
        } catch (permError) {
          
          const errorMsg = String(permError?.message || permError || "");
          console.warn("[voice_ui] Microphone permission denied, will create room without audio:", errorMsg);
          
        }
      }

      
      const roomInfo = await createRoom(httpBaseUrl, token, { roomId, name, password });
      if (!roomInfo?.ok) throw new Error("create_room_failed");

      
      const tokenInfo = await fetchLiveKitToken(httpBaseUrl, token, {
        roomId,
        password,
        identity: myAddr || roomId,
        name: nickname || name,
        ttlSeconds: 3600,
      });
      if (!tokenInfo?.token || !tokenInfo?.host) throw new Error("get_token_failed");

      await enterRoom(roomId, password, true, tokenInfo.token, tokenInfo.host);
    }

    async function onJoin(p) {
      const roomId = String(p.roomId || "").trim();
      const password = String(p.password || "").trim();
      if (!roomId) {
        throw new Error("roomId_required");
      }
      if (!password) {
        throw new Error("password_required");
      }

      
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          
          
          stream.getTracks().forEach(track => track.stop());
        } catch (permError) {
          
          const errorMsg = String(permError?.message || permError || "");
          console.warn("[voice_ui] Microphone permission denied, will join without audio:", errorMsg);
          
        }
      }

      
      const tokenInfo = await fetchLiveKitToken(httpBaseUrl, token, {
        roomId,
        password,
        identity: myAddr || roomId,
        name: nickname,
        ttlSeconds: 3600,
      });
      if (!tokenInfo?.token || !tokenInfo?.host) throw new Error("get_token_failed");

      
      const isOwner = roomId === myAddr;
      await enterRoom(roomId, password, isOwner, tokenInfo.token, tokenInfo.host);
    }

    function renderLobby() {
      Lobby.mount(container, {
        defaultRoomId,
        onCreate: async (p) => {
          try {
            await onCreate(p);
          } catch (e) {
            console.warn("voice create failed", e);
            
            const createTip = container.querySelector("#tvVoiceCreateTip");
            if (createTip) {
              const errorMsg = String(e?.message || e || "创建失败");
              let displayMsg = errorMsg;
              if (errorMsg.includes("http_401")) {
                displayMsg = "认证失败，请检查登录状态";
              } else if (errorMsg.includes("http_403")) {
                displayMsg = "密码错误或无权访问";
              } else if (errorMsg.includes("http_404")) {
                displayMsg = "房间不存在";
              } else if (errorMsg.includes("password_required")) {
                displayMsg = "密码为必填项";
              } else if (errorMsg.includes("get_token_failed")) {
                displayMsg = "获取连接令牌失败";
              } else if (errorMsg.includes("create_room_failed")) {
                displayMsg = "创建房间失败";
              } else if (errorMsg.includes("LiveKit_missing")) {
                displayMsg = "LiveKit 客户端未加载，请检查 popup.html 的脚本引用";
              } else if (errorMsg.includes("connect_timeout")) {
                displayMsg = "连接超时，请检查 LiveKit host、网络或权限";
              } else if (errorMsg.includes("getUserMedia_failed")) {
                displayMsg = "获取麦克风失败，将只能听不能说。请在浏览器设置中允许此扩展访问麦克风";
              }
              createTip.textContent = `错误: ${displayMsg}`;
              createTip.style.color = "rgba(255, 100, 100, 0.9)";
            }
          }
        },
        onJoin: async (p) => {
          try {
            await onJoin(p);
          } catch (e) {
            console.warn("voice join failed", e);
            
            const joinTip = container.querySelector("#tvVoiceJoinTip");
            if (joinTip) {
              const errorMsg = String(e?.message || e || "加入失败");
              let displayMsg = errorMsg;
              if (errorMsg.includes("http_401")) {
                displayMsg = "认证失败，请检查登录状态";
              } else if (errorMsg.includes("http_403")) {
                displayMsg = "密码错误或无权访问";
              } else if (errorMsg.includes("http_404")) {
                displayMsg = "房间不存在";
              } else if (errorMsg.includes("password_required")) {
                displayMsg = "密码为必填项";
              } else if (errorMsg.includes("roomId_required")) {
                displayMsg = "房间号为必填项";
              } else if (errorMsg.includes("get_token_failed")) {
                displayMsg = "获取连接令牌失败";
              } else if (errorMsg.includes("LiveKit_missing")) {
                displayMsg = "LiveKit 客户端未加载，请检查 popup.html 的脚本引用";
              } else if (errorMsg.includes("connect_timeout")) {
                displayMsg = "连接超时，请检查 LiveKit host、网络或权限";
              } else if (errorMsg.includes("getUserMedia_failed")) {
                displayMsg = "获取麦克风失败，将只能听不能说。请在浏览器设置中允许此扩展访问麦克风";
              }
              joinTip.textContent = `错误: ${displayMsg}`;
              joinTip.style.color = "rgba(255, 100, 100, 0.9)";
            }
          }
        },
      });
    }

      renderLobby();
    } catch (e) {
      console.error("[voice_ui] mount error:", e);
      if (container) {
        container.innerHTML = `<div style="padding: 20px; color: rgba(255, 100, 100, 0.9);">电话房初始化失败：${String(e?.message || e)}</div>`;
      }
      throw e;
    }
  }

  
  window.__tvVoiceUI = { mount };
})();


