import { buildPubMedQuery, validateSearchForm } from "./query-builder.js";
import { clearLastSearch, loadLastSearch, saveLastSearch } from "./storage.js";
import { renderArticles } from "./article-renderer.js";

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
  mockSearchButton: document.querySelector("#mock-search-button"),
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

const mockArticles = [
  {
    pmid: "DEMO-001",
    title: "Shorter versus longer antimicrobial treatment for bloodstream infection: a systematic review",
    authors: ["Sample A", "Sample B"],
    journal: "Demo Journal of Infectious Diseases",
    year: "2026",
    doi: "10.0000/demo.001",
    publicationTypes: ["Systematic Review"]
  },
  {
    pmid: "DEMO-002",
    title: "Clinical practice guidance for management of complicated bacteremia",
    authors: ["Example C", "Example D"],
    journal: "Clinical Demo Guidance",
    year: "2025",
    publicationTypes: ["Practice Guideline"]
  },
  {
    pmid: "DEMO-003",
    title: "Seven versus fourteen days of therapy in stable patients: a randomized trial",
    authors: ["Trial E", "Trial F"],
    journal: "International Demo Medicine",
    year: "2024",
    doi: "10.0000/demo.003",
    publicationTypes: ["Randomized Controlled Trial"]
  },
  {
    pmid: "DEMO-004",
    title: "Treatment duration and recurrence in a multicenter cohort",
    authors: ["Cohort G", "Cohort H"],
    journal: "Observational Research Demo",
    year: "2023",
    publicationTypes: ["Observational Study", "Cohort Study"]
  },
  {
    pmid: "DEMO-005",
    title: "Early oral step-down therapy: a case-control analysis",
    authors: ["Study I"],
    journal: "Demo Antimicrobial Practice",
    year: "2022",
    publicationTypes: ["Case-Control Studies"]
  },
  {
    pmid: "DEMO-006",
    title: "Unexpected relapse after abbreviated therapy: a case report",
    authors: [],
    journal: "Demo Case Reports",
    year: "2021",
    publicationTypes: ["Case Reports"]
  },
  {
    pmid: "DEMO-007",
    title: "Laboratory characteristics associated with persistent bacteremia",
    authors: ["Researcher J", "Researcher K"],
    journal: "Microbiology Demo",
    year: "2020",
    publicationTypes: ["Journal Article"]
  }
];

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

elements.mockSearchButton.addEventListener("click", () => {
  if (!elements.queryTextarea.value.trim()) {
    showMessage("検索式を作成してください。", "error");
    return;
  }
  saveCurrentState();
  const requestedLimit = Number(elements.resultLimit.value);
  const displayed = mockArticles.slice(0, Math.min(requestedLimit, mockArticles.length));
  elements.resultSummary.textContent = `Phase 1 仮データ：該当件数 326件 ／ 今回の表示 ${displayed.length}件 ／ ${elements.sortOrder.value === "pub_date" ? "新しい順" : "関連度順"}`;
  renderArticles(elements.articleGroups, displayed);
  elements.resultsSection.hidden = false;
  elements.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

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
