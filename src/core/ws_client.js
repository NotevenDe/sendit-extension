

(() => {
  
  let ws = null;
  
  let currentCa = null;
  
  let currentToken = null;
  
  let wsBaseUrl = "wss://sendit.opsat.io";
  
  let reconnectAttempt = 0;
  
  let reconnectTimer = null;
  
  let stopped = false;
  
  let autoReconnect = true;

  
  const pendingOutbox = [];

  
  const listeners = { open: [], close: [], message: [], unauthorized: [], error: [] };

  
  function on(event, cb) {
    listeners[event].push(cb);
  }

  
  function off(event, cb) {
    const list = listeners[event];
    if (!list) return;
    const index = list.indexOf(cb);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }

  
  function emit(event, payload) {
    for (const cb of listeners[event] || []) {
      try {
        cb(payload);
      } catch {
        
      }
    }
  }

  
  function clearReconnect() {
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  
  function disconnect() {
    stopped = true;
    clearReconnect();
    reconnectAttempt = 0;
    pendingOutbox.splice(0, pendingOutbox.length);
    if (ws) {
      try {
        ws.close();
      } catch {
        
      }
    }
    ws = null;
  }

  
  function setBaseUrl(base) {
    wsBaseUrl = base || wsBaseUrl;
  }

  
  function setAutoReconnect(enabled) {
    autoReconnect = Boolean(enabled);
    if (!autoReconnect) clearReconnect();
  }

  
  function connect(ca, token) {
    stopped = false;
    clearReconnect();
    
    const same = currentCa === ca && currentToken === token;
    const state = ws?.readyState;
    if (same && (state === WebSocket.OPEN || state === WebSocket.CONNECTING)) return;

    
    if (ws) {
      
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        try {
          ws.close();
        } catch {
          
        }
      }
      
      ws = null;
    }

    currentCa = ca;
    currentToken = token;
    reconnectAttempt = 0;
    openSocket();
  }

  
  function openSocket() {
    if (stopped) return;
    if (!currentCa || !currentToken) return;

    const url = new URL(wsBaseUrl);
    
    if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else if (url.protocol === "http:") {
      url.protocol = "ws:";
    } else if (url.protocol !== "wss:" && url.protocol !== "ws:") {
      
      url.protocol = "wss:";
    }
    url.pathname = "/ws";
    url.searchParams.set("ca", currentCa);
    url.searchParams.set("token", currentToken);

    try {
      ws = new WebSocket(url.toString());
    } catch (e) {
      emit("error", e);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempt = 0;
      emit("open", { ca: currentCa });
      
      if (pendingOutbox.length) {
        const batch = pendingOutbox.splice(0, pendingOutbox.length);
        for (const m of batch) {
          try {
            ws?.send(JSON.stringify(m));
          } catch {
            
          }
        }
      }
    };

    ws.onmessage = (ev) => {
      let data = null;
      try {
        data = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (data?.type === "system" && data?.text === "unauthorized") {
        emit("unauthorized", data);
        disconnect();
        return;
      }
      emit("message", data);
    };

    ws.onerror = (e) => {
      emit("error", e);
    };

    ws.onclose = () => {
      emit("close", { ca: currentCa });
      ws = null;
      scheduleReconnect();
    };
  }

  
  function scheduleReconnect() {
    if (stopped) return;
    if (!autoReconnect) return;
    clearReconnect();
    reconnectAttempt += 1;
    const delay = Math.min(15000, 600 * Math.pow(1.6, reconnectAttempt));
    reconnectTimer = window.setTimeout(() => {
      openSocket();
    }, delay);
  }

  
  function send(msg) {
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pendingOutbox.push(msg);
      
      if (pendingOutbox.length > 50) pendingOutbox.splice(0, pendingOutbox.length - 50);
      return;
    }
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      
    }
  }

  
  window.__tvDanmakuWs = { connect, disconnect, send, on, off, setBaseUrl, setAutoReconnect };
})();


