# 感染症論文トリアージ（Phase 2）

感染症領域の単純な疾患名・病原体名・病態名からPubMed検索式を作成し、PubMedの検索結果を研究デザイン別に整理して論文選別を支援するウェブアプリです。

## 現在の実装範囲

Phase 2として、以下を実装しています。

- 検索条件入力画面
- 主題検索語辞書による検索語展開
- 入力語と追加語の表示
- 臨床テーマ・研究デザイン・発表年による検索式生成
- 検索式の手動修正とコピー
- 入力条件と手動修正後の検索式のlocalStorage保存・復元
- NCBI E-utilitiesのESearchによるPMIDと総件数の取得
- ESummaryによるタイトル、著者、雑誌、発表年、DOI、Publication Typeの取得
- PubMed原文ページへのリンク
- Publication Typeに基づく研究デザイン別表示
- 「読む」「保留」「除外」と除外理由のlocalStorage保存
- 通信中の検索ボタン無効化
- タイムアウト、通信失敗、API制限、応答解析失敗のエラー表示
- PC・スマートフォン向けレスポンシブ表示

抄録と論文本文は取得しません。

## GitHub Pagesの更新方法

Phase 1で使用したGitHubリポジトリのルートへ、このフォルダの中身をすべて上書きアップロードしてください。

特に以下のファイルが更新対象です。

```text
index.html
README.md
css/style.css
js/app.js
js/pubmed-api.js
js/article-renderer.js
js/query-builder.js
```

`js`や`css`フォルダを含め、フォルダ構造を保ったままアップロードします。反映後も古い表示が残る場合は、Windowsでは `Ctrl + F5` で再読み込みしてください。

## API通信

1回の検索につき、原則として次の2リクエストを直列で実行します。

```text
1. ESearch
2. ESummary
```

検索結果が0件の場合はESummaryを実行しないため、1リクエストだけです。APIキーは使用していません。検索中は検索ボタンを無効化し、連続実行を防止します。

NCBIはE-utilitiesリクエストへの `tool` と `email` の指定を推奨しています。現在は `tool=id-paper-triage` を指定しています。プロジェクト用の公開連絡先が決まっていないため、`email` はまだ送信していません。

## 保存データ

以下をブラウザのlocalStorageに保存します。

- `id-paper-triage:last-search:v1`：前回の検索条件と検索式
- `id-paper-triage:decisions:v1`：PMIDごとの判定と除外理由

Phase 1と同じ保存キーを使うため、既存の論文判定と検索条件は引き継がれます。ブラウザのデータを削除すると保存内容も消えます。

## 動作確認の例

```text
病原体・疾患・病態：Staphylococcus aureus bacteremia
臨床テーマ：治療期間
研究デザイン：システマティックレビュー
表示件数：10件
並び順：関連度順
```

「検索式を作成」後に「PubMedを検索」を押し、実在するPMIDとPubMedへのリンクが表示されることを確認します。

## 注意

患者氏名、患者ID、生年月日、診療録、個人を識別できる情報、未公表の症例情報は入力しないでください。入力した検索式はNCBIへ送信されます。
