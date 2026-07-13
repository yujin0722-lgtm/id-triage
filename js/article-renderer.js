import { classifyArticle, getGroupLabel, groupArticles } from "./article-classifier.js?v=2.0.0";
import { loadDecision, saveDecision } from "./storage.js?v=2.0.0";

const STATUS_LABELS = {
  unreviewed: "未判定",
  read: "読む",
  hold: "保留",
  exclude: "除外"
};

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

function statusText(decision) {
  if (decision.status !== "exclude") return STATUS_LABELS[decision.status] ?? STATUS_LABELS.unreviewed;
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

function buildScreeningButton(label, status, currentStatus, onClick) {
  const button = createElement("button", {
    className: `button button-small ${status === currentStatus ? "button-primary" : "button-secondary"}`,
    text: label,
    attributes: { type: "button", "aria-pressed": String(status === currentStatus) }
  });
  button.addEventListener("click", onClick);
  return button;
}

function createArticleCard(article) {
  let decision = loadDecision(article.pmid);
  const card = createElement("article", { className: "article-card" });
  card.dataset.status = decision.status;

  const header = createElement("div", { className: "article-card-header" });
  header.append(
    createElement("span", { className: "design-badge", text: getGroupLabel(classifyArticle(article)) })
  );
  const statusLabel = createElement("span", { className: "status-label", text: statusText(decision) });
  header.append(statusLabel);
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
  identifiers.append(createElement("span", { text: `PMID: ${article.pmid}` }));
  if (article.doi) identifiers.append(createElement("span", { text: `DOI: ${article.doi}` }));
  card.append(identifiers);

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
  const screeningActions = createElement("div", { className: "screening-actions" });
  const exclusionFields = createElement("div", { className: "exclusion-fields" });

  const reasonSelect = createElement("select", { attributes: { "aria-label": "除外理由" } });
  EXCLUSION_REASONS.forEach(([value, label]) => {
    const option = createElement("option", { text: label, attributes: { value } });
    if (decision.reason === value) option.selected = true;
    reasonSelect.append(option);
  });

  const noteInput = createElement("textarea", {
    attributes: { placeholder: "「その他」の補足などを記録", "aria-label": "除外理由の補足" }
  });
  noteInput.value = decision.note ?? "";
  exclusionFields.append(reasonSelect, noteInput);

  function persist(nextStatus = decision.status) {
    decision = {
      status: nextStatus,
      reason: nextStatus === "exclude" ? reasonSelect.value : "",
      note: nextStatus === "exclude" ? noteInput.value.trim() : ""
    };
    saveDecision(article.pmid, decision);
    card.dataset.status = decision.status;
    statusLabel.textContent = statusText(decision);
    exclusionFields.hidden = decision.status !== "exclude";
    [...screeningActions.querySelectorAll("button")].forEach(button => {
      const active = button.dataset.status === decision.status;
      button.className = `button button-small ${active ? "button-primary" : "button-secondary"}`;
      button.setAttribute("aria-pressed", String(active));
    });
  }

  [
    ["未判定", "unreviewed"],
    ["読む", "read"],
    ["保留", "hold"],
    ["除外", "exclude"]
  ].forEach(([label, status]) => {
    const button = buildScreeningButton(label, status, decision.status, () => persist(status));
    button.dataset.status = status;
    screeningActions.append(button);
  });

  reasonSelect.addEventListener("change", () => persist("exclude"));
  noteInput.addEventListener("change", () => persist("exclude"));

  exclusionFields.hidden = decision.status !== "exclude";
  screeningPanel.append(screeningActions, exclusionFields);
  card.append(screeningPanel);
  return card;
}

export function renderEmptyResults(container) {
  container.replaceChildren(
    createElement("div", { className: "empty-results" })
  );
  const emptyPanel = container.firstElementChild;
  emptyPanel.append(
    createElement("p", { className: "empty-results-title", text: "条件に一致する論文が見つかりませんでした。" }),
    createElement("p", { text: "検索語を減らすか、研究デザインや発表年の条件を広げてください。" })
  );
}

export function renderArticles(container, articles) {
  container.replaceChildren();
  groupArticles(articles).forEach(group => {
    const details = createElement("details", { className: "article-group", attributes: { open: "" } });
    const summary = createElement("summary");
    summary.append(
      createElement("span", { text: group.label }),
      createElement("span", { text: `${group.articles.length}件` })
    );
    const list = createElement("div", { className: "article-list" });

    if (group.articles.length === 0) {
      list.append(createElement("p", { className: "help-text", text: "該当する論文はありません。" }));
    } else {
      group.articles.forEach(article => list.append(createArticleCard(article)));
    }
    details.append(summary, list);
    container.append(details);
  });
}
