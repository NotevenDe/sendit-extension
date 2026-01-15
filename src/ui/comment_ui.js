

(() => {
  const CLS = "tv-danmaku-comment";

  
  let panelEl = null;
  
  let httpBaseUrl = "https://sendit.opsat.io";
  
  
  let currentComments = [];
  
  const COMMENTS_PER_PAGE = 10;
  
  let currentPage = 1;
  
  let sortMode = "time";

  
  function setHttpBaseUrl(base) {
    httpBaseUrl = String(base || httpBaseUrl);
  }

  
  function joinHttp(path) {
    const u = new URL(httpBaseUrl);
    u.pathname = path;
    return u.toString();
  }

  
  function ensurePanel() {
    if (panelEl && document.body.contains(panelEl)) return panelEl;
    const existing = document.body.querySelector(`:scope > .${CLS}`);
    if (existing instanceof HTMLElement) {
      panelEl = existing;
      return existing;
    }

    const panel = document.createElement("div");
    panel.className = CLS;
    panel.style.display = "none";

    const header = document.createElement("div");
    header.className = "tv-danmaku-comment-header";
    header.style.cursor = "move"; 

    const title = document.createElement("div");
    title.className = "tv-danmaku-comment-title";
    title.textContent = "评论区：";

    const caDisplay = document.createElement("span");
    caDisplay.className = "tv-danmaku-comment-ca";
    caDisplay.textContent = "";

    
    const countDisplay = document.createElement("span");
    countDisplay.className = "tv-danmaku-comment-count";
    countDisplay.textContent = "";

    
    const sortBtn = document.createElement("button");
    sortBtn.className = "tv-danmaku-comment-sort";
    sortBtn.type = "button";
    sortBtn.title = "切换排序方式";
    sortBtn.setAttribute("aria-label", "排序");
    updateSortButton(sortBtn, sortMode);
    sortBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      
      sortMode = sortMode === "time" ? "hot" : "time";
      updateSortButton(sortBtn, sortMode);
      
      const panel = ensurePanel();
      renderComments(panel);
    });

    const titleWrapper = document.createElement("div");
    titleWrapper.style.display = "flex";
    titleWrapper.style.alignItems = "center";
    titleWrapper.style.gap = "6px";
    titleWrapper.style.flex = "1";
    titleWrapper.style.minWidth = "0";
    titleWrapper.style.overflow = "hidden";
    titleWrapper.appendChild(title);
    titleWrapper.appendChild(caDisplay);

    const closeBtn = document.createElement("button");
    closeBtn.className = "tv-danmaku-chat-close";
    closeBtn.type = "button";
    closeBtn.title = "关闭";
    closeBtn.setAttribute("aria-label", "关闭评论区");
    closeBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M18 6 6 18"></path><path d="M6 6l12 12"></path></svg>';

    header.appendChild(titleWrapper);
    header.appendChild(countDisplay);
    header.appendChild(sortBtn);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "tv-danmaku-comment-body";
    body.innerHTML = `
      <div class="tv-danmaku-comment-list"></div>
      <div class="tv-danmaku-comment-pagination"></div>
      <div class="tv-danmaku-comment-tip tv-danmaku-chat-hint" style="margin-top:10px;"></div>
    `;

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    closeBtn.addEventListener("click", () => close());

    
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    header.addEventListener("mousedown", (e) => {
      
      const target = e.target;
      if (target === closeBtn || closeBtn.contains(target) || 
          target === sortBtn || sortBtn.contains(target) || 
          target.closest("button")) {
        return;
      }
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      panel.style.userSelect = "none";
      header.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      
      
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      
      panel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
      panel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        panel.style.userSelect = "";
        header.style.cursor = "move";
      }
    });

    
    panel._caDisplay = caDisplay;
    panel._countDisplay = countDisplay;

    panelEl = panel;
    return panel;
  }

  
  function close() {
    const p = ensurePanel();
    p.style.display = "none";
  }

  
  function updateSortButton(btn, mode) {
    const isTime = mode === "time";
    
    
    const icon = isTime
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;display:block;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;display:block;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>';
    const text = isTime ? "按时间" : "按热度";
    btn.innerHTML = icon + '<span style="margin-left:4px;font-size:12px;">' + text + '</span>';
    btn.title = isTime ? "切换到按热度排序" : "切换到按时间排序";
  }

  
  function sortComments(comments, mode) {
    const sorted = [...comments];
    if (mode === "hot") {
      
      sorted.sort((a, b) => {
        const aLikes = Number(a?.likeCount || a?.likes || 0);
        const bLikes = Number(b?.likeCount || b?.likes || 0);
        if (aLikes !== bLikes) {
          return bLikes - aLikes; 
        }
        
        const aTime = getCommentTimestamp(a);
        const bTime = getCommentTimestamp(b);
        return (bTime || 0) - (aTime || 0);
      });
    } else {
      
      sorted.sort((a, b) => {
        const aTime = getCommentTimestamp(a);
        const bTime = getCommentTimestamp(b);
        return (bTime || 0) - (aTime || 0);
      });
    }
    return sorted;
  }

  
  function getCommentTimestamp(comment) {
    let timestamp = null;
    if (comment?.createdAt) {
      timestamp = Number(comment.createdAt);
      if (timestamp < 10000000000) {
        timestamp = timestamp * 1000;
      }
    } else if (comment?.ts) {
      timestamp = Number(comment.ts);
      if (timestamp < 10000000000) {
        timestamp = timestamp * 1000;
      }
    }
    return timestamp || 0;
  }

  
  function setTip(panel, text) {
    const el = panel.querySelector(".tv-danmaku-comment-tip");
    if (!(el instanceof HTMLElement)) return;
    el.textContent = String(text || "");
  }

  
  function clearList(panel) {
    const el = panel.querySelector(".tv-danmaku-comment-list");
    if (el instanceof HTMLElement) el.innerHTML = "";
    currentComments = [];
    currentPage = 1;
  }

  
  function renderPagination(panel, total, current, perPage) {
    const paginationEl = panel.querySelector(".tv-danmaku-comment-pagination");
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
    prevBtn.className = "tv-danmaku-comment-pagination-btn";
    prevBtn.textContent = "上一页";
    prevBtn.disabled = current <= 1;
    prevBtn.addEventListener("click", () => {
      if (current > 1) {
        currentPage = current - 1;
        renderComments(panel);
      }
    });
    paginationEl.appendChild(prevBtn);

    
    const pageInfo = document.createElement("span");
    pageInfo.className = "tv-danmaku-comment-pagination-info";
    pageInfo.textContent = `${current} / ${totalPages}`;
    paginationEl.appendChild(pageInfo);

    
    const nextBtn = document.createElement("button");
    nextBtn.className = "tv-danmaku-comment-pagination-btn";
    nextBtn.textContent = "下一页";
    nextBtn.disabled = current >= totalPages;
    nextBtn.addEventListener("click", () => {
      if (current < totalPages) {
        currentPage = current + 1;
        renderComments(panel);
      }
    });
    paginationEl.appendChild(nextBtn);
  }

  
  function renderComments(panel) {
    const listEl = panel.querySelector(".tv-danmaku-comment-list");
    if (!(listEl instanceof HTMLElement)) return;

    listEl.innerHTML = "";

    
    const sortedComments = sortComments(currentComments, sortMode);

    const start = (currentPage - 1) * COMMENTS_PER_PAGE;
    const end = start + COMMENTS_PER_PAGE;
    const pageComments = sortedComments.slice(start, end);

    for (const c of pageComments) {
      appendComment(panel, c);
    }

    
    renderPagination(panel, sortedComments.length, currentPage, COMMENTS_PER_PAGE);

    
    listEl.scrollTop = 0;
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

  
  function createInfoMenu(itemEl, address) {
    
    const existingMenu = document.querySelector(".tv-danmaku-comment-menu");
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement("div");
    menu.className = "tv-danmaku-comment-menu";
    
    
    const infoItem = document.createElement("div");
    infoItem.className = "tv-danmaku-comment-menu-item";
    const infoLabel = document.createElement("span");
    infoLabel.className = "tv-danmaku-comment-menu-label";
    infoLabel.textContent = "Info";
    const infoValue = document.createElement("span");
    infoValue.className = "tv-danmaku-comment-menu-value";
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
    
    
    const reportItem = document.createElement("div");
    reportItem.className = "tv-danmaku-comment-menu-item";
    const reportLabel = document.createElement("span");
    reportLabel.className = "tv-danmaku-comment-menu-label";
    reportLabel.textContent = "举报";
    reportItem.appendChild(reportLabel);
    reportItem.style.cursor = "pointer";
    reportItem.addEventListener("click", () => {
      
      alert("举报功能开发中");
      menu.remove();
    });
    
    menu.appendChild(infoItem);
    menu.appendChild(reportItem);
    document.body.appendChild(menu);
    
    
    const infoBtn = itemEl.querySelector(".tv-danmaku-comment-info");
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

  
  function createCommentItem(c) {
    const item = document.createElement("div");
    item.className = "tv-danmaku-comment-item";

    const name = c?.nickname || (c?.fromAddr ? String(c.fromAddr).slice(0, 8) + "…" : "user");
    const text = String(c?.text || "");
    const address = String(c?.fromAddr || "");
    const likeCount = Number(c?.likeCount || c?.likes || 0);
    
    let timestamp = null;
    if (c?.createdAt) {
      timestamp = Number(c.createdAt);
      
      if (timestamp < 10000000000) {
        timestamp = timestamp * 1000;
      }
    } else if (c?.ts) {
      timestamp = Number(c.ts);
      
      if (timestamp < 10000000000) {
        timestamp = timestamp * 1000;
      }
    }

    
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "tv-danmaku-comment-content";

    
    const leftSection = document.createElement("div");
    leftSection.className = "tv-danmaku-comment-left";

    const nameSpan = document.createElement("span");
    nameSpan.className = "tv-danmaku-comment-name";
    nameSpan.textContent = name;

    
    const textWrapper = document.createElement("div");
    textWrapper.className = "tv-danmaku-comment-text-wrapper";
    
    const textSpan = document.createElement("span");
    textSpan.className = "tv-danmaku-comment-text";
    textSpan.textContent = `: ${text}`;
    
    textWrapper.appendChild(textSpan);
    
    
    const toggleExpand = (e) => {
      if (e) {
        e.stopPropagation();
      }
      const isExpanded = textWrapper.classList.contains("tv-danmaku-comment-text-expanded");
      if (isExpanded) {
        
        textWrapper.classList.remove("tv-danmaku-comment-text-expanded");
      } else {
        
        textWrapper.classList.add("tv-danmaku-comment-text-expanded");
      }
    };
    
    
    const checkExpand = () => {
      
      textWrapper.classList.remove("tv-danmaku-comment-text-expanded");
      
      
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
    rightSection.className = "tv-danmaku-comment-right";

    
    if (timestamp) {
      const timeSpan = document.createElement("span");
      timeSpan.className = "tv-danmaku-comment-time";
      timeSpan.textContent = formatTime(timestamp);
      rightSection.appendChild(timeSpan);
    }

    
    const likeBtn = document.createElement("button");
    likeBtn.className = "tv-danmaku-comment-like";
    likeBtn.type = "button";
    likeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
      <span class="tv-danmaku-comment-like-count">${likeCount}</span>
    `;
    likeBtn.title = "点赞";

    
    const infoBtn = document.createElement("button");
    infoBtn.className = "tv-danmaku-comment-info";
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

    rightSection.appendChild(likeBtn);
    rightSection.appendChild(infoBtn);

    contentWrapper.appendChild(leftSection);
    contentWrapper.appendChild(rightSection);

    item.appendChild(contentWrapper);
    
    
    requestAnimationFrame(() => {
      requestAnimationFrame(checkExpand);
    });

    return item;
  }

  
  
  function appendComment(panel, c) {
    const box = panel.querySelector(".tv-danmaku-comment-list");
    if (!(box instanceof HTMLElement)) return;
    
    const item = createCommentItem(c);
    box.appendChild(item);
  }

  
  async function open(ca, token) {
    const p = ensurePanel();
    
    
    
    if (!p.style.left || p.style.left === "0px" || !p.dataset.positioned) {
      p.style.left = "20px";
      p.style.top = "20px";
      p.dataset.positioned = "true";
    }
    
    if (!p.style.height || p.style.height === "auto") {
      p.style.height = `${Math.min(550, window.innerHeight * 0.7)}px`;
    }
    
    p.style.display = "block";

    
    const caDisplay = p._caDisplay || p.querySelector(".tv-danmaku-comment-ca");
    if (caDisplay instanceof HTMLElement) {
      const caStr = String(ca || "");
      
      if (caStr.length > 10) {
        const head = caStr.slice(0, 6);
        const tail = caStr.slice(-4);
        caDisplay.textContent = `${head}...${tail}`;
      } else {
        caDisplay.textContent = caStr;
      }
      caDisplay.title = caStr; 
    }

    clearList(p);
    setTip(p, "加载中…");

    
    const url = joinHttp("/comments") + `?ca=${encodeURIComponent(String(ca || ""))}&limit=500`;
    try {
      const res = await fetch(url, { headers: { authorization: `Bearer ${String(token || "")}` } });
      let js = null;
      try {
        js = await res.json();
      } catch {
        js = null;
      }
      if (!res.ok) {
        const errorMsg = `加载失败（${res.status}）：${String(js?.detail || res.statusText || "")}`;
        setTip(p, errorMsg);
        
        
        if (res.status === 401) {
          
          if (window.__tvDanmakuContent?.showToast) {
            
            window.__tvDanmakuContent.showToast("加载评论失败：登录已过期，请重新登录", "error", 4000);
          }
        } else if (res.status >= 500) {
          
          if (window.__tvDanmakuContent?.showToast) {
            
            window.__tvDanmakuContent.showToast("加载评论失败：服务器错误，请稍后重试", "error", 4000);
          }
        } else if (res.status >= 400) {
          
          if (window.__tvDanmakuContent?.showToast) {
            
            window.__tvDanmakuContent.showToast(errorMsg, "error", 3000);
          }
        }
        
        
        const countDisplay = p._countDisplay || p.querySelector(".tv-danmaku-comment-count");
        if (countDisplay instanceof HTMLElement) {
          countDisplay.textContent = "";
        }
        return;
      }
      const list = Array.isArray(js?.comments) ? js.comments : [];
      currentComments = list;
      currentPage = 1;
      
      setTip(p, list.length ? "" : "暂无评论。");
      
      
      const countDisplay = p._countDisplay || p.querySelector(".tv-danmaku-comment-count");
      if (countDisplay instanceof HTMLElement) {
        countDisplay.textContent = list.length > 0 ? `(${list.length})` : "";
      }
      
      
      const sortBtn = p.querySelector(".tv-danmaku-comment-sort");
      if (sortBtn instanceof HTMLElement) {
        updateSortButton(sortBtn, sortMode);
      }
      
      
      renderComments(p);
    } catch (e) {
      
      if (e instanceof TypeError && e.message.includes("fetch")) {
        
        if (window.__tvDanmakuContent?.showToast) {
          
          window.__tvDanmakuContent.showToast("加载评论失败：网络错误，请检查网络连接", "error", 4000);
        }
        setTip(p, "加载失败：网络错误");
      } else {
        console.error("[comment_ui] loadComments error:", e);
        setTip(p, `加载失败：${String(e?.message || e)}`);
      }
      
      const countDisplay = p._countDisplay || p.querySelector(".tv-danmaku-comment-count");
      if (countDisplay instanceof HTMLElement) {
        countDisplay.textContent = "";
      }
    }
  }

  
  window.__tvDanmakuComments = { ensurePanel, open, close, setHttpBaseUrl, appendComment };
})();


