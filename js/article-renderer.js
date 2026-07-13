import {
  classifyArticleDetailed,
  groupArticles
} from "./article-classifier.js?v=0.1.0";
import { loadDecision, saveDecision } from "./storage.js?v=0.1.0";

const STATUS_LABELS = {
  unreviewed: "未判定",
  read: "読む",
  hold: "保留",
  exclude: "除外"
};

const VALID_STATUSES = new Set(Object.keys(STATUS_LABELS));

const EXCLUSION_REASONS = [
  ["", "除外理由を選択"],
  ["wrong-population", "対象患者が違う"],
  ["wrong-disease", "病原体・疾患が違う"],
  ["wrong-intervention", "介入が違う"],
  ["wrong-outcome", "評価項目が違う"],
  ["wrong-design", "研究デザインが目的と違う"],
  ["case-report", "症例報告"],
  ["too-old", "古すぎる"],
  ["duplicate", "重複"],
  ["other", "その他"]
];

function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => element.setAttribute(key, value));
  }
  return element;
}

function normalizedStatus(status) {
  return VALID_STATUSES.has(status) ? status : "unreviewed";
}

function statusText(decision) {
  const status = normalizedStatus(decision.status);
  if (status !== "exclude") return STATUS_LABELS[status];
  const reasonLabel = EXCLUSION_REASONS.find(([value]) => value === decision.reason)?.[1];
  return reasonLabel && decision.reason ? `除外：${reasonLabel}` : "除外";
}

function formatAuthors(authors = []) {
  if (!authors.length) return "著者情報なし";
  if (authors.length <= 6) return authors.join(", ");
  return `${authors.slice(0, 6).join(", ")}, et al.`;
}

function formatCitation(article) {
  const volumeIssue = article.volume
    ? `${article.volume}${article.issue ? `(${article.issue})` : ""}`
    : "";
  const pagePart = article.pages ? `${volumeIssue ? ":" : ""}${article.pages}` : "";
  const bibliographicPart = `${volumeIssue}${pagePart}`;

  return [article.journal, article.year, bibliographicPart].filter(Boolean).join(". ");
}

function classificationDisplayText(classification) {
  return classification.groupLabel === classification.designLabel
    ? classification.groupLabel
    : `${classification.groupLabel} ／ ${classification.designLabel}`;
}

function createIdentifier(label, value, href) {
  const wrapper = createElement("span", { className: "article-identifier" });
  wrapper.append(document.createTextNode(`${label}: `));

  const link = createElement("a", {
    className: "identifier-link",
    text: value,
    attributes: {
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": `${label}: ${value}（新しいタブで開く）`
    }
  });
  wrapper.append(link);
  return wrapper;
}

function buildScreeningButton(label, status, currentStatus, onClick) {
  const button = createElement("button", {
    className: `button button-small ${status === currentStatus ? "button-primary" : "button-secondary"}`,
    text: label,
    attributes: {
      type: "button",
      "aria-pressed": String(status === currentStatus),
      "data-status": status
    }
  });
  button.addEventListener("click", onClick);
  return button;
}

function appendDefinitionRow(list, term, description) {
  const row = createElement("div", { className: "classification-row" });
  row.append(
    createElement("dt", { text: term }),
    createElement("dd", { text: description })
  );
  list.append(row);
}

function createClassificationDetails(classification) {
  const details = createElement("details", { className: "classification-details" });
  const summary = createElement("summary", { text: "研究デザインの分類根拠を確認" });
  const content = createElement("div", { className: "classification-details-content" });
  const list = createElement("dl", { className: "classification-list" });

  appendDefinitionRow(list, "このアプリの分類", classificationDisplayText(classification));
  appendDefinitionRow(
    list,
    "一致したPublication Type",
    classification.matchedPublicationTypes.length
      ? classification.matchedPublicationTypes.join("、")
      : "該当なし"
  );
  appendDefinitionRow(
    list,
    "PubMedから取得した全Publication Type",
    classification.publicationTypes.length
      ? classification.publicationTypes.join("、")
      : "取得できませんでした"
  );

  content.append(
    createElement("p", { className: "classification-basis", text: classification.basis }),
    list,
    createElement("p", {
      className: "help-text",
      text: "タイトルや抄録の表現からは推測していません。分類は論文の質を評価するものではありません。"
    })
  );
  details.append(summary, content);
  return details;
}

