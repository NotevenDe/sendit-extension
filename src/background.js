

const STORAGE_KEY = "tv_danmaku_settings_v1";


async function loadSettings() {
  const res = await chrome.storage.local.get([STORAGE_KEY]);
  return res?.[STORAGE_KEY] || {};
}


async function saveSettings(s) {
  await chrome.storage.local.set({ [STORAGE_KEY]: s });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  
  if (msg?.type === "open_side_panel") {
    
    
    sendResponse({ ok: false, error: "must_call_from_user_gesture_in_popup" });
    return false;
  }

  
  if (msg?.type === "inject_okx_sol_bridge") {
    (async () => {
      const tabId = _sender?.tab?.id;
      if (!tabId) {
        sendResponse({ ok: false, error: "no_sender_tab" });
        return;
      }
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          world: "MAIN",
          files: ["src/inject/okx_sol_bridge.js"],
        });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: "inject_failed", detail: String(e?.message || e) });
      }
    })();
    return true;
  }

  if (msg?.type !== "login_via_okx") return;

  (async () => {
    const settings = await loadSettings();
    

    
    const tabId = _sender?.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: "no_sender_tab" });
      return;
    }

    const httpBaseUrl = settings.httpBaseUrl || "https://sendit.opsat.io";

    
    async function saveResp(resp) {
      const next = {
        ...settings,
        accessToken: resp.key,
        jawKey: resp.key,
        expiresAt: resp.expiresAt,
        address: resp.address,
        loggedInAt: Date.now(),
      };
      await saveSettings(next);
    }

    
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: async () => {
          const solProv = window.okxwallet?.solana || null;
          if (solProv?.connect && solProv?.signMessage) {
            const ts = Date.now();
            await solProv.connect();
            const pubkey = String(solProv.publicKey?.toBase58?.() || "");
            if (!pubkey) return { ok: false, error: "no_pubkey" };
            const message = `${pubkey}:${ts}`;
            const enc = new TextEncoder();
            const signed = await solProv.signMessage(enc.encode(message), "utf8");
            const sigBytes = signed?.signature;
            if (!sigBytes) return { ok: false, error: "sign_failed" };
            const b64 = btoa(String.fromCharCode(...sigBytes));
            return { ok: true, kind: "sol", pubkey, ts, signatureB64: b64 };
          }
          return { ok: false, error: "no_solana_provider" };
        },
      });

      const signed = results?.[0]?.result;
      if (!signed?.ok) {
        sendResponse(signed || { ok: false, error: "no_okx_provider" });
        return;
      }

      let resp = null;
      if (signed.kind === "sol") {
        const res = await fetch(`${httpBaseUrl}/auth/okx/sol/verify`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pubkey: signed.pubkey, ts: signed.ts, signatureB64: signed.signatureB64 }),
        });
        if (!res.ok) {
          sendResponse({ ok: false, error: "backend_verify_failed" });
          return;
        }
        const js = await res.json(); 
        resp = { ok: true, address: String(js.pubkey || signed.pubkey), key: String(js.key || ""), expiresAt: Number(js.expiresAt || 0) };
      } else {
        sendResponse({ ok: false, error: "no_solana_provider" });
        return;
      }

      if (!resp.key || !resp.expiresAt) {
        sendResponse({ ok: false, error: "bad_backend_response" });
        return;
      }
      await saveResp(resp);
      sendResponse(resp);
    } catch {
      sendResponse({ ok: false, error: "execute_script_failed" });
    }
  })();

  
  return true;
});


