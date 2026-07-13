const GROUPS = [
  { key: "evidence-synthesis", label: "ガイドライン・統合研究" },
  { key: "intervention", label: "介入研究" },
  { key: "observational", label: "観察研究" },
  { key: "case-report", label: "症例報告" },
  { key: "other", label: "その他" }
];

function normalizedTypes(publicationTypes = []) {
  return publicationTypes.map(type => String(type).toLowerCase());
}

export function classifyArticle(article) {
  const types = normalizedTypes(article.publicationTypes);
  const includesAny = terms => terms.some(term => types.some(type => type.includes(term)));

  if (includesAny(["guideline", "practice guideline", "systematic review", "meta-analysis"])) {
    return "evidence-synthesis";
  }
  if (includesAny(["randomized controlled trial", "controlled clinical trial", "clinical trial"])) {
    return "intervention";
  }
  if (includesAny(["observational study", "cohort", "case-control"])) {
    return "observational";
  }
  if (includesAny(["case reports", "case report"])) {
    return "case-report";
  }
  return "other";
}

export function groupArticles(articles) {
  return GROUPS.map(group => ({
    ...group,
    articles: articles.filter(article => classifyArticle(article) === group.key)
  }));
}

export function getGroupLabel(key) {
  return GROUPS.find(group => group.key === key)?.label ?? "その他";
}
