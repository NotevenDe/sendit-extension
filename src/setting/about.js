

function renderAboutPanel() {
  return `
    <div class="tv-danmaku-modal-panel tv-about" data-panel="about">
      <style>
        
        .tv-about{
          --text: rgba(255,255,255,0.92);
          --muted: rgba(255,255,255,0.68);
          --muted2: rgba(255,255,255,0.55);
          --accent: rgba(41, 98, 255, 0.95);

          padding: 8px 6px;
          position: relative;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto,
            "PingFang SC","Hiragino Sans GB","Microsoft YaHei",
            Arial, "Press Start 2P", monospace;
          color: var(--text);
          animation: tvAboutIn .28s ease-out both;
        }

        @keyframes tvAboutIn{
          from{ opacity: 0; transform: translateY(6px); }
          to{ opacity: 1; transform: translateY(0); }
        }

        .tv-about-inner{
          padding: 6px 4px;
        }

        
        .tv-about-head{
          text-align: center;
          margin-bottom: 14px;
        }

        .tv-about-title{
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: .4px;
          position: relative;
          overflow: hidden;
        }

        
        .tv-about-title::after{
          content:"";
          position:absolute;
          inset: -30% -10%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.22) 48%,
            transparent 70%
          );
          transform: translateX(-80%) skewX(-18deg);
          animation: tvScan 2.6s ease-in-out infinite;
          pointer-events:none;
        }

        @keyframes tvScan{
          0%{ transform: translateX(-95%) skewX(-18deg); opacity: 0; }
          15%{ opacity: .9; }
          45%{ opacity: .9; }
          60%{ transform: translateX(105%) skewX(-18deg); opacity: 0; }
          100%{ opacity: 0; }
        }

        .tv-about-sub{
          margin-top: 10px;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--muted);
        }
        .tv-about-sub p{ margin: 8px 0; }

        
        .tv-features{
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 14px 0 18px;
        }

        .tv-card{
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04); 
          transition: transform .18s ease, background .18s ease;
        }

        .tv-card:hover{
          transform: translateY(-3px);
          background: rgba(255,255,255,0.07);
        }

        .tv-card-head{
          display:flex;
          align-items:center;
          gap: 7px;
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 5px;
        }

        .tv-ico{
          width: 14px;
          height: 14px;
          opacity: .9;
        }

        .tv-card-body{
          font-size: 11px;
          line-height: 1.55;
          color: var(--muted);
        }

        
        .tv-links{
          display:flex;
          justify-content:center;
          gap: 14px;
          padding-top: 12px;
        }

        .tv-linkbtn{
          display:flex;
          align-items:center;
          justify-content:center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          transition: transform .15s ease, color .15s ease;
        }

        .tv-linkbtn:hover{
          transform: translateY(-2px);
          color: var(--accent);
        }

        .tv-linkbtn:active{
          transform: translateY(0);
        }

        @media (max-width: 520px){
          .tv-features{
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce){
          .tv-about,
          .tv-about-title::after{
            animation: none !important;
          }
          .tv-card,
          .tv-linkbtn{
            transition: none !important;
          }
        }
      </style>

      <div class="tv-about-inner">
        <div class="tv-about-head">
          <div class="tv-about-title">
            <span style="width:8px;height:8px;border-radius:2px;background:var(--accent);"></span>
            Sendit
          </div>
          <div class="tv-about-sub">
            <p>Sendit是一款用于实时K线交互的插件，在同一ca下全平台共同聊天，无需任何权限即可将K线变成直播间，并支持评论区和聊天室</p>
          </div>
        </div>

        <div class="tv-features">
          <div class="tv-card">
            <div class="tv-card-head">
              <svg class="tv-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              弹幕
            </div>
            <div class="tv-card-body">在图表上显示实时弹幕消息，支持全平台交流。</div>
          </div>

          <div class="tv-card">
            <div class="tv-card-head">
              <svg class="tv-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <line x1="9" y1="10" x2="15" y2="10"/>
                <line x1="12" y1="7" x2="12" y2="13"/>
              </svg>
              评论
            </div>
            <div class="tv-card-body">发表评论并查看其他用户的评论，获取token更多有效信息。</div>
          </div>

          <div class="tv-card">
            <div class="tv-card-head">
              <svg class="tv-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07
                         19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67
                         A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72
                         12.84 12.84 0 0 0 .7 2.81
                         2 2 0 0 1-.45 2.11L8.09 9.91
                         a16 16 0 0 0 6 6l1.27-1.27
                         a2 2 0 0 1 2.11-.45
                         12.84 12.84 0 0 0 2.81.7
                         A2 2 0 0 1 22 16.92z"/>
              </svg>
              电话房
            </div>
            <div class="tv-card-body">创建或加入语音房间，与其他交易者进行实时语音交流。</div>
          </div>
        </div>

        <div class="tv-links">
          <a class="tv-linkbtn" href="https://twitter.com" target="_blank" aria-label="Twitter">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53
                       4.48 4.48 0 0 0-7.86 3v1
                       A10.66 10.66 0 0 1 3 4s-4 9 5 13
                       a11.64 11.64 0 0 1-7 2
                       c9 5 20 0 20-11.5
                       a4.5 4.5 0 0 0-.08-.83
                       A7.72 7.72 0 0 0 23 3z"/>
            </svg>
          </a>

          <a class="tv-linkbtn" href="https://example.com" target="_blank" aria-label="Website">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10
                       15.3 15.3 0 0 1-4 10
                       15.3 15.3 0 0 1-4-10
                       15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </a>

          <a class="tv-linkbtn" href="https://docs.example.com" target="_blank" aria-label="Docs">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16
                       a2 2 0 0 0 2 2h12
                       a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderAboutPanel };
}
if (typeof window !== 'undefined') {
  window.__tvAboutPanel = { renderAboutPanel };
}
