import { buildPubMedQuery, validateSearchForm } from "./query-builder.js?v=2.0.0";
import { clearLastSearch, loadLastSearch, saveLastSearch } from "./storage.js?v=2.0.0";
import { renderArticles, renderEmptyResults } from "./article-renderer.js?v=2.0.0";
import { PubMedApiError, searchPubMed } from "./pubmed-api.js?v=2.0.0";

const CURRENT_YEAR = new Date().getFullYear();

const elements = {
  form: document.querySelector("#search-form"),
  subjectInput: document.querySelector("#subject-input"),
  clinicalTheme: document.querySelector("#clinical-theme"),
  studyDesigns: [...document.querySelectorAll('input[name="studyDesigns"]')],
  startYear: document.querySelector("#start-year"),
  endYear: document.querySelector("#end-year"),
  resultLimit: document.querySelector("#result-limit"),
  sortOrder: document.querySelector("#sort-order"),
  subjectError: document.querySelector("#subject-error"),
  yearError: document.querySelector("#year-error"),
  querySection: document.querySelector("#query-section"),
  conversionSummary: document.querySelector("#conversion-summary"),
  queryTextarea: document.querySelector("#query-textarea"),
  manualEditBadge: document.querySelector("#manual-edit-badge"),
  searchButton: document.querySelector("#pubmed-search-button"),
  copyQueryButton: document.querySelector("#copy-query-button"),
  backToInputButton: document.querySelector("#back-to-input-button"),
  clearButton: document.querySelector("#clear-button"),
  resultsSection: document.querySelector("#results-section"),
  resultSummary: document.querySelector("#result-summary"),
  articleGroups: document.querySelector("#article-groups"),
  globalMessage: document.querySelector("#global-message")
};

let generatedQuery = "";
let currentConversion = null;
let isManuallyEdited = false;
let isSearching = false;

function getFormValues() {
  return {
    subjectInput: elements.subjectInput.value,
    clinicalTheme: elements.clinicalTheme.value,
    studyDesigns: elements.studyDesigns.filter(input => input.checked).map(input => input.value),
    startYear: elements.startYear.value,
    endYear: elements.endYear.value,
    resultLimit: Number(elements.resultLimit.value),
    sortOrder: elements.sortOrder.value
  };
}

function setFormValues(form = {}) {
  elements.subjectInput.value = form.subjectInput ?? "";
  elements.clinicalTheme.value = form.clinicalTheme ?? "none";
  elements.studyDesigns.forEach(input => {
    input.checked = Array.isArray(form.studyDesigns) && form.studyDesigns.includes(input.value);
  });
  elements.startYear.value = form.startYear ?? "";
  elements.endYear.value = form.endYear ?? CURRENT_YEAR;
  elements.resultLimit.value = String(form.resultLimit ?? 20);
  elements.sortOrder.value = form.sortOrder ?? "relevance";
}

function showMessage(text, type = "info") {
  elements.globalMessage.textContent = text;
  elements.globalMessage.className = `message${type === "error" ? " error" : ""}`;
  elements.globalMessage.hidden = false;
}

function clearMessage() {
  elements.globalMessage.hidden = true;
  elements.globalMessage.textContent = "";
}

function showErrors(errors) {
  elements.subjectError.hidden = !errors.subject;
  elements.subjectError.textContent = errors.subject ?? "";
  elements.yearError.hidden = !errors.year;
  elements.yearError.textContent = errors.year ?? "";
  elements.subjectInput.setAttribute("aria-invalid", String(Boolean(errors.subject)));
  elements.startYear.setAttribute("aria-invalid", String(Boolean(errors.year)));
  elements.endYear.setAttribute("aria-invalid", String(Boolean(errors.year)));
}

