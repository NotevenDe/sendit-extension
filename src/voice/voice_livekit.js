

(() => {
  

  

  
  const listeners = { state: [], chat: [], error: [] };
  
  function on(ev, cb) {
    listeners[ev].push(cb);
  }
  function emit(ev, payload) {
    for (const cb of listeners[ev] || []) {
      try {
        cb(payload);
      } catch {}
    }
  }

  
  let opts = null;
  
  let currentRoomId = "";
  
  let currentRoomPassword = "";
  
  let livekitToken = "";
  
  let livekitHost = "";
  
  let room = null;
  
  let localAudioTrack = null;
  
  let peers = [];
  
  let micEnabled = true;
  
  let joined = false;
  
  let selfIdentity = "";

  
  const audioEls = {};

  
  function getLiveKit() {
    
    
    if (typeof globalThis !== "undefined" && globalThis.LivekitClient) return globalThis.LivekitClient;
    
    if (typeof window !== "undefined" && window.LivekitClient) return window.LivekitClient;

    
    
    if (typeof globalThis !== "undefined" && globalThis.LiveKit) return globalThis.LiveKit;
    
    if (typeof window !== "undefined" && window.LiveKit) return window.LiveKit;

    return null;
  }

  function updateState() {
    
    const allPeers = [];
    if (selfIdentity && joined) {
      allPeers.push(selfIdentity);
    }
    
    for (const p of peers) {
      if (p !== selfIdentity && !allPeers.includes(p)) {
        allPeers.push(p);
      }
    }
    emit("state", { roomId: currentRoomId, peerId: selfIdentity, peers: allPeers, micEnabled, joined });
  }

  
  function attachRemoteAudio(identity, track) {
    try {
      let el = audioEls[identity];
      if (!el) {
        el = document.createElement("audio");
        el.autoplay = true;
        el.controls = false;
        el.style.display = "none";
        document.body.appendChild(el);
        audioEls[identity] = el;
      }
      track.attach(el);
      void el.play?.();
    } catch {
      
    }
  }

  function cleanupRemoteAudio() {
    for (const k of Object.keys(audioEls)) {
      try {
        const el = audioEls[k];
        if (el) {
          const stream = el.srcObject;
          if (stream instanceof MediaStream) {
            stream.getTracks().forEach((t) => t.stop());
          }
        }
        el.remove();
      } catch {}
      delete audioEls[k];
    }
  }

  
  async function ensureLocalStream() {
    if (localAudioTrack) return;
    const LiveKit = getLiveKit();
    if (!LiveKit) throw new Error("LiveKit_missing");

    try {
      
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia_failed: 浏览器不支持 getUserMedia API");
      }

      
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: "microphone" });
          if (permissionStatus.state === "denied") {
            throw new Error("getUserMedia_failed: 麦克风权限已被永久拒绝。请点击浏览器地址栏右侧的锁图标或扩展图标，在网站设置中允许麦克风权限，然后刷新页面重试。");
          }
        } catch (permQueryError) {
          
          console.warn("[voice_livekit] Permission query failed:", permQueryError);
        }
      }

      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (permError) {
        
        const errorMsg = String(permError?.message || permError || "");
        const errorName = String(permError?.name || "");
        
        
        if (errorMsg.includes("NotAllowedError") || errorMsg.includes("Permission denied") || errorMsg.includes("NotAllowed") || 
            errorMsg.includes("Permission dismissed") || errorName === "NotAllowedError") {
          throw new Error("getUserMedia_failed: 麦克风权限被拒绝。\n\n对于浏览器扩展，请按以下步骤操作：\n1. 关闭当前扩展弹窗\n2. 点击浏览器地址栏右侧的扩展图标（拼图图标）\n3. 找到本扩展，点击右侧的\"...\"菜单\n4. 选择\"网站权限\"或\"管理扩展\"\n5. 允许麦克风权限\n6. 重新打开扩展弹窗，再次点击\"开麦\"按钮\n\n或者：\n1. 访问 chrome://extensions/\n2. 找到本扩展\n3. 点击\"详细信息\"\n4. 在\"网站权限\"中允许麦克风");
        } else if (errorMsg.includes("NotFoundError") || errorMsg.includes("No device") || errorMsg.includes("NotFound") || 
                   errorName === "NotFoundError") {
          throw new Error("getUserMedia_failed: 未找到麦克风设备，请检查您的设备是否连接了麦克风");
        } else if (errorMsg.includes("NotReadableError") || errorMsg.includes("NotReadable") || 
                   errorName === "NotReadableError") {
          throw new Error("getUserMedia_failed: 麦克风被其他应用占用，请关闭其他使用麦克风的应用后重试");
        } else if (errorMsg.includes("OverconstrainedError") || errorName === "OverconstrainedError") {
          throw new Error("getUserMedia_failed: 麦克风设备不支持请求的配置");
        } else {
          throw new Error(`getUserMedia_failed: ${errorMsg || errorName || "未知错误"}`);
        }
      }

      
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error("getUserMedia_failed: 流中没有音频轨道");
      }

      
      try {
        
        
        localAudioTrack = new LiveKit.LocalAudioTrack(audioTracks[0], undefined, false);
        
        if (LiveKit.Track && LiveKit.Track.Source) {
          localAudioTrack.source = LiveKit.Track.Source.SourceMicrophone;
        }
        console.log("[voice_livekit] LocalAudioTrack created successfully", { trackId: localAudioTrack.mediaStreamTrack.id });
      } catch (createError) {
        console.warn("[voice_livekit] Failed to create LocalAudioTrack from MediaStreamTrack, trying createLocalAudioTrack:", createError);
        
        stream.getTracks().forEach(track => track.stop());
        try {
          localAudioTrack = await LiveKit.createLocalAudioTrack({
            
          });
          console.log("[voice_livekit] LocalAudioTrack created via createLocalAudioTrack", { trackId: localAudioTrack?.mediaStreamTrack?.id });
        } catch (fallbackError) {
          const errorMsg = String(createError?.message || createError || "");
          throw new Error(`getUserMedia_failed: 创建音频轨道失败 - ${errorMsg} (fallback also failed: ${String(fallbackError?.message || fallbackError)})`);
        }
      }

      
      if (!micEnabled && localAudioTrack) {
        await localAudioTrack.mute();
      }
    } catch (e) {
      const errorMsg = String(e?.message || e || "");
      if (errorMsg.includes("getUserMedia_failed")) {
        throw e; 
      }
      throw new Error(`getUserMedia_failed: ${errorMsg}`);
    }
  }

  
  function normalizeLiveKitHost(host) {
    let url = String(host || "").trim();
    if (!url) throw new Error("no_livekit_host");
    
    if (url.startsWith("http://")) {
      url = url.replace(/^http:/, "ws:");
    } else if (url.startsWith("https://")) {
      url = url.replace(/^https:/, "wss:");
    } else if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
      url = `wss://${url}`;
    }
    return url;
  }

  
  async function connectWithTimeout(room, url, token, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("connect_timeout"));
      }, timeoutMs);

      room
        .connect(url, token)
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((e) => {
          clearTimeout(timer);
          reject(e);
        });
    });
  }

  
  async function join() {
    if (joined) return;
    if (!opts) throw new Error("no_opts");
    if (!currentRoomId) throw new Error("no_room_id");
    if (!livekitToken || !livekitHost) throw new Error("no_livekit_info");

    const LiveKit = getLiveKit();
    if (!LiveKit) throw new Error("LiveKit_missing");

    
    
    let micPermissionGranted = false;
    try {
      await ensureLocalStream();
      micPermissionGranted = true;
    } catch (micError) {
      console.warn("[voice_livekit] Failed to get microphone, will join without audio:", micError);
      
      emit("error", { 
        error: "mic_permission_failed", 
        detail: String(micError?.message || micError),
        warning: true 
      });
    }

    try {
      room = new LiveKit.Room({
        adaptiveStream: true,
        dynacast: true,
      });

      
      room.on(LiveKit.RoomEvent.Connected, () => {
        console.log("[voice_livekit] Room connected");
        selfIdentity = room.localParticipant.identity;
        joined = true;
        
        
        peers = [];
        room.remoteParticipants.forEach((participant) => {
          if (participant.identity !== selfIdentity && !peers.includes(participant.identity)) {
            peers.push(participant.identity);
          }
        });
        
        console.log("[voice_livekit] Connected state:", { selfIdentity, peersCount: peers.length, totalPeers: peers.length + 1 });
        
        
        updateState();
      });

      room.on(LiveKit.RoomEvent.Disconnected, () => {
        joined = false;
        updateState();
        cleanupRemoteAudio();
      });

      room.on(LiveKit.RoomEvent.ParticipantConnected, (participant) => {
        if (participant.identity === selfIdentity) return;
        if (!peers.includes(participant.identity)) {
          peers.push(participant.identity);
          updateState();
        }
      });

      room.on(LiveKit.RoomEvent.ParticipantDisconnected, (participant) => {
        peers = peers.filter((p) => p !== participant.identity);
        updateState();
        
        try {
          const el = audioEls[participant.identity];
          if (el) {
            if (el.srcObject instanceof MediaStream) {
              el.srcObject.getTracks().forEach((t) => t.stop());
            }
            el.remove();
            delete audioEls[participant.identity];
          }
        } catch {}
      });

      room.on(LiveKit.RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === LiveKit.Track.Kind.KindAudio && participant.identity !== selfIdentity) {
          attachRemoteAudio(participant.identity, track);
        }
      });

      room.on(LiveKit.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (track.kind === LiveKit.Track.Kind.KindAudio && participant.identity !== selfIdentity) {
          try {
            const el = audioEls[participant.identity];
            if (el) {
              track.detach();
              if (el.srcObject instanceof MediaStream) {
                el.srcObject.getTracks().forEach((t) => t.stop());
              }
            }
          } catch {}
        }
      });

      room.on(LiveKit.RoomEvent.DataReceived, (payload, participant) => {
        
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(payload);
          const data = JSON.parse(text);
          if (data.type === "chat" && data.text) {
            emit("chat", {
              peerId: participant?.identity || "",
              nickname: data.nickname || participant?.name || "",
              text: data.text,
            });
          }
        } catch {}
      });

      room.on(LiveKit.RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        
      });

      
      const normalizedHost = normalizeLiveKitHost(livekitHost);
      console.log("[voice_livekit] Connecting to room...", { host: normalizedHost });
      await connectWithTimeout(room, normalizedHost, livekitToken, 15000);
      console.log("[voice_livekit] Room connection established");
      
      
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      
      if (room && room.localParticipant) {
        
        if (!selfIdentity && room.localParticipant.identity) {
          selfIdentity = room.localParticipant.identity;
          joined = true;
        }
        
        
        peers = [];
        room.remoteParticipants.forEach((participant) => {
          if (participant.identity !== selfIdentity && !peers.includes(participant.identity)) {
            peers.push(participant.identity);
          }
        });
        
        console.log("[voice_livekit] Post-connect: ensuring state is up to date", { selfIdentity, peersCount: peers.length, totalPeers: peers.length + (selfIdentity ? 1 : 0) });
        updateState();
      }

      
      if (micPermissionGranted && localAudioTrack) {
        try {
          console.log("[voice_livekit] Publishing audio track on join...");
          await room.localParticipant.publishTrack(localAudioTrack, {
            source: LiveKit.Track.Source.SourceMicrophone,
          });
          console.log("[voice_livekit] Audio track published successfully on join");
          
          if (!micEnabled) {
            await localAudioTrack.mute();
          }
          
          updateState();
        } catch (publishError) {
          console.error("[voice_livekit] Failed to publish audio track on join:", publishError);
          
          micEnabled = false;
          emit("error", { 
            error: "publish_audio_failed", 
            detail: String(publishError?.message || publishError),
            warning: true 
          });
          updateState();
        }
      } else {
        
        console.log("[voice_livekit] No microphone permission or track, setting micEnabled to false");
        micEnabled = false;
        updateState();
      }
    } catch (e) {
      joined = false;
      updateState();
      emit("error", { error: "connect_failed", detail: String(e?.message || e) });
      throw e;
    }
  }

  
  function leave() {
    if (room) {
      try {
        room.disconnect();
      } catch {}
      room = null;
    }
    if (localAudioTrack) {
      try {
        localAudioTrack.stop();
      } catch {}
      localAudioTrack = null;
    }
    cleanupRemoteAudio();
    joined = false;
    peers = [];
    selfIdentity = "";
    updateState();
  }

  
  async function setMicEnabled(enabled) {
    console.log("[voice_livekit] setMicEnabled called", { enabled, hasLocalTrack: !!localAudioTrack, hasRoom: !!room, joined });
    
    micEnabled = enabled;
    
    if (enabled) {
      
      if (!localAudioTrack && room && joined) {
        try {
          const LiveKit = getLiveKit();
          if (!LiveKit) throw new Error("LiveKit_missing");
          
          console.log("[voice_livekit] Getting microphone...");
          await ensureLocalStream();
          console.log("[voice_livekit] Microphone obtained", { hasLocalTrack: !!localAudioTrack });
          
          if (localAudioTrack) {
            try {
              console.log("[voice_livekit] Publishing audio track...");
              await room.localParticipant.publishTrack(localAudioTrack, {
                source: LiveKit.Track.Source.SourceMicrophone,
              });
              console.log("[voice_livekit] Audio track published successfully");
            } catch (publishError) {
              console.error("[voice_livekit] Failed to publish audio track:", publishError);
              
              micEnabled = false;
              emit("error", { 
                error: "publish_audio_failed", 
                detail: String(publishError?.message || publishError),
                warning: false
              });
            }
          } else {
            console.warn("[voice_livekit] ensureLocalStream completed but localAudioTrack is still null");
            micEnabled = false;
            emit("error", { 
              error: "get_microphone_failed", 
              detail: "获取麦克风后未创建音频轨道",
              warning: false
            });
          }
        } catch (micError) {
          console.error("[voice_livekit] Failed to get microphone:", micError);
          
          micEnabled = false;
          const errorMsg = String(micError?.message || micError || "");
          emit("error", { 
            error: errorMsg.includes("getUserMedia_failed") ? "getUserMedia_failed" : "get_microphone_failed", 
            detail: errorMsg,
            warning: false
          });
        }
      } else if (localAudioTrack) {
        
        const LiveKit = getLiveKit();
        let publication = null;
        try {
          
          if (LiveKit?.Track?.Source) {
            publication = room?.localParticipant?.getTrackPublication(LiveKit.Track.Source.SourceMicrophone);
          }
        } catch (e) {
          console.warn("[voice_livekit] Error checking track publication:", e);
        }
        
        if (!publication || !publication.track) {
          
          console.log("[voice_livekit] Audio track exists but not published, publishing...");
          try {
            await room.localParticipant.publishTrack(localAudioTrack, {
              source: LiveKit.Track.Source.SourceMicrophone,
            });
            console.log("[voice_livekit] Audio track published");
          } catch (publishError) {
            console.error("[voice_livekit] Failed to publish audio track:", publishError);
            micEnabled = false;
            emit("error", { 
              error: "publish_audio_failed", 
              detail: String(publishError?.message || publishError),
              warning: false
            });
            updateState();
            return;
          }
        } else {
          console.log("[voice_livekit] Audio track already published");
        }
        
        
        console.log("[voice_livekit] Unmuting existing audio track");
        try {
          await localAudioTrack.unmute();
          console.log("[voice_livekit] Audio track unmuted");
        } catch (unmuteError) {
          console.error("[voice_livekit] Failed to unmute:", unmuteError);
          emit("error", { 
            error: "unmute_failed", 
            detail: String(unmuteError?.message || unmuteError),
            warning: false
          });
        }
      } else {
        console.warn("[voice_livekit] Cannot enable mic: no localAudioTrack and", { hasRoom: !!room, joined });
        micEnabled = false;
        emit("error", { 
          error: "mic_not_available", 
          detail: "无法启用麦克风：未连接到房间或未获取音频轨道",
          warning: false
        });
      }
    } else {
      
      if (localAudioTrack) {
        console.log("[voice_livekit] Muting audio track");
        try {
          await localAudioTrack.mute();
          console.log("[voice_livekit] Audio track muted");
        } catch (muteError) {
          console.error("[voice_livekit] Failed to mute:", muteError);
        }
      }
    }
    
    updateState();
  }

  
  function sendText(text) {
    if (!room || !joined) return;
    try {
      const encoder = new TextEncoder();
      const data = JSON.stringify({
        type: "chat",
        text: String(text || ""),
        nickname: opts?.nickname || "",
      });
      
      room.localParticipant.publishData(encoder.encode(data), { reliable: true });
    } catch {}
  }

  
  function setRoomId(roomId, password) {
    currentRoomId = String(roomId || "").trim();
    currentRoomPassword = String(password || "").trim();
  }

  
  function setLiveKitInfo(token, host) {
    livekitToken = String(token || "").trim();
    livekitHost = String(host || "").trim();
  }

  
  function closeRoom() {
    
    leave();
  }

  
  function getState() {
    return { roomId: currentRoomId, peerId: selfIdentity, peers, micEnabled, joined };
  }

  
  function create(o) {
    opts = o;
    currentRoomId = String(o?.roomId || "").trim();
    currentRoomPassword = "";
    livekitToken = "";
    livekitHost = "";
    return { join, leave, setMicEnabled, sendText, setRoomId, setLiveKitInfo, closeRoom, getState, on };
  }

  
  window.__tvVoiceRoom = { create };
  console.log("[voice_livekit] Module exposed: window.__tvVoiceRoom", { hasCreate: typeof create === "function" });
})();


console.log("[voice_livekit] Script loaded, checking exposure:", {
  hasWindow: typeof window !== "undefined",
  hasModule: typeof window !== "undefined" && !!window.__tvVoiceRoom,
  hasCreate: typeof window !== "undefined" && window.__tvVoiceRoom && typeof window.__tvVoiceRoom.create === "function",
});
