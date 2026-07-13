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
  try {
    localStorage.removeItem(LAST_SEARCH_KEY);
    return true;
  } catch (error) {
    console.warn("保存された検索条件を削除できませんでした。", error);
    return false;
  }
}

export function loadDecisions() {
  try {
    return safelyParse(localStorage.getItem(DECISIONS_KEY), {});
  } catch (error) {
    console.warn("保存された論文判定へアクセスできませんでした。", error);
    return {};
  }
}

export function saveDecision(pmid, decision) {
  const decisions = loadDecisions();
  decisions[pmid] = {
    status: decision.status ?? "unreviewed",
    reason: decision.reason ?? "",
    note: decision.note ?? "",
    updatedAt: new Date().toISOString()
  };
  return safelySet(DECISIONS_KEY, decisions);
}

export function loadDecision(pmid) {
  return loadDecisions()[pmid] ?? {
    status: "unreviewed",
    reason: "",
    note: ""
  };
}
