document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggleEnabled');
  const toggleStrict = document.getElementById('toggleStrict');
  const blockedCountEl = document.getElementById('blockedCount');
  const keywordInput = document.getElementById('keywordInput');
  const addKeywordBtn = document.getElementById('addKeywordBtn');
  const keywordList = document.getElementById('keywordList');
  const remoteUrlInput = document.getElementById('remoteUrlInput');
  const syncNowBtn = document.getElementById('syncNowBtn');
  const syncStatus = document.getElementById('syncStatus');

  let customKeywords = [];

  function renderKeywords() {
    keywordList.innerHTML = '';
    if (customKeywords.length === 0) {
      const empty = document.createElement('span');
      empty.style.fontSize = '11px';
      empty.style.color = '#64748b';
      empty.textContent = 'Varsayılan: GTA 6, GTA VI, Lucia, Jason, Vice City, Leonida...';
      keywordList.appendChild(empty);
      return;
    }

    customKeywords.forEach((kw, idx) => {
      const chip = document.createElement('div');
      chip.className = 'keyword-chip';
      chip.innerHTML = `<span>${kw}</span>`;

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.title = 'Kaldır';
      removeBtn.addEventListener('click', () => {
        customKeywords.splice(idx, 1);
        chrome.storage.local.set({ customKeywords });
        renderKeywords();
      });

      chip.appendChild(removeBtn);
      keywordList.appendChild(chip);
    });
  }

  chrome.storage.local.get(
    ['enabled', 'strictMode', 'blockedCount', 'customKeywords', 'remoteConfigUrl', 'lastSyncTime', 'remoteKeywords'],
    (res) => {
      toggleEnabled.checked = res.enabled !== undefined ? res.enabled : true;
      toggleStrict.checked = res.strictMode !== undefined ? res.strictMode : false;
      blockedCountEl.textContent = res.blockedCount || 0;
      customKeywords = Array.isArray(res.customKeywords) ? res.customKeywords : [];
      remoteUrlInput.value = res.remoteConfigUrl || 'https://raw.githubusercontent.com/alpyzy/gta6-spoiler-engelleyici/main/ortak-liste.json';
      if (res.lastSyncTime) {
        const count = Array.isArray(res.remoteKeywords) ? res.remoteKeywords.length : 0;
        syncStatus.textContent = `✓ ${count} kelime (${res.lastSyncTime})`;
      }
      renderKeywords();
    }
  );

  toggleEnabled.addEventListener('change', () => {
    chrome.storage.local.set({ enabled: toggleEnabled.checked });
  });

  toggleStrict.addEventListener('change', () => {
    chrome.storage.local.set({ strictMode: toggleStrict.checked });
  });

  function addKeyword() {
    const val = keywordInput.value.trim().toLowerCase();
    if (!val) return;
    if (!customKeywords.includes(val)) {
      customKeywords.push(val);
      chrome.storage.local.set({ customKeywords });
      renderKeywords();
    }
    keywordInput.value = '';
  }

  addKeywordBtn.addEventListener('click', addKeyword);
  keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addKeyword();
  });

  syncNowBtn.addEventListener('click', () => {
    const url = remoteUrlInput.value.trim();
    chrome.storage.local.set({ remoteConfigUrl: url }, () => {
      if (!url) {
        syncStatus.style.color = '#94a3b8';
        syncStatus.textContent = 'URL temizlendi';
        return;
      }
      syncStatus.style.color = '#fbbf24';
      syncStatus.textContent = 'Güncelleniyor...';
      chrome.runtime.sendMessage({ type: 'SYNC_REMOTE_NOW' }, (res) => {
        if (res && res.ok) {
          syncStatus.style.color = '#4ade80';
          syncStatus.textContent = `✓ ${res.count} kelime çekildi`;
        } else {
          syncStatus.style.color = '#f87171';
          syncStatus.textContent = 'Hata: ' + ((res && res.reason) || 'Bağlanamadı');
        }
      });
    });
  });
});
