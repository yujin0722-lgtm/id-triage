# 感染症論文トリアージ

**ID Paper Triage Version 0.1.0**

感染症領域の疾患名・病原体名・病態名からPubMed検索式を作成し、検索結果を研究デザイン別に整理して、論文の「読む・保留・除外」を記録するウェブアプリです。

公開ページ：<https://yujin0722-lgtm.github.io/id-triage/>

## このアプリでできること

- 英語の疾患名などを、登録済みの類義語を含むPubMed検索式へ変換
- 何が追加・変換されたかを検索前に表示
- 生成された検索式の手動修正とコピー
- PubMedのESearch・ESummaryを利用した論文検索
- PubMedのPublication Typeに基づく研究デザイン分類
- 各論文の「読む・保留・除外」と除外理由の記録
- 判定状態による絞り込みと件数集計
- 前回の入力条件、手動修正後の検索式、論文判定の復元
- 保存済みデータの確認と削除

## 使い方

1. 「病原体・疾患・病態」に英語の一般的な名称を入力します。
2. 必要に応じて臨床テーマ、研究デザイン、発表年などを指定します。
3. 「検索式を作成」を押し、追加された検索語と最終的な検索式を確認します。
4. 必要なら検索式を直接修正し、「PubMedを検索」を押します。
5. 論文カードを「読む・保留・除外」に振り分けます。

### 入力例

```text
Staphylococcus aureus bacteremia
infective endocarditis
Clostridioides difficile infection
community-acquired pneumonia
```

入力欄はPubMed検索構文を直接書くための欄ではありません。辞書に登録されていない語は、入力された表現をフレーズ検索として使用します。

## 保存データ

検索条件・検索式と論文判定は、サーバーではなく利用中のブラウザの`localStorage`へ保存されます。

- ユーザー登録はありません。
- クラウド同期はありません。
- 別の端末や別のブラウザには引き継がれません。
- ブラウザのサイトデータを削除すると保存内容も消えます。
- 画面下部の「保存データ」から、論文判定だけ、または全保存データを削除できます。

使用する保存キー：

```text
id-paper-triage:last-search:v1
id-paper-triage:decisions:v1
```

## プライバシー

患者氏名、患者ID、生年月日、診療録、個人を識別できる情報、未公表の症例情報は入力しないでください。

入力した検索式は、PubMed検索のためNCBI E-utilitiesへ送信されます。本アプリはアクセス解析を使用せず、ユーザー情報を収集しません。

## 研究デザイン分類の限界

分類はPubMedから取得した`Publication Type`だけに基づきます。タイトルや抄録から研究デザインを推測しません。

そのため、実際には観察研究であってもPublication Typeが十分に付与されていない論文は「その他」になることがあります。分類は論文の質、エビデンスの確実性、推奨の強さを評価するものではありません。

## 初期版に含まれない機能

- 抄録・本文の取得や保存
- AIによる要約や論文の質の評価
- 日本語自由文から英語への翻訳
- ログイン、複数端末同期、共同スクリーニング
- CSV・RIS・BibTeX出力
- 新着論文の定期監視

## 技術構成

- HTML
- CSS
- Vanilla JavaScript / JavaScript Modules
- GitHub Pages
- NCBI E-utilities（ESearch、ESummary）
- localStorage

フレームワーク、ビルドツール、サーバー、データベースは使用していません。

## NCBI E-utilitiesへの対応

1回の検索につき、原則として次の2リクエストを直列に実行します。

1. ESearchで検索件数とPMIDを取得
2. ESummaryで複数PMIDの書誌情報をまとめて取得

`tool=id-paper-triage`を付けてリクエストします。APIキーは使用していません。NCBIの案内に従い、検索ボタンの連打防止とリクエスト数の抑制を行っています。

- [A General Introduction to the E-utilities](https://www.ncbi.nlm.nih.gov/books/NBK25497/)
- [The E-utilities In-Depth](https://www.ncbi.nlm.nih.gov/books/NBK25499/)
- [NCBI Website and Data Usage Policies and Disclaimers](https://www.ncbi.nlm.nih.gov/home/about/policies/)
- [PubMed Disclaimer](https://pubmed.ncbi.nlm.nih.gov/disclaimer/)

プロジェクト用の公開連絡先メールアドレスは未設定です。公開連絡先を用意した場合は、`js/pubmed-api.js`の`CONTACT_EMAIL`へ設定します。秘密情報や個人用APIキーを公開リポジトリへ記載しないでください。

## GitHub Pagesの更新方法

`id-paper-triage-v0.1.0.zip`を解凍し、外側のフォルダではなく、フォルダ内の次の項目をGitHubリポジトリのルートへ上書きアップロードします。

```text
assets/
css/
js/
index.html
README.md
id-paper-triage-spec-v0.3-final.md
```

コミットメッセージ例：

```text
Release ID Paper Triage v0.1.0
```

アップロード後、Windowsでは`Ctrl + F5`で再読み込みします。画面右上に「公開版」「Version 0.1.0」と表示されれば更新されています。

以前の`id-paper-triage-spec-v0.2.md`がリポジトリに残っていてもアプリの動作には影響しませんが、文書を整理する場合は削除してください。

## 動作確認

### 基本検索

```text
病原体・疾患・病態：Staphylococcus aureus bacteremia
臨床テーマ：治療期間
研究デザイン：システマティックレビュー
表示件数：10件
```

確認項目：

1. 検索語の変換内容と検索式が表示される
2. 実在するPMIDを含む論文カードが表示される
3. 分類根拠としてPublication Typeが表示される
4. 「読む・保留・除外」と除外理由を保存できる
5. 再読み込み後、同じ検索で判定が復元される
6. 保存データ欄の論文判定件数が更新される
7. 論文判定の一括削除と全保存データ削除で確認メッセージが表示される

## トラブルシューティング

### 画面が以前のバージョンのまま

`Ctrl + F5`でキャッシュを無視して再読み込みします。GitHub Pagesへの反映には少し時間がかかることがあります。

### ボタンを押しても動かない

GitHubリポジトリのルートに`js/`と`css/`フォルダがあり、`index.html`と同じ階層に配置されているか確認します。

### PubMed検索に失敗する

インターネット接続を確認し、短時間に繰り返し検索した場合は少し待ってから再実行します。NCBI側の一時的な障害や利用制限でも失敗することがあります。

### 判定が保存されない

ブラウザのプライベートモード、サイトデータの保存制限、容量不足などにより`localStorage`を使用できない場合があります。通常のブラウザ画面で試してください。

## ファイル構成

```text
id-triage/
├─ index.html
├─ README.md
├─ id-paper-triage-spec-v0.3-final.md
├─ assets/
│  └─ favicon.svg
├─ css/
│  └─ style.css
└─ js/
   ├─ app.js
   ├─ query-builder.js
   ├─ pubmed-api.js
   ├─ article-classifier.js
   ├─ article-renderer.js
   ├─ storage.js
   └─ search-terms.js
```

## 免責事項

本アプリはPubMed検索を補助する非公式ツールです。NLMおよびNCBIが提供・承認する公式サービスではありません。本アプリは診断、治療その他の臨床判断を提供しません。重要な判断では、必ず原論文および公式情報を確認してください。
