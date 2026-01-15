

(() => {
  
  if (window.__tvOkxSolBridgeInstalled) return;
  window.__tvOkxSolBridgeInstalled = true;

  
  function reply(payload) {
    try {
      window.postMessage(payload, "*");
    } catch {
      
    }
  }

  window.addEventListener(
    "message",
    async (ev) => {
      const data = ev?.data;
      if (!data || data.type !== "TV_OKX_SOL_SIGN_REQUEST") return;

      const requestId = String(data.requestId || "");
      if (!requestId) return;

      try {
        
        const solProv = window.okxwallet?.solana || null;
        if (!solProv?.connect || !solProv?.signMessage) {
          reply({ type: "TV_OKX_SOL_SIGN_RESULT", requestId, ok: false, error: "no_solana_provider" });
          return;
        }

        const ts = Date.now();
        await solProv.connect();
        const pubkey = String(solProv.publicKey?.toBase58?.() || "");
        if (!pubkey) {
          reply({ type: "TV_OKX_SOL_SIGN_RESULT", requestId, ok: false, error: "no_pubkey" });
          return;
        }

        const message = `${pubkey}:${ts}`;
        const enc = new TextEncoder();
        const signed = await solProv.signMessage(enc.encode(message), "utf8");
        const sigBytes = signed?.signature;
        if (!sigBytes) {
          reply({ type: "TV_OKX_SOL_SIGN_RESULT", requestId, ok: false, error: "sign_failed" });
          return;
        }

        
        const signatureB64 = btoa(String.fromCharCode(...sigBytes));
        reply({
          type: "TV_OKX_SOL_SIGN_RESULT",
          requestId,
          ok: true,
          pubkey,
          ts,
          signatureB64,
        });
      } catch (e) {
        reply({
          type: "TV_OKX_SOL_SIGN_RESULT",
          requestId,
          ok: false,
          error: "exception",
          detail: String(e?.message || e),
        });
      }
    },
    false,
  );
})();


