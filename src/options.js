

const STORAGE_KEY = "tv_danmaku_settings_v1";



const DEFAULT_SETTINGS = {
  direction: "rtl",
  lanes: 0,
  speedPxPerSec: 220,
  fontSizePx: 16,
  opacity: 0.92,
  color: "#ffffff",
  strokeWidth: 3,
  strokeColor: "rgba(0,0,0,0.55)",
  backgroundAlpha: 0.22,
  
  nickname: "",
  avatarDataUrl: "",
  
  jawKey: "",
  accessToken: "",
  expiresAt: 0,
  address: "",
  httpBaseUrl: "https://sendit.opsat.io",
  wsBaseUrl: "wss://sendit.opsat.io",
  wcProjectId: "",
  loggedInAt: 0,
  confettiEnabled: true,
};


async function load() {
  const res = await chrome.storage.local.get([STORAGE_KEY]);
  return { ...DEFAULT_SETTINGS, ...(res?.[STORAGE_KEY] || {}) };
}


async function save(s) {
  await chrome.storage.local.set({ [STORAGE_KEY]: s });
}


function devKey(text) {
  const seed = `${Date.now()}-${Math.random()}-${text || ""}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `jaw_test_${(h >>> 0).toString(16)}`;
}


function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(new Error("read failed"));
    fr.readAsDataURL(file);
  });
}


function setLoginBadge(ok) {
  const el = document.getElementById("loginBadge");
  if (!el) return;
  el.textContent = ok ? "已登录" : "未登录";
  el.style.color = ok ? "rgba(34,197,94,0.95)" : "rgba(248,113,113,0.95)";
}


function tip(msg) {
  const el = document.getElementById("saveTip");
  if (!el) return;
  el.textContent = msg;
}


function bind() {
  
  const jawKey = document.getElementById("jawKey");
  
  const nickname = document.getElementById("nickname");
  
  const avatarFile = document.getElementById("avatarFile");
  
  const avatarPreview = document.getElementById("avatarPreview");

  
  

  
  const btnSave = document.getElementById("btnSave");
  
  const btnReset = document.getElementById("btnReset");
  
  const btnLogin = document.getElementById("btnLogin");
  
  const btnLogout = document.getElementById("btnLogout");

  const loginSection = document.getElementById("loginSection");
  const profileSection = document.getElementById("profileSection");

  
  let state = { ...DEFAULT_SETTINGS };

  
  function collect() {
    return {
      ...state,
      jawKey: String(jawKey?.value || "").trim(),
      accessToken: String(jawKey?.value || "").trim(),
      nickname: String(nickname?.value || "").trim().slice(0, 16) || "我",
    };
  }

  
  function fill(s) {
    state = { ...DEFAULT_SETTINGS, ...s };
    jawKey.value = state.accessToken || state.jawKey || "";
    nickname.value = state.nickname || "我";
    avatarPreview.src = state.avatarDataUrl || "";
    const expiresAt = Number(state.expiresAt || 0);
    const ok = Boolean(state.accessToken || state.jawKey) && expiresAt > Date.now() + 5_000;
    setLoginBadge(ok);
    if (loginSection) loginSection.style.display = ok ? "none" : "block";
    if (profileSection) profileSection.style.display = ok ? "block" : "none";
    tip("");
  }

  btnSave.addEventListener("click", async () => {
    const next = collect();
    if (!next.accessToken) {
      tip("请先连接钱包登录后再保存。");
      setLoginBadge(false);
      return;
    }
    next.loggedInAt = Date.now();
    await save(next);
    fill(next);
    tip("已保存。返回图表页面刷新即可生效。");
  });

  btnReset.addEventListener("click", async () => {
    const keep = {
      ...DEFAULT_SETTINGS,
      accessToken: state.accessToken || state.jawKey || "",
      jawKey: state.accessToken || state.jawKey || "",
      expiresAt: state.expiresAt || 0,
      address: state.address || "",
      wcProjectId: state.wcProjectId || "",
      avatarDataUrl: state.avatarDataUrl || "",
    };
    await save(keep);
    fill(keep);
    tip("已恢复默认（保留 jaw key / 头像）。");
  });

  

  async function startWalletLogin() {
    tip("请在已打开的 OKX/GMGN/pump/binance 页面中点击（确保页面里有 OKX Wallet 注入），正在请求签名…");
    chrome.runtime.sendMessage({ type: "login_via_okx" }, (resp) => {
      const err = chrome.runtime.lastError;
      if (err) {
        tip("登录失败：扩展通信异常。");
        return;
      }
      if (!resp?.ok) {
        const e = resp?.error || "unknown";
        if (e === "no_supported_tab") {
          tip("登录失败：请先打开一个支持的页面（OKX/GMGN/pump/binance）。");
          return;
        }
        if (e === "no_okx_provider") {
          tip("登录失败：未检测到 OKX Wallet 注入。请确认该站点已允许 OKX 扩展访问并刷新页面；Solana 页面需允许 okxwallet.solana 注入。");
          return;
        }
        if (e === "execute_script_failed") {
          tip("登录失败：无法在页面执行签名脚本。请检查扩展权限（scripting）并重新加载扩展后再试。");
          return;
        }
        if (e === "no_pubkey") {
          tip("登录失败：未拿到 Solana 公钥（请在 OKX Wallet 中完成连接）。");
          return;
        }
        tip(`登录失败：${e}`);
        return;
      }

      jawKey.value = String(resp.key || "");
      state = { ...state, accessToken: String(resp.key || ""), jawKey: String(resp.key || "") };
      state.expiresAt = Number(resp.expiresAt || 0);
      state.address = String(resp.address || "");
      setLoginBadge(true);
      tip("登录成功，记得点保存。");
    });
  }

  btnLogin.addEventListener("click", () => {
    void startWalletLogin();
  });

  btnLogout.addEventListener("click", async () => {
    const next = { ...state, accessToken: "", jawKey: "", expiresAt: 0, address: "" };
    await save(next);
    fill(next);
    tip("已退出登录。");
  });

  avatarFile.addEventListener("change", async () => {
    const f = avatarFile.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    state = { ...state, avatarDataUrl: dataUrl };
    avatarPreview.src = dataUrl;
    tip("头像已选择（记得点保存）。");
  });

  
  load().then(fill);
}

bind();


