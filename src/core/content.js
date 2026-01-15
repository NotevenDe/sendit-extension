

(() => {
  
  const EXT_ROOT_ATTR = "data-tv-danmaku-installed";

  
  let stopFollow = null;

  
  const BASE_LANE_HEIGHT = 28;

  
  const LANE_GAP = 8;

  
  const LANE_PADDING_TOP = 10;

  
  const LANE_PADDING_BOTTOM = 10;

  
  const STORAGE_KEY = "tv_danmaku_settings_v1";

  
  const EVM_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

  
  const SOL_ID_RE = /^[1-9A-HJ-NP-Za-km-z]{32,100}$/;
  
    const DEFAULT_HTTP_BASE = "https://sendit.opsat.io";

  
  const DEFAULT_WS_BASE = "wss://sendit.opsat.io";

  
  function computeDanmakuAreaBounds(settings, h) {
    const padTop = 10;
    const padBottom = 10;
    const off = Number(settings?.danmakuYOffset || 0);
    const area = settings?.danmakuArea || "full";

    let startY = padTop;
    let endY = Math.max(padTop + 1, h - padBottom);

    if (area === "top") {
      startY = padTop;
      endY = Math.max(startY + 60, Math.floor(h * 0.35));
    } else if (area === "middle") {
      startY = Math.floor(h * 0.33);
      endY = Math.max(startY + 80, Math.floor(h * 0.66));
    } else if (area === "bottom") {
      startY = Math.floor(h * 0.60);
      endY = Math.max(startY + 60, h - padBottom);
    }

    startY = clamp(0, h - 1, startY + off);
    endY = clamp(startY + 1, h, endY + off);
    return { startY, endY };
  }

  

  

  
  const DEFAULT_SETTINGS = {
    direction: "rtl",
    lanes: 0,
    speedPxPerSec: 70,
    fontSizePx: 16,
    opacity: 0.92,
    color: "#ffffff",
    danmakuGapPx: 28,
    strokeWidth: 3,
    strokeColor: "rgba(0,0,0,0.55)",
    backgroundAlpha: 0.22,
    
    nickname: "",
    avatarDataUrl: "",
    jawKey: "",
    loggedInAt: 0,
    danmakuArea: "full",
    danmakuYOffset: 0,
    danmakuEnabled: true,
    confettiEnabled: true,
    httpBaseUrl: DEFAULT_HTTP_BASE,
    wsBaseUrl: DEFAULT_WS_BASE,
    address: "",
    accessToken: "",
    expiresAt: 0,
    uiMode: "comment",
  };

  
  function clamp(min, max, v) {
    return Math.max(min, Math.min(max, v));
  }

  
  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 240 || rect.height < 180) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")
      return false;
    return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
  }

  
  function findTradingViewCandidates() {
    
    const selectors = [
      
      ".tradingview-widget-container",
      ".tv-chart-container",
      ".tv-lightweight-charts",
      "[class*='tradingview']",
      "[id*='tradingview']",
      
      "[class*='chart-container']",
      "[class*='tv-chart']",
      "iframe[src*='tradingview.com']",
      "iframe[title*='TradingView']",
    ];

    
    const set = new Set();
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => set.add(el));
    }
    return Array.from(set);
  }

  
  function pickBestContainer(candidates) {
    
    const scored = [];
    for (const el of candidates) {
      const host = el instanceof HTMLIFrameElement ? el.parentElement : el;
      if (!(host instanceof HTMLElement)) continue;
      if (!isVisible(host)) continue;
      const rect = host.getBoundingClientRect();
      scored.push({ el: host, area: rect.width * rect.height });
    }
    scored.sort((a, b) => b.area - a.area);
    return scored[0]?.el ?? null;
  }

  
  function ensureOverlay(container) {

    void container;
    return ensurePortal().overlay;
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

  
  function formatMessage(nickname, text) {
    
    void nickname;
    return String(text || "").replace(/[\r\n]+/g, " ").trim();
  }

  
  function shortenAddr(addr) {
    const a = String(addr || "").trim();
    if (!a) return "-";
    if (a.length <= 14) return a;
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
  }

  
  function defaultNicknameFromAddress(addr) {
    return shortenAddr(addr);
  }

  

  
  async function ensureOkxSolBridgeInjected() {
    try {
      
      const r = await chrome.runtime.sendMessage({ type: "inject_okx_sol_bridge" });
      if (r?.ok) return { ok: true };
      return { ok: false, error: String(r?.error || "inject_failed"), detail: r?.detail ? String(r.detail) : undefined };
    } catch (e) {
      return { ok: false, error: "inject_failed", detail: String(e?.message || e) };
    }
  }

  
  async function requestOkxSolSignatureViaBridge() {
    const inj = await ensureOkxSolBridgeInjected();
    if (!inj.ok) return inj;

    const requestId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    return await new Promise((resolve) => {
      
      function onMsg(ev) {
        const d = ev?.data;
        if (!d || d.type !== "TV_OKX_SOL_SIGN_RESULT" || String(d.requestId || "") !== requestId) return;
        window.removeEventListener("message", onMsg, false);
        if (d.ok) {
          resolve({
            ok: true,
            pubkey: String(d.pubkey || ""),
            ts: Number(d.ts || 0),
            signatureB64: String(d.signatureB64 || ""),
          });
        } else {
          resolve({ ok: false, error: String(d.error || "sign_failed"), detail: d.detail ? String(d.detail) : undefined });
        }
      }

      window.addEventListener("message", onMsg, false);
      try {
        window.postMessage({ type: "TV_OKX_SOL_SIGN_REQUEST", requestId }, "*");
      } catch (e) {
        window.removeEventListener("message", onMsg, false);
        resolve({ ok: false, error: "post_message_failed", detail: String(e?.message || e) });
        return;
      }

      window.setTimeout(() => {
        window.removeEventListener("message", onMsg, false);
        resolve({ ok: false, error: "timeout" });
      }, 15000);
    });
  }

  
  function openUserInfoModal(info) {
    const addr = String(info?.fromAddr || "").trim();
    if (!addr) return;
    if (document.querySelector(".tv-danmaku-modal-backdrop")) return;

    const backdrop = document.createElement("div");
    backdrop.className = "tv-danmaku-modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "tv-danmaku-modal";

    const header = document.createElement("div");
    header.className = "tv-danmaku-modal-header";

    const title = document.createElement("div");
    title.className = "tv-danmaku-modal-title";
    title.textContent = "用户信息";

    const closeBtn = document.createElement("button");
    closeBtn.className = "tv-danmaku-modal-close";
    closeBtn.type = "button";
    closeBtn.textContent = "关闭";

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    const nick = String(info?.nickname || "").trim() || defaultNicknameFromAddress(addr);
    body.innerHTML = `
      <div class="tv-danmaku-kv">
        <div class="tv-danmaku-muted">昵称</div>
        <div>${nick}</div>
        <div class="tv-danmaku-muted">地址</div>
        <div style="word-break:break-all;">${addr}</div>
      </div>
      <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="tv-danmaku-modal-btn tv-danmaku-modal-btn-ghost" type="button" id="tvCopyAddr">复制地址</button>
      </div>
      <div class="tv-danmaku-muted" id="tvUserTip" style="margin-top:10px;"></div>
    `;

    modal.appendChild(header);
    modal.appendChild(body);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const tipEl = body.querySelector("#tvUserTip");
    const copyBtn = body.querySelector("#tvCopyAddr");
    copyBtn?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(addr);
        if (tipEl) tipEl.textContent = "已复制。";
      } catch {
        if (tipEl) tipEl.textContent = "复制失败（浏览器权限限制）。";
      }
    });

    function close() {
      backdrop.remove();
      document.removeEventListener("keydown", onKey, true);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    document.addEventListener("keydown", onKey, true);
  }

  
  function getDanmakuEngine() {
    
    const engine = window.__tvDanmakuEngine || null;
    if (!engine) return null;
    const host = document.querySelector(".tv-danmaku-host");
    if (!(host instanceof HTMLElement)) return null;
    
    const player = window.__tvDanmakuPlayer;
    if (player?.el && !document.body.contains(player.el)) return null;
    return engine;
  }

  
  function resetDanmakuEngineState() {
    try {
      
      window.__tvDanmakuEngine = null;
    } catch {}
    try {
      
      window.__tvDanmakuPlayer = null;
    } catch {}
    try {
      
      
      if (window.AwesomeDanmaku?.instanceControl) {
        
        window.AwesomeDanmaku.instanceControl = null;
      }
    } catch {}
  }

  
  const pendingDanmaku = [];

  
  function enqueueDanmaku(payload) {
    pendingDanmaku.push(payload);
    if (pendingDanmaku.length > 200) pendingDanmaku.splice(0, pendingDanmaku.length - 200);
  }

  
  function flushPendingDanmaku() {
    const engine = getDanmakuEngine();
    if (!engine || pendingDanmaku.length === 0) return false;
    const batch = pendingDanmaku.splice(0, pendingDanmaku.length);
    for (const item of batch) {
      try {
        engine.send?.(item);
      } catch {
        
      }
    }
    return true;
  }

  

  
  function ensurePortal() {
    const existingHost = document.querySelector(".tv-danmaku-host");
    if (existingHost instanceof HTMLElement) {
      const overlay = existingHost.querySelector(":scope > .tv-danmaku-overlay");
      const canvas = existingHost.querySelector(":scope canvas.tv-danmaku-canvas");
      if (overlay instanceof HTMLElement && canvas instanceof HTMLCanvasElement) {
        return { host: existingHost, overlay, canvas };
      }
      existingHost.remove();
    }

    const host = document.createElement("div");
    host.className = "tv-danmaku-host";

    const overlay = document.createElement("div");
    overlay.className = "tv-danmaku-overlay";

    const canvas = document.createElement("canvas");
    canvas.className = "tv-danmaku-canvas";
    overlay.appendChild(canvas);

    
    const dom = document.createElement("div");
    dom.className = "tv-danmaku-dom";
    overlay.appendChild(dom);

    host.appendChild(overlay);
    document.body.appendChild(host);
    return { host, overlay, canvas };
  }

  
  function ensureDomDanmakuContainer(overlay) {
    const el = overlay.querySelector(":scope > .tv-danmaku-dom");
    if (el instanceof HTMLElement) return el;
    const dom = document.createElement("div");
    dom.className = "tv-danmaku-dom";
    overlay.appendChild(dom);
    return dom;
  }

  
  function followTargetRect(target, host, ui, chatPanel) {
    let raf = 0;
    let lastL = -1;
    let lastT = -1;
    let lastW = -1;
    let lastH = -1;

    const tick = () => {
      const r = target.getBoundingClientRect();
      const l = Math.floor(r.left);
      const t = Math.floor(r.top);
      const w = Math.floor(r.width);
      const h = Math.floor(r.height);

      if (w > 0 && h > 0 && (l !== lastL || t !== lastT || w !== lastW || h !== lastH)) {
        lastL = l;
        lastT = t;
        lastW = w;
        lastH = h;
        host.style.left = `${l}px`;
        host.style.top = `${t}px`;
        host.style.width = `${w}px`;
        host.style.height = `${h}px`;

        
        const uiW = Math.max(260, Math.min(520, w - 24));
        ui.style.width = `${uiW}px`;
        ui.style.left = `${l + w / 2}px`;
        ui.style.bottom = `${Math.max(10, window.innerHeight - (t + h) + 10)}px`;
        ui.style.transform = "translateX(-50%)";
        ui.style.top = "auto";

        if (chatPanel) {
          const panelW = Math.min(360, Math.max(260, chatPanel.getBoundingClientRect().width || 300));
          const gap = 8;
          const preferLeft = l - panelW - gap;
          const left = preferLeft >= 0 ? preferLeft : l + gap; 
          const top = Math.max(8, t + 8);
          const height = Math.max(120, h - 16);
          chatPanel.style.left = `${Math.floor(left)}px`;
          chatPanel.style.top = `${Math.floor(top)}px`;
          chatPanel.style.height = `${Math.floor(height)}px`;
        }
        
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };
  }

  
  function isChartReady(container) {
    if (!isVisible(container)) return false;
    return Boolean(container.querySelector("iframe, canvas, svg"));
  }

  
  async function loadSettings() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        const res = await chrome.storage.local.get([STORAGE_KEY]);
        const raw = res?.[STORAGE_KEY];
        if (raw && typeof raw === "object") return { ...DEFAULT_SETTINGS, ...raw };
      }
    } catch {
      
    }
    
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (raw && typeof raw === "object") return { ...DEFAULT_SETTINGS, ...raw };
    } catch {
      
    }
    return { ...DEFAULT_SETTINGS };
  }

  

  

  
  function parseRouteInfoFromHref(href) {
    let u;
    try {
      u = new URL(href);
    } catch {
      return null;
    }

    const host = u.hostname;
    const path = u.pathname.replace(/\/+$/, "");

    
    function asRoute(ca, source, evmChain) {
      if (EVM_ADDR_RE.test(ca)) return { chain: "evm", ca: ca.toLowerCase(), source, evmChain: String(evmChain || "") || undefined };
      if (SOL_ID_RE.test(ca)) return { chain: "solana", ca, source };
      return null;
    }

    
    if (host === "web3.okx.com") {
      const m = path.match(/^\/[^/]+\/token\/([^/]+)\/([^/]+)$/);
      if (m) return asRoute(m[2], "okx", m[1]);
    }

    
    if (host === "gmgn.ai") {
      const m = path.match(/^\/([^/]+)\/token\/([^/]+)$/);
      if (m) return asRoute(m[2], "gmgn", m[1]);
    }

    
    if (host === "pump.fun") {
      const m = path.match(/^\/coin\/([^/]+)$/);
      if (m) {
        const ca = m[1];
        return asRoute(ca, "pumpfun", "solana");
      }
    }

    
    if (host === "web3.binance.com") {
      const m = path.match(/^\/(?:[^/]+\/)?token\/([^/]+)\/([^/]+)$/);
      if (m) return asRoute(m[2], "binance", m[1]);
    }

    // flap.sh 支持：/{chain}/{token_address}
    if (host === "flap.sh") {
      const m = path.match(/^\/([^/]+)\/([^/]+)$/);
      if (m) {
        const chainName = m[1]; // 例如 "bnb", "eth" 等
        const ca = m[2]; // 代币地址
        // 根据链名判断类型，常见EVM链返回evm，否则返回solana
        const isEvm = ["bnb", "eth", "bsc", "polygon", "arbitrum", "optimism", "base", "avax", "fantom"].includes(chainName.toLowerCase());
        if (isEvm) {
          return { chain: "evm", ca: ca.toLowerCase(), source: "flap", evmChain: chainName };
        } else {
          return { chain: "solana", ca, source: "flap" };
        }
      }
    }

    // ave.ai 支持：/token/{token_address}-{chain}
    if (host === "ave.ai") {
      const m = path.match(/^\/token\/([^-]+)-(.+)$/);
      if (m) {
        const ca = m[1]; // 代币地址
        const chainName = m[2]; // 链名，例如 "bsc", "eth" 等
        // 根据链名判断类型，常见EVM链返回evm，否则返回solana
        const isEvm = ["bnb", "eth", "bsc", "polygon", "arbitrum", "optimism", "base", "avax", "fantom"].includes(chainName.toLowerCase());
        if (isEvm) {
          return { chain: "evm", ca: ca.toLowerCase(), source: "ave", evmChain: chainName };
        } else {
          return { chain: "solana", ca, source: "ave" };
        }
      }
    }

    // trends.fun 支持：/token/{token_address} (Solana)
    if (host === "trends.fun") {
      const m = path.match(/^\/token\/([^/]+)$/);
      if (m) {
        const ca = m[1]; // 代币地址
        // trends.fun 主要支持 Solana 代币
        return { chain: "solana", ca, source: "trends" };
      }
    }

    return null;
  }

  
  function parseRouteInfo() {
    
    const primary = parseRouteInfoFromHref(window.location.href);
    if (primary) return primary;
    const ref = document.referrer ? parseRouteInfoFromHref(document.referrer) : null;
    if (ref) return ref;
    return null;
  }

  
  function parseRouteInfoStrict() {
    return parseRouteInfoFromHref(window.location.href);
  }

  
  async function saveSettings(settings) {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEY]: settings });
        return;
      }
    } catch {
      
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      
    }
  }

  
  async function okxSolBridgeLogin(httpBaseUrl) {
    const signed = await requestOkxSolSignatureViaBridge();
    if (!signed.ok) return signed;

    const base = httpBaseUrl || DEFAULT_HTTP_BASE;
    const res = await fetch(`${base}/auth/okx/sol/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pubkey: signed.pubkey, ts: signed.ts, signatureB64: signed.signatureB64 }),
    });
    if (!res.ok) return { ok: false, error: "backend_verify_failed" };
    const js = await res.json();
    const key = String(js.key || "");
    const expiresAt = Number(js.expiresAt || 0);
    const address = String(js.pubkey || signed.pubkey || "");
    if (!key || !expiresAt || !address) return { ok: false, error: "bad_backend_response" };
    return { ok: true, address, key, expiresAt };
  }


  
  function getWsModule() {
    
    return window.__tvDanmakuWs;
  }

  
  function joinHttp(httpBase, path) {
    const u = new URL(httpBase);
    u.pathname = path;
    return u.toString();
  }

  
  async function httpGetRoomExists(ca, token, httpBaseUrl) {
    const base = httpBaseUrl || DEFAULT_HTTP_BASE;
    const url = joinHttp(base, "/rooms/exists") + `?ca=${encodeURIComponent(String(ca || ""))}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { authorization: `Bearer ${String(token || "")}` },
    });
    if (res.status === 401) throw new Error("unauthorized");
    if (!res.ok) throw new Error(`http_${res.status}`);
    const js = await res.json();
    return Boolean(js?.exists);
  }

  
  async function ensureAuth(settings) {
    
    
    let latest;
    try {
      latest = await loadSettings();
    } catch {
      
      latest = settings;
    }

    const now = Date.now();
    if (latest.accessToken && latest.expiresAt && now < Number(latest.expiresAt) - 30_000) {
      return latest;
    }

    
    openInPageConfigModal(latest);
    throw new Error("need_login");
  }

  
  

  
  function insertToolbar(container, onSend) {
    void container;
  
    const existing = document.body.querySelector(":scope > .tv-danmaku-ui");
    if (existing instanceof HTMLElement) return existing;

    
    function iconSvg(kind) {
      
      const common = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
      if (kind === "chat") {
        return `<svg viewBox="0 0 24 24" ${common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>`;
      }
      if (kind === "send") {
        return `<svg viewBox="0 0 24 24" ${common}><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9 22 2z"/></svg>`;
      }
      if (kind === "settings") {
        return `<svg viewBox="0 0 24 24" ${common}><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.7 1.7 0 0 0 .33 1.87l.06.06-1.6 2.77-.08-.03a2 2 0 0 0-2.2.47l-.06.06-3.2-1.85a1.7 1.7 0 0 0-.85-.23 1.7 1.7 0 0 0-.85.23L7.75 20.2l-.06-.06a2 2 0 0 0-2.2-.47l-.08.03-1.6-2.77.06-.06A1.7 1.7 0 0 0 4.2 15l-3.2-1.85V10.9L4.2 9a1.7 1.7 0 0 0-.33-1.87l-.06-.06 1.6-2.77.08.03a2 2 0 0 0 2.2-.47l.06-.06L11 1.95A1.7 1.7 0 0 0 11.85 1.7c.3 0 .6.08.85.23L15.9 3.8l.06.06a2 2 0 0 0 2.2.47l.08-.03 1.6 2.77-.06.06A1.7 1.7 0 0 0 19.8 9l3.2 1.85v2.25z"/></svg>`;
      }
      if (kind === "action") {
        return `<svg viewBox="0 0 24 24" ${common}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>`;
      }
      return `<svg viewBox="0 0 24 24" ${common}><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>`;
    }
  
    const root = document.createElement("div");
    root.className = "tv-danmaku-ui tv-danmaku-dock";
    root.style.position = "fixed";
    root.style.zIndex = "2147483647";
  
    const bar = document.createElement("div");
    bar.className = "tv-danmaku-dock-bar";
  
    const input = document.createElement("input");
    input.className = "tv-danmaku-dock-input";
    input.type = "text";
    input.placeholder = "Send it…";
    input.maxLength = 100;
    
    input.style.paddingRight = "60px";
    input.style.paddingLeft = "28px";

    
    const inputWrap = document.createElement("div");
    inputWrap.className = "tv-danmaku-dock-inputwrap";

    // Logo元素
    const logoEl = document.createElement("div");
    logoEl.className = "tv-danmaku-dock-logo";
    logoEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="#1677FF" d="M1.5 0L0 2.5V14h4v2h2l2-2h2.5L15 9.5V0zM13 8.5L10.5 11H8l-2 2v-2H3V2h10z"/><path fill="#1677FF" d="M9.5 4H11v4H9.5zm-3 0H8v4H6.5z"/></svg>';

    // Action按钮 在emoji左侧
    const actionBtn = document.createElement("button");
    actionBtn.className = "tv-danmaku-dock-action tv-danmaku-iconbtn";
    actionBtn.type = "button";
    actionBtn.title = "Action";
    actionBtn.setAttribute("aria-label", "Action");
    actionBtn.innerHTML = iconSvg("action");
    actionBtn.addEventListener("click", () => {
      showToast("弹幕action暂时不可用", "error", 3000);
    });
    
    const emojiBtn = document.createElement("button");
    emojiBtn.className = "tv-danmaku-dock-emoji tv-danmaku-iconbtn";
    emojiBtn.type = "button";
    emojiBtn.title = "Emoji";
    emojiBtn.setAttribute("aria-label", "Emoji");
    emojiBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="10"></circle>' +
      '<path d="M8 14s1.5 2 4 2 4-2 4-2"></path>' +
      '<path d="M9 9h.01"></path><path d="M15 9h.01"></path>' +
      "</svg>";

    
    inputWrap.appendChild(input);
    inputWrap.appendChild(logoEl);
    inputWrap.appendChild(actionBtn);
    inputWrap.appendChild(emojiBtn);

    const modeBtn = document.createElement("button");
    modeBtn.className = "tv-danmaku-dock-mode tv-danmaku-iconbtn";
    modeBtn.type = "button";
    modeBtn.title = "切换：评论/弹幕";
    modeBtn.setAttribute("aria-label", "切换：评论/弹幕");
    modeBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M17 2l4 4-4 4"></path>' +
      '<path d="M3 11V9a4 4 0 0 1 4-4h14"></path>' +
      '<path d="M7 22l-4-4 4-4"></path>' +
      '<path d="M21 13v2a4 4 0 0 1-4 4H3"></path>' +
      "</svg>";

    const chatBtn = document.createElement("button");
    chatBtn.className = "tv-danmaku-dock-chatbtn tv-danmaku-iconbtn";
    chatBtn.type = "button";
    chatBtn.title = "打开聊天室";
    chatBtn.setAttribute("aria-label", "聊天");
    chatBtn.innerHTML = iconSvg("chat");

    const configBtn = document.createElement("button");
    configBtn.className = "tv-danmaku-dock-config tv-danmaku-iconbtn";
    configBtn.type = "button";
    configBtn.title = "配置";
    configBtn.setAttribute("aria-label", "配置");
    configBtn.innerHTML = iconSvg("settings");
  
    
    void onSend;
  
    bar.appendChild(modeBtn);
    bar.appendChild(chatBtn);
    bar.appendChild(inputWrap);
    bar.appendChild(configBtn);
    root.appendChild(bar);
    document.body.appendChild(root);
  
    
    root.__tvDockChatBtn = chatBtn;
    root.__tvDockConfigBtn = configBtn;
    root.__tvDockModeBtn = modeBtn;
    root.__tvDockEmojiBtn = emojiBtn;

    return root;
  }
  
  
  
  function createCanvasDanmakuEngine(overlay, canvas, initialSettings) {
    
    let settings = { ...DEFAULT_SETTINGS, ...initialSettings };

    
    
    const ctx = canvas.getContext("2d");

    
    let dpr = window.devicePixelRatio || 1;

    
    const queue = [];

    
    const active = [];

    
    let frozenItem = null;

    
    let laneNextAllowedAt = [];

    
    let raf = null;

    
    let lastTs = performance.now();

    
    let cachedW = 0;

    
    let cachedH = 0;

    
    let cachedLanes = 0;

    
    let cachedDpr = 0;

    
    function laneHeight() {
      return Math.max(BASE_LANE_HEIGHT, Math.floor(settings.fontSizePx + 14));
    }

    
    function getAreaBounds(h) {
      return computeDanmakuAreaBounds(settings, h);
    }

    
    function getLanes() {
      const h = overlay.getBoundingClientRect().height;
      if (settings.lanes && settings.lanes > 0) return Math.max(1, Math.floor(settings.lanes));
      const bounds = getAreaBounds(h);
      const usable = Math.max(0, bounds.endY - bounds.startY);
      return Math.max(1, Math.floor(usable / (laneHeight() + LANE_GAP)));
    }

    
    function resize() {
      const r = overlay.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      const lanes = getLanes();

      const sizeChanged = w !== cachedW || h !== cachedH || dpr !== cachedDpr;
      const lanesChanged = lanes !== cachedLanes;

      if (sizeChanged) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cachedW = w;
        cachedH = h;
        cachedDpr = dpr;
      }

      if (lanesChanged) {
        const next = new Array(lanes).fill(0);
        for (let i = 0; i < Math.min(lanes, laneNextAllowedAt.length); i++) next[i] = laneNextAllowedAt[i];
        laneNextAllowedAt = next;
        cachedLanes = lanes;
      }

      return { w, h };
    }

    
    function measureTextWidth(text) {
      ctx.font = `${settings.fontSizePx}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      const safe = String(text).replace(/[\r\n]+/g, " ").trim();
      return ctx.measureText(safe).width + 16; 
    }

    
    function laneToY(lane) {
      const h = overlay.getBoundingClientRect().height;
      const bounds = getAreaBounds(h);
      return bounds.startY + lane * (laneHeight() + LANE_GAP);
    }

    
    function spawnIfPossible() {
      if (queue.length === 0) return;
      const now = performance.now();
      const lanes = getLanes();
      
      if (laneNextAllowedAt.length !== lanes) resize();

      
      let chosen = -1;
      let bestTime = Infinity;
      for (let i = 0; i < lanes; i++) {
        const t = laneNextAllowedAt[i] || 0;
        if (t <= now && t < bestTime) {
          bestTime = t;
          chosen = i;
        }
      }
      if (chosen === -1) return;

      const next = queue.shift();
      if (!next) return;

      const { w } = resize();
      const width = measureTextWidth(next.text);
      const speed = Math.max(60, settings.speedPxPerSec);
      const gap = clamp(0, 200, Number(settings.danmakuGapPx ?? 28)); 

      
      const xStart = settings.direction === "rtl" ? w + 8 : -width - 8;
      
      const validColors = ["#ffffff", "#00CFFF", "#ffdd00", "#FF6B6B"];
      const itemColor = next.color && validColors.includes(next.color) 
        ? next.color 
        : settings.color;
      const item = {
        text: String(next.text).replace(/[\r\n]+/g, " ").trim(),
        x: xStart,
        y: laneToY(chosen),
        width,
        lane: chosen,
        bornAt: now,
        meta: next.meta,
        color: itemColor,
      };
      active.push(item);

      
      const waitMs = ((width + gap) / speed) * 1000;
      laneNextAllowedAt[chosen] = now + waitMs;
    }

    
    function step(dtSec) {
      const r = overlay.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const speed = Math.max(60, settings.speedPxPerSec);
      const dir = settings.direction;

      for (const it of active) {
        
        if (frozenItem && it === frozenItem) continue;
        it.x += (dir === "rtl" ? -1 : 1) * speed * dtSec;
      }

      
      for (let i = active.length - 1; i >= 0; i--) {
        const it = active[i];
        const out = dir === "rtl" ? it.x < -it.width - 20 : it.x > w + 20;
        if (out) active.splice(i, 1);
      }
    }

    
    function draw() {
      const { w, h } = resize();
      ctx.clearRect(0, 0, w, h);

      ctx.font = `${settings.fontSizePx}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textBaseline = "top";

      for (const it of active) {
        const x = it.x;
        const y = it.y;
        const lh = laneHeight();

        
        const bgA = clamp(0, 1, settings.backgroundAlpha);
        if (bgA > 0.001) {
          ctx.fillStyle = `rgba(0,0,0,${bgA})`;
          roundRect(ctx, x, y - 2, it.width, lh - 6, 999);
          ctx.fill();
        }

        
        const alpha = clamp(0, 1, settings.opacity);
        const textX = x + 8;
        const textY = y;
        if (settings.strokeWidth > 0.001) {
          ctx.lineWidth = settings.strokeWidth;
          ctx.strokeStyle = settings.strokeColor;
          ctx.globalAlpha = alpha;
          ctx.strokeText(it.text, textX, textY);
        }

        
        ctx.fillStyle = it.color || settings.color;
        ctx.globalAlpha = alpha;
        ctx.fillText(it.text, textX, textY);
      }

      ctx.globalAlpha = 1;
    }

    
    function loop(ts) {
      const dtSec = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
      lastTs = ts;
      spawnIfPossible();
      step(dtSec);
      draw();
      raf = window.requestAnimationFrame(loop);
    }

    
    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(overlay);

    resize();
    raf = window.requestAnimationFrame(loop);

    return {
      
      send(payload) {
        if (typeof payload === "string") {
          queue.push({ text: payload, color: settings.color });
          return;
        }
        if (payload && typeof payload === "object") {
          const t = String(payload.text || "").trim();
          if (!t) return;
          
          const validColors = ["#ffffff", "#00CFFF", "#ffdd00", "#FF6B6B"];
          const msgColor = payload.color && validColors.includes(payload.color) 
            ? payload.color 
            : settings.color;
          queue.push({ text: t, meta: payload.meta, color: msgColor });
        }
      },
      
      stop() {
        if (raf) window.cancelAnimationFrame(raf);
        raf = null;
        ro.disconnect();
        active.splice(0, active.length);
        queue.splice(0, queue.length);
      },
      
      updateSettings(s) {
        settings = { ...DEFAULT_SETTINGS, ...s };
        
        resize();
      },
      
      getSettings() {
        return { ...settings };
      },
      
      hitTest(clientX, clientY) {
        const r = overlay.getBoundingClientRect();
        const x = clientX - r.left;
        const y = clientY - r.top;
        if (x < 0 || y < 0 || x > r.width || y > r.height) return null;
        const h = laneHeight();
        
        for (let i = active.length - 1; i >= 0; i--) {
          const it = active[i];
          if (x >= it.x && x <= it.x + it.width && y >= it.y - 2 && y <= it.y - 2 + h) {
            return { text: it.text, meta: it.meta };
          }
        }
        return null;
      },
      
      toggleFreezeAt(clientX, clientY) {
        const r = overlay.getBoundingClientRect();
        const x = clientX - r.left;
        const y = clientY - r.top;
        if (x < 0 || y < 0 || x > r.width || y > r.height) return { frozen: false, hit: null };
        const h = laneHeight();
        for (let i = active.length - 1; i >= 0; i--) {
          const it = active[i];
          if (x >= it.x && x <= it.x + it.width && y >= it.y - 2 && y <= it.y - 2 + h) {
            if (frozenItem === it) {
              frozenItem = null;
              return { frozen: false, hit: { text: it.text, meta: it.meta } };
            }
            frozenItem = it;
            return { frozen: true, hit: { text: it.text, meta: it.meta } };
          }
        }
        return { frozen: false, hit: null };
      },
      
      clearFreeze() {
        frozenItem = null;
      },
    };
  }

  
  function createAwesomeDanmakuEngine(overlay, initialSettings) {
    
    let settings = { ...DEFAULT_SETTINGS, ...initialSettings };

    const domEl = ensureDomDanmakuContainer(overlay);
    
    const DanmakuPlayer = window.AwesomeDanmaku;
    if (!DanmakuPlayer?.getPlayer) throw new Error("AwesomeDanmaku missing");

    
    
    const existingPlayer = window.__tvDanmakuPlayer;
    if (existingPlayer?.el && existingPlayer.el !== domEl) {
      resetDanmakuEngineState();
    }

    
    const player = DanmakuPlayer.getPlayer({
      el: domEl,
      
      rollingTime: 6000,
      nodeMaxCount: 60,
      nodeTag: "p",
      
      nodeClass: "awesome-danmaku-item tv-danmaku-node",
      nodeValueKey: "value",
      trackCount: Math.max(1, Number(settings.lanes || 0) || 6),
      trackHeight: Math.max(28, Math.floor((settings.fontSizePx || 16) + 14)),
    });

    
    function syncSize() {
      try {
        const r = overlay.getBoundingClientRect();
        const w = Math.max(1, Math.floor(r.width || domEl.clientWidth || 1));
        player.playerWidth = w;
        if (Array.isArray(player.trackList)) {
          for (const tr of player.trackList) {
            if (tr && typeof tr === "object") tr.width = w;
          }
        }
      } catch {
        
      }
    }

    
    function applyArea() {
      try {
        const r = overlay.getBoundingClientRect();
        const fullH = Math.max(1, Math.floor(r.height || 1));
        const bounds = computeDanmakuAreaBounds(settings, fullH);
        const areaH = Math.max(1, Math.floor(bounds.endY - bounds.startY));

        
        domEl.style.top = `${Math.floor(bounds.startY)}px`;
        domEl.style.bottom = "auto";
        domEl.style.height = `${areaH}px`;

        
        const trackH = Math.max(28, Math.floor((settings.fontSizePx || 16) + 14));
        const lanes = Number(settings.lanes || 0);
        const autoTracks = Math.max(1, Math.floor(areaH / (trackH + 8)));
        player.trackHeight = trackH;
        player.trackCount = lanes > 0 ? Math.max(1, Math.floor(lanes)) : autoTracks;
      } catch {
        
      }
    }

    
    function applySpeed() {
      try {
        syncSize();
        applyArea();
        const w = Math.max(1, domEl.clientWidth || overlay.getBoundingClientRect().width || 1);
        const rollingTime = Number(player.rollingTime || 6000);
        const baseline = (w * 1000) / rollingTime; 
        const desired = Math.max(60, Number(settings.speedPxPerSec || 70));
        const mul = Math.max(0.2, Math.min(6, desired / Math.max(1, baseline)));
        player.change?.("speed", mul);
      } catch {
        
      }
    }

    function applyOpacity() {
      try {
        player.change?.("opacity", clamp(0, 1, Number(settings.opacity || 1)));
      } catch {
        
      }
    }

    function applyGapDensity() {
      try {
        const gap = clamp(0, 140, Number(settings.danmakuGapPx ?? 28));
        
        const density = clamp(0, 1, 1 - gap / 140);
        player.change?.("overlap", density);
      } catch {
        
      }
    }

    function applyTracks() {
      try {
        syncSize();
        applyArea();
      } catch {
        
      }
    }

    applyTracks();
    applySpeed();
    applyOpacity();
    applyGapDensity();
    try {
      syncSize();
      player.play?.();
      
      
      window.__tvDanmakuPlayer = player;
    } catch {
      
    }

    
    function metaId(meta) {
      const raw = String(meta?.clientMsgId || meta?.id || "");
      if (!raw) return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    return {
      send(payload) {
        const text = typeof payload === "string" ? payload : String(payload?.text || "");
        if (!String(text).trim()) return;
        const meta = typeof payload === "object" && payload ? payload.meta : undefined;
        const id = metaId(meta);
        syncSize();
        
        
        if (!player.trackList || !Array.isArray(player.trackList) || player.trackList.length === 0) {
          
          window.setTimeout(() => {
            this.send(payload);
          }, 100);
          return;
        }
        
        try {
          
          const validColors = ["#ffffff", "#00CFFF", "#ffdd00", "#FF6B6B"];
          const payloadColor = typeof payload === "object" && payload?.color && validColors.includes(payload.color)
            ? payload.color
            : settings.color || "#ffffff";
          player.insert(
            {
              value: String(text),
              color: String(payloadColor),
              opacity: String(clamp(0, 1, Number(settings.opacity || 1))),
              fontSize: Math.max(12, Math.floor(Number(settings.fontSizePx || 16))),
              fontWeight: "normal",
              
              
              nodeClass: `awesome-danmaku-item tv-danmaku-node tv-danmaku-id-${id}`,
            },
            false
          );
        } catch (e) {
          
          console.warn("[tv-danmaku] 弹幕插入失败，延迟重试:", e);
          window.setTimeout(() => {
            try {
              if (player.trackList && Array.isArray(player.trackList) && player.trackList.length > 0) {
                player.insert(
                  {
                    value: String(text),
                    color: String(settings.color || "#ffffff"),
                    opacity: String(clamp(0, 1, Number(settings.opacity || 1))),
                    fontSize: Math.max(12, Math.floor(Number(settings.fontSizePx || 16))),
                    fontWeight: "normal",
                    nodeClass: `awesome-danmaku-item tv-danmaku-node tv-danmaku-id-${id}`,
                  },
                  false
                );
              }
            } catch (e2) {
              console.warn("[tv-danmaku] 弹幕插入重试失败:", e2);
            }
          }, 200);
        }

        
        try {
          
          const m = (window.__tvDanmakuMetaMap ||= {});
          
          m[id] = meta || {};
        } catch {
          
        }
      },
      stop() {
        try {
          player.stop?.();
        } catch {
          
        }
      },
      updateSettings(s) {
        settings = { ...DEFAULT_SETTINGS, ...s };
        applyTracks();
        applySpeed();
        applyOpacity();
        applyGapDensity();
      },
      getSettings() {
        return { ...settings };
      },
    };
  }

  
  function roundRect(ctx2, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx2.beginPath();
    ctx2.moveTo(x + rr, y);
    ctx2.arcTo(x + w, y, x + w, y + h, rr);
    ctx2.arcTo(x + w, y + h, x, y + h, rr);
    ctx2.arcTo(x, y + h, x, y, rr);
    ctx2.arcTo(x, y, x + w, y, rr);
    ctx2.closePath();
  }

  
  function init() {
    
    const route = parseRouteInfo();
    if (!route) return;

    const candidates = findTradingViewCandidates();
    const container = pickBestContainer(candidates);

    if (!container) {
      
      watchForLateContainer();
      return;
    }

    if (document.documentElement.hasAttribute(EXT_ROOT_ATTR)) return;
    document.documentElement.setAttribute(EXT_ROOT_ATTR, "1");

    const portal = ensurePortal();

    
    function setupWithSettings(s) {
      
      let currentSettings = { ...DEFAULT_SETTINGS, ...s };
      
      
      const TEMP_COLOR_KEY = "tv_danmaku_temp_color";
      try {
        const tempColor = sessionStorage.getItem(TEMP_COLOR_KEY);
        const validColors = ["#ffffff", "#00CFFF", "#ffdd00", "#FF6B6B"];
        if (tempColor && validColors.includes(tempColor)) {
          currentSettings.color = tempColor;
        } else {
          
          currentSettings.color = "#ffffff";
          sessionStorage.removeItem(TEMP_COLOR_KEY);
        }
      } catch {
        
        currentSettings.color = "#ffffff";
      }

      
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "local") return;
            const ch = changes?.[STORAGE_KEY];
            if (!ch?.newValue) return;
            const prevToken = currentSettings.accessToken;
            const prevExpires = Number(currentSettings.expiresAt || 0);
            currentSettings = { ...currentSettings, ...ch.newValue };
            
            try {
              const engine = getDanmakuEngine();
              if (currentSettings.danmakuEnabled === false) {
                
                if (engine?.stop) {
                  engine.stop();
                }
              } else {
                
                if (engine) {
                  engine.updateSettings?.(currentSettings);
                } else {
                  
                  
                  if (window.__tvInitDanmakuEngine) {
                    
                    window.__tvInitDanmakuEngine();
                  }
                }
              }
            } catch {
              
            }
            
            try {
              const ui = document.body.querySelector(":scope > .tv-danmaku-ui");
              
              if (ui && ui.__tvApplyModeUi) {
                
                ui.__tvApplyModeUi(currentSettings);
              }
            } catch {
              
            }

            
            try {
              const nextToken = currentSettings.accessToken;
              const nextExpires = Number(currentSettings.expiresAt || 0);
              const now = Date.now();
              const prevValid = prevToken && prevExpires && now < prevExpires - 30_000;
              const nextValid = nextToken && nextExpires && now < nextExpires - 30_000;
              if (!prevValid && nextValid) {
                const route = parseRouteInfo();
                if (route?.ca) {
                  if (currentSettings.uiMode === "comment" && currentSettings.danmakuEnabled !== false) {
                    
                    window.__tvLoadCommentsAsDanmaku?.(route.ca, nextToken, currentSettings.httpBaseUrl);
                  } else {
                    const ws = getWsModule();
                    ws?.setBaseUrl?.(currentSettings.wsBaseUrl || currentSettings.httpBaseUrl || DEFAULT_WS_BASE);
                    void httpGetRoomExists(route.ca, nextToken, currentSettings.httpBaseUrl || DEFAULT_HTTP_BASE)
                      .then((exists) => {
                        if (exists) ws?.connect?.(route.ca, nextToken);
                      })
                      .catch(() => {});
                  }
                }
              }
            } catch {
              
            }
          });
        }
      } catch {
        
      }

      
      function onSendText(text) {
        void text;
        
      }

      const ui = insertToolbar(container, onSendText);
      bindDock(ui, () => currentSettings, (next) => {
        currentSettings = next;
      });
      const chatPanel = ensureChatPanel();

      
      function initDanmakuEngineWithRetry(retryCount = 0, maxRetries = 10) {
        
        if (getDanmakuEngine()) {
          return;
        }

        
        if (currentSettings.danmakuEnabled === false) {
          console.log("[tv-danmaku] 弹幕已关闭，跳过初始化");
          return;
        }

        
        try {
          
          const portalCheck = ensurePortal();
          if (!portalCheck || !portalCheck.overlay || !portalCheck.canvas) {
            throw new Error("Portal 未就绪");
          }

          
          if (!container || !document.body.contains(container)) {
            throw new Error("Container 未就绪");
          }

          const overlay = ensureOverlay(container);
          if (!overlay) {
            throw new Error("Overlay 未就绪");
          }

          
          if (!document.body.contains(portalCheck.canvas)) {
            throw new Error("Canvas 未在 DOM 中");
          }

          const engine =
            
            window.AwesomeDanmaku?.getPlayer
              ? createAwesomeDanmakuEngine(overlay, currentSettings)
              : createCanvasDanmakuEngine(overlay, portalCheck.canvas, currentSettings);
          
          window.__tvDanmakuEngine = engine;

          if (engine) {
            flushPendingDanmaku();
            console.log("[tv-danmaku] 弹幕引擎初始化成功");
            return;
          } else {
            throw new Error("引擎创建返回 null");
          }
        } catch (e) {
          console.error(`[tv-danmaku] 弹幕引擎初始化失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, e);
        }

        
        if (retryCount < maxRetries) {
          const delay = Math.min(500 * (retryCount + 1), 2000); 
          console.log(`[tv-danmaku] ${delay}ms 后重试初始化弹幕引擎...`);
          window.setTimeout(() => {
            initDanmakuEngineWithRetry(retryCount + 1, maxRetries);
          }, delay);
        } else {
          console.error("[tv-danmaku] 弹幕引擎初始化失败，已达到最大重试次数");
        }
      }

      
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          
          window.setTimeout(() => {
            initDanmakuEngineWithRetry();
          }, 100);
        });
      } else {
        
        window.setTimeout(() => {
          initDanmakuEngineWithRetry();
        }, 100);
      }

      
      
      window.__tvInitDanmakuEngine = () => {
        
        if (getDanmakuEngine()) {
          return true;
        }
        try {
          
          const portalCheck = ensurePortal();
          if (!portalCheck || !portalCheck.overlay || !portalCheck.canvas) {
            console.warn("[tv-danmaku] Portal 未就绪，无法初始化引擎");
            return false;
          }

          if (!container || !document.body.contains(container)) {
            console.warn("[tv-danmaku] Container 未就绪，无法初始化引擎");
            return false;
          }

          const overlay = ensureOverlay(container);
          if (!overlay) {
            console.warn("[tv-danmaku] Overlay 未就绪，无法初始化引擎");
            return false;
          }

          if (!document.body.contains(portalCheck.canvas)) {
            console.warn("[tv-danmaku] Canvas 未在 DOM 中，无法初始化引擎");
            return false;
          }

          const engine =
            
            window.AwesomeDanmaku?.getPlayer
              ? createAwesomeDanmakuEngine(overlay, currentSettings)
              : createCanvasDanmakuEngine(overlay, portalCheck.canvas, currentSettings);
          
          window.__tvDanmakuEngine = engine;
          if (engine) {
            flushPendingDanmaku();
            console.log("[tv-danmaku] 弹幕引擎初始化成功（通过全局函数）");
            return true;
          } else {
            console.warn("[tv-danmaku] 引擎创建返回 null");
            return false;
          }
        } catch (e) {
          console.error("[tv-danmaku] 弹幕引擎初始化失败（通过全局函数）:", e);
          return false;
        }
      };

      
      
      
      try {
        
        if (!window.__tvDanmakuClickBound) {
          
          window.__tvDanmakuClickBound = true;

          
          let tipEl = null;
          
          let frozenAwesomeEl = null;
          
          const awesomeFreeze = new WeakMap();

          function ensureTip() {
            if (tipEl && document.body.contains(tipEl)) return tipEl;
            const d = document.createElement("div");
            d.className = "tv-danmaku-hover-tip";
            document.body.appendChild(d);
            tipEl = d;
            return d;
          }

          
          function showTip(clientX, clientY, addr) {
            const el = ensureTip();
            el.textContent = `地址：${addr}`;
            el.style.display = "block";
            const pad = 10;
            const w = el.getBoundingClientRect().width || 200;
            const h = el.getBoundingClientRect().height || 24;
            const x = clamp(pad, window.innerWidth - w - pad, clientX + 12);
            const y = clamp(pad, window.innerHeight - h - pad, clientY + 14);
            el.style.left = `${Math.floor(x)}px`;
            el.style.top = `${Math.floor(y)}px`;
          }

          function hideTip() {
            if (!tipEl) return;
            tipEl.style.display = "none";
          }

          
          function freezeAwesomeNode(node) {
            if (!node || awesomeFreeze.has(node)) return;
            try {
              const cs = window.getComputedStyle(node);
              const transform = cs.transform === "none" ? "" : cs.transform;
              const transition = cs.transition || "";
              awesomeFreeze.set(node, { transform, transition });
              node.style.transition = "none";
              if (transform) node.style.transform = transform;
            } catch {
              
            }
          }

          
          function resumeAwesomeNode(node, speedPxPerSec) {
            if (!node) return;
            const saved = awesomeFreeze.get(node);
            if (!saved) return;
            awesomeFreeze.delete(node);
            try {
              const cs = window.getComputedStyle(node);
              const m = cs.transform && cs.transform !== "none" ? cs.transform.match(/matrix\\(([^)]+)\\)/) : null;
              let curX = 0;
              if (m) {
                const parts = m[1].split(",").map((x) => Number(String(x).trim()));
                curX = Number(parts?.[4] || 0);
              }
              const rect = node.getBoundingClientRect();
              const portal2 = ensurePortal();
              const ow = Math.max(1, portal2.overlay.getBoundingClientRect().width || 1);
              const targetX = -Math.max(ow + rect.width + 60, 200);
              const dist = Math.abs(curX - targetX);
              const durMs = Math.max(80, Math.floor((dist / Math.max(60, speedPxPerSec)) * 1000));
              node.style.transition = `transform ${durMs}ms linear`;
              node.style.transform = `translateX(${targetX}px)`;
            } catch {
              
            }
          }

          document.addEventListener(
            "click",
            (e) => {
              try {
                const portal2 = ensurePortal();
                const host = portal2.host;
                const overlay = portal2.overlay;
                const dom = overlay.querySelector(":scope > .tv-danmaku-dom");

                
                
                
                const prevHostPe = host.style.pointerEvents;
                host.style.pointerEvents = "auto";
                const prevPe = overlay.style.pointerEvents;
                overlay.style.pointerEvents = "auto";
                const prevDomPe = dom instanceof HTMLElement ? dom.style.pointerEvents : "";
                if (dom instanceof HTMLElement) dom.style.pointerEvents = "auto";
                const el = document.elementFromPoint(e.clientX, e.clientY);
                if (dom instanceof HTMLElement) dom.style.pointerEvents = prevDomPe || "";
                overlay.style.pointerEvents = prevPe || "";
                host.style.pointerEvents = prevHostPe || "";

                
                function findIdNode(start) {
                  let cur = start;
                  for (let i = 0; i < 8; i++) {
                    const cls = Array.from(cur.classList || []).find((c) => c.startsWith("tv-danmaku-id-"));
                    if (cls) return { node: cur, id: cls.slice("tv-danmaku-id-".length) };
                    const p = cur.parentElement;
                    if (!p) break;
                    cur = p;
                  }
                  return null;
                }

                if (el instanceof HTMLElement) {
                  const found = findIdNode(el);
                  if (found?.id) {
                    const id = found.id;
                    
                    const meta = (window.__tvDanmakuMetaMap && window.__tvDanmakuMetaMap[id]) || {};
                    const addr = String(meta?.fromAddr || "").trim();

                    
                    try {
                      
                      if (window.__tvDanmakuDebugClick) console.debug("[tv-danmaku] click hit", { id, addr, el, node: found.node, meta });
                    } catch {}

                    e.preventDefault();
                    e.stopPropagation();
                    const s = getDanmakuEngine()?.getSettings?.() || DEFAULT_SETTINGS;

                    
                    if (frozenAwesomeEl === found.node) {
                      resumeAwesomeNode(found.node, Number(s.speedPxPerSec || 70));
                      frozenAwesomeEl = null;
                      hideTip();
                      return;
                    }
                    if (frozenAwesomeEl) resumeAwesomeNode(frozenAwesomeEl, Number(s.speedPxPerSec || 70));
                    frozenAwesomeEl = found.node;
                    freezeAwesomeNode(found.node);

                    
                    try {
                      const eng2 = getDanmakuEngine();
                      eng2?.clearFreeze?.();
                    } catch {}

                    if (addr) showTip(e.clientX, e.clientY, addr);
                    else hideTip();
                    return;
                  }
                }

                
                if (frozenAwesomeEl) {
                  const s = getDanmakuEngine()?.getSettings?.() || DEFAULT_SETTINGS;
                  resumeAwesomeNode(frozenAwesomeEl, Number(s.speedPxPerSec || 70));
                  frozenAwesomeEl = null;
                }

                
                const eng = getDanmakuEngine();
                if (eng?.toggleFreezeAt) {
                  const r = eng.toggleFreezeAt(e.clientX, e.clientY);
                  const addr = String(r?.hit?.meta?.fromAddr || "").trim();
                  if (r?.hit) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (addr && r.frozen) showTip(e.clientX, e.clientY, addr);
                    else hideTip();
                    return;
                  }
                  eng?.clearFreeze?.();
                }

                
                hideTip();
              } catch {
                
              }
            },
            true
          );

          
          window.addEventListener("blur", () => {
            try {
              if (frozenAwesomeEl) {
                const s = getDanmakuEngine()?.getSettings?.() || DEFAULT_SETTINGS;
                resumeAwesomeNode(frozenAwesomeEl, Number(s.speedPxPerSec || 70));
              }
              frozenAwesomeEl = null;
              try {
                getDanmakuEngine()?.clearFreeze?.();
              } catch {}
              hideTip();
            } catch {
              
            }
          });
        }
      } catch {
        
      }

      
      if (stopFollow) stopFollow();
      stopFollow = followTargetRect(container, portal.host, ui, chatPanel);
      const ensureEngineReady = () => {
        if (getDanmakuEngine()) {
          flushPendingDanmaku();
          return true;
        }
        
        if (window.__tvInitDanmakuEngine) {
          
          window.__tvInitDanmakuEngine();
        }
        flushPendingDanmaku();
        return Boolean(getDanmakuEngine());
      };
      
      window.requestAnimationFrame(() => {
        ensureEngineReady();
        window.setTimeout(ensureEngineReady, 200);
        window.setTimeout(ensureEngineReady, 800);
      });

      
      startCaRoomWatcher(() => currentSettings, (next) => {
        currentSettings = next;
      });

      
      
      window.setTimeout(() => {
        const route = parseRouteInfo();
        if (route?.ca && currentSettings.uiMode === "comment" && currentSettings.accessToken && currentSettings.danmakuEnabled !== false) {
          
          const engine = getDanmakuEngine();
          if (!engine) {
            
            window.setTimeout(() => {
              const route2 = parseRouteInfo();
              const engine2 = getDanmakuEngine();
              if (route2?.ca && engine2 && currentSettings.uiMode === "comment" && currentSettings.accessToken && currentSettings.danmakuEnabled !== false) {
                
                if (window.__tvLoadCommentsAsDanmaku) {
                  
                  window.__tvLoadCommentsAsDanmaku(route2.ca, currentSettings.accessToken, currentSettings.httpBaseUrl).catch(() => {});
                }
              }
            }, 500);
            return;
          }
          
          if (window.__tvLoadCommentsAsDanmaku) {
            
            window.__tvLoadCommentsAsDanmaku(route.ca, currentSettings.accessToken, currentSettings.httpBaseUrl).catch(() => {});
          }
        }
      }, 500);
    }

    loadSettings().then(setupWithSettings);
  }

  
  function getChatModule() {
    
    return window.__tvDanmakuChat;
  }

  
  function ensureChatPanel() {
    return getChatModule().ensureChatPanel();
  }

  
  function toggleChatPanel(panel) {
    getChatModule().toggle(panel);
  }

  
  function bindDock(uiRoot, getSettingsRef, setSettingsRef) {
    
    
    if (uiRoot.__tvDockBound) return;
    
    uiRoot.__tvDockBound = true;

    
    
    const btn = uiRoot.__tvDockConfigBtn;
    if (!(btn instanceof HTMLButtonElement)) return;
    
    const chatBtn = uiRoot.__tvDockChatBtn;
    
    const modeBtn = uiRoot.__tvDockModeBtn;

    
    btn.addEventListener("click", () => {
      void openInPageConfigModal(getSettingsRef());
    });

    
    const input = uiRoot.querySelector(":scope .tv-danmaku-dock-input");
    
    const emojiBtn = uiRoot.__tvDockEmojiBtn;
    const ws = getWsModule();

    
    function iconSvg(kind) {
      
      const common = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
      if (kind === "chat") {
        return `<svg viewBox="0 0 24 24" ${common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>`;
      }
      if (kind === "send") {
        return `<svg viewBox="0 0 24 24" ${common}><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9 22 2z"/></svg>`;
      }
      if (kind === "settings") {
        return `<svg viewBox="0 0 24 24" ${common}><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.7 1.7 0 0 0 .33 1.87l.06.06-1.6 2.77-.08-.03a2 2 0 0 0-2.2.47l-.06.06-3.2-1.85a1.7 1.7 0 0 0-.85-.23 1.7 1.7 0 0 0-.85.23L7.75 20.2l-.06-.06a2 2 0 0 0-2.2-.47l-.08.03-1.6-2.77.06-.06A1.7 1.7 0 0 0 4.2 15l-3.2-1.85V10.9L4.2 9a1.7 1.7 0 0 0-.33-1.87l-.06-.06 1.6-2.77.08.03a2 2 0 0 0 2.2-.47l.06-.06L11 1.95A1.7 1.7 0 0 0 11.85 1.7c.3 0 .6.08.85.23L15.9 3.8l.06.06a2 2 0 0 0 2.2.47l.08-.03 1.6 2.77-.06.06A1.7 1.7 0 0 0 19.8 9l3.2 1.85v2.25z"/></svg>`;
      }
      if (kind === "action") {
        return `<svg viewBox="0 0 24 24" ${common}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>`;
      }
      return `<svg viewBox="0 0 24 24" ${common}><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>`;
    }

    
    function ensureEmojiPicker(inputEl) {
      
      if (window.__tvEmojiPicker) return window.__tvEmojiPicker;

      
      
      const EmojiButton = window.EmojiButton;
      if (!EmojiButton) {
        console.warn("EmojiButton not found. Make sure emoji-button.min.js is loaded before content.js");
        return null;
      }

      
      const picker = new EmojiButton({
        theme: "dark",
        position: "top-end",
        zIndex: 2147483647,
      });

      picker.on("emoji", (selection) => {
        const emoji = selection?.emoji || "";
        if (!emoji || !(inputEl instanceof HTMLInputElement)) return;
        const start = inputEl.selectionStart ?? inputEl.value.length;
        const end = inputEl.selectionEnd ?? inputEl.value.length;
        inputEl.value = inputEl.value.slice(0, start) + emoji + inputEl.value.slice(end);
        const next = start + emoji.length;
        inputEl.setSelectionRange(next, next);
        inputEl.focus();
      });

      
      window.__tvEmojiPicker = picker;
      return picker;
    }

    
    if (emojiBtn instanceof HTMLButtonElement && input instanceof HTMLInputElement) {
      emojiBtn.addEventListener("click", () => {
        const picker = ensureEmojiPicker(input);
        if (picker) {
          picker.togglePicker(emojiBtn);
        } else {
          console.warn("Emoji picker not available");
        }
      });
    }

    
    
    const seenIds = (window.__tvSeenClientMsgIds ||= new Set());

    
    async function loadCommentsAsDanmaku(ca, token, httpBaseUrl) {
      try {
        
        const s = getSettingsRef();
        if (s && s.danmakuEnabled === false) {
          return; 
        }
        
        
        const engine = getDanmakuEngine();
        if (!engine) {
          console.warn("[tv-danmaku] 弹幕引擎未初始化，延迟加载评论");
          
          window.setTimeout(() => {
            loadCommentsAsDanmaku(ca, token, httpBaseUrl).catch(() => {});
          }, 500);
          return;
        }

        
        
        const player = window.__tvDanmakuPlayer;
        if (player && (!player.trackList || !Array.isArray(player.trackList) || player.trackList.length === 0)) {
          
          console.warn("[tv-danmaku] player.trackList 未初始化，延迟加载评论");
          window.setTimeout(() => {
            loadCommentsAsDanmaku(ca, token, httpBaseUrl).catch(() => {});
          }, 300);
          return;
        }

        const url = new URL(httpBaseUrl || DEFAULT_HTTP_BASE);
        url.pathname = "/comments/all";
        url.searchParams.set("ca", ca);

        const res = await fetch(url.toString(), {
          headers: { authorization: `Bearer ${String(token || "")}` },
        });

        if (!res.ok) {
          
          if (res.status === 401) {
            showToast("加载评论失败：登录已过期，请重新登录", "error", 4000);
          } else if (res.status >= 500) {
            
            showToast("加载评论失败：服务器错误，请稍后重试", "error", 4000);
          } else {
            
            console.warn("[tv-danmaku] 加载评论失败:", res.status);
          }
          return;
        }

        const js = await res.json();
        const comments = Array.isArray(js?.comments) ? js.comments : [];

        
        for (const comment of comments) {
          const addr = String(comment?.fromAddr || "").trim();
          const name = comment?.nickname ? String(comment.nickname) : addr ? defaultNicknameFromAddress(addr) : "匿名";
          const text = String(comment?.text || "");

          if (!text) continue;

          try {
            
            engine.send?.({
              text: formatMessage(name, text),
              meta: {
                fromAddr: addr,
                nickname: name,
                commentId: comment?.id,
                createdAt: comment?.createdAt,
              },
              color: "#ffffff",
            });
          } catch (e) {
            console.warn("[tv-danmaku] 发送评论弹幕失败:", e);
            
          }
        }
      } catch (e) {
        
        if (e instanceof TypeError && e.message.includes("fetch")) {
          showToast("加载评论失败：网络错误，请检查网络连接", "error", 4000);
        } else {
          console.error("[tv-danmaku] 加载评论异常:", e);
        }
      }
    }

    
    
    window.__tvLoadCommentsAsDanmaku = loadCommentsAsDanmaku;
    
    
    
    window.__tvDanmakuContent = {
      showToast,
      parseRouteInfo,
    };

    
    async function sendToChat(text) {
      
      const s = getSettingsRef();
      if (s && s.danmakuEnabled === false) {
        showToast("弹幕功能已关闭，请在设置中启用", "error", 3000);
        return;
      }
      
      
      const trimmedText = String(text || "").trim();
      if (!trimmedText) {
        showToast("不能发送空白消息", "error", 2000);
        return;
      }
      if (trimmedText.length > 100) {
        showToast("消息长度不能超过100字", "error", 3000);
        return;
      }
      
      const route = parseRouteInfo();
      if (!route) return;
      const ca = route.ca;
      let settings = s;
      try {
        settings = await ensureAuth(settings);
        setSettingsRef(settings);
      } catch {
        
        return;
      }

      
      try {
        getChatModule()?.clearHint?.();
      } catch {
        
      }

      
      if (!ws) {
        showToast("WebSocket 模块未加载，请刷新页面重试", "error", 3000);
        return;
      }

      
      try {
        ws.setAutoReconnect?.(true);
      } catch {
        
      }

      
      ws?.setBaseUrl?.(settings.wsBaseUrl || settings.httpBaseUrl || DEFAULT_WS_BASE);
      
      
      const clientMsgId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      
      const TEMP_COLOR_KEY = "tv_danmaku_temp_color";
      let messageColor = "#ffffff";
      try {
        const tempColor = sessionStorage.getItem(TEMP_COLOR_KEY);
        const validColors = ["#ffffff", "#00CFFF", "#ffdd00", "#FF6B6B"];
        if (tempColor && validColors.includes(tempColor)) {
          messageColor = tempColor;
        }
      } catch {
        
        messageColor = "#ffffff";
      }

      

      
      const messageToSend = {
        type: "chat_send",
        clientMsgId,
        text: trimmedText,
        fromAddr: settings.address || undefined,
        nickname: settings.nickname || undefined,
        avatar: settings.avatarDataUrl || undefined,
        color: messageColor,
      };

      
      if (!ws?.connect) {
        showToast("WebSocket 连接方法不可用，请刷新页面重试", "error", 3000);
        return;
      }
      ws.connect(ca, settings.accessToken);
      
      
      
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          
          
          showToast("连接超时，消息已加入队列", "error", 3000);
          resolve(); 
        }, 3000);

        let resolved = false;

        const onOpen = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          ws?.off?.("open", onOpen);
          ws?.off?.("error", onError);
          ws?.off?.("unauthorized", onUnauthorized);
          resolve();
        };

        const onError = (e) => {
          if (resolved) return;
          
          
        };

        const onUnauthorized = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          ws?.off?.("open", onOpen);
          ws?.off?.("error", onError);
          ws?.off?.("unauthorized", onUnauthorized);
          showToast("登录已过期，请重新登录", "error", 3000);
          reject(new Error("登录已过期"));
        };

        if (ws?.on) {
          ws.on("open", onOpen);
          ws.on("error", onError);
          ws.on("unauthorized", onUnauthorized);
        }

        
        
        setTimeout(() => {
          if (!resolved) {
            
            resolved = true;
            clearTimeout(timeout);
            ws?.off?.("open", onOpen);
            ws?.off?.("error", onError);
            ws?.off?.("unauthorized", onUnauthorized);
            resolve();
          }
        }, 300);
      }).catch((e) => {
        
        if (String(e?.message || e) === "登录已过期") {
          return;
        }
        
      });

      
      console.log("[tv-danmaku] 发送消息:", {
        type: messageToSend.type,
        clientMsgId: messageToSend.clientMsgId,
        text: messageToSend.text,
        color: messageToSend.color,
      });
      try {
        if (!ws?.send) {
          showToast("WebSocket 发送方法不可用，请刷新页面重试", "error", 3000);
          return;
        }
        ws.send(messageToSend);
        showToast("弹幕发送成功", "success", 2000);
      } catch (sendError) {
        
        
        console.error("[tv-danmaku] send error:", sendError);
      }
    }

    
    async function sendToComment(text) {
      
      const s = getSettingsRef();
      if (s && s.danmakuEnabled === false) {
        showToast("弹幕功能已关闭，请在设置中启用", "error", 3000);
        return;
      }
      
      
      const trimmedText = String(text || "").trim();
      if (!trimmedText) {
        showToast("不能发送空白消息", "error", 2000);
        return;
      }
      if (trimmedText.length > 100) {
        showToast("评论长度不能超过100字", "error", 3000);
        return;
      }
      
      const route = parseRouteInfo();
      if (!route) return;
      const ca = route.ca;
      let settings = s;
      try {
        settings = await ensureAuth(settings);
        setSettingsRef(settings);
      } catch {
        return;
      }

      const u = new URL(settings.httpBaseUrl || DEFAULT_HTTP_BASE);
      u.pathname = "/comments";
      const res = await fetch(u.toString(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${String(settings.accessToken || "")}`,
        },
        body: JSON.stringify({
          ca,
          text: trimmedText,
          nickname: settings.nickname || undefined,
          avatar: settings.avatarDataUrl || undefined,
        }),
      });
      if (!res.ok) {
        
        showToast("评论发送失败", "error", 3000);
        
        try {
          
          window.__tvDanmakuComments?.ensurePanel?.();
        } catch {}
        return;
      }
      
      
      showToast("评论发送成功", "success", 2000);
      
      
      try {
        
        const cm = window.__tvDanmakuComments;
        if (cm?.ensurePanel && cm?.open) {
          const p = cm.ensurePanel();
          if (p instanceof HTMLElement && p.style.display !== "none") {
            await cm.open(ca, String(settings.accessToken || ""));
          }
        }
      } catch {
        
      }
    }

    
    function getMode() {
      const s = getSettingsRef();
      return s?.uiMode === "danmaku" ? "danmaku" : "comment";
    }

    
    async function setMode(nextMode) {
      const cur = await loadSettings();
      const next = { ...cur, uiMode: nextMode };
      await saveSettings(next);
      setSettingsRef(next);
      applyModeUi(next, true); 

      
      if (nextMode === "comment" && next.danmakuEnabled !== false) {
        const route = parseRouteInfo();
        if (route?.ca && next.accessToken) {
          await loadCommentsAsDanmaku(route.ca, next.accessToken, next.httpBaseUrl);
        }
      }
    }

    
    function applyModeUi(s, isUserSwitch = false) {
      
      const mode = String(s?.uiMode || "").trim() === "danmaku" ? "danmaku" : "comment";
      if (input instanceof HTMLInputElement) input.placeholder = mode === "comment" ? "Comment it…" : "Sendt it…";
      if (chatBtn instanceof HTMLButtonElement) {
        chatBtn.title = mode === "comment" ? "打开评论区" : "打开聊天室";
        chatBtn.setAttribute("aria-label", mode === "comment" ? "评论区" : "聊天室");
        
        if (mode === "comment") {
          chatBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:16px;height:16px;display:block;"><path fill="currentColor" d="M6 14h12v-2H6zm0-3h12V9H6zm0-3h12V6H6zm16 14l-4-4H4q-.825 0-1.412-.587T2 16V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4zM4 16h14.85L20 17.125V4H4zm0 0V4z"/></svg>';
        } else {
          
          const chatIcon = iconSvg("chat");
          chatBtn.innerHTML = chatIcon.replace('viewBox="0 0 24 24"', 'viewBox="0 0 24 24" style="width:16px;height:16px;display:block;"');
        }
      }
      if (modeBtn instanceof HTMLButtonElement) {
        modeBtn.title = mode === "comment" ? "当前：评论（点切到弹幕）" : "当前：弹幕（点切到评论）";
        
        modeBtn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M17 2l4 4-4 4"></path>' +
          '<path d="M3 11V9a4 4 0 0 1 4-4h14"></path>' +
          '<path d="M7 22l-4-4 4-4"></path>' +
          '<path d="M21 13v2a4 4 0 0 1-4 4H3"></path>' +
          "</svg>";
      }
    }

    
    
    uiRoot.__tvApplyModeUi = applyModeUi;

    
    function doSend() {
      if (!(input instanceof HTMLInputElement)) return;
      const text = input.value.trim();
      
      
      if (!text) {
        showToast("不能发送空白消息", "error", 2000);
        return;
      }
      
      
      if (text.length > 100) {
        showToast("消息长度不能超过100字", "error", 3000);
        return;
      }
      
      input.value = "";
      if (getMode() === "comment") void sendToComment(text);
      else void sendToChat(text);
    }

    if (input instanceof HTMLInputElement) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doSend();
      });
      
      
      input.addEventListener("input", async (e) => {
        
        if (typeof confetti === "undefined") return;
        
        const inputEl = e.target;
        if (!(inputEl instanceof HTMLInputElement)) return;
        
        const settings = getSettingsRef();
        if (settings?.confettiEnabled === false) return;
        
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

    
    if (modeBtn instanceof HTMLButtonElement) {
      modeBtn.addEventListener("click", () => {
        const m = getMode();
        void setMode(m === "comment" ? "danmaku" : "comment");
      });
    }

    
    if (chatBtn instanceof HTMLButtonElement) {
      const chatPanel = ensureChatPanel();
      const chat = getChatModule();

      chatBtn.addEventListener("click", () => {
        const s = getSettingsRef();
        const mode = s?.uiMode === "danmaku" ? "danmaku" : "comment";
        if (mode === "comment") {
          const route = parseRouteInfo();
          if (!route?.ca) {
            showToast("当前页面不支持评论，已打开聊天室", "error", 3000);
            try {
              chat.setHttpBaseUrl?.(s.httpBaseUrl || DEFAULT_HTTP_BASE);
              void chat.refreshRooms?.();
            } catch {}
            toggleChatPanel(chatPanel);
            return;
          }
          
          
          if (!s.accessToken) {
            showToast("请先登录", "error", 3000);
            return;
          }
          
          
          const cm = window.__tvDanmakuComments;
          if (!cm) {
            showToast("评论模块未加载", "error", 3000);
            return;
          }
          
          cm?.setHttpBaseUrl?.(s.httpBaseUrl || DEFAULT_HTTP_BASE);
          cm?.open?.(route.ca, String(s.accessToken)).catch((e) => {
            console.error("[tv-danmaku] 打开评论面板失败:", e);
            showToast("加载评论失败", "error", 3000);
          });
          return;
        }

        
        try {
          chat.setHttpBaseUrl?.(s.httpBaseUrl || DEFAULT_HTTP_BASE);
          void chat.refreshRooms?.();
        } catch {}
        toggleChatPanel(chatPanel);
      });

      chat.on("open", () => {
        chatBtn.hidden = true;
        const tvBtn = document.querySelector(".tv-danmaku-tvbtn");
        if (tvBtn instanceof HTMLElement) tvBtn.style.display = "none";
      });
      chat.on("close", () => {
        chatBtn.hidden = false;
        const tvBtn = document.querySelector(".tv-danmaku-tvbtn");
        if (tvBtn instanceof HTMLElement) tvBtn.style.display = "block";
      });
    }

    
    try {
      applyModeUi(getSettingsRef());
    } catch {}
  }

  
  
  async function openInPageConfigModal(settings) {
    if (document.querySelector(".tv-danmaku-modal-backdrop")) return;

    
    const latestSettings = await loadSettings();
    
    const mergedSettings = { ...latestSettings, ...settings };

    const backdrop = document.createElement("div");
    backdrop.className = "tv-danmaku-modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "tv-danmaku-modal";

    const header = document.createElement("div");
    header.className = "tv-danmaku-modal-header";

    const title = document.createElement("div");
    title.className = "tv-danmaku-modal-title";
    title.textContent = "配置";

    const closeBtn = document.createElement("button");
    closeBtn.className = "tv-danmaku-modal-close";
    closeBtn.type = "button";
    closeBtn.title = "关闭";
    closeBtn.setAttribute("aria-label", "关闭");
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M18 6 6 18"></path><path d="M6 6l12 12"></path></svg>';

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    const now = Date.now();
    const loggedIn = Boolean(mergedSettings.accessToken) && Number(mergedSettings.expiresAt || 0) > now + 5_000;
    const addrShort = loggedIn ? shortenAddr(String(mergedSettings.address || "")) : "-";
    const expiresAtStr = loggedIn ? new Date(Number(mergedSettings.expiresAt)).toLocaleString() : "-";

    body.innerHTML = `
      <div class="tv-danmaku-modal-tabs">
        <button class="tv-danmaku-modal-tab is-active" type="button" data-tab="cfg">配置</button>
        <button class="tv-danmaku-modal-tab" type="button" data-tab="danmaku">弹幕</button>
        <button class="tv-danmaku-modal-tab" type="button" data-tab="about">关于</button>
      </div>
      
      <div class="tv-danmaku-modal-panel is-active" data-panel="cfg">
        <div class="tv-danmaku-kv" style="margin-top: 12px;">
          <div class="tv-danmaku-muted">地址</div>
          <div>${addrShort}</div>
          <div class="tv-danmaku-muted">过期</div>
          <div>${expiresAtStr}</div>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 10px;">
          <button class="tv-danmaku-modal-btn" type="button" id="tvLoginBtn">${loggedIn ? "重新登录" : "OKX 登录"}</button>
          ${loggedIn ? '<button class="tv-danmaku-modal-btn tv-danmaku-modal-btn-ghost" type="button" id="tvLogoutBtn">退出登录</button>' : ""}
        </div>
        ${loggedIn ? `
          <div style="margin-top: 20px;">
            <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.68); font-size: 13px;">昵称</label>
            <input type="text" id="tvNickname" class="tv-danmaku-modal-input" maxlength="16" placeholder="默认=地址" value="${String(mergedSettings.nickname || "").trim() || (mergedSettings.address ? defaultNicknameFromAddress(mergedSettings.address) : "")}" />
          </div>
        ` : ""}
      </div>
      
      ${typeof window !== 'undefined' && window.__tvDanmakuPanel ? window.__tvDanmakuPanel.renderDanmakuPanel(mergedSettings, {
        showEnabledToggle: true,
        showColorPresets: true,
        showColorPicker: false,
        showGapControl: false,
        defaultSpeed: 70,
        speedMin: 20,
        speedMax: 520
      }) : ''}
      
      ${typeof window !== 'undefined' && window.__tvAboutPanel ? window.__tvAboutPanel.renderAboutPanel() : ''}
      
      <div class="tv-danmaku-muted" id="tvUserTip" style="margin-top: 12px;"></div>
    `;

    modal.appendChild(header);
    modal.appendChild(body);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const tipEl = body.querySelector("#tvUserTip");
    const nickEl = body.querySelector("#tvNickname");
    const areaEl = body.querySelector("#tvDanmakuArea");
    const speedEl = body.querySelector("#tvSpeed");
    const speedLabelEl = body.querySelector("#tvSpeedLabel");
    const danmakuEnabledEl = body.querySelector("#tvDanmakuEnabled");
    const danmakuEnabledToggle = body.querySelector("#tvDanmakuEnabledToggle");
    const danmakuEnabledThumb = body.querySelector("#tvDanmakuEnabledThumb");
    const confettiEnabledEl = body.querySelector("#tvConfettiEnabled");
    const confettiEnabledToggle = body.querySelector("#tvConfettiEnabledToggle");
    const confettiEnabledThumb = body.querySelector("#tvConfettiEnabledThumb");
    const colorPickerEl = body.querySelector("#tvColorPicker");
    const colorDots = colorPickerEl ? colorPickerEl.querySelectorAll(".tv-color-dot") : [];
    const TEMP_COLOR_KEY = "tv_danmaku_temp_color";
    
    
    if (danmakuEnabledEl) {
      const isEnabled = mergedSettings.danmakuEnabled !== false; 
      danmakuEnabledEl.checked = isEnabled;
      
      if (danmakuEnabledToggle && danmakuEnabledThumb) {
        if (isEnabled) {
          danmakuEnabledToggle.style.backgroundColor = "rgba(34, 197, 94, 0.8)";
          danmakuEnabledThumb.style.left = "22px";
        } else {
          danmakuEnabledToggle.style.backgroundColor = "rgba(255,255,255,0.2)";
          danmakuEnabledThumb.style.left = "3px";
        }
      }
    }
    
    if (confettiEnabledEl) {
      const isEnabled = mergedSettings.confettiEnabled !== false; 
      confettiEnabledEl.checked = isEnabled;
      
      if (confettiEnabledToggle && confettiEnabledThumb) {
        if (isEnabled) {
          confettiEnabledToggle.style.backgroundColor = "rgba(34, 197, 94, 0.8)";
          confettiEnabledThumb.style.left = "22px";
        } else {
          confettiEnabledToggle.style.backgroundColor = "rgba(255,255,255,0.2)";
          confettiEnabledThumb.style.left = "3px";
        }
      }
    }
    
    
    let selectedColor = sessionStorage.getItem(TEMP_COLOR_KEY) || "#ffffff";
    const validColors = ["#ffffff", "#00CFFF", "#ffdd00", "#FF6B6B"];
    if (!validColors.includes(selectedColor)) {
      selectedColor = "#ffffff";
    }
    
    
    try {
      
      
      if (!getDanmakuEngine() && window.__tvInitDanmakuEngine) {
        
        window.__tvInitDanmakuEngine();
      }
      
      const cur = getDanmakuEngine()?.getSettings?.() || mergedSettings;
      const next = { ...cur, color: selectedColor };
      getDanmakuEngine()?.updateSettings?.(next);
    } catch {}
    
    colorDots.forEach((dot) => {
      const color = dot.getAttribute("data-color");
      const indicator = dot.querySelector("svg");
      
      
      if (color === selectedColor && indicator) {
        indicator.style.display = "block";
        
        const bgColor = dot.style.background || dot.getAttribute("data-color") || "#ffffff";
        const isLight = bgColor === "#ffffff" || bgColor === "#ffdd00" || bgColor === "#00CFFF";
        indicator.style.color = isLight ? "#000000" : "#ffffff";
        dot.style.borderColor = "rgba(255,255,255,0.8)";
        dot.style.borderWidth = "3px";
      }
      
      
      dot.addEventListener("click", () => {
        
        colorDots.forEach((d) => {
          const ind = d.querySelector("svg");
          if (ind) ind.style.display = "none";
          d.style.borderColor = "rgba(255,255,255,0.3)";
          d.style.borderWidth = "2px";
        });
        
        
        const ind = dot.querySelector("svg");
        if (ind) {
          ind.style.display = "block";
          
          const bgColor = dot.style.background || dot.getAttribute("data-color") || "#ffffff";
          const isLight = bgColor === "#ffffff" || bgColor === "#ffdd00" || bgColor === "#00CFFF";
          ind.style.color = isLight ? "#000000" : "#ffffff";
        }
        dot.style.borderColor = "rgba(255,255,255,0.8)";
        dot.style.borderWidth = "3px";
        
        selectedColor = color || "#ffffff";
        
        
        try {
          sessionStorage.setItem(TEMP_COLOR_KEY, selectedColor);
        } catch {}
        
        
        try {
          const cur = getDanmakuEngine()?.getSettings?.() || mergedSettings;
          const next = { ...cur, color: selectedColor };
          getDanmakuEngine()?.updateSettings?.(next);
        } catch {}
      });
    });

    function tip(t) {
      if (tipEl) tipEl.textContent = String(t || "");
    }

    async function doLogin() {
      tip("请求 OKX 签名中…");
      chrome.runtime.sendMessage({ type: "login_via_okx" }, async (resp) => {
        if (resp?.ok) {
          const cur = await loadSettings();
          const addr = String(resp.address || "");
          const nextNick = cur.nickname && String(cur.nickname).trim() && String(cur.nickname).trim() !== "我"
            ? String(cur.nickname).trim()
            : defaultNicknameFromAddress(addr);
          const next = {
            ...cur,
            accessToken: resp.key,
            jawKey: resp.key,
            expiresAt: resp.expiresAt,
            address: addr,
            nickname: nextNick,
            loggedInAt: Date.now(),
          };
          await saveSettings(next);
          tip("登录成功（已保存）。");
          close();
          window.setTimeout(() => openInPageConfigModal(next), 0);
        } else {
          tip(`登录失败：${String(resp?.error || "unknown")}`);
        }
      });
    }

    async function doLogout() {
      const cur = await loadSettings();
      const next = { ...cur, accessToken: "", jawKey: "", expiresAt: 0, address: "" };
      await saveSettings(next);
      tip("已退出登录。");
      close();
      window.setTimeout(() => openInPageConfigModal(next), 0);
    }

    
    let saveTimer = null;
    async function autoSave() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        const cur = await loadSettings();
        const next = {
          ...cur,
          nickname: nickEl ? String(nickEl.value || "").trim().slice(0, 16) || (cur.address ? defaultNicknameFromAddress(cur.address) : "我") : cur.nickname,
          httpBaseUrl: DEFAULT_HTTP_BASE,
          wsBaseUrl: DEFAULT_WS_BASE,
          danmakuArea: areaEl ? String(areaEl.value || "full") : cur.danmakuArea,
          speedPxPerSec: speedEl ? Number(speedEl.value || 70) : cur.speedPxPerSec,
          danmakuEnabled: danmakuEnabledEl !== null && danmakuEnabledEl !== undefined ? Boolean(danmakuEnabledEl.checked) : (typeof cur.danmakuEnabled === "boolean" ? cur.danmakuEnabled : true),
          confettiEnabled: confettiEnabledEl !== null && confettiEnabledEl !== undefined ? Boolean(confettiEnabledEl.checked) : (typeof cur.confettiEnabled === "boolean" ? cur.confettiEnabled : true),
          color: cur.color, 
        };
        await saveSettings(next);
        tip("已自动保存");
        
        try {
          if (next.danmakuEnabled === false) {
            
            const engine = getDanmakuEngine();
            if (engine?.stop) {
              engine.stop();
            }
          } else {
            
            const engine = getDanmakuEngine();
            if (engine) {
              engine.updateSettings?.(next);
            } else {
              
              
              if (window.__tvInitDanmakuEngine) {
                
                window.__tvInitDanmakuEngine();
              }
            }
          }
        } catch {}
      }, 500); 
    }

    function close() {
      
      backdrop.remove();
      document.removeEventListener("keydown", onKey, true);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }

    
    const tabs = body.querySelectorAll(".tv-danmaku-modal-tab");
    const panels = body.querySelectorAll(".tv-danmaku-modal-panel");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.getAttribute("data-tab");
        tabs.forEach((t) => t.classList.remove("is-active"));
        panels.forEach((p) => p.classList.remove("is-active"));
        tab.classList.add("is-active");
        const targetPanel = body.querySelector(`[data-panel="${tabName}"]`);
        if (targetPanel) targetPanel.classList.add("is-active");
      });
    });

    body.querySelector("#tvLoginBtn")?.addEventListener("click", () => void doLogin());
    body.querySelector("#tvLogoutBtn")?.addEventListener("click", () => void doLogout());
    
    
    nickEl?.addEventListener("input", () => void autoSave());
    areaEl?.addEventListener("change", () => void autoSave());
    speedEl?.addEventListener("input", () => {
      if (speedLabelEl) speedLabelEl.textContent = String(speedEl.value);
      void autoSave();
    });
    
    danmakuEnabledToggle?.addEventListener("click", async () => {
      if (!danmakuEnabledEl) return;
      
      danmakuEnabledEl.checked = !danmakuEnabledEl.checked;
      const newValue = Boolean(danmakuEnabledEl.checked);
      
      if (danmakuEnabledToggle && danmakuEnabledThumb) {
        if (newValue) {
          danmakuEnabledToggle.style.backgroundColor = "rgba(34, 197, 94, 0.8)";
          danmakuEnabledThumb.style.left = "22px";
        } else {
          danmakuEnabledToggle.style.backgroundColor = "rgba(255,255,255,0.2)";
          danmakuEnabledThumb.style.left = "3px";
        }
      }
      
      try {
        const cur = await loadSettings();
        const next = {
          ...cur,
          danmakuEnabled: newValue,
        };
        await saveSettings(next);
        tip("已保存");
      } catch (e) {
        console.error("[tv-danmaku] 保存弹幕开关状态失败:", e);
      }
      
      if (!newValue) {
        try {
          const engine = getDanmakuEngine();
          if (engine?.stop) {
            engine.stop();
          }
        } catch {}
      } else {
        
        try {
          
          if (window.__tvInitDanmakuEngine) {
            
            window.__tvInitDanmakuEngine();
          }
        } catch {}
      }
    });
    
    confettiEnabledToggle?.addEventListener("click", async () => {
      if (!confettiEnabledEl) return;
      
      confettiEnabledEl.checked = !confettiEnabledEl.checked;
      const newValue = Boolean(confettiEnabledEl.checked);
      
      if (confettiEnabledToggle && confettiEnabledThumb) {
        if (newValue) {
          confettiEnabledToggle.style.backgroundColor = "rgba(34, 197, 94, 0.8)";
          confettiEnabledThumb.style.left = "22px";
        } else {
          confettiEnabledToggle.style.backgroundColor = "rgba(255,255,255,0.2)";
          confettiEnabledThumb.style.left = "3px";
        }
      }
      
      try {
        const cur = await loadSettings();
        const next = {
          ...cur,
          confettiEnabled: newValue,
        };
        await saveSettings(next);
        tip("已保存");
      } catch (e) {
        console.error("[tv-danmaku] 保存烟花特效开关状态失败:", e);
      }
    });
    
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    document.addEventListener("keydown", onKey, true);
  }

  
  function startCaRoomWatcher(getSettingsRef, setSettingsRef) {
    
    
    if (window.__tvDanmakuCaWatcherStarted) return;
    
    window.__tvDanmakuCaWatcherStarted = true;

    const ws = getWsModule();
    
    try {
      ws.setAutoReconnect?.(false);
    } catch {
      
    }
    let lastCa = null;
    
    let lastWsState = null;
    
    let lastCheckSeq = 0;
    
    let lastExistsCheckAt = 0;
    
    let lastExists = false;
    
    let checkFailed = false;

    
    ws.on?.("unauthorized", () => {
      const cur = getSettingsRef();
      const next = { ...cur, accessToken: "", expiresAt: 0 };
      setSettingsRef(next);
      void saveSettings(next);
      try {
        openInPageConfigModal(next);
      } catch {
        
      }
    });

    
    try {
      ws.on?.("open", () => {
        if (lastWsState === "open") return;
        lastWsState = "open";
        try {
          getChatModule()?.appendMessage?.({ type: "system", level: "info", text: "WS 已连接", ts: Date.now() });
        } catch {}
      });
      ws.on?.("close", () => {
        if (lastWsState === "close") return;
        lastWsState = "close";
        try {
          getChatModule()?.appendMessage?.({ type: "system", level: "warn", text: "WS 已断开，正在重连…", ts: Date.now() });
        } catch {}
      });
      ws.on?.("error", () => {
        try {
          getChatModule()?.appendMessage?.({ type: "system", level: "error", text: "WS 连接错误：请检查后端是否运行 / 地址是否正确", ts: Date.now() });
        } catch {}
      });
    } catch {
      
    }

    
    
    const seenClientMsgIds = (window.__tvSeenClientMsgIds ||= new Set());
    
    const seenChatMsgIds = (window.__tvSeenChatMsgIds ||= new Set());

    ws.on("message", (msg) => {
      
      if (msg?.type === "chat_message") {
        console.log("[tv-danmaku] 收到 chat_message:", {
          clientMsgId: msg?.clientMsgId,
          text: msg?.text,
          fromAddr: msg?.fromAddr,
          color: msg?.color,
        });
      }

      
      try {
        const chat = getChatModule();
        if (msg?.type === "chat_message" || msg?.type === "system") {
          
          if (msg?.type === "chat_message") {
            const id = msg?.clientMsgId ? String(msg.clientMsgId) : "";
            if (id && seenChatMsgIds.has(id)) {
              
              console.log("[tv-danmaku] 消息已处理过，跳过:", id);
            } else {
              if (id) seenChatMsgIds.add(id);
              chat.appendMessage?.(msg);
            }
          } else {
            
            chat.appendMessage?.(msg);
            
            if (msg?.type === "system" && typeof msg?.onlineCount === "number") {
              try {
                chat.updateOnlineCount?.(msg.onlineCount);
              } catch (e) {
                console.error("[tv-danmaku] 更新在线人数失败:", e);
              }
            }
          }
        }
      } catch (e) {
        console.error("[tv-danmaku] 同步到聊天室面板失败:", e);
      }

      
      try {
        
        const s = getSettingsRef();
        if (s && s.danmakuEnabled === false) {
          return; 
        }
        
        if (msg?.type === "chat_message" && msg?.text) {
          const id = msg?.clientMsgId ? String(msg.clientMsgId) : "";
          
          if (id && seenClientMsgIds.has(id)) {
            console.log("[tv-danmaku] 弹幕消息已处理过，跳过:", id);
            return;
          }
          if (id) {
            seenClientMsgIds.add(id);
            
            if (seenClientMsgIds.size > 500) {
              
              seenClientMsgIds.clear();
              seenClientMsgIds.add(id);
            }
          }
          const addr = String(msg?.fromAddr || "").trim();
          const name = msg?.nickname ? String(msg.nickname) : addr ? defaultNicknameFromAddress(addr) : "匿名";
          
          const validColors = ["#ffffff", "#00CFFF", "#ffdd00", "#FF6B6B"];
          const msgColor = msg?.color && validColors.includes(msg.color) 
            ? msg.color 
            : "#ffffff";
          
          console.log("[tv-danmaku] 发送弹幕到引擎:", {
            text: formatMessage(name, String(msg.text)),
            color: msgColor,
            clientMsgId: id,
          });
          
          const payload = {
            text: formatMessage(name, String(msg.text)),
            meta: { fromAddr: addr, nickname: name },
            color: msgColor,
          };

          let engine = getDanmakuEngine();
          if (!engine) {
            enqueueDanmaku(payload);
            
            
            if (window.__tvInitDanmakuEngine) {
              
              const initSuccess = window.__tvInitDanmakuEngine();
              if (initSuccess) {
                engine = getDanmakuEngine();
              }
            }
            if (!engine) {
              console.warn("[tv-danmaku] 弹幕引擎未初始化，已缓存弹幕等待加载");
              return;
            }
            flushPendingDanmaku();
            return;
          }

          engine.send?.(payload);
        }
      } catch (e) {
        console.error("[tv-danmaku] 同步到弹幕引擎失败:", e);
      }

      if (msg?.type === "system" && msg?.text === "unauthorized") {
        
        const cur = getSettingsRef();
        const next = { ...cur, accessToken: "", expiresAt: 0 };
        setSettingsRef(next);
        void saveSettings(next);
      }
    });

    
    function tick() {
      const route = parseRouteInfo();
      const ca = route ? route.ca : null;
      const caChanged = ca !== lastCa;
      if (caChanged) {
        lastCa = ca;
        lastExists = false;
        lastExistsCheckAt = 0;
        checkFailed = false; 
        ws.disconnect();
        
        
        const s = getSettingsRef();
        if (ca && s.accessToken) {
          const httpBase = s.httpBaseUrl || DEFAULT_HTTP_BASE;
          const mode = s?.uiMode === "danmaku" ? "danmaku" : "comment";
          
          if (mode === "comment") {
            
            
            if (window.__tvLoadCommentsAsDanmaku) {
              
              window.__tvLoadCommentsAsDanmaku(ca, s.accessToken, httpBase).catch(() => {});
            }
            
            
            
            const cm = window.__tvDanmakuComments;
            if (cm) {
              try {
                
                const commentPanel = document.querySelector(".tv-danmaku-comment");
                if (commentPanel instanceof HTMLElement && commentPanel.style.display !== "none") {
                  
                  cm.setHttpBaseUrl?.(httpBase);
                  cm.open?.(ca, String(s.accessToken)).catch(() => {});
                }
              } catch (e) {
                
                console.warn("[tv-danmaku] 重新加载评论区失败:", e);
              }
            }
          }
          
        }
      }
      if (!ca) return;

      
      const s = getSettingsRef();
      if (!s.accessToken || !s.expiresAt || Date.now() >= Number(s.expiresAt) - 30_000) return;

      
      if (checkFailed) return;

      
      const now = Date.now();
      const needPoll = now - lastExistsCheckAt > 2500;
      if (!needPoll) return;
      lastExistsCheckAt = now;

      const seq = ++lastCheckSeq;
      const httpBase = s.httpBaseUrl || DEFAULT_HTTP_BASE;
      void (async () => {
        try {
          const exists = await httpGetRoomExists(ca, s.accessToken, httpBase);
          if (seq !== lastCheckSeq) return;
          lastExists = exists;

          if (!exists) {
            try {
              getChatModule()?.setHint?.("当前无人在线，暂无聊天室；首次发言将创建房间。");
            } catch {}
            return;
          }

          try {
            getChatModule()?.clearHint?.();
          } catch {}

          
          ws.setBaseUrl(s.wsBaseUrl || s.httpBaseUrl || DEFAULT_WS_BASE);
          ws.connect(ca, s.accessToken);
        } catch (e) {
          
          checkFailed = true;
          if (String(e?.message || e) === "unauthorized") {
            const cur = getSettingsRef();
            const next = { ...cur, accessToken: "", expiresAt: 0 };
            setSettingsRef(next);
            void saveSettings(next);
            showToast("登录已过期，请重新登录", "error", 4000);
            try {
              getChatModule()?.setHint?.("登录已过期，请重新登录后再加入/发言。");
            } catch {}
          } else if (String(e?.message || e).startsWith("http_")) {
            
            const status = String(e?.message || e).replace("http_", "");
            if (status === "401") {
              showToast("检查房间状态失败：登录已过期，请重新登录", "error", 4000);
            } else if (Number(status) >= 500) {
              showToast("检查房间状态失败：服务器错误，请稍后重试", "error", 4000);
            } else {
              showToast(`检查房间状态失败：${status}`, "error", 3000);
            }
          } else if (e instanceof TypeError && e.message.includes("fetch")) {
            
            showToast("检查房间状态失败：网络错误，请检查网络连接", "error", 4000);
          } else {
            console.error("[tv-danmaku] httpGetRoomExists error:", e);
          }
          
          console.warn("[tv-danmaku] 房间存在性检查失败，停止后续检查:", e);
        }
      })();
    }

    
    window.setInterval(tick, 1000);
    window.addEventListener("popstate", tick);
    tick();
  }

  
  function startCaRoomWatcher(getSettingsRef, setSettingsRef) {
    
    
    if (window.__tvDanmakuCaWatcherStarted) return;
    
    window.__tvDanmakuCaWatcherStarted = true;

    const ws = getWsModule();
    
    try {
      ws.setAutoReconnect?.(false);
    } catch {
      
    }
    let lastCa = null;
    
    let lastWsState = null;
    
    let lastCheckSeq = 0;
    
    let lastExistsCheckAt = 0;
    
    let lastExists = false;
    
    let checkFailed = false;

    
    ws.on?.("unauthorized", () => {
      const cur = getSettingsRef();
      const next = { ...cur, accessToken: "", expiresAt: 0 };
      setSettingsRef(next);
      void saveSettings(next);
      try {
        openInPageConfigModal(next);
      } catch {
        
      }
    });

    
    try {
      ws.on?.("open", () => {
        if (lastWsState === "open") return;
        lastWsState = "open";
        try {
          getChatModule()?.appendMessage?.({ type: "system", level: "info", text: "WS 已连接", ts: Date.now() });
        } catch {}
      });
      ws.on?.("close", () => {
        if (lastWsState === "close") return;
        lastWsState = "close";
        try {
          getChatModule()?.appendMessage?.({ type: "system", level: "warn", text: "WS 已断开，正在重连…", ts: Date.now() });
        } catch {}
      });
      ws.on?.("error", () => {
        try {
          getChatModule()?.appendMessage?.({ type: "system", level: "error", text: "WS 连接错误：请检查后端是否运行 / 地址是否正确", ts: Date.now() });
        } catch {}
      });
    } catch {
      
    }

    
    
    const seenClientMsgIds = (window.__tvSeenClientMsgIds ||= new Set());
    
    const seenChatMsgIds = (window.__tvSeenChatMsgIds ||= new Set());

    ws.on("message", (msg) => {
      
      if (msg?.type === "chat_message") {
        console.log("[tv-danmaku] 收到 chat_message:", {
          clientMsgId: msg?.clientMsgId,
          text: msg?.text,
          fromAddr: msg?.fromAddr,
          color: msg?.color,
        });
      }

      
      try {
        const chat = getChatModule();
        if (msg?.type === "chat_message" || msg?.type === "system") {
          
          if (msg?.type === "chat_message") {
            const id = msg?.clientMsgId ? String(msg.clientMsgId) : "";
            if (id && seenChatMsgIds.has(id)) {
              
              console.log("[tv-danmaku] 消息已处理过，跳过:", id);
            } else {
              if (id) seenChatMsgIds.add(id);
              chat.appendMessage?.(msg);
            }
          } else {
            
            chat.appendMessage?.(msg);
            
            if (msg?.type === "system" && typeof msg?.onlineCount === "number") {
              try {
                chat.updateOnlineCount?.(msg.onlineCount);
              } catch (e) {
                console.error("[tv-danmaku] 更新在线人数失败:", e);
              }
            }
          }
        }
      } catch (e) {
        console.error("[tv-danmaku] 同步到聊天室面板失败:", e);
      }

      
      try {
        
        const s = getSettingsRef();
        if (s && s.danmakuEnabled === false) {
          return; 
        }
        
        if (msg?.type === "chat_message" && msg?.text) {
          const id = msg?.clientMsgId ? String(msg.clientMsgId) : "";
          
          if (id && seenClientMsgIds.has(id)) {
            console.log("[tv-danmaku] 弹幕消息已处理过，跳过:", id);
            return;
          }
          if (id) {
            seenClientMsgIds.add(id);
            
            if (seenClientMsgIds.size > 500) {
              
              seenClientMsgIds.clear();
              seenClientMsgIds.add(id);
            }
          }
          const addr = String(msg?.fromAddr || "").trim();
          const name = msg?.nickname ? String(msg.nickname) : addr ? defaultNicknameFromAddress(addr) : "匿名";
          
          const validColors = ["#ffffff", "#00CFFF", "#ffdd00", "#FF6B6B"];
          const msgColor = msg?.color && validColors.includes(msg.color) 
            ? msg.color 
            : "#ffffff";
          
          console.log("[tv-danmaku] 发送弹幕到引擎:", {
            text: formatMessage(name, String(msg.text)),
            color: msgColor,
            clientMsgId: id,
          });
          
          const payload = {
            text: formatMessage(name, String(msg.text)),
            meta: { fromAddr: addr, nickname: name },
            color: msgColor,
          };

          let engine = getDanmakuEngine();
          if (!engine) {
            enqueueDanmaku(payload);
            
            
            if (window.__tvInitDanmakuEngine) {
              
              const initSuccess = window.__tvInitDanmakuEngine();
              if (initSuccess) {
                engine = getDanmakuEngine();
              }
            }
            if (!engine) {
              console.warn("[tv-danmaku] 弹幕引擎未初始化，已缓存弹幕等待加载");
              return;
            }
            flushPendingDanmaku();
            return;
          }

          engine.send?.(payload);
        }
      } catch (e) {
        console.error("[tv-danmaku] 同步到弹幕引擎失败:", e);
      }

      if (msg?.type === "system" && msg?.text === "unauthorized") {
        
        const cur = getSettingsRef();
        const next = { ...cur, accessToken: "", expiresAt: 0 };
        setSettingsRef(next);
        void saveSettings(next);
      }
    });

    
    function tick() {
      const route = parseRouteInfo();
      const ca = route ? route.ca : null;
      const caChanged = ca !== lastCa;
      if (caChanged) {
        lastCa = ca;
        lastExists = false;
        lastExistsCheckAt = 0;
        checkFailed = false; 
        ws.disconnect();
        
        
        const s = getSettingsRef();
        if (ca && s.accessToken) {
          const httpBase = s.httpBaseUrl || DEFAULT_HTTP_BASE;
          const mode = s?.uiMode === "danmaku" ? "danmaku" : "comment";
          
          if (mode === "comment") {
            
            
            if (window.__tvLoadCommentsAsDanmaku) {
              
              window.__tvLoadCommentsAsDanmaku(ca, s.accessToken, httpBase).catch(() => {});
            }
            
            
            
            const cm = window.__tvDanmakuComments;
            if (cm) {
              try {
                
                const commentPanel = document.querySelector(".tv-danmaku-comment");
                if (commentPanel instanceof HTMLElement && commentPanel.style.display !== "none") {
                  
                  cm.setHttpBaseUrl?.(httpBase);
                  cm.open?.(ca, String(s.accessToken)).catch(() => {});
                }
              } catch (e) {
                
                console.warn("[tv-danmaku] 重新加载评论区失败:", e);
              }
            }
          }
          
        }
      }
      if (!ca) return;

      
      const s = getSettingsRef();
      if (!s.accessToken || !s.expiresAt || Date.now() >= Number(s.expiresAt) - 30_000) return;

      
      if (checkFailed) return;

      
      const now = Date.now();
      const needPoll = now - lastExistsCheckAt > 2500;
      if (!needPoll) return;
      lastExistsCheckAt = now;

      const seq = ++lastCheckSeq;
      const httpBase = s.httpBaseUrl || DEFAULT_HTTP_BASE;
      void (async () => {
        try {
          const exists = await httpGetRoomExists(ca, s.accessToken, httpBase);
          if (seq !== lastCheckSeq) return;
          lastExists = exists;

          if (!exists) {
            try {
              getChatModule()?.setHint?.("当前无人在线，暂无聊天室；首次发言将创建房间。");
            } catch {}
            return;
          }

          try {
            getChatModule()?.clearHint?.();
          } catch {}

          
          ws.setBaseUrl(s.wsBaseUrl || s.httpBaseUrl || DEFAULT_WS_BASE);
          ws.connect(ca, s.accessToken);
        } catch (e) {
          
          checkFailed = true;
          if (String(e?.message || e) === "unauthorized") {
            const cur = getSettingsRef();
            const next = { ...cur, accessToken: "", expiresAt: 0 };
            setSettingsRef(next);
            void saveSettings(next);
            showToast("登录已过期，请重新登录", "error", 4000);
            try {
              getChatModule()?.setHint?.("登录已过期，请重新登录后再加入/发言。");
            } catch {}
          } else if (String(e?.message || e).startsWith("http_")) {
            
            const status = String(e?.message || e).replace("http_", "");
            if (status === "401") {
              showToast("检查房间状态失败：登录已过期，请重新登录", "error", 4000);
            } else if (Number(status) >= 500) {
              showToast("检查房间状态失败：服务器错误，请稍后重试", "error", 4000);
            } else {
              showToast(`检查房间状态失败：${status}`, "error", 3000);
            }
          } else if (e instanceof TypeError && e.message.includes("fetch")) {
            
            showToast("检查房间状态失败：网络错误，请检查网络连接", "error", 4000);
          } else {
            console.error("[tv-danmaku] httpGetRoomExists error:", e);
          }
          
          console.warn("[tv-danmaku] 房间存在性检查失败，停止后续检查:", e);
        }
      })();
    }

    
    window.setInterval(tick, 1000);
    window.addEventListener("popstate", tick);
    tick();
  }


  
  function startCaRoomWatcher(getSettingsRef, setSettingsRef) {
    
    
    if (window.__tvDanmakuCaWatcherStarted) return;
    
    window.__tvDanmakuCaWatcherStarted = true;

    const ws = getWsModule();
    
    try {
      ws.setAutoReconnect?.(false);
    } catch {
      
    }
    let lastCa = null;
    
    let lastWsState = null;
    
    let lastCheckSeq = 0;
    
    let lastExistsCheckAt = 0;
    
    let lastExists = false;
    
    let checkFailed = false;

    
    ws.on?.("unauthorized", () => {
      const cur = getSettingsRef();
      const next = { ...cur, accessToken: "", expiresAt: 0 };
      setSettingsRef(next);
      void saveSettings(next);
      try {
        openInPageConfigModal(next);
      } catch {
        
      }
    });

    
    try {
      ws.on?.("open", () => {
        if (lastWsState === "open") return;
        lastWsState = "open";
        try {
          getChatModule()?.appendMessage?.({ type: "system", level: "info", text: "WS 已连接", ts: Date.now() });
        } catch {}
      });
      ws.on?.("close", () => {
        if (lastWsState === "close") return;
        lastWsState = "close";
        try {
          getChatModule()?.appendMessage?.({ type: "system", level: "warn", text: "WS 已断开，正在重连…", ts: Date.now() });
        } catch {}
      });
      ws.on?.("error", () => {
        try {
          getChatModule()?.appendMessage?.({ type: "system", level: "error", text: "WS 连接错误：请检查后端是否运行 / 地址是否正确", ts: Date.now() });
        } catch {}
      });
    } catch {
      
    }

    
    
    const seenClientMsgIds = (window.__tvSeenClientMsgIds ||= new Set());
    
    const seenChatMsgIds = (window.__tvSeenChatMsgIds ||= new Set());

    ws.on("message", (msg) => {
      
      if (msg?.type === "chat_message") {
        console.log("[tv-danmaku] 收到 chat_message:", {
          clientMsgId: msg?.clientMsgId,
          text: msg?.text,
          fromAddr: msg?.fromAddr,
          color: msg?.color,
        });
      }

      
      try {
        const chat = getChatModule();
        if (msg?.type === "chat_message" || msg?.type === "system") {
          
          if (msg?.type === "chat_message") {
            const id = msg?.clientMsgId ? String(msg.clientMsgId) : "";
            if (id && seenChatMsgIds.has(id)) {
              
              console.log("[tv-danmaku] 消息已处理过，跳过:", id);
            } else {
              if (id) seenChatMsgIds.add(id);
              chat.appendMessage?.(msg);
            }
          } else {
            
            chat.appendMessage?.(msg);
            
            if (msg?.type === "system" && typeof msg?.onlineCount === "number") {
              try {
                chat.updateOnlineCount?.(msg.onlineCount);
              } catch (e) {
                console.error("[tv-danmaku] 更新在线人数失败:", e);
              }
            }
          }
        }
      } catch (e) {
        console.error("[tv-danmaku] 同步到聊天室面板失败:", e);
      }

      
      try {
        
        const s = getSettingsRef();
        if (s && s.danmakuEnabled === false) {
          return; 
        }
        
        if (msg?.type === "chat_message" && msg?.text) {
          const id = msg?.clientMsgId ? String(msg.clientMsgId) : "";
          
          if (id && seenClientMsgIds.has(id)) {
            console.log("[tv-danmaku] 弹幕消息已处理过，跳过:", id);
            return;
          }
          if (id) {
            seenClientMsgIds.add(id);
            
            if (seenClientMsgIds.size > 500) {
              
              seenClientMsgIds.clear();
              seenClientMsgIds.add(id);
            }
          }
          const addr = String(msg?.fromAddr || "").trim();
          const name = msg?.nickname ? String(msg.nickname) : addr ? defaultNicknameFromAddress(addr) : "匿名";
          
          const validColors = ["#ffffff", "#00CFFF", "#ffdd00", "#FF6B6B"];
          const msgColor = msg?.color && validColors.includes(msg.color) 
            ? msg.color 
            : "#ffffff";
          
          console.log("[tv-danmaku] 发送弹幕到引擎:", {
            text: formatMessage(name, String(msg.text)),
            color: msgColor,
            clientMsgId: id,
          });
          
          const payload = {
            text: formatMessage(name, String(msg.text)),
            meta: { fromAddr: addr, nickname: name },
            color: msgColor,
          };

          let engine = getDanmakuEngine();
          if (!engine) {
            enqueueDanmaku(payload);
            
            
            if (window.__tvInitDanmakuEngine) {
              
              const initSuccess = window.__tvInitDanmakuEngine();
              if (initSuccess) {
                engine = getDanmakuEngine();
              }
            }
            if (!engine) {
              console.warn("[tv-danmaku] 弹幕引擎未初始化，已缓存弹幕等待加载");
              return;
            }
            flushPendingDanmaku();
            return;
          }

          engine.send?.(payload);
        }
      } catch (e) {
        console.error("[tv-danmaku] 同步到弹幕引擎失败:", e);
      }

      if (msg?.type === "system" && msg?.text === "unauthorized") {
        
        const cur = getSettingsRef();
        const next = { ...cur, accessToken: "", expiresAt: 0 };
        setSettingsRef(next);
        void saveSettings(next);
      }
    });

    
    function tick() {
      const route = parseRouteInfo();
      const ca = route ? route.ca : null;
      const caChanged = ca !== lastCa;
      if (caChanged) {
        lastCa = ca;
        lastExists = false;
        lastExistsCheckAt = 0;
        checkFailed = false; 
        ws.disconnect();
        
        
        const s = getSettingsRef();
        if (ca && s.accessToken) {
          const httpBase = s.httpBaseUrl || DEFAULT_HTTP_BASE;
          const mode = s?.uiMode === "danmaku" ? "danmaku" : "comment";
          
          if (mode === "comment") {
            
            
            if (window.__tvLoadCommentsAsDanmaku) {
              
              window.__tvLoadCommentsAsDanmaku(ca, s.accessToken, httpBase).catch(() => {});
            }
            
            
            
            const cm = window.__tvDanmakuComments;
            if (cm) {
              try {
                
                const commentPanel = document.querySelector(".tv-danmaku-comment");
                if (commentPanel instanceof HTMLElement && commentPanel.style.display !== "none") {
                  
                  cm.setHttpBaseUrl?.(httpBase);
                  cm.open?.(ca, String(s.accessToken)).catch(() => {});
                }
              } catch (e) {
                
                console.warn("[tv-danmaku] 重新加载评论区失败:", e);
              }
            }
          }
          
        }
      }
      if (!ca) return;

      
      const s = getSettingsRef();
      if (!s.accessToken || !s.expiresAt || Date.now() >= Number(s.expiresAt) - 30_000) return;

      
      const now = Date.now();
      const needPoll = now - lastExistsCheckAt > 2500;
      if (!needPoll) return;
      lastExistsCheckAt = now;

      const seq = ++lastCheckSeq;
      const httpBase = s.httpBaseUrl || DEFAULT_HTTP_BASE;
      void (async () => {
        try {
          const exists = await httpGetRoomExists(ca, s.accessToken, httpBase);
          if (seq !== lastCheckSeq) return;
          lastExists = exists;

          if (!exists) {
            try {
              getChatModule()?.setHint?.("当前无人在线，暂无聊天室；首次发言将创建房间。");
            } catch {}
            return;
          }

          try {
            getChatModule()?.clearHint?.();
          } catch {}

          
          ws.setBaseUrl(s.wsBaseUrl || s.httpBaseUrl || DEFAULT_WS_BASE);
          ws.connect(ca, s.accessToken);
        } catch (e) {
          
          checkFailed = true;
          if (String(e?.message || e) === "unauthorized") {
            const cur = getSettingsRef();
            const next = { ...cur, accessToken: "", expiresAt: 0 };
            setSettingsRef(next);
            void saveSettings(next);
            showToast("登录已过期，请重新登录", "error", 4000);
            try {
              getChatModule()?.setHint?.("登录已过期，请重新登录后再加入/发言。");
            } catch {}
          } else if (String(e?.message || e).startsWith("http_")) {
            
            const status = String(e?.message || e).replace("http_", "");
            if (status === "401") {
              showToast("检查房间状态失败：登录已过期，请重新登录", "error", 4000);
            } else if (Number(status) >= 500) {
              showToast("检查房间状态失败：服务器错误，请稍后重试", "error", 4000);
            } else {
              showToast(`检查房间状态失败：${status}`, "error", 3000);
            }
          } else if (e instanceof TypeError && e.message.includes("fetch")) {
            
            showToast("检查房间状态失败：网络错误，请检查网络连接", "error", 4000);
          } else {
            console.error("[tv-danmaku] httpGetRoomExists error:", e);
          }
          
          console.warn("[tv-danmaku] 房间存在性检查失败，停止后续检查:", e);
        }
      })();
    }

    
    window.setInterval(tick, 1000);
    window.addEventListener("popstate", tick);
    tick();
  }


  
  function watchForLateContainer() {
    
    let obs = null;
    
    let pollTimer = 0;

    
    const start = Date.now();

    function stop() {
      if (obs) {
        obs.disconnect();
        obs = null;
      }
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = 0;
      }
    }

    
    function tryInit() {
      if (Date.now() - start > 15000) {
        stop();
        return;
      }
      const container = pickBestContainer(findTradingViewCandidates());
      if (!container) return;
      stop();
      
      document.documentElement.removeAttribute(EXT_ROOT_ATTR);
      init();
    }

    obs = new MutationObserver(() => {
      tryInit();
    });

    obs.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });
    pollTimer = window.setInterval(tryInit, 500);
    window.setTimeout(stop, 16000);
    tryInit();
  }

  
  function cleanup() {
    try {
      if (stopFollow) {
        stopFollow();
        stopFollow = null;
      }

      
      const engine = getDanmakuEngine();
      if (engine) {
        engine.stop?.();
      }
      
      
      const player = window.__tvDanmakuPlayer;
      if (player && typeof player.clear === "function") {
        player.clear();
      }
      
      
      if (window.__tvDanmakuMetaMap) {
        
        window.__tvDanmakuMetaMap = {};
      }
      
      const ws = getWsModule();
      if (ws) {
        ws.disconnect?.();
      }
      
      
      if (window.__tvDanmakuCaWatcherStarted) {
        
        window.__tvDanmakuCaWatcherStarted = false;
      }
      
      if (window.__tvSeenClientMsgIds) {
        
        window.__tvSeenClientMsgIds.clear();
      }
      
      if (window.__tvSeenChatMsgIds) {
        
        window.__tvSeenChatMsgIds.clear();
      }
      resetDanmakuEngineState();
    } catch {
      
    }
  }

  
  function cleanupDomArtifacts() {
    const selectors = [
      ".tv-danmaku-host",
      ".tv-danmaku-ui",
      ".tv-danmaku-chat",
      ".tv-danmaku-comment",
      ".tv-danmaku-modal-backdrop",
      ".tv-danmaku-toast-container",
      ".tv-danmaku-hover-tip",
      ".tv-danmaku-chat-menu",
      ".tv-danmaku-comment-menu",
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }
  }

  
  function watchUrlChange() {
    const getRouteForWatch = () => (window === window.top ? parseRouteInfoStrict() : parseRouteInfo());
    let lastRoute = getRouteForWatch();
    let initTimer = null;

    
    function checkAndReinit() {
      const currentRoute = getRouteForWatch();
      const routeChanged =
        (lastRoute === null && currentRoute !== null) || 
        (lastRoute !== null && currentRoute === null) || 
        (lastRoute !== null && currentRoute !== null && lastRoute.ca !== currentRoute.ca); 

      if (routeChanged) {
        const prevRoute = lastRoute;
        lastRoute = currentRoute;

        
        if (prevRoute !== null) {
          cleanup();
        }

        
        if (prevRoute !== null && currentRoute === null) {
          cleanupDomArtifacts();
          document.documentElement.removeAttribute(EXT_ROOT_ATTR);
          
          window.__tvDanmakuCaWatcherStarted = false;
        }

        
        if (currentRoute !== null) {
          
          if (initTimer) {
            clearTimeout(initTimer);
          }
          
          initTimer = window.setTimeout(() => {
            
            document.documentElement.removeAttribute(EXT_ROOT_ATTR);
            
            window.__tvDanmakuCaWatcherStarted = false;
            init();
          }, 100);
        }
      }
    }

    
    window.addEventListener("popstate", checkAndReinit);

    
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(checkAndReinit, 50);
    };
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkAndReinit, 50);
    };

    
    window.setInterval(checkAndReinit, 1000);
  }

  
  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("unload", cleanup);
  
  watchUrlChange();

  
  init();
})();