function createArticleCard(article, options = {}) {
  let decision = loadDecision(article.pmid);
  decision.status = normalizedStatus(decision.status);

  const classification = classifyArticleDetailed(article);
  const card = createElement("article", { className: "article-card" });
  card.dataset.status = decision.status;
  card.dataset.classification = classification.groupKey;
  card.dataset.pmid = article.pmid;

  const header = createElement("div", { className: "article-card-header" });
  const designLabels = createElement("div", { className: "design-labels" });
  designLabels.append(
    createElement("span", { className: "design-badge", text: classification.groupLabel })
  );
  if (classification.designLabel !== classification.groupLabel) {
    designLabels.append(
      createElement("span", { className: "design-detail-badge", text: classification.designLabel })
    );
  }
  const statusLabel = createElement("span", {
    className: "status-label",
    text: statusText(decision),
    attributes: { "aria-live": "polite" }
  });
  header.append(designLabels, statusLabel);
  card.append(header);

  const title = createElement("h3", { className: "article-title" });
  const titleLink = createElement("a", {
    text: article.title || "書誌情報を十分に取得できませんでした",
    attributes: {
      href: article.pubmedUrl,
      target: "_blank",
      rel: "noopener noreferrer"
    }
  });
  title.append(titleLink);
  card.append(title);

  card.append(createElement("p", { className: "article-meta", text: formatAuthors(article.authors) }));
  const citation = formatCitation(article);
  if (citation) card.append(createElement("p", { className: "article-meta", text: citation }));

  const identifiers = createElement("div", { className: "article-identifiers" });
  identifiers.append(createIdentifier("PMID", article.pmid, article.pubmedUrl));
  if (article.doi) {
    identifiers.append(
      createIdentifier("DOI", article.doi, `https://doi.org/${encodeURI(article.doi)}`)
    );
  }
  card.append(identifiers);

  card.append(createClassificationDetails(classification));

  const articleActions = createElement("div", { className: "article-actions" });
  const pubmedLink = createElement("a", {
    className: "button button-secondary button-small",
    text: "PubMedで開く",
    attributes: {
      href: article.pubmedUrl,
      target: "_blank",
      rel: "noopener noreferrer"
    }
  });
  articleActions.append(pubmedLink);
  card.append(articleActions);

  const screeningPanel = createElement("div", { className: "screening-panel" });
  const screeningActions = createElement("div", {
    className: "screening-actions",
    attributes: { role: "group", "aria-label": "論文の判定" }
  });
  const exclusionFields = createElement("div", { className: "exclusion-fields" });

  const reasonGroup = createElement("div", { className: "exclusion-field" });
  const reasonLabel = createElement("label", {
    text: "除外理由",
    attributes: { for: `exclusion-reason-${article.pmid}` }
  });
  const reasonSelect = createElement("select", {
    attributes: {
      id: `exclusion-reason-${article.pmid}`,
      "aria-label": "除外理由"
    }
  });
  EXCLUSION_REASONS.forEach(([value, label]) => {
    const option = createElement("option", { text: label, attributes: { value } });
    if (decision.reason === value) option.selected = true;
    reasonSelect.append(option);
  });
  reasonGroup.append(reasonLabel, reasonSelect);

  const noteGroup = createElement("div", { className: "exclusion-field exclusion-note-field" });
  const noteLabel = createElement("label", {
    text: "その他の除外理由",
    attributes: { for: `exclusion-note-${article.pmid}` }
  });
  const noteInput = createElement("textarea", {
    attributes: {
      id: `exclusion-note-${article.pmid}`,
      placeholder: "除外理由を記録してください",
      "aria-label": "その他の除外理由"
    }
  });
  noteInput.value = decision.note ?? "";
  noteGroup.append(noteLabel, noteInput);
  exclusionFields.append(reasonGroup, noteGroup);

  function updateOtherReasonVisibility() {
    noteGroup.hidden = reasonSelect.value !== "other";
  }

  function updateCardState() {
    card.dataset.status = decision.status;
    statusLabel.textContent = statusText(decision);
    exclusionFields.hidden = decision.status !== "exclude";
    updateOtherReasonVisibility();

    [...screeningActions.querySelectorAll("button[data-status]")].forEach(button => {
      const active = button.dataset.status === decision.status;
      button.className = `button button-small ${active ? "button-primary" : "button-secondary"}`;
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function persist(nextStatus = decision.status) {
    const previousStatus = decision.status;
    const status = normalizedStatus(nextStatus);

    if (status !== "exclude") {
      reasonSelect.value = "";
      noteInput.value = "";
    }

    decision = {
      status,
      reason: status === "exclude" ? reasonSelect.value : "",
      note: status === "exclude" && reasonSelect.value === "other" ? noteInput.value : ""
    };

    saveDecision(article.pmid, decision);
    updateCardState();

    if (previousStatus !== decision.status && typeof options.onDecisionChange === "function") {
      options.onDecisionChange({
        pmid: article.pmid,
        previousStatus,
        status: decision.status
      });
    }
  }

  [
    ["未判定", "unreviewed"],
    ["読む", "read"],
    ["保留", "hold"],
    ["除外", "exclude"]
  ].forEach(([label, status]) => {
    const button = buildScreeningButton(label, status, decision.status, () => persist(status));
    screeningActions.append(button);
  });

  reasonSelect.addEventListener("change", () => {
    if (reasonSelect.value !== "other") noteInput.value = "";
    persist("exclude");
  });
  noteInput.addEventListener("input", () => persist("exclude"));

  updateCardState();
  screeningPanel.append(screeningActions, exclusionFields);
  card.append(screeningPanel);
  return card;
}

export function summarizeScreening(articles = []) {
  const summary = {
    total: articles.length,
    unreviewed: 0,
    read: 0,
    hold: 0,
    exclude: 0
  };

  articles.forEach(article => {
    const status = normalizedStatus(loadDecision(article.pmid).status);
    summary[status] += 1;
  });

  return summary;
}

export function applyArticleStatusFilter(container, statusFilter = "all") {
  const filter = statusFilter === "all" || VALID_STATUSES.has(statusFilter)
    ? statusFilter
    : "all";
  let visibleTotal = 0;

  container.querySelectorAll(".article-card").forEach(card => {
    const visible = filter === "all" || card.dataset.status === filter;
    card.hidden = !visible;
    if (visible) visibleTotal += 1;
  });

  container.querySelectorAll(".article-group").forEach(group => {
    const cards = [...group.querySelectorAll(".article-card")];
    const visibleCount = cards.filter(card => !card.hidden).length;
    const count = group.querySelector(".article-group-count");
    group.hidden = visibleCount === 0;
    if (count) {
      count.textContent = filter === "all"
        ? `${cards.length}件`
        : `${visibleCount}件（全${cards.length}件）`;
    }
  });

  const empty = container.querySelector(".filter-empty-results");
  if (empty) empty.hidden = visibleTotal !== 0;
  return visibleTotal;
}

export function renderEmptyResults(container) {
  container.replaceChildren(createElement("div", { className: "empty-results" }));
  const emptyPanel = container.firstElementChild;
  emptyPanel.append(
    createElement("p", { className: "empty-results-title", text: "条件に一致する論文が見つかりませんでした。" }),
    createElement("p", { text: "検索語を減らすか、研究デザインや発表年の条件を広げてください。" })
  );
}

export function renderClassificationOverview(container, articles = []) {
  const groups = groupArticles(articles);
  container.replaceChildren();

  const heading = createElement("h3", { text: "分類内訳" });
  const list = createElement("div", { className: "classification-overview-list" });
  groups.forEach(group => {
    const item = createElement("div", { className: "classification-overview-item" });
    item.append(
      createElement("span", { text: group.label }),
      createElement("strong", { text: `${group.articles.length}件` })
    );
    list.append(item);
  });
  container.append(heading, list);
  container.hidden = articles.length === 0;
}

export function renderArticles(container, articles, options = {}) {
  container.replaceChildren();
  groupArticles(articles).forEach(group => {
    const details = createElement("details", { className: "article-group", attributes: { open: "" } });
    const summary = createElement("summary");
    summary.append(
      createElement("span", { text: group.label }),
      createElement("span", { className: "article-group-count", text: `${group.articles.length}件` })
    );
    const list = createElement("div", { className: "article-list" });

    if (group.articles.length === 0) {
      list.append(createElement("p", { className: "help-text", text: "該当する論文はありません。" }));
    } else {
      group.articles.forEach(article => list.append(createArticleCard(article, options)));
    }
    details.append(summary, list);
    container.append(details);
  });

  const filterEmpty = createElement("div", { className: "empty-results filter-empty-results" });
  filterEmpty.hidden = true;
  filterEmpty.append(
    createElement("p", { className: "empty-results-title", text: "この判定に該当する論文はありません。" }),
    createElement("p", { text: "別の判定を選ぶか、「すべて」を表示してください。" })
  );
  container.append(filterEmpty);
}
