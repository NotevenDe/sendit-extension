


function renderDanmakuPanel(settings, options = {}) {
  const {
    showEnabledToggle = true,
    showColorPresets = true,
    showColorPicker = false,
    showGapControl = false,
    defaultSpeed = 70,
    speedMin = 20,
    speedMax = 520,
  } = options;

  const danmakuEnabled = settings.danmakuEnabled !== false;
  const confettiEnabled = settings.confettiEnabled !== false;
  const speed = Number(settings.speedPxPerSec || defaultSpeed);
  const gap = Number(settings.lanes || 0);
  const color = String(settings.color || "#ffffff");
  const area = settings.danmakuArea || "full";

  return `
    <div class="tv-danmaku-modal-panel" data-panel="danmaku">
      ${showEnabledToggle ? `
        <div style="margin-top: 12px;">
          <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; color: rgba(255,255,255,0.68); font-size: 13px;">
            <span>启用弹幕</span>
            <div style="position: relative; display: inline-block; width: 44px; height: 24px; margin: 0;">
              <input type="checkbox" id="tvDanmakuEnabled" style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;" ${danmakuEnabled ? "checked" : ""} />
              <span id="tvDanmakuEnabledToggle" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${danmakuEnabled ? "rgba(34, 197, 94, 0.8)" : "rgba(255,255,255,0.2)"}; transition: 0.3s; border-radius: 24px; z-index: 1;">
                <span id="tvDanmakuEnabledThumb" style="position: absolute; content: ''; height: 18px; width: 18px; left: ${danmakuEnabled ? "22px" : "3px"}; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
              </span>
            </div>
          </label>
          <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px;">关闭后将停止显示弹幕和自动加载评论</div>
        </div>
      ` : ''}
      
      ${showEnabledToggle ? `
        <div style="margin-top: 12px;">
          <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; color: rgba(255,255,255,0.68); font-size: 13px;">
            <span>文字烟花特效</span>
            <div style="position: relative; display: inline-block; width: 44px; height: 24px; margin: 0;">
              <input type="checkbox" id="tvConfettiEnabled" style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;" ${confettiEnabled ? "checked" : ""} />
              <span id="tvConfettiEnabledToggle" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${confettiEnabled ? "rgba(34, 197, 94, 0.8)" : "rgba(255,255,255,0.2)"}; transition: 0.3s; border-radius: 24px; z-index: 1;">
                <span id="tvConfettiEnabledThumb" style="position: absolute; content: ''; height: 18px; width: 18px; left: ${confettiEnabled ? "22px" : "3px"}; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
              </span>
            </div>
          </label>
          <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px;">关闭后打字时将不显示烟花特效</div>
        </div>
      ` : ''}
      
      ${showColorPresets ? `
        <div style="margin-top: 12px;">
          <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.68); font-size: 13px;">颜色</label>
          <div id="tvColorPicker" style="display: flex; gap: 10px; align-items: center;">
            <button type="button" class="tv-color-dot" data-color="#ffffff" style="width: 24px; height: 24px; border-radius: 50%; background: #ffffff; border: 2px solid rgba(255,255,255,0.3); cursor: pointer; position: relative;" title="白色">
              <svg style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 14px; height: 14px; display: ${color === "#ffffff" ? "block" : "none"}; pointer-events: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </button>
            <button type="button" class="tv-color-dot" data-color="#00CFFF" style="width: 24px; height: 24px; border-radius: 50%; background: #00CFFF; border: 2px solid rgba(255,255,255,0.3); cursor: pointer; position: relative;" title="蓝色">
              <svg style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 14px; height: 14px; display: ${color === "#00CFFF" ? "block" : "none"}; pointer-events: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </button>
            <button type="button" class="tv-color-dot" data-color="#ffdd00" style="width: 24px; height: 24px; border-radius: 50%; background: #ffdd00; border: 2px solid rgba(255,255,255,0.3); cursor: pointer; position: relative;" title="黄色">
              <svg style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 14px; height: 14px; display: ${color === "#ffdd00" ? "block" : "none"}; pointer-events: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </button>
            <button type="button" class="tv-color-dot" data-color="#FF6B6B" style="width: 24px; height: 24px; border-radius: 50%; background: #FF6B6B; border: 2px solid rgba(255,255,255,0.3); cursor: pointer; position: relative;" title="红色">
              <svg style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 14px; height: 14px; display: ${color === "#FF6B6B" ? "block" : "none"}; pointer-events: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </button>
          </div>
        </div>
      ` : ''}
      
      ${showColorPicker ? `
        <div style="margin-top: 12px;">
          <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.68); font-size: 13px;">颜色</label>
          <input type="color" id="tvColor" value="${color}" class="tv-danmaku-modal-input" style="height: 40px; padding: 4px;" />
        </div>
      ` : ''}
      
      <div style="margin-top: 12px;">
        <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.68); font-size: 13px;">弹幕位置</label>
        <select id="tvDanmakuArea" class="tv-danmaku-modal-input">
          <option value="full" ${area === "full" ? "selected" : ""}>全屏</option>
          <option value="top" ${area === "top" ? "selected" : ""}>上层</option>
          <option value="middle" ${area === "middle" ? "selected" : ""}>中层</option>
          <option value="bottom" ${area === "bottom" ? "selected" : ""}>下层</option>
        </select>
      </div>
      
      <div style="margin-top: 12px;">
        <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.68); font-size: 13px;">弹幕速度: <span id="tvSpeedLabel">${speed}</span> px/s</label>
        <input type="range" id="tvSpeed" min="${speedMin}" max="${speedMax}" step="10" value="${speed}" style="width: 100%;" />
      </div>
      
      ${showGapControl ? `
        <div style="margin-top: 12px;">
          <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.68); font-size: 13px;">分布区间: <span id="tvGapLabel">${gap}</span></label>
          <input type="range" id="tvGap" min="0" max="140" step="4" value="${gap}" style="width: 100%;" />
        </div>
      ` : ''}
    </div>
  `;
}


if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderDanmakuPanel };
}


if (typeof window !== 'undefined') {
  window.__tvDanmakuPanel = { renderDanmakuPanel };
}
