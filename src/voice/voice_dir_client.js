

(() => {
  
  let ws = null;
  
  let baseWs = "wss://sendit.opsat.io";
  
  let roomId = "";
  
  let peerId = "";
  
  let token = "";
  
  let roomPassword = "";

  
  const listeners = { open: [], close: [], peers: [], chat: [], closed: [], system: [], error: [] };

  
  function on(ev, cb) {
    listeners[ev].push(cb);
  }

  
  function emit(ev, payload) {
    for (const cb of listeners[ev] || []) {
      try {
        cb(payload);
      } catch {
        
      }
    }
  }

  
  function setBaseUrl(wsBaseUrl) {
    baseWs = wsBaseUrl || baseWs;
  }

  function disconnect() {
    try {
      ws?.close();
    } catch {}
    ws = null;
  }

  
  function connect(nextRoomId, nextPeerId, nextToken, nextPassword) {
    roomId = String(nextRoomId || "");
    peerId = String(nextPeerId || "");
    token = String(nextToken || "");
    roomPassword = String(nextPassword || "");
    if (!roomId || !peerId || !token) throw new Error("bad_params");

    const url = new URL(baseWs);
    
    if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else if (url.protocol === "http:") {
      url.protocol = "ws:";
    } else if (url.protocol !== "wss:" && url.protocol !== "ws:") {
      
      url.protocol = "wss:";
    }
    url.pathname = "/ws_voice_dir";
    url.searchParams.set("roomId", roomId);
    url.searchParams.set("peerId", peerId);
    url.searchParams.set("token", token);
    if (roomPassword) url.searchParams.set("password", roomPassword);

    ws = new WebSocket(url.toString());
    ws.onopen = () => emit("open", { roomId, peerId });
    ws.onclose = () => emit("close", { roomId, peerId });
    ws.onerror = (e) => emit("error", e);
    ws.onmessage = (ev) => {
      let data = null;
      try {
        data = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (data?.type === "peers") emit("peers", data);
      if (data?.type === "room_chat") emit("chat", data);
      if (data?.type === "room_closed") emit("closed", data);
      if (data?.type === "system") emit("system", data);
      if (data?.type === "system" && data?.text === "unauthorized") emit("error", { error: "unauthorized" });
      if (data?.type === "system" && data?.text === "room_not_found") emit("error", { error: "room_not_found" });
    };
  }

  
  function sendChat(text, nickname) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type: "room_chat", text, nickname }));
    } catch {}
  }

  
  function closeRoom() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type: "room_close" }));
    } catch {}
  }

  
  window.__tvVoiceDir = { on, connect, disconnect, setBaseUrl, sendChat, closeRoom };
})();


