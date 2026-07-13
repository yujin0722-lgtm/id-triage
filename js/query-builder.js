import { subjectTerms, clinicalThemes, studyDesignFilters } from "./search-terms.js?v=4.0.0";

export function normalizeSubject(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function formatBlock(terms) {
  if (!Array.isArray(terms) || terms.length === 0) return "";
  if (terms.length === 1) return terms[0];
  return `(\n  ${terms.join("\n  OR ")}\n)`;
}

function termToDisplayText(term) {
  return term
    .replace(/\[(?:Title\/Abstract|MeSH Terms|Publication Type|Subheading)\]$/i, "")
    .replace(/^"|"$/g, "");
}

export function buildSubjectConversion(subjectInput) {
  const originalInput = String(subjectInput ?? "").trim().replace(/\s+/g, " ");
  const normalizedInput = normalizeSubject(originalInput);
  const dictionaryEntry = subjectTerms[normalizedInput];

  if (dictionaryEntry) {
    return {
      originalInput,
      matched: true,
      matchedKey: normalizedInput,
      matchedLabel: dictionaryEntry.label,
      addedTerms: dictionaryEntry.terms.map(termToDisplayText),
      queryTerms: [...dictionaryEntry.terms],
      queryBlock: formatBlock(dictionaryEntry.terms),
      explanation: "主題検索語辞書に一致したため、登録済みの表現を追加しました。"
    };
  }

  const fallbackTerm = originalInput;
  return {
    originalInput,
    matched: false,
    matchedKey: null,
    matchedLabel: null,
    addedTerms: [],
    queryTerms: [fallbackTerm],
    queryBlock: `(${fallbackTerm})`,
    explanation: "辞書に一致する検索語がないため、入力語をそのまま使用しました。"
  };
}

function buildDateBlock(startYear, endYear, currentYear) {
  const start = Number.parseInt(startYear, 10);
  const end = Number.parseInt(endYear, 10);
  const hasStart = Number.isInteger(start);
  const hasEnd = Number.isInteger(end);

  if (!hasStart && (!hasEnd || end === currentYear)) return "";
  if (hasStart && hasEnd) return `${start}:${end}[Publication Date]`;
  if (hasStart) return `${start}:3000[Publication Date]`;
  return `1800:${end}[Publication Date]`;
}

export function buildPubMedQuery(formValues, currentYear = new Date().getFullYear()) {
  const subjectConversion = buildSubjectConversion(formValues.subjectInput);
  const theme = clinicalThemes[formValues.clinicalTheme] ?? clinicalThemes.none;
  const selectedDesigns = (formValues.studyDesigns ?? [])
    .map(key => studyDesignFilters[key])
    .filter(Boolean);

  const themeBlock = formatBlock(theme.terms);
  const designTerms = selectedDesigns.flatMap(item => item.terms);
  const designBlock = formatBlock(designTerms);
  const dateBlock = buildDateBlock(formValues.startYear, formValues.endYear, currentYear);

  const blocks = [subjectConversion.queryBlock, themeBlock, designBlock, dateBlock].filter(Boolean);

  return {
    query: blocks.join("\nAND\n"),
    subjectConversion,
    details: {
      clinicalThemeLabel: theme.label,
      clinicalThemeTerms: [...theme.terms],
      studyDesignLabels: selectedDesigns.map(item => item.label),
      studyDesignTerms: designTerms,
      dateBlock
    }
  };
}

export function validateSearchForm(formValues, currentYear = new Date().getFullYear()) {
  const errors = {};
  const subject = String(formValues.subjectInput ?? "").trim();
  if (!subject) errors.subject = "病原体・疾患・病態を入力してください。";

  const start = formValues.startYear === "" ? null : Number(formValues.startYear);
  const end = formValues.endYear === "" ? null : Number(formValues.endYear);

  if (start !== null && (!Number.isInteger(start) || start < 1800 || start > 2100)) {
    errors.year = "開始年は1800～2100の範囲で入力してください。";
  } else if (end !== null && (!Number.isInteger(end) || end < 1800 || end > 2100)) {
    errors.year = "終了年は1800～2100の範囲で入力してください。";
  } else if (start !== null && end !== null && start > end) {
    errors.year = "開始年は終了年以前にしてください。";
  } else if (end !== null && end > currentYear + 1) {
    errors.year = `終了年は${currentYear + 1}年以前にしてください。`;
  }

  return errors;
}
