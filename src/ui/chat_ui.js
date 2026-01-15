

(() => {
  const CHAT_CLASS = "tv-danmaku-chat";
  
  let httpBaseUrl = "https://sendit.opsat.io";

  
  let viewingCa = null;

  
  let currentMessages = [];
  
  const MESSAGES_PER_PAGE = 7;
  
  let currentPage = 1;
  
  let currentActiveConnections = 0;

  
  let roomsList = [];
  let roomsCurrentPage = 1;
  const ROOMS_PER_PAGE = 5;
  let roomsSearchKeyword = "";

  
  function ensureChatPanel() {
    const existing = document.body.querySelector(`:scope > .${CHAT_CLASS}`);
    if (existing instanceof HTMLElement) return existing;

    const panel = document.createElement("div");
    panel.className = CHAT_CLASS;
    panel.style.display = "none";

    const header = document.createElement("div");
    header.className = "tv-danmaku-chat-header";

    const title = document.createElement("div");
    title.className = "tv-danmaku-chat-title";
    title.textContent = "聊天室";

    
    const searchWrapper = document.createElement("div");
    searchWrapper.className = "tv-danmaku-chat-search";
    searchWrapper.style.display = "none";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "tv-danmaku-chat-search-input";
    searchInput.placeholder = "搜索房间CA...";
    searchWrapper.appendChild(searchInput);

    
    const homeBtn = document.createElement("button");
    homeBtn.className = "tv-danmaku-chat-home";
    homeBtn.type = "button";
    homeBtn.title = "房间列表";
    homeBtn.setAttribute("aria-label", "房间列表");
    homeBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';

    
    const backBtn = document.createElement("button");
    backBtn.className = "tv-danmaku-chat-back";
    backBtn.type = "button";
    backBtn.title = "返回";
    backBtn.setAttribute("aria-label", "返回");
    backBtn.style.display = "none";
    backBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>';

    
    const statsWrapper = document.createElement("div");
    statsWrapper.className = "tv-danmaku-chat-stats";
    statsWrapper.style.display = "none"; 
    
    
    const onlineItem = document.createElement("div");
    onlineItem.className = "tv-danmaku-chat-stat-item";
    onlineItem.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tv-danmaku-chat-stat-icon">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
      <span class="tv-danmaku-chat-online-count">0</span>
    `;
    
    
    const recordItem = document.createElement("div");
    recordItem.className = "tv-danmaku-chat-stat-item";
    recordItem.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tv-danmaku-chat-stat-icon">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      <span class="tv-danmaku-chat-record-count">0</span>
    `;
    
    statsWrapper.appendChild(onlineItem);
    statsWrapper.appendChild(recordItem);

    const closeBtn = document.createElement("button");
    closeBtn.className = "tv-danmaku-chat-close";
    closeBtn.type = "button";
    closeBtn.title = "关闭";
    closeBtn.setAttribute("aria-label", "关闭");
    closeBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M18 6 6 18"></path><path d="M6 6l12 12"></path></svg>';

    header.appendChild(title);
    header.appendChild(searchWrapper);
    header.appendChild(homeBtn);
    header.appendChild(backBtn);
    header.appendChild(statsWrapper);
    header.appendChild(closeBtn);
    
    
    panel._onlineCount = onlineItem.querySelector(".tv-danmaku-chat-online-count");
    panel._recordCount = recordItem.querySelector(".tv-danmaku-chat-record-count");
    panel._statsWrapper = statsWrapper;

    const body = document.createElement("div");
    body.className = "tv-danmaku-chat-body";
    body.innerHTML = `
      <div class="tv-danmaku-chat-globalhint tv-danmaku-chat-hint" style="display:none;"></div>
      <div class="tv-danmaku-chat-page" style="display:block;">
        <div class="tv-danmaku-chat-messages" style="display:block;">
          <div class="tv-danmaku-chat-message-list"></div>
          <div class="tv-danmaku-chat-pagination"></div>
        </div>
      </div>
      <div class="tv-danmaku-chat-rooms-page" style="display:none;">
        <div class="tv-danmaku-chat-rooms"></div>
        <div class="tv-danmaku-chat-rooms-pagination"></div>
      </div>
    `;

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    closeBtn.addEventListener("click", () => {
      panel.style.display = "none";
      window.__tvDanmakuChat?.__emit?.("close");
    });

    
    homeBtn.addEventListener("click", () => {
      showRoomsList(panel);
    });

    
    backBtn.addEventListener("click", () => {
      showChatView(panel);
    });

    
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        roomsSearchKeyword = String(e.target.value || "").trim().toLowerCase();
        roomsCurrentPage = 1;
        renderRoomsList(panel);
      });
    }

    return panel;
  }

  
  function isOpen(panel) {
    return panel.style.display !== "none";
  }

  
  function open(panel) {
    panel.style.display = "block";
    window.__tvDanmakuChat?.__emit?.("open");
    
    
    const ca = getCurrentCa();
    if (ca) {
      showRoomMessages(panel, ca).catch(() => {});
    } else {
      const msgsEl = panel.querySelector(".tv-danmaku-chat-page .tv-danmaku-chat-messages");
      const listEl = msgsEl?.querySelector(".tv-danmaku-chat-message-list");
      if (listEl instanceof HTMLElement) {
        listEl.innerHTML = `<div class="tv-danmaku-chat-hint">无法获取合约地址，请确保在支持的页面（如 pump.fun、GMGN 等）</div>`;
      }
    }
  }

  
  function close(panel) {
    panel.style.display = "none";
    window.__tvDanmakuChat?.__emit?.("close");
  }

  
  function toggle(panel) {
    if (isOpen(panel)) close(panel);
    else open(panel);
  }

  
  const listeners = { open: [], close: [] };

  
  function on(event, cb) {
    listeners[event].push(cb);
  }

  
  function emit(event, payload) {
    for (const cb of listeners[event] || []) {
      try {
        cb(payload);
      } catch {
        
      }
    }
  }

  
  function formatTime(timestamp) {
    if (!timestamp) return "";
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}秒前`;
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    return `${month}/${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  
  function getMessageTimestamp(msg) {
    let timestamp = null;
    if (msg?.ts) {
      timestamp = Number(msg.ts);
      if (timestamp < 10000000000) {
        timestamp = timestamp * 1000;
      }
    } else if (msg?.createdAt) {
      timestamp = Number(msg.createdAt);
      if (timestamp < 10000000000) {
        timestamp = timestamp * 1000;
      }
    }
    return timestamp || 0;
  }

  
  function createMessageItem(msg) {
    const item = document.createElement("div");
    item.className = "tv-danmaku-chat-message-item";

    const name = msg?.nickname || (msg?.fromAddr ? String(msg.fromAddr).slice(0, 8) + "…" : msg?.level ? String(msg.level) : "system");
    const text = String(msg?.text || "");
    const address = String(msg?.fromAddr || "");
    const timestamp = getMessageTimestamp(msg);

    
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "tv-danmaku-chat-message-content";

    
    const leftSection = document.createElement("div");
    leftSection.className = "tv-danmaku-chat-message-left";

    const nameSpan = document.createElement("span");
    nameSpan.className = "tv-danmaku-chat-message-name";
    nameSpan.textContent = name;

    
    const textWrapper = document.createElement("div");
    textWrapper.className = "tv-danmaku-chat-message-text-wrapper";
    
    const textSpan = document.createElement("span");
    textSpan.className = "tv-danmaku-chat-message-text";
    textSpan.textContent = `: ${text}`;
    
    textWrapper.appendChild(textSpan);
    
    
    const toggleExpand = (e) => {
      if (e) {
        e.stopPropagation();
      }
      const isExpanded = textWrapper.classList.contains("tv-danmaku-chat-message-text-expanded");
      if (isExpanded) {
        textWrapper.classList.remove("tv-danmaku-chat-message-text-expanded");
      } else {
        textWrapper.classList.add("tv-danmaku-chat-message-text-expanded");
      }
    };
    
    
    const checkExpand = () => {
      textWrapper.classList.remove("tv-danmaku-chat-message-text-expanded");
      const containerWidth = textWrapper.offsetWidth;
      const textWidth = textSpan.scrollWidth;
      
      if (textWidth > containerWidth && containerWidth > 0) {
        textWrapper.style.cursor = "pointer";
        if (!textWrapper.dataset.hasClickHandler) {
          textWrapper.addEventListener("click", toggleExpand);
          textWrapper.dataset.hasClickHandler = "true";
        }
      } else {
        textWrapper.style.cursor = "default";
        if (textWrapper.dataset.hasClickHandler) {
          textWrapper.removeEventListener("click", toggleExpand);
          delete textWrapper.dataset.hasClickHandler;
        }
      }
    };

    leftSection.appendChild(nameSpan);
    leftSection.appendChild(textWrapper);

    
    const rightSection = document.createElement("div");
    rightSection.className = "tv-danmaku-chat-message-right";

    
    if (timestamp) {
      const timeSpan = document.createElement("span");
      timeSpan.className = "tv-danmaku-chat-message-time";
      timeSpan.textContent = formatTime(timestamp);
      rightSection.appendChild(timeSpan);
    }

    
    const infoBtn = document.createElement("button");
    infoBtn.className = "tv-danmaku-chat-message-info";
    infoBtn.type = "button";
    infoBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;
    infoBtn.title = "更多信息";
    infoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      createInfoMenu(item, address);
    });

    rightSection.appendChild(infoBtn);

    contentWrapper.appendChild(leftSection);
    contentWrapper.appendChild(rightSection);

    item.appendChild(contentWrapper);
    
    
    requestAnimationFrame(() => {
      requestAnimationFrame(checkExpand);
    });

    return item;
  }

  
  function createInfoMenu(itemEl, address) {
    
    const existingMenu = document.querySelector(".tv-danmaku-chat-menu");
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement("div");
    menu.className = "tv-danmaku-chat-menu";
    
    
    const infoItem = document.createElement("div");
    infoItem.className = "tv-danmaku-chat-menu-item";
    const infoLabel = document.createElement("span");
    infoLabel.className = "tv-danmaku-chat-menu-label";
    infoLabel.textContent = "角色信息";
    const infoValue = document.createElement("span");
    infoValue.className = "tv-danmaku-chat-menu-value";
    infoValue.textContent = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-";
    infoItem.appendChild(infoLabel);
    infoItem.appendChild(infoValue);
    
    if (address) {
      infoItem.style.cursor = "pointer";
      infoItem.addEventListener("click", () => {
        window.open(`https://gmgn.ai/sol/address/${address}`, "_blank");
        menu.remove();
      });
    }
    
    
    const tipItem = document.createElement("div");
    tipItem.className = "tv-danmaku-chat-menu-item";
    const tipLabel = document.createElement("span");
    tipLabel.className = "tv-danmaku-chat-menu-label";
    tipLabel.textContent = "打赏";
    tipItem.appendChild(tipLabel);
    tipItem.style.cursor = "pointer";
    tipItem.addEventListener("click", () => {
      
      if (window.__tvDanmakuContent?.showToast) {
        
        window.__tvDanmakuContent.showToast("打赏功能开发中", "info", 3000);
      } else {
        alert("打赏功能开发中");
      }
      menu.remove();
    });
    
    
    const reportItem = document.createElement("div");
    reportItem.className = "tv-danmaku-chat-menu-item";
    const reportLabel = document.createElement("span");
    reportLabel.className = "tv-danmaku-chat-menu-label";
    reportLabel.textContent = "举报";
    reportItem.appendChild(reportLabel);
    reportItem.style.cursor = "pointer";
    reportItem.addEventListener("click", () => {
      
      if (window.__tvDanmakuContent?.showToast) {
        
        window.__tvDanmakuContent.showToast("举报功能开发中", "info", 3000);
      } else {
        alert("举报功能开发中");
      }
      menu.remove();
    });
    
    menu.appendChild(infoItem);
    menu.appendChild(tipItem);
    menu.appendChild(reportItem);
    document.body.appendChild(menu);
    
    
    const infoBtn = itemEl.querySelector(".tv-danmaku-chat-message-info");
    if (infoBtn) {
      const btnRect = infoBtn.getBoundingClientRect();
      
      menu.style.left = `${btnRect.right}px`;
      menu.style.top = `${btnRect.bottom + 4}px`;
      menu.style.visibility = "hidden";
      
      
      const menuRect = menu.getBoundingClientRect();
      menu.style.visibility = "visible";
      
      
      let left = btnRect.right - menuRect.width;
      let top = btnRect.bottom + 4;
      
      if (left < 8) left = 8; 
      if (top + menuRect.height > window.innerHeight - 8) {
        top = btnRect.top - menuRect.height - 4;
      }
      if (top < 8) top = 8; 
      
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }
    
    
    const closeMenu = (e) => {
      if (!menu.contains(e.target) && !itemEl.contains(e.target)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
    
    return menu;
  }

  
  function renderPagination(panel, total, current, perPage) {
    const paginationEl = panel.querySelector(".tv-danmaku-chat-pagination");
    if (!(paginationEl instanceof HTMLElement)) return;

    const totalPages = Math.ceil(total / perPage);
    
    
    if (totalPages <= 1 || total === 0) {
      paginationEl.innerHTML = "";
      paginationEl.style.display = "none";
      return;
    }

    paginationEl.style.display = "flex";
    paginationEl.innerHTML = "";

    
    const prevBtn = document.createElement("button");
    prevBtn.className = "tv-danmaku-chat-pagination-btn";
    prevBtn.textContent = "上一页";
    prevBtn.disabled = current <= 1;
    prevBtn.addEventListener("click", () => {
      if (current > 1) {
        currentPage = current - 1;
        renderMessages(panel);
      }
    });
    paginationEl.appendChild(prevBtn);

    
    const pageInfo = document.createElement("span");
    pageInfo.className = "tv-danmaku-chat-pagination-info";
    pageInfo.textContent = `${current} / ${totalPages}`;
    paginationEl.appendChild(pageInfo);

    
    const nextBtn = document.createElement("button");
    nextBtn.className = "tv-danmaku-chat-pagination-btn";
    nextBtn.textContent = "下一页";
    nextBtn.disabled = current >= totalPages;
    nextBtn.addEventListener("click", () => {
      if (current < totalPages) {
        currentPage = current + 1;
        renderMessages(panel);
      }
    });
    paginationEl.appendChild(nextBtn);
  }

  
  function renderMessages(panel) {
    const listEl = panel.querySelector(".tv-danmaku-chat-message-list");
    if (!(listEl instanceof HTMLElement)) return;

    listEl.innerHTML = "";

    
    const sortedMessages = [...currentMessages].sort((a, b) => {
      const aTime = getMessageTimestamp(a);
      const bTime = getMessageTimestamp(b);
      return (bTime || 0) - (aTime || 0);
    });

    const start = (currentPage - 1) * MESSAGES_PER_PAGE;
    const end = start + MESSAGES_PER_PAGE;
    const pageMessages = sortedMessages.slice(start, end);

    for (const m of pageMessages) {
      const item = createMessageItem(m);
      listEl.appendChild(item);
    }

    
    renderPagination(panel, sortedMessages.length, currentPage, MESSAGES_PER_PAGE);

    
    updateStats(panel, currentActiveConnections, sortedMessages.length);

    
    listEl.scrollTop = 0;
  }

  
  function appendMessage(msg) {
    
    currentMessages.push(msg);
    
    const panel = ensureChatPanel();
    if (viewingCa) {
      currentPage = 1; 
      renderMessages(panel);
      
      updateStats(panel, currentActiveConnections, currentMessages.length);
    }
  }

  
  function setHint(text) {
    const panel = ensureChatPanel();
    const el = panel.querySelector(".tv-danmaku-chat-globalhint");
    if (!(el instanceof HTMLElement)) return;
    const t = String(text || "").trim();
    if (!t) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.textContent = t;
    el.style.display = "block";
  }

  
  function clearHint() {
    setHint("");
  }

  
  function setHttpBaseUrl(base) {
    httpBaseUrl = base || httpBaseUrl;
  }

  
  function joinHttp(path) {
    const u = new URL(httpBaseUrl);
    u.pathname = path;
    return u.toString();
  }

  
  /**
   * 更新统计信息
   * @param {HTMLElement} panel - 聊天面板元素
   * @param {number} onlineCount - 在线人数
   * @param {number} recordCount - 消息记录数
   */
  function updateStats(panel, onlineCount, recordCount) {
    const statsWrapper = panel._statsWrapper || panel.querySelector(".tv-danmaku-chat-stats");
    const onlineEl = panel._onlineCount || panel.querySelector(".tv-danmaku-chat-online-count");
    const recordEl = panel._recordCount || panel.querySelector(".tv-danmaku-chat-record-count");
    
    if (statsWrapper instanceof HTMLElement) {
      statsWrapper.style.display = "flex";
    }
    
    if (onlineEl instanceof HTMLElement) {
      onlineEl.textContent = String(onlineCount);
    }
    
    if (recordEl instanceof HTMLElement) {
      recordEl.textContent = String(recordCount);
    }
  }

  /**
   * 更新在线人数
   * @param {number} count - 在线人数
   */
  function updateOnlineCount(count) {
    if (typeof count !== "number" || count < 0) return;
    currentActiveConnections = count;
    const panel = ensureChatPanel();
    const recordCount = currentMessages.length;
    updateStats(panel, currentActiveConnections, recordCount);
  }

  /**
   * 显示聊天视图
   * @param {HTMLElement} panel - 聊天面板元素
   */
  function showChatView(panel) {
    const chatPage = panel.querySelector(".tv-danmaku-chat-page");
    const roomsPage = panel.querySelector(".tv-danmaku-chat-rooms-page");
    const header = panel.querySelector(".tv-danmaku-chat-header");
    const homeBtn = header?.querySelector(".tv-danmaku-chat-home");
    const backBtn = header?.querySelector(".tv-danmaku-chat-back");
    const title = header?.querySelector(".tv-danmaku-chat-title");
    const statsWrapper = header?.querySelector(".tv-danmaku-chat-stats");
    const searchWrapper = header?.querySelector(".tv-danmaku-chat-search");

    if (chatPage) chatPage.style.display = "block";
    if (roomsPage) roomsPage.style.display = "none";
    if (homeBtn) homeBtn.style.display = "flex";
    if (backBtn) backBtn.style.display = "none";
    if (searchWrapper) searchWrapper.style.display = "none";
    if (title) {
      const ca = viewingCa;
      if (ca) {
        const caStr = String(ca);
        const shortCa = caStr.slice(0, 10) + "…";
        title.innerHTML = `聊天室：<span class="tv-danmaku-chat-title-ca" style="cursor: pointer; text-decoration: underline; color: inherit;" title="点击复制完整地址">${shortCa}</span>`;
        
        // 添加点击复制功能
        const caEl = title.querySelector(".tv-danmaku-chat-title-ca");
        if (caEl) {
          caEl.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              await navigator.clipboard.writeText(caStr);
              if (window.__tvDanmakuContent?.showToast) {
                window.__tvDanmakuContent.showToast("地址已复制", "success", 2000);
              }
            } catch (err) {
              if (window.__tvDanmakuContent?.showToast) {
                window.__tvDanmakuContent.showToast("复制失败", "error", 2000);
              }
            }
          });
        }
      } else {
        title.textContent = "聊天室";
      }
    }
    if (statsWrapper) statsWrapper.style.display = "flex";
  }

  /**
   * 显示房间列表视图
   * @param {HTMLElement} panel - 聊天面板元素
   */
  async function showRoomsList(panel) {
    const chatPage = panel.querySelector(".tv-danmaku-chat-page");
    const roomsPage = panel.querySelector(".tv-danmaku-chat-rooms-page");
    const header = panel.querySelector(".tv-danmaku-chat-header");
    const homeBtn = header?.querySelector(".tv-danmaku-chat-home");
    const backBtn = header?.querySelector(".tv-danmaku-chat-back");
    const title = header?.querySelector(".tv-danmaku-chat-title");
    const statsWrapper = header?.querySelector(".tv-danmaku-chat-stats");
    const searchWrapper = header?.querySelector(".tv-danmaku-chat-search");
    const searchInput = searchWrapper?.querySelector(".tv-danmaku-chat-search-input");

    if (chatPage) chatPage.style.display = "none";
    if (roomsPage) roomsPage.style.display = "block";
    if (homeBtn) homeBtn.style.display = "none";
    if (backBtn) backBtn.style.display = "flex";
    if (searchWrapper) searchWrapper.style.display = "flex";
    if (title) title.textContent = "房间列表";
    if (statsWrapper) statsWrapper.style.display = "none";

    const roomsEl = roomsPage?.querySelector(".tv-danmaku-chat-rooms");
    if (roomsEl) {
      roomsEl.innerHTML = `<div class="tv-danmaku-chat-hint">加载中…</div>`;
    }

    try {
      const res = await fetch(joinHttp("/rooms"));
      if (!res.ok) {
        if (roomsEl) {
          roomsEl.innerHTML = `<div class="tv-danmaku-chat-hint">加载失败（${res.status}）</div>`;
        }
        return;
      }
      const data = await res.json();
      roomsList = Array.isArray(data?.rooms) ? data.rooms : [];
      roomsCurrentPage = 1;
      roomsSearchKeyword = "";
      
      if (searchInput) {
        searchInput.value = "";
      }
      
      renderRoomsList(panel);
    } catch (e) {
      if (roomsEl) {
        roomsEl.innerHTML = `<div class="tv-danmaku-chat-hint">加载失败：网络错误</div>`;
      }
    }
  }

  /**
   * 过滤房间列表
   * @param {Array} rooms - 房间列表
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 过滤后的房间列表
   */
  function filterRooms(rooms, keyword) {
    if (!keyword) return rooms;
    const lowerKeyword = keyword.toLowerCase();
    return rooms.filter(room => {
      const ca = String(room?.ca || "").toLowerCase();
      return ca.includes(lowerKeyword);
    });
  }

  /**
   * 渲染房间列表
   * @param {HTMLElement} panel - 聊天面板元素
   */
  function renderRoomsList(panel) {
    const roomsEl = panel.querySelector(".tv-danmaku-chat-rooms");
    const paginationEl = panel.querySelector(".tv-danmaku-chat-rooms-pagination");
    if (!(roomsEl instanceof HTMLElement)) return;

    roomsEl.innerHTML = "";

    if (roomsList.length === 0) {
      roomsEl.innerHTML = `<div class="tv-danmaku-chat-hint">暂无房间</div>`;
      if (paginationEl) {
        paginationEl.style.display = "none";
      }
      return;
    }

    
    const filteredRooms = filterRooms(roomsList, roomsSearchKeyword);

    if (filteredRooms.length === 0) {
      roomsEl.innerHTML = `<div class="tv-danmaku-chat-hint">未找到匹配的房间</div>`;
      if (paginationEl) {
        paginationEl.style.display = "none";
      }
      return;
    }

    const totalPages = Math.ceil(filteredRooms.length / ROOMS_PER_PAGE);
    const start = (roomsCurrentPage - 1) * ROOMS_PER_PAGE;
    const end = start + ROOMS_PER_PAGE;
    const pageRooms = filteredRooms.slice(start, end);

    for (const room of pageRooms) {
      const item = createRoomItem(room);
      roomsEl.appendChild(item);
    }

    renderRoomsPagination(panel, filteredRooms.length, roomsCurrentPage, ROOMS_PER_PAGE);
  }

  /**
   * 创建房间项
   * @param {Object} room - 房间对象
   * @returns {HTMLElement} 房间项元素
   */
  function createRoomItem(room) {
    const item = document.createElement("div");
    item.className = "tv-danmaku-chat-room-item";

    const ca = String(room?.ca || "");
    const activeConnections = Number(room?.activeConnections || 0);
    const messageCount = Number(room?.messageCount || 0);
    const lastActiveAt = room?.lastActiveAt ? Number(room.lastActiveAt) : null;

    
    const caDisplay = ca.length > 20 ? `${ca.slice(0, 20)}...` : ca;

    item.innerHTML = `
      <div class="tv-danmaku-chat-room-content">
        <div class="tv-danmaku-chat-room-header">
          <div class="tv-danmaku-chat-room-name" title="${ca}">${caDisplay}</div>
          <div class="tv-danmaku-chat-room-meta">
            <span class="tv-danmaku-chat-room-online">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:inline-block;vertical-align:middle;">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              ${activeConnections}
            </span>
            <span class="tv-danmaku-chat-room-messages">消息: ${messageCount}</span>
          </div>
        </div>
        ${lastActiveAt ? `<div class="tv-danmaku-chat-room-time">${formatTime(lastActiveAt)}</div>` : ""}
      </div>
    `;

    item.addEventListener("click", () => {
      if (ca) {
        const chatPanel = ensureChatPanel();
        if (!isOpen(chatPanel)) {
          open(chatPanel);
        }
        switchToCa(ca).then(() => {
          showChatView(chatPanel);
        }).catch(() => {});
      }
    });

    return item;
  }

  /**
   * 渲染房间列表分页
   * @param {HTMLElement} panel - 聊天面板元素
   * @param {number} total - 总房间数
   * @param {number} current - 当前页码
   * @param {number} perPage - 每页数量
   */
  function renderRoomsPagination(panel, total, current, perPage) {
    const paginationEl = panel.querySelector(".tv-danmaku-chat-rooms-pagination");
    if (!(paginationEl instanceof HTMLElement)) return;

    const totalPages = Math.ceil(total / perPage);

    if (totalPages <= 1 || total === 0) {
      paginationEl.innerHTML = "";
      paginationEl.style.display = "none";
      return;
    }

    paginationEl.style.display = "flex";
    paginationEl.innerHTML = "";

    const prevBtn = document.createElement("button");
    prevBtn.className = "tv-danmaku-chat-pagination-btn";
    prevBtn.textContent = "上一页";
    prevBtn.disabled = current <= 1;
    prevBtn.addEventListener("click", () => {
      if (current > 1) {
        roomsCurrentPage = current - 1;
        renderRoomsList(panel);
      }
    });
    paginationEl.appendChild(prevBtn);

    const pageInfo = document.createElement("span");
    pageInfo.className = "tv-danmaku-chat-pagination-info";
    pageInfo.textContent = `${current} / ${totalPages}`;
    paginationEl.appendChild(pageInfo);

    const nextBtn = document.createElement("button");
    nextBtn.className = "tv-danmaku-chat-pagination-btn";
    nextBtn.textContent = "下一页";
    nextBtn.disabled = current >= totalPages;
    nextBtn.addEventListener("click", () => {
      if (current < totalPages) {
        roomsCurrentPage = current + 1;
        renderRoomsList(panel);
      }
    });
    paginationEl.appendChild(nextBtn);
  }

  
  async function showRoomMessages(panel, ca) {
    const msgsEl = panel.querySelector(".tv-danmaku-chat-page .tv-danmaku-chat-messages");
    const header = panel.querySelector(".tv-danmaku-chat-header");
    if (!(msgsEl instanceof HTMLElement) || !(header instanceof HTMLElement))
      return;

    viewingCa = ca;
    
    showChatView(panel);

    msgsEl.style.display = "block";
    
    const listEl = msgsEl.querySelector(".tv-danmaku-chat-message-list");
    if (listEl instanceof HTMLElement) {
      listEl.innerHTML = `<div class="tv-danmaku-chat-hint">加载中…</div>`;
    }

    try {
      
      let activeConnections = 0;
      try {
        
        
        
        currentActiveConnections = 0;
      } catch {
        
      }

      const res = await fetch(joinHttp("/rooms/messages") + `?ca=${encodeURIComponent(ca)}&limit=200`);
      if (!res.ok) {
        if (res.status === 401) {
          
          if (window.__tvDanmakuContent?.showToast) {
            
            window.__tvDanmakuContent.showToast("加载消息失败：登录已过期，请重新登录", "error", 4000);
          }
          if (listEl instanceof HTMLElement) {
            listEl.innerHTML = `<div class="tv-danmaku-chat-hint">加载失败：登录已过期</div>`;
          }
        } else if (res.status >= 500) {
          
          if (window.__tvDanmakuContent?.showToast) {
            
            window.__tvDanmakuContent.showToast("加载消息失败：服务器错误，请稍后重试", "error", 4000);
          }
          if (listEl instanceof HTMLElement) {
            listEl.innerHTML = `<div class="tv-danmaku-chat-hint">加载失败（${res.status}）</div>`;
          }
        } else {
          if (listEl instanceof HTMLElement) {
            listEl.innerHTML = `<div class="tv-danmaku-chat-hint">加载失败（${res.status}）</div>`;
          }
        }
        return;
      }
      const js = await res.json();
      const messages = Array.isArray(js?.messages) ? js.messages : [];
      currentMessages = messages;
      currentPage = 1;
      
      
      updateStats(panel, activeConnections, messages.length);
      
      
      renderMessages(panel);
    } catch (e) {
      
      
      if (window.__tvDanmakuContent?.showToast) {
        
        window.__tvDanmakuContent.showToast("加载消息失败：网络错误，请检查网络连接", "error", 4000);
      }
      const listEl = msgsEl.querySelector(".tv-danmaku-chat-message-list");
      if (listEl instanceof HTMLElement) {
        listEl.innerHTML = `<div class="tv-danmaku-chat-hint">加载失败：网络错误</div>`;
      }
    }
  }

  
  async function switchToCa(ca) {
    const panel = ensureChatPanel();
    if (!ca) {
      viewingCa = null;
      const msgsEl = panel.querySelector(".tv-danmaku-chat-page .tv-danmaku-chat-messages");
      const listEl = msgsEl?.querySelector(".tv-danmaku-chat-message-list");
      if (listEl instanceof HTMLElement) {
        listEl.innerHTML = `<div class="tv-danmaku-chat-hint">无法获取合约地址，请确保在支持的页面（如 pump.fun、GMGN 等）</div>`;
      }
      return;
    }
    
    
    if (viewingCa === ca && isOpen(panel)) {
      return;
    }
    
    
    if (isOpen(panel)) {
      await showRoomMessages(panel, ca);
    } else {
      
      viewingCa = ca;
    }
  }

  
  function getCurrentCa() {
    try {
      
      if (window.__tvDanmakuContent?.parseRouteInfo) {
        
        const route = window.__tvDanmakuContent.parseRouteInfo();
        return route?.ca || null;
      }
    } catch {
      
    }
    return null;
  }

  
  let lastUrl = window.location.href;
  function checkUrlChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      const ca = getCurrentCa();
      if (ca !== viewingCa) {
        switchToCa(ca).catch(() => {});
      }
    }
  }
  
  
  window.setInterval(checkUrlChange, 1000);
  window.addEventListener("popstate", checkUrlChange);
  
  
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(checkUrlChange, 100);
  };
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    setTimeout(checkUrlChange, 100);
  };

  
  
  window.__tvDanmakuChat = {
    ensureChatPanel,
    isOpen,
    open,
    close,
    toggle,
    on,
    appendMessage,
    setHint,
    clearHint,
    setHttpBaseUrl,
    switchToCa,
    getCurrentCa,
    updateOnlineCount,
    __emit: emit,
  };
})();


