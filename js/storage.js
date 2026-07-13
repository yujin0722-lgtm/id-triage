const LAST_SEARCH_KEY = "id-paper-triage:last-search:v1";
const DECISIONS_KEY = "id-paper-triage:decisions:v1";

function safelyParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("保存データを読み取れませんでした。", error);
    return fallback;
  }
}

function safelySet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("ブラウザへデータを保存できませんでした。", error);
    return false;
  }
}

function safelyRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn("保存データを削除できませんでした。", error);
    return false;
  }
}

export function saveLastSearch(data) {
  return safelySet(LAST_SEARCH_KEY, { ...data, updatedAt: new Date().toISOString() });
}

export function loadLastSearch() {
  try {
    return safelyParse(localStorage.getItem(LAST_SEARCH_KEY), null);
  } catch (error) {
    console.warn("保存された検索条件へアクセスできませんでした。", error);
    return null;
  }
}

export function clearLastSearch() {
  return safelyRemove(LAST_SEARCH_KEY);
}

export function loadDecisions() {
  try {
    const decisions = safelyParse(localStorage.getItem(DECISIONS_KEY), {});
    return decisions && typeof decisions === "object" && !Array.isArray(decisions) ? decisions : {};
  } catch (error) {
    console.warn("保存された論文判定へアクセスできませんでした。", error);
    return {};
  }
}

export function saveDecision(pmid, decision) {
  const decisions = loadDecisions();
  const normalizedDecision = {
    status: decision.status ?? "unreviewed",
    reason: decision.reason ?? "",
    note: decision.note ?? "",
    updatedAt: new Date().toISOString()
  };

  // 初期状態へ戻した論文は保存対象から外し、保存件数を実際の判定数と一致させる。
  if (
    normalizedDecision.status === "unreviewed" &&
    !normalizedDecision.reason &&
    !normalizedDecision.note
  ) {
    delete decisions[pmid];
  } else {
    decisions[pmid] = normalizedDecision;
  }

  return safelySet(DECISIONS_KEY, decisions);
}

export function loadDecision(pmid) {
  return loadDecisions()[pmid] ?? {
    status: "unreviewed",
    reason: "",
    note: ""
  };
}

export function clearAllDecisions() {
  return safelyRemove(DECISIONS_KEY);
}

export function clearAllStoredData() {
  const searchCleared = clearLastSearch();
  const decisionsCleared = clearAllDecisions();
  return searchCleared && decisionsCleared;
}

export function getStorageSummary() {
  const lastSearch = loadLastSearch();
  const decisions = loadDecisions();
  return {
    hasLastSearch: Boolean(lastSearch?.form),
    lastSearchUpdatedAt: lastSearch?.updatedAt ?? "",
    decisionCount: Object.keys(decisions).length
  };
}
