# 感染症論文トリアージ（Phase 1）

感染症領域の単純な疾患名・病原体名・病態名からPubMed検索式を作成し、論文選別画面を提供するウェブアプリです。

## 現在の実装範囲

Phase 1として、以下を実装しています。

- 検索条件入力画面
- 主題検索語辞書による検索語展開
- 入力語と追加語の表示
- 臨床テーマ・研究デザイン・発表年による検索式生成
- 検索式の手動修正とコピー
- 入力条件と手動修正後の検索式のlocalStorage保存・復元
- 仮論文データの研究デザイン別表示
- 「読む」「保留」「除外」と除外理由のlocalStorage保存
- PC・スマートフォン向けレスポンシブ表示

PubMed APIへの接続はPhase 2で実装します。現在「PubMedを検索」を押すと、画面確認用の仮データを表示します。

## ファイル構成

```text
id-paper-triage-phase1/
├─ index.html
├─ README.md
├─ css/
│  └─ style.css
├─ js/
│  ├─ app.js
│  ├─ query-builder.js
│  ├─ pubmed-api.js
│  ├─ article-classifier.js
│  ├─ article-renderer.js
│  ├─ storage.js
│  └─ search-terms.js
└─ assets/
   └─ favicon.svg
```

## 表示方法

JavaScript Modulesを使用しているため、`index.html`をダブルクリックして開く方法では正常に動かないブラウザがあります。GitHub Pagesへ公開するか、ローカルサーバーで表示してください。

GitHub Pagesでは、フォルダの中身をリポジトリのルートへアップロードし、リポジトリの `Settings` → `Pages` から公開します。

## 保存データ

以下をブラウザのlocalStorageに保存します。

- `id-paper-triage:last-search:v1`：前回の検索条件と検索式
- `id-paper-triage:decisions:v1`：論文ごとの判定と除外理由

ブラウザのデータを削除すると保存内容も消えます。

## 注意

患者氏名、患者ID、生年月日、診療録、個人を識別できる情報、未公表の症例情報は入力しないでください。
