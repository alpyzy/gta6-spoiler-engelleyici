// GTA 6 Spoiler Engelleyici - Background Service Worker (Uzaktan Tek Tuşla Güncelleme Motoru)

// Arkadaşlarına dağıttığında tüm eklentilerin ortak olarak kelime listesini çekebileceği Uzak JSON URL'si.
// Popup üzerinden bir GitHub Gist / Raw URL girdiğinde veya "Şimdi Senkronize Et" dediğinde burası çalışır.

const ALARM_NAME = 'gta6_remote_sync';
const DEFAULT_REMOTE_URL = 'https://raw.githubusercontent.com/alpyzy/gta6-spoiler-engelleyici/main/ortak-liste.json';

async function syncRemoteConfig() {
  try {
    const data = await chrome.storage.local.get(['remoteConfigUrl']);
    const url = (data.remoteConfigUrl || DEFAULT_REMOTE_URL).trim();
    if (!url) return { ok: false, reason: 'URL tanımlanmamış' };

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return { ok: false, reason: 'HTTP ' + response.status };
    }

    const json = await response.json();
    const remoteKeywords = Array.isArray(json.keywords)
      ? json.keywords.map(k => String(k).trim().toLowerCase()).filter(Boolean)
      : [];

    await chrome.storage.local.set({
      remoteKeywords,
      remoteVersion: json.version || '1.0',
      lastSyncTime: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    });

    return { ok: true, count: remoteKeywords.length, version: json.version };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 30 });
  syncRemoteConfig();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    syncRemoteConfig();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'SYNC_REMOTE_NOW') {
    syncRemoteConfig().then(res => sendResponse(res));
    return true; // async response
  }
});
