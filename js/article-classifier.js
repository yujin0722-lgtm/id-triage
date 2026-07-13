const GROUPS = [
  {
    key: "evidence-synthesis",
    label: "ガイドライン・統合研究",
    rules: [
      {
        label: "ガイドライン",
        publicationTypes: ["Guideline", "Practice Guideline"]
      },
      {
        label: "システマティックレビュー・メタ解析",
        publicationTypes: ["Systematic Review", "Meta-Analysis"]
      }
    ]
  },
  {
    key: "intervention",
    label: "介入研究",
    rules: [
      {
        label: "ランダム化比較試験",
        publicationTypes: ["Randomized Controlled Trial"]
      },
      {
        label: "臨床試験",
        publicationTypes: [
          "Controlled Clinical Trial",
          "Clinical Trial",
          "Clinical Trial, Phase I",
          "Clinical Trial, Phase II",
          "Clinical Trial, Phase III",
          "Clinical Trial, Phase IV",
          "Pragmatic Clinical Trial",
          "Adaptive Clinical Trial",
          "Equivalence Trial"
        ]
      }
    ]
  },
  {
    key: "observational",
    label: "観察研究",
    rules: [
      {
        label: "観察研究",
        publicationTypes: ["Observational Study"]
      }
    ]
  },
  {
    key: "case-report",
    label: "症例報告",
    rules: [
      {
        label: "症例報告",
        publicationTypes: ["Case Reports"]
      }
    ]
  },
  {
    key: "other",
    label: "その他",
    rules: []
  }
];

function normalizePublicationType(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function cleanPublicationTypes(publicationTypes = []) {
  return [...new Set(
    publicationTypes
      .map(type => String(type ?? "").trim().replace(/\s+/g, " "))
      .filter(Boolean)
  )];
}

function matchingTypes(allTypes, expectedTypes) {
  const expected = new Set(expectedTypes.map(normalizePublicationType));
  return allTypes.filter(type => expected.has(normalizePublicationType(type)));
}

export function classifyArticleDetailed(article) {
  const publicationTypes = cleanPublicationTypes(article?.publicationTypes);

  // GROUPSの順序が、そのまま分類の優先順位です。
  // タイトルや抄録からは推測せず、PubMedのPublication Typeだけを使用します。
  for (const group of GROUPS) {
    for (const rule of group.rules) {
      const matchedPublicationTypes = matchingTypes(publicationTypes, rule.publicationTypes);
      if (matchedPublicationTypes.length > 0) {
        return {
          groupKey: group.key,
          groupLabel: group.label,
          designLabel: rule.label,
          matchedPublicationTypes,
          publicationTypes,
          basis: `PubMedのPublication Type「${matchedPublicationTypes.join("、")}」に基づく分類です。`
        };
      }
    }
  }

  return {
    groupKey: "other",
    groupLabel: "その他",
    designLabel: "分類不能",
    matchedPublicationTypes: [],
    publicationTypes,
    basis: publicationTypes.length > 0
      ? "取得したPublication Typeだけでは、初期版の分類カテゴリーを判定できませんでした。"
      : "PubMedからPublication Typeを取得できなかったため、分類できませんでした。"
  };
}

export function classifyArticle(article) {
  return classifyArticleDetailed(article).groupKey;
}

export function groupArticles(articles = []) {
  return GROUPS.map(group => ({
    key: group.key,
    label: group.label,
    articles: articles.filter(article => classifyArticle(article) === group.key)
  }));
}

export function getGroupLabel(key) {
  return GROUPS.find(group => group.key === key)?.label ?? "その他";
}

export function getClassificationGroups() {
  return GROUPS.map(({ key, label }) => ({ key, label }));
}
