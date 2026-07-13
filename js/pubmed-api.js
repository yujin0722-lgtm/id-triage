const EUTILS_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const TOOL_NAME = "id-paper-triage";

// NCBIはemailパラメータの指定を推奨しています。
// プロジェクト専用の公開連絡先が決まった段階で、ここへ設定します。
const CONTACT_EMAIL = "";
const REQUEST_TIMEOUT_MS = 20000;

export class PubMedApiError extends Error {
  constructor(message, code = "unknown", options = {}) {
    super(message, options);
    this.name = "PubMedApiError";
    this.code = code;
    this.status = options.status ?? null;
  }
}

function buildRequestUrl(endpoint, parameters) {
  const url = new URL(`${EUTILS_BASE_URL}/${endpoint}`);
  const allParameters = {
    ...parameters,
    tool: TOOL_NAME
  };

  if (CONTACT_EMAIL) allParameters.email = CONTACT_EMAIL;

  Object.entries(allParameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function requestJson(url, { timeoutMs = REQUEST_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (response.status === 429) {
      throw new PubMedApiError("NCBIのAPI利用上限に達しました。", "rate-limit", {
        status: response.status
      });
    }

    if (!response.ok) {
      throw new PubMedApiError(`PubMed API returned HTTP ${response.status}.`, "http", {
        status: response.status
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new PubMedApiError("PubMed APIの応答をJSONとして読み取れませんでした。", "invalid-response", {
        cause: error,
        status: response.status
      });
    }

    const apiError = data?.error ?? data?.esearchresult?.ERROR;
    if (apiError) {
      const message = String(apiError);
      const code = /rate limit/i.test(message) ? "rate-limit" : "api";
      throw new PubMedApiError(message, code, { status: response.status });
    }

    return data;
  } catch (error) {
    if (error instanceof PubMedApiError) throw error;

    if (error?.name === "AbortError") {
      throw new PubMedApiError("PubMed APIへの接続がタイムアウトしました。", "timeout", {
        cause: error
      });
    }

    throw new PubMedApiError("PubMed APIへ接続できませんでした。", "network", {
      cause: error
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function cleanText(value) {
  if (value === undefined || value === null) return "";

  const namedEntities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " "
  };

  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        const codePoint = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      if (entity.startsWith("#")) {
        const codePoint = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      return namedEntities[entity.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractYear(...dateCandidates) {
  for (const candidate of dateCandidates) {
    const match = String(candidate ?? "").match(/\b(?:18|19|20|21)\d{2}\b/);
    if (match) return match[0];
  }
  return "";
}

function extractDoi(record) {
  const doiEntry = asArray(record?.articleids).find(item =>
    String(item?.idtype ?? item?.idtypen ?? "").toLowerCase() === "doi"
  );

  if (doiEntry?.value) return cleanText(doiEntry.value);

  const location = cleanText(record?.elocationid);
  const locationMatch = location.match(/(?:doi:\s*)?(10\.\d{4,9}\/\S+)/i);
  return locationMatch?.[1]?.replace(/[.,;]+$/, "") ?? "";
}

export function parseESearchResponse(data) {
  const result = data?.esearchresult;
  if (!result || !Array.isArray(result.idlist)) {
    throw new PubMedApiError("ESearchの応答形式が想定と異なります。", "invalid-response");
  }

  const total = Number.parseInt(result.count, 10);
  return {
    total: Number.isFinite(total) ? total : 0,
    ids: result.idlist.map(String),
    translatedQuery: cleanText(result.querytranslation)
  };
}

export function parseESummaryResponse(data, requestedIds = []) {
  const result = data?.result;
  if (!result || typeof result !== "object") {
    throw new PubMedApiError("ESummaryの応答形式が想定と異なります。", "invalid-response");
  }

  const orderedIds = requestedIds.length
    ? requestedIds.map(String)
    : asArray(result.uids).map(String);

  return orderedIds.map(pmid => {
    const record = result[pmid] ?? {};
    const authors = asArray(record.authors)
      .map(author => cleanText(author?.name))
      .filter(Boolean);

    return {
      pmid,
      title: cleanText(record.title),
      authors,
      journal: cleanText(record.fulljournalname || record.source),
      sourceAbbreviation: cleanText(record.source),
      year: extractYear(record.sortpubdate, record.pubdate, record.epubdate),
      publicationDate: cleanText(record.pubdate || record.epubdate),
      volume: cleanText(record.volume),
      issue: cleanText(record.issue),
      pages: (() => {
        const pages = cleanText(record.pages);
        if (pages) return pages;
        const electronicLocation = cleanText(record.elocationid);
        return /^doi:/i.test(electronicLocation) ? "" : electronicLocation;
      })(),
      doi: extractDoi(record),
      publicationTypes: asArray(record.pubtype).map(cleanText).filter(Boolean),
      pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/`
    };
  });
}

export async function searchPubMed({
  query,
  resultLimit = 20,
  sortOrder = "relevance",
  fetchImpl = fetch
}) {
  const normalizedQuery = String(query ?? "").trim();
  if (!normalizedQuery) {
    throw new PubMedApiError("検索式が空です。", "invalid-query");
  }

  const safeLimit = [10, 20, 50].includes(Number(resultLimit)) ? Number(resultLimit) : 20;
  const safeSort = sortOrder === "pub_date" ? "pub_date" : "relevance";

  const searchUrl = buildRequestUrl("esearch.fcgi", {
    db: "pubmed",
    term: normalizedQuery,
    retmode: "json",
    retmax: safeLimit,
    sort: safeSort
  });

  const searchData = await requestJson(searchUrl, { fetchImpl });
  const searchResult = parseESearchResponse(searchData);

  if (searchResult.ids.length === 0) {
    return {
      total: searchResult.total,
      articles: [],
      translatedQuery: searchResult.translatedQuery
    };
  }

  const summaryUrl = buildRequestUrl("esummary.fcgi", {
    db: "pubmed",
    id: searchResult.ids.join(","),
    retmode: "json"
  });

  const summaryData = await requestJson(summaryUrl, { fetchImpl });
  const articles = parseESummaryResponse(summaryData, searchResult.ids);

  return {
    total: searchResult.total,
    articles,
    translatedQuery: searchResult.translatedQuery
  };
}