function renderConversion(result) {
  const { subjectConversion, details } = result;
  const addedTerms = subjectConversion.addedTerms.length
    ? `<ul class="term-list">${subjectConversion.addedTerms.map(term => `<li>${escapeHtml(term)}</li>`).join("")}</ul>`
    : "なし";
  const themeTerms = details.clinicalThemeTerms.length
    ? `<ul class="term-list">${details.clinicalThemeTerms.map(term => `<li><code>${escapeHtml(term)}</code></li>`).join("")}</ul>`
    : "追加なし";
  const designTerms = details.studyDesignTerms.length
    ? `<ul class="term-list">${details.studyDesignTerms.map(term => `<li><code>${escapeHtml(term)}</code></li>`).join("")}</ul>`
    : "追加なし";

  elements.conversionSummary.innerHTML = `
    <h3>検索語の変換内容</h3>
    <dl class="conversion-list">
      <div class="conversion-item"><dt>利用者が入力した主題</dt><dd>${escapeHtml(subjectConversion.originalInput)}</dd></div>
      <div class="conversion-item"><dt>主題辞書との一致</dt><dd>${subjectConversion.matched ? `あり（${escapeHtml(subjectConversion.matchedLabel)}）` : "なし"}<br><span class="help-text">${escapeHtml(subjectConversion.explanation)}</span></dd></div>
      <div class="conversion-item"><dt>アプリが追加した主題表現</dt><dd>${addedTerms}</dd></div>
      <div class="conversion-item"><dt>作成した主題検索ブロック</dt><dd><pre class="query-preview">${escapeHtml(subjectConversion.queryBlock)}</pre></dd></div>
      <div class="conversion-item"><dt>臨床テーマ</dt><dd>${escapeHtml(details.clinicalThemeLabel)}${themeTerms === "追加なし" ? "（追加なし）" : themeTerms}</dd></div>
      <div class="conversion-item"><dt>研究デザイン条件</dt><dd>${details.studyDesignLabels.length ? escapeHtml(details.studyDesignLabels.join("、")) : "未選択"}${designTerms === "追加なし" ? "（追加なし）" : designTerms}</dd></div>
      <div class="conversion-item"><dt>発表年条件</dt><dd>${details.dateBlock ? `<code>${escapeHtml(details.dateBlock)}</code>` : "追加なし"}</dd></div>
    </dl>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saveCurrentState() {
  saveLastSearch({
    form: getFormValues(),
    subjectConversion: currentConversion,
    generatedQuery,
    editedQuery: elements.queryTextarea.value,
    isManuallyEdited
  });
}

function updateManualEditState() {
  isManuallyEdited = Boolean(generatedQuery) && elements.queryTextarea.value !== generatedQuery;
  elements.manualEditBadge.hidden = !isManuallyEdited;
  saveCurrentState();
}

function generateQuery({ scroll = true } = {}) {
  clearMessage();
  const formValues = getFormValues();
  const errors = validateSearchForm(formValues, CURRENT_YEAR);
  showErrors(errors);

  if (Object.keys(errors).length > 0) {
    if (errors.subject) elements.subjectInput.focus();
    else elements.startYear.focus();
    return false;
  }

  const result = buildPubMedQuery(formValues, CURRENT_YEAR);
  generatedQuery = result.query;
  currentConversion = result.subjectConversion;
  isManuallyEdited = false;
  elements.queryTextarea.value = generatedQuery;
  elements.manualEditBadge.hidden = true;
  renderConversion(result);
  elements.querySection.hidden = false;
  saveCurrentState();

  if (scroll) elements.querySection.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function restoreState() {
  elements.endYear.value = CURRENT_YEAR;
  const saved = loadLastSearch();
  if (!saved?.form) return;

  setFormValues(saved.form);
  generatedQuery = saved.generatedQuery ?? "";
  currentConversion = saved.subjectConversion ?? null;
  isManuallyEdited = Boolean(saved.isManuallyEdited);

  if (generatedQuery) {
    const rebuilt = buildPubMedQuery(getFormValues(), CURRENT_YEAR);
    renderConversion(rebuilt);
    elements.queryTextarea.value = saved.editedQuery || generatedQuery;
    elements.querySection.hidden = false;
    elements.manualEditBadge.hidden = !isManuallyEdited;
  }
  showMessage("前回の検索条件と検索式を復元しました。");
}

function setSearchingState(searching) {
  isSearching = searching;
  elements.searchButton.disabled = searching;
  elements.searchButton.textContent = searching ? "PubMedを検索しています……" : "PubMedを検索";
  elements.querySection.setAttribute("aria-busy", String(searching));
}

function errorMessageFor(error) {
  if (!(error instanceof PubMedApiError)) {
    return "PubMedとの通信に失敗しました。インターネット接続を確認して、もう一度検索してください。";
  }

  switch (error.code) {
    case "rate-limit":
      return "短時間に検索が繰り返されました。少し時間を空けて、もう一度検索してください。";
    case "timeout":
      return "PubMedからの応答が時間内に得られませんでした。少し時間を空けて、もう一度検索してください。";
    case "invalid-response":
    case "api":
      return "PubMedから取得した情報を読み取れませんでした。時間を空けて再度お試しください。";
    case "invalid-query":
      return "検索式が空です。検索式を作成してから検索してください。";
    case "network":
    case "http":
    default:
      return "PubMedとの通信に失敗しました。インターネット接続を確認して、もう一度検索してください。";
  }
}

function sortLabel(value) {
  return value === "pub_date" ? "新しい順" : "関連度順";
}

async function executePubMedSearch() {
  if (isSearching) return;

  const query = elements.queryTextarea.value.trim();
  if (!query) {
    showMessage("検索式を作成してください。", "error");
    return;
  }

  clearMessage();
  saveCurrentState();
  setSearchingState(true);
  elements.resultsSection.hidden = false;
  elements.resultSummary.textContent = "PubMedを検索しています……";
  elements.articleGroups.replaceChildren();
  elements.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const formValues = getFormValues();
    const result = await searchPubMed({
      query,
      resultLimit: formValues.resultLimit,
      sortOrder: formValues.sortOrder
    });

    elements.resultSummary.textContent = `該当件数：${result.total.toLocaleString("ja-JP")}件 ／ 今回の表示：${result.articles.length}件 ／ 並び順：${sortLabel(formValues.sortOrder)}`;

    if (result.articles.length === 0) {
      renderEmptyResults(elements.articleGroups);
    } else {
      renderArticles(elements.articleGroups, result.articles);
    }
  } catch (error) {
    console.error("PubMed search failed:", error);
    elements.resultsSection.hidden = true;
    elements.articleGroups.replaceChildren();
    showMessage(errorMessageFor(error), "error");
  } finally {
    setSearchingState(false);
  }
}

elements.form.addEventListener("submit", event => {
  event.preventDefault();
  generateQuery();
});

elements.queryTextarea.addEventListener("input", updateManualEditState);

elements.copyQueryButton.addEventListener("click", async () => {
  const query = elements.queryTextarea.value.trim();
  if (!query) return showMessage("コピーする検索式がありません。", "error");
  try {
    await navigator.clipboard.writeText(query);
    showMessage("検索式をコピーしました。");
  } catch (error) {
    console.warn(error);
    elements.queryTextarea.select();
    showMessage("検索式を選択しました。Ctrl+Cでコピーしてください。");
  }
});

elements.backToInputButton.addEventListener("click", () => {
  document.querySelector("#search-input-section").scrollIntoView({ behavior: "smooth", block: "start" });
  elements.subjectInput.focus({ preventScroll: true });
});

elements.searchButton.addEventListener("click", executePubMedSearch);

elements.clearButton.addEventListener("click", () => {
  elements.form.reset();
  elements.endYear.value = CURRENT_YEAR;
  elements.resultLimit.value = "20";
  elements.sortOrder.value = "relevance";
  generatedQuery = "";
  currentConversion = null;
  isManuallyEdited = false;
  elements.queryTextarea.value = "";
  elements.querySection.hidden = true;
  elements.resultsSection.hidden = true;
  elements.articleGroups.replaceChildren();
  elements.manualEditBadge.hidden = true;
  showErrors({});
  clearLastSearch();
  showMessage("検索条件と検索式をクリアしました。論文ごとの判定は残っています。");
  elements.subjectInput.focus();
});

// 入力途中も保存する。検索式を作成済みの場合は、検索式と入力条件の不一致を避けるため、
// 次回の「検索式を作成」までは既存の検索式を保持する。
elements.form.addEventListener("change", () => saveCurrentState());
elements.subjectInput.addEventListener("input", () => saveCurrentState());

restoreState();
