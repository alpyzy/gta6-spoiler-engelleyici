// GTA 6 Spoiler Engelleyici - Content Script v1.3

(() => {
  const DEFAULT_KEYWORDS = [
    "gta 6",
    "gta6",
    "gta vi",
    "gtavi",
    "grand theft auto 6",
    "grand theft auto vi",
    "grand theft auto",
    "g t a",
    "vice city",
    "leonida",
    "jason and lucia",
    "lucia and jason",
    "gta 6 leak",
    "gta 6 spoiler",
    "gta 6 trailer",
    "gta 6 fragman",
    "gta 6 sızıntı",
    "gta 6 oynanış",
    "gta 6 gameplay",
    "rockstar games gta"
  ];

  const DEFAULT_IGNORED_HOSTS = [
    "github.com",
    "gist.github.com",
    "raw.githubusercontent.com",
    "claude.ai",
    "chatgpt.com",
    "chat.openai.com",
    "gemini.google.com",
    "aistudio.google.com"
  ];

  let settings = {
    enabled: true,
    strictMode: false,
    customKeywords: [],
    remoteKeywords: [],
    blockedCount: 0,
    allowOnAiChats: false
  };

  let compiledRegex = null;

  const hostname = window.location.hostname.replace(/^www\./, '').toLowerCase();
  const isKick = hostname === 'kick.com' || hostname.endsWith('.kick.com');
  const isX = hostname === 'x.com' || hostname === 'twitter.com' || hostname.endsWith('.x.com') || hostname.endsWith('.twitter.com');

  const CONTAINER_SELECTORS = [
    // X / Twitter
    'article[data-testid="tweet"]',
    'div[data-testid="trend"]',
    'div[data-testid="UserCell"]',
    'div[data-testid="TypeaheadUser"]',

    // YouTube
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-reel-item-renderer',
    'ytd-shorts-lockup-view-model',
    'yt-lockup-view-model',
    'ytd-comment-thread-renderer',
    'ytd-playlist-renderer',
    'ytd-channel-renderer',
    'ytd-watch-metadata',

    // Reddit
    'shreddit-post',
    'shreddit-comment',
    'div[data-testid="post-container"]',
    '.Post',
    '.Comment',
    'faceplate-tracker[source="post"]',

    // Instagram
    'article',
    'div._aabd',
    'div._ac7v',
    'ul._a9z6 > div',

    // TikTok
    'div[data-e2e="recommend-list-item-container"]',
    'div[data-e2e="search_top-item"]',
    'div[data-e2e="comment-level-1"]',

    // Twitch
    'article[data-a-target="card-0"]'
  ].join(', ');

  function normalizeText(str) {
    if (!str) return '';
    return str
      .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildRegex() {
    const merged = [
      ...DEFAULT_KEYWORDS,
      ...(settings.customKeywords || []),
      ...(settings.remoteKeywords || [])
    ];
    const allKeywords = [...new Set(merged.map(k => (k || '').trim().toLowerCase()).filter(Boolean))];

    if (allKeywords.length === 0) {
      compiledRegex = null;
      return;
    }

    const patterns = allKeywords.map(kw => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return escaped.replace(/\s+/g, '[\\s\\-_.•]*');
    });

    compiledRegex = new RegExp(
      `(?:^|[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ])(${patterns.join('|')}|grand[\\s\\-_]*theft[\\s\\-_]*aut[o0]?)(?=$|[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ])`,
      'i'
    );
  }

  function findMatchedKeyword(rawText) {
    if (!compiledRegex || !rawText) return null;
    const text = normalizeText(rawText);
    if (!text) return null;

    // Eski GTA oyunlarını (GTA IV, GTA 4, GTA V, GTA 5, San Andreas) hariç tut
    const cleanedForOldGta = text
      .replace(/grand\s*theft\s*auto\s*(iv|4|v|5|iii|3|san\s*andreas|online)\b/gi, '')
      .replace(/\bgta\s*(iv|4|v|5|iii|3|san\s*andreas|online|rp)\b/gi, '');

    const match = cleanedForOldGta.match(compiledRegex);
    return match ? match[1] : null;
  }

  function extractElementSearchableText(el) {
    let text = el.innerText || el.textContent || '';
    const mediaAndLinks = el.querySelectorAll('img[alt], a[title], a[aria-label], [aria-label], [title]');
    for (let i = 0; i < mediaAndLinks.length; i++) {
      const node = mediaAndLinks[i];
      if (node.alt) text += ' ' + node.alt;
      if (node.title) text += ' ' + node.title;
      const aria = node.getAttribute('aria-label');
      if (aria) text += ' ' + aria;
    }
    return text;
  }

  // Elementi blurla ve üstüne kırmızı "GTA 6 SPOILER" katmanı ekle
  function applySpoilerBlock(container, matchedKeyword, options = {}) {
    if (!container || !container.isConnected) return;
    if (container.dataset.gta6Processed === 'revealed') return;

    // X (Twitter) veya başka bir React sitesi fareyle üzerine gelindiğinde (hover)
    // elementin className'ini sıfırlamış olabilir. Eğer daha önce 'blocked' işaretlendiyse
    // ama üzerinde '.gta6-spoiler-active' sınıfı veya '.gta6-spoiler-overlay' kalmadıysa tekrar uygula!
    if (container.dataset.gta6Processed === 'blocked') {
      if (!container.classList.contains('gta6-spoiler-active')) {
        container.classList.add('gta6-spoiler-container', 'gta6-spoiler-active');
      }
      if (!container.querySelector(':scope > .gta6-spoiler-overlay')) {
        delete container.dataset.gta6Processed;
      } else {
        return;
      }
    }

    if (container.parentElement && container.parentElement.closest('.gta6-spoiler-active')) {
      return;
    }

    if (!options.keepNested) {
      const nestedSpoilers = container.querySelectorAll('.gta6-spoiler-container');
      nestedSpoilers.forEach(nested => removeSpoilerBlock(nested, false));
    }

    container.dataset.gta6Processed = 'blocked';
    container.dataset.gta6Keyword = matchedKeyword || 'GTA 6';
    container.classList.add('gta6-spoiler-container', 'gta6-spoiler-active');

    if (container.children.length === 0) {
      container.classList.add('gta6-spoiler-leaf-blur');
    }

    const computedStyle = window.getComputedStyle(container);
    if (computedStyle.position === 'static') {
      container.classList.add('gta6-spoiler-pos-relative');
    }

    // İçeride oynayan video varsa durdur
    const videos = container.querySelectorAll('video');
    videos.forEach(v => {
      try {
        v.pause();
        v.muted = true;
      } catch (e) {}
    });

    const rect = container.getBoundingClientRect();
    const isCompact = options.forceCompact || (rect.height > 0 && rect.height < 95);

    const overlay = document.createElement('div');
    overlay.className = 'gta6-spoiler-overlay' + (isCompact ? ' gta6-spoiler-compact' : '');

    const badge = document.createElement('div');
    badge.className = 'gta6-spoiler-badge';
    badge.innerHTML = `<span>⚠️</span> <span>GTA 6 SPOILER</span>`;
    overlay.appendChild(badge);

    if (!isCompact) {
      const subtext = document.createElement('div');
      subtext.className = 'gta6-spoiler-subtext';
      subtext.innerHTML = `Bu içerik <span class="gta6-spoiler-keyword-tag">"${escapeHtml((matchedKeyword || 'GTA 6').toUpperCase())}"</span> içerdiği için gizlendi.`;
      overlay.appendChild(subtext);
    }

    if (!settings.strictMode) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gta6-spoiler-btn';
      btn.textContent = 'Yine de Göster';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (options.groupRoot) {
          options.groupRoot.dataset.gta6CardProcessed = 'revealed';
        }
        removeSpoilerBlock(container, true);
      });
      overlay.appendChild(btn);
    }

    // Fare olaylarının (hover, mouseenter, mouseover, pointerover) X/Twitter'a ulaşıp
    // tweet kartının class'larını değiştirmesini veya video otomatik oynatmasını engelle
    ['click', 'mouseenter', 'mouseover', 'mousemove', 'pointerenter', 'pointerover'].forEach(evtName => {
      overlay.addEventListener(evtName, (e) => {
        e.stopPropagation();
        if (evtName === 'click') {
          e.preventDefault();
        }
      });
    });

    container.appendChild(overlay);
    incrementBlockedCount();
  }

  function removeSpoilerBlock(container, markAsRevealed = false) {
    if (!container) return;
    container.classList.remove(
      'gta6-spoiler-active',
      'gta6-spoiler-container',
      'gta6-spoiler-pos-relative',
      'gta6-spoiler-leaf-blur'
    );
    const overlays = container.querySelectorAll(':scope > .gta6-spoiler-overlay');
    overlays.forEach(o => o.remove());

    const keptVisible = container.querySelectorAll('.gta6-kick-keep-visible');
    keptVisible.forEach(el => el.classList.remove('gta6-kick-keep-visible'));

    if (markAsRevealed) {
      container.dataset.gta6Processed = 'revealed';
    } else {
      delete container.dataset.gta6Processed;
    }
  }

  function removeAllSpoilers() {
    const blocked = document.querySelectorAll('[data-gta6-processed]');
    blocked.forEach(el => removeSpoilerBlock(el, false));
    const kickCards = document.querySelectorAll('[data-gta6-card-processed]');
    kickCards.forEach(el => delete el.dataset.gta6CardProcessed);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let countUpdateTimeout = null;
  let pendingCountIncrements = 0;

  function incrementBlockedCount() {
    pendingCountIncrements++;
    if (countUpdateTimeout) return;
    countUpdateTimeout = setTimeout(() => {
      const inc = pendingCountIncrements;
      pendingCountIncrements = 0;
      countUpdateTimeout = null;
      try {
        chrome.storage.local.get(['blockedCount'], (res) => {
          const current = res.blockedCount || 0;
          chrome.storage.local.set({ blockedCount: current + inc });
        });
      } catch (e) {}
    }, 800);
  }

  // ============================================================================
  // KICK.COM ÖZEL TARAYICI (v1.3)
  // - Sol taraftaki Takip Edilen Kanallar listesine HİÇ DOKUNMAZ (kimin GTA oynadığı açıkça görünür).
  // - Gözat ve Ana Sayfadaki yayın kartlarında:
  //   Başlık, Yayıncı İsmi, Yayıncı Logosu, Kategori ve İzleyici Sayısı AÇIK KALIR.
  //   SADECE Yayın Önizleme Görseli (Thumbnail) blurlanır!
  // ============================================================================
  function scanKickPage() {
    const allImages = document.querySelectorAll('img');
    const candidateCards = new Set();

    allImages.forEach(img => {
      // Sol menüdeki (Takip Edilen Kanallar) hiçbir görsele dokunma
      if (img.closest('aside, nav, [class*="sidebar"]')) return;

      const rect = img.getBoundingClientRect();
      // Yayın önizleme (thumbnail) görselleri: genişliği >= 170px, yüksekliği >= 95px ve yatay (16:9) olanlar
      if (rect.width >= 170 && rect.height >= 95 && rect.width > rect.height * 1.3) {
        let thumbWrapper = img.closest('a') || img.parentElement;
        let current = thumbWrapper;
        let cardRoot = null;

        for (let depth = 0; depth < 6 && current && current.parentElement; depth++) {
          current = current.parentElement;
          if (current.tagName === 'BODY' || current.tagName === 'MAIN') break;
          const cRect = current.getBoundingClientRect();
          if (
            Math.abs(cRect.width - rect.width) < 40 &&
            cRect.height > rect.height + 35 &&
            cRect.height < rect.height + 185
          ) {
            cardRoot = current;
          }
        }

        if (cardRoot) {
          candidateCards.add({ card: cardRoot, thumbImg: img });
        }
      }
    });

    candidateCards.forEach(({ card, thumbImg }) => {
      if (card.dataset.gta6CardProcessed === 'revealed') return;

      const cardText = extractElementSearchableText(card);
      const matched = findMatchedKeyword(cardText);
      if (!matched) return;

      card.dataset.gta6CardProcessed = 'blocked';

      // SADECE Thumbnail (Önizleme) kutusunu bul ve blurla!
      // Altındaki yayıncı logosu, yayıncı ismi, yayın başlığı ve kategori etiketlerine HİÇ DOKUNMA!
      const thumbRect = thumbImg.getBoundingClientRect();
      let thumbContainer = thumbImg.parentElement;
      while (
        thumbContainer &&
        thumbContainer.parentElement &&
        thumbContainer.parentElement !== card &&
        Math.abs(thumbContainer.parentElement.getBoundingClientRect().height - thumbRect.height) < 16
      ) {
        thumbContainer = thumbContainer.parentElement;
      }

      if (thumbContainer) {
        // Sol üst köşedeki İzleyici Sayısı (• 39,5 B / LIVE) rozetini blur üstünde net görünür tut
        const badges = thumbContainer.querySelectorAll('span, div');
        badges.forEach(b => {
          const bRect = b.getBoundingClientRect();
          if (
            bRect.width > 18 &&
            bRect.width < 125 &&
            bRect.height > 14 &&
            bRect.height < 38 &&
            bRect.top - thumbRect.top < 25 &&
            bRect.left - thumbRect.left < 35
          ) {
            const bText = (b.innerText || '').trim();
            if (bText && (/\d/.test(bText) || /live|canlı/i.test(bText))) {
              b.classList.add('gta6-kick-keep-visible');
            }
          }
        });

        applySpoilerBlock(thumbContainer, matched, { groupRoot: card, keepNested: true });
      }
    });
  }

  // ============================================================================
  // GENEL SOSYAL MEDYA TARAYICISI
  // ============================================================================
  function scanPage(root = document) {
    if (!settings.enabled || !compiledRegex) return;

    if (!settings.allowOnAiChats && DEFAULT_IGNORED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))) {
      return;
    }

    if (isKick) {
      scanKickPage();
      return;
    }

    // Daha önce blurlanmış ama React/X hover yüzünden class'ı silinmiş elementleri onar
    const previouslyBlocked = document.querySelectorAll('[data-gta6-processed="blocked"]');
    previouslyBlocked.forEach(el => {
      if (!el.classList.contains('gta6-spoiler-active') || !el.querySelector(':scope > .gta6-spoiler-overlay')) {
        applySpoilerBlock(el, el.dataset.gta6Keyword || 'GTA 6');
      }
    });

    const containers = root.querySelectorAll
      ? root.querySelectorAll(CONTAINER_SELECTORS)
      : [];

    containers.forEach(container => {
      if (container.dataset.gta6Processed) return;
      if (container.tagName === 'BODY' || container.tagName === 'MAIN') return;

      const text = extractElementSearchableText(container);
      const matched = findMatchedKeyword(text);
      if (matched) {
        applySpoilerBlock(container, matched);
      }
    });

    if (isX) {
      return;
    }

    const genericNodes = root.querySelectorAll
      ? root.querySelectorAll('h1, h2, h3, h4, p, li, a, figcaption, blockquote')
      : [];

    genericNodes.forEach(node => {
      if (node.dataset.gta6Processed) return;
      if (node.closest('.gta6-spoiler-active') || node.closest('.gta6-spoiler-overlay')) return;

      const directText = (node.innerText || node.textContent || '').trim();
      if (!directText || directText.length > 1200) return;

      const matched = findMatchedKeyword(directText);
      if (matched) {
        const cardParent =
          node.closest(CONTAINER_SELECTORS) ||
          node.closest('article, figure, [role="article"]');

        if (cardParent && cardParent.tagName !== 'BODY' && cardParent.tagName !== 'MAIN') {
          const rect = cardParent.getBoundingClientRect();
          if (rect.height < window.innerHeight * 0.75 && rect.width < window.innerWidth * 0.85) {
            applySpoilerBlock(cardParent, matched);
            return;
          }
        }
        applySpoilerBlock(node, matched);
      }
    });
  }

  let scanScheduled = false;
  function scheduleScan() {
    if (scanScheduled || !settings.enabled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      setTimeout(() => {
        scanScheduled = false;
        scanPage(document);
      }, 150);
    });
  }

  function initObserver() {
    const observer = new MutationObserver((mutations) => {
      if (!settings.enabled) return;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];

        // Eğer X/Twitter fareyle üzerine gelindiğinde blurlu bir tweet'in class attribute'unu değiştirdiyse ANINDA geri yükle!
        if (m.type === 'attributes' && m.target && m.target.dataset && m.target.dataset.gta6Processed === 'blocked') {
          if (!m.target.classList.contains('gta6-spoiler-active')) {
            m.target.classList.add('gta6-spoiler-container', 'gta6-spoiler-active');
          }
          continue;
        }

        if (m.addedNodes && m.addedNodes.length > 0) {
          for (let j = 0; j < m.addedNodes.length; j++) {
            const node = m.addedNodes[j];
            if (node.nodeType === 1 && !node.classList.contains('gta6-spoiler-overlay')) {
              scheduleScan();
              return;
            }
          }
        }
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  function loadSettingsAndStart() {
    try {
      chrome.storage.local.get(
        ['enabled', 'strictMode', 'customKeywords', 'remoteKeywords', 'allowOnAiChats'],
        (res) => {
          settings.enabled = res.enabled !== undefined ? res.enabled : true;
          settings.strictMode = res.strictMode !== undefined ? res.strictMode : false;
          settings.customKeywords = Array.isArray(res.customKeywords) ? res.customKeywords : [];
          settings.remoteKeywords = Array.isArray(res.remoteKeywords) ? res.remoteKeywords : [];
          settings.allowOnAiChats = res.allowOnAiChats !== undefined ? res.allowOnAiChats : false;

          buildRegex();
          if (settings.enabled) {
            scanPage(document);
          }
          initObserver();
        }
      );

      chrome.storage.onChanged.addListener((changes) => {
        if (changes.enabled) {
          settings.enabled = changes.enabled.newValue;
          if (!settings.enabled) {
            removeAllSpoilers();
          } else {
            scanPage(document);
          }
        }
        if (changes.strictMode) {
          settings.strictMode = changes.strictMode.newValue;
          removeAllSpoilers();
          if (settings.enabled) scanPage(document);
        }
        if (changes.customKeywords || changes.remoteKeywords) {
          if (changes.customKeywords) settings.customKeywords = changes.customKeywords.newValue || [];
          if (changes.remoteKeywords) settings.remoteKeywords = changes.remoteKeywords.newValue || [];
          buildRegex();
          removeAllSpoilers();
          if (settings.enabled) scanPage(document);
        }
      });
    } catch (e) {
      buildRegex();
      scanPage(document);
      initObserver();
    }
  }

  window.addEventListener('scroll', () => {
    scheduleScan();
  }, { passive: true });

  loadSettingsAndStart();
})();
