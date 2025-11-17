# 自分史自動作成WEBアプリ「自分史ジェネレーター」
## 技術アーキテクチャ設計ドキュメント

**バージョン：** 1.0  
**作成日：** 2025-11-16  
**プロジェクト名：** 自分史ジェネレーター（Jibunshi Generator）

---

## 1. プロジェクト概要

### ビジネス目標
- 出版社の「高齢者の人生を聞き取り → 自分史本作成」プロセスを自動化・省力化
- 高齢者が自分の人生を整理・記録する支援
- 最終成果物：50～100ページの「自分史本」（PDF）

### ユーザーフロー
1. **高齢者ユーザー** - 写真アップロード → AI質問に回答（音声/テキスト）→ 自分史完成
2. **出版社管理者** - ユーザー管理 → 進捗確認 → PDF出力・編集 → 最終版の出版

### スコープ
- 高齢者向けフロントエンド
- 出版社向け管理画面
- AI自動生成エンジン（質問生成、テキスト編集）
- PDF本生成機能
- シングルテナント設計（初期は1社のみ対応）

---

## 2. 技術スタック

### フロントエンド
- **言語：** TypeScript + React 18
- **UIライブラリ：** React（シンプルUI、高齢者向け）
- **状態管理：** React Context API
- **スタイル：** CSS + Tailwind CSS（レスポンシブ対応）
- **音声認識：** Web Speech API（ブラウザネイティブ）
- **ビルドツール：** Vite

### バックエンド
- **ランタイム：** Node.js 20.x
- **フレームワーク：** Express.js
- **言語：** JavaScript/TypeScript
- **DB：** SQLite 3（ローカル、シンプル）
- **ORM：** better-sqlite3（同期的、シンプル）

### AI/機械学習
- **AI API：** Anthropic Claude 3.5 Sonnet
  - 画像分析（Vision）
  - 質問生成
  - テキスト自動編集
- **API連携：** @anthropic-ai/sdk

### PDF生成
- **ライブラリ：** Puppeteer
- **テンプレート形式：** HTML（手作業編集可能）
- **ワークフロー：** 自動生成テキスト → HTMLテンプレートに埋め込み → HTML印刷 → PDF

### その他
- **ファイルアップロード：** Multer
- **環境管理：** dotenv
- **ホスティング：** Render.com
- **バージョン管理：** Git + GitHub

---

## 3. データベース設計

### テーブル構成

#### 3.1 users テーブル
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age INTEGER,
  email TEXT UNIQUE,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active', -- active, paused, completed
  progress_stage TEXT, -- birth, childhood, school, work, memory, retirement, done
  estimated_completion_date DATE
);
```

#### 3.2 photos テーブル
```sql
CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  stage TEXT, -- Which life stage this photo belongs to
  description TEXT, -- User's initial description
  ai_analysis TEXT, -- Claude Vision analysis
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 3.3 responses テーブル
```sql
CREATE TABLE responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER,
  stage TEXT, -- birth, childhood, school, work, memory, retirement
  question_text TEXT NOT NULL,
  response_text TEXT NOT NULL, -- Original response from user
  is_voice BOOLEAN, -- Voice or text input
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  photo_id INTEGER, -- Reference to related photo if any
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id),
  FOREIGN KEY (photo_id) REFERENCES photos(id)
);
```

#### 3.4 questions テーブル
```sql
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage TEXT, -- Which life stage
  order_num INTEGER, -- Question order within stage
  template_text TEXT, -- Template question
  photo_id INTEGER, -- If generated from photo
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (photo_id) REFERENCES photos(id)
);
```

#### 3.5 timeline テーブル
```sql
CREATE TABLE timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  age INTEGER,
  year INTEGER,
  stage TEXT,
  event_title TEXT,
  event_description TEXT,
  edited_content TEXT, -- Final edited version
  is_auto_generated BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 3.6 pdf_versions テーブル
```sql
CREATE TABLE pdf_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  html_content TEXT,
  pdf_path TEXT,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT, -- draft, ready_for_review, finalized
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 4. API設計

### 認証
- **方式：** Simple Session（Cookie-based）
- **出版社管理画面のみ必須**

### エンドポイント一覧

#### 4.1 高齢者ユーザー向けAPI

| メソッド | エンドポイント | 説明 |
|---------|---|---|
| POST | `/api/users` | ユーザー登録 |
| GET | `/api/users/:id` | ユーザー情報取得 |
| POST | `/api/users/:id/photos` | 写真アップロード |
| GET | `/api/users/:id/photos` | 写真一覧取得 |
| GET | `/api/questions/:photoId` | 質問生成（写真から） |
| POST | `/api/responses` | 回答保存 |
| GET | `/api/users/:id/timeline` | 年表取得 |
| POST | `/api/users/:id/generate-pdf` | PDF生成リクエスト |

#### 4.2 出版社管理画面API

| メソッド | エンドポイント | 説明 |
|---------|---|---|
| GET | `/api/publisher/users` | ユーザー一覧 |
| GET | `/api/publisher/users/:id/progress` | 進捗確認 |
| GET | `/api/publisher/users/:id/pdf-versions` | PDF版履歴 |
| POST | `/api/publisher/users/:id/edit-pdf` | PDFテンプレート編集 |
| POST | `/api/publisher/users/:id/finalize-pdf` | PDF最終版確定 |
| PUT | `/api/publisher/users/:id` | ユーザー情報編集 |

#### 4.3 AI処理API（内部）

| メソッド | エンドポイント | 説明 |
|---------|---|---|
| POST | `/api/ai/analyze-photo` | Claude Vision: 写真分析 |
| POST | `/api/ai/generate-questions` | 質問生成 |
| POST | `/api/ai/edit-text` | テキスト自動編集 |

---

## 5. 処理フロー詳細

### 5.1 高齢者ユーザーのメインフロー

```
[スタート]
  ↓
[写真アップロード]
  ├→ Claude Vision で写真分析
  └→ DB保存 + メタデータ抽出
  ↓
[質問生成]
  ├→ Claude で関連質問を3～5個生成
  ├→ ステージ別（生い立ち、学生時代、仕事、思い出、退職後）
  └→ 高齢者に表示
  ↓
[ユーザー回答]
  ├→ 音声入力 → Speech-to-Text → 保存
  └→ テキスト入力 → 保存
  ↓
[年表自動整理]
  ├→ 回答から時間軸情報を抽出
  ├→ ステージ別に分類
  └→ Timeline テーブルに保存
  ↓
[テキスト自動編集]
  ├→ Claude で複数の回答を結合・整形
  ├→ 重複削除、文体統一、流れ改善
  └→ 最終テキスト生成
  ↓
[PDF本生成]
  ├→ 写真 + テキスト で HTMLテンプレート構成
  ├→ Puppeteer で印刷 → PDF
  └→ PDF-versions に保存
  ↓
[完了]
```

### 5.2 出版社管理フロー

```
[出版社ログイン]
  ↓
[ユーザー一覧表示]
  ├→ 進捗状況表示（進捗バー）
  ├→ 完成待ちのユーザー表示
  └→ フィルター機能（名前、進捗段階など）
  ↓
[PDF版確認・編集]
  ├→ 自動生成PDFプレビュー表示
  ├→ HTMLエディタで内容編集可能
  ├→ 写真の位置調整
  ├→ テキストの微調整
  └→ 編集版を再度PDF生成
  ↓
[最終版確定]
  ├→ PDF-versions に status='finalized' として保存
  ├→ ダウンロード用URL生成
  └→ 出版社に通知
  ↓
[完了 → 出版]
```

---

## 6. AI処理の詳細

### 6.1 Claude Vision による写真分析

**入力：** 高齢者がアップロードした写真

**出力：** 
```json
{
  "scene_description": "1980年代と思われる農家の家の前での家族写真",
  "estimated_era": "1980年",
  "suggested_stage": "childhood",
  "emotional_context": "家族団欒、温かさ",
  "suggested_questions": [
    "この写真はいつ、どこで撮られましたか？",
    "このときの思い出を教えてください",
    "この時期、どんなことが印象的でしたか？"
  ]
}
```

### 6.2 質問生成ロジック

**入力：** ユーザー情報 + 写真メタデータ + ステージ

**プロンプト例：**
```
高齢者のための人生回想インタビュー。
ユーザー名: 田中花子さん
現在の年齢: 78歳
現在のステージ: childhood（幼少期）
写真の説明: 1950年代の田舎の家での子ども写真

以下の質問を5個生成してください：
- 温かみのある質問
- 思い出を引き出す質問
- 感覚（匂い、音、季節感）に関する質問
- 家族や周囲の人についての質問
```

### 6.3 テキスト自動編集ロジック

**入力：** バラバラの複数回答

**処理内容：**
1. 年代順に整理
2. 重複表現を削除
3. 文体を統一（敬語 → 一般形）
4. 流れをスムーズに繋ぎ込む
5. 段落分けと見出しを自動生成

**プロンプト例：**
```
以下は高齢者の人生回想の断片です。
これらを統合して、一つのまとまった文章にしてください。

要件：
- 時系列順に整理
- 重複を削除
- 読みやすく、流れが良い文章に
- 原文の感情や思い出は保持
- 段落は3～4行ごと

回答1: ...
回答2: ...
回答3: ...

統合版:
```

---

## 7. PDF生成ワークフロー

### 7.1 テンプレート構成

```html
<!-- templates/jibunshi-book.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    /* 印刷向けCSS */
    @page { size: A4; margin: 2cm; }
    body { font-family: "HGS正楷ﾎﾟｯﾌﾟ体"; }
    .chapter { page-break-before: always; }
    .photo { max-width: 100%; margin: 1em 0; }
  </style>
</head>
<body>
  <!-- 表紙 -->
  <div class="cover">
    <h1>{{user_name}}の自分史</h1>
    <p>{{year_created}}年作成</p>
  </div>

  <!-- 第1章：生い立ち -->
  <div class="chapter birth">
    <h2>第1章 生い立ち</h2>
    <p>{{birth_content}}</p>
    <img src="{{photo_1_path}}" class="photo">
  </div>

  <!-- 第2章：幼少期 -->
  <div class="chapter childhood">
    <h2>第2章 幼少期の思い出</h2>
    <p>{{childhood_content}}</p>
    <img src="{{photo_2_path}}" class="photo">
  </div>

  <!-- ... その他章 ... -->

  <!-- 年表 -->
  <div class="timeline">
    <h2>人生年表</h2>
    <table>
      <tr><td>{{year}}</td><td>{{event}}</td></tr>
      <!-- ... -->
    </table>
  </div>
</body>
</html>
```

### 7.2 PDF生成プロセス

```javascript
// 1. テンプレートに動的データを埋め込み
const html = renderTemplate(template, userData, aiContent, photos);

// 2. HTML → 印刷形式に変換
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setContent(html);

// 3. PDF出力
await page.pdf({
  path: `./pdfs/user_${userId}_v${version}.pdf`,
  format: 'A4',
  margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' }
});

await browser.close();
```

### 7.3 手作業編集ワークフロー

```
[自動生成PDF完成]
  ↓
[出版社管理画面で表示]
  ├→ HTML エディタで内容編集可能
  ├→ 写真の順序・サイズ変更
  ├→ テキストの微調整
  └→ フォントや色の調整
  ↓
[編集内容を保存]
  ├→ HTML を DB に保存（編集版）
  ├→ 必要に応じて Puppeteer で PDF 再生成
  └→ PDF-versions テーブルに新バージョンとして保存
  ↓
[最終版確定]
  ├→ status = 'finalized'
  ├→ 出版社がダウンロード可能に
  └→ 完了
```

---

## 8. フロルダ構造

```
jibunshi-generator/
├── backend/
│   ├── src/
│   │   ├── index.ts              # サーバーエントリーポイント
│   │   ├── db.ts                 # SQLite初期化・管理
│   │   ├── routes/
│   │   │   ├── users.ts          # ユーザー関連エンドポイント
│   │   │   ├── photos.ts         # 写真アップロード
│   │   │   ├── responses.ts      # 回答保存
│   │   │   ├── ai.ts             # AI処理エンドポイント
│   │   │   ├── publisher.ts      # 出版社管理画面用
│   │   │   └── pdf.ts            # PDF生成
│   │   ├── services/
│   │   │   ├── aiService.ts      # Claude API呼び出し
│   │   │   ├── pdfService.ts     # Puppeteer用
│   │   │   └── storageService.ts # ファイル管理
│   │   ├── middleware/
│   │   │   ├── auth.ts           # 認証ミドルウェア
│   │   │   └── errorHandler.ts   # エラーハンドリング
│   │   └── utils/
│   │       └── helpers.ts
│   ├── uploads/                  # ユーザーアップロード画像
│   ├── pdfs/                     # 生成済みPDF
│   ├── templates/                # PDFテンプレート
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UserFlow/         # 高齢者向けUI
│   │   │   │   ├── PhotoUpload.tsx
│   │   │   │   ├── QuestionDisplay.tsx
│   │   │   │   ├── ResponseInput.tsx
│   │   │   │   └── Timeline.tsx
│   │   │   ├── Publisher/        # 出版社管理画面
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── UserManagement.tsx
│   │   │   │   ├── PDFEditor.tsx
│   │   │   │   └── PDFPreview.tsx
│   │   │   └── Common/
│   │   │       ├── Header.tsx
│   │   │       └── Footer.tsx
│   │   ├── pages/
│   │   │   ├── UserPage.tsx
│   │   │   ├── PublisherPage.tsx
│   │   │   └── NotFound.tsx
│   │   ├── hooks/
│   │   │   ├── useUserData.ts
│   │   │   ├── usePhotoUpload.ts
│   │   │   └── useAPI.ts
│   │   ├── context/
│   │   │   └── AppContext.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── shared/
│   ├── types.ts                  # 共通型定義
│   └── constants.ts
│
└── README.md
```

---

## 9. 実装ロードマップ

### フェーズ1: 基盤構築（1週間）

**優先度：P0（クリティカル）**

1. **Day 1-2：プロジェクト初期化**
   - Node.js + Express バックエンド初期設定
   - React フロントエンド初期設定
   - SQLite DB + テーブル作成
   - フォルダ構造構築

2. **Day 3-4：ユーザー管理・ログイン**
   - User CRUD API
   - フロントエンド: ユーザー登録画面
   - Session管理（出版社向け）

3. **Day 5-7：写真アップロード機能**
   - Photo アップロードAPI
   - Multer設定
   - ファイル保存管理
   - フロントエンド: 写真アップロードUI

### フェーズ2: AI連携・質問生成（1週間）

**優先度：P0**

1. **Day 8-9：Claude API統合**
   - @anthropic-ai/sdk 統合
   - 画像分析エンドポイント実装
   - 質問生成エンドポイント

2. **Day 10-11：質問生成フロー**
   - 写真 → 分析 → 質問生成の一連処理
   - フロントエンド: 質問表示画面
   - 音声入力との連携

3. **Day 12-14：回答保存・管理**
   - Response CRUD
   - 音声認識結果の保存
   - 進捗トラッキング

### フェーズ3: テキスト編集・年表整理（5日）

**優先度：P1**

1. **Day 15-16：年表自動整理**
   - 回答から時間軸抽出ロジック
   - Timeline テーブル 自動生成
   - ステージ別分類

2. **Day 17-18：テキスト自動編集**
   - 複数回答の結合・整形ロジック
   - Claude による自動編集
   - 編集結果の保存

3. **Day 19：フロントエンド表示**
   - 年表ビュー
   - 編集後テキスト表示

### フェーズ4: PDF生成（5日）

**優先度：P1**

1. **Day 20-21：Puppeteerセットアップ**
   - Puppeteerライブラリ統合
   - HTMLテンプレート作成
   - 基本的なPDF生成テスト

2. **Day 22-23：PDF本テンプレート**
   - 表紙、章、年表レイアウト設計
   - 写真埋め込み機能
   - 印刷用CSS調整

3. **Day 24：エンドポイント実装**
   - PDF生成API
   - バージョン管理

### フェーズ5: 出版社管理画面（4日）

**優先度：P2**

1. **Day 25-26：管理ダッシュボード**
   - ユーザー一覧表示
   - 進捗確認画面
   - PDF版履歴表示

2. **Day 27-28：PDF編集機能**
   - HTMLエディタ統合
   - PDF再生成機能
   - 最終版確定ロジック

### フェーズ6: テスト・デプロイ（3日）

**優先度：P0**

1. **Day 29：機能テスト**
   - 各エンドポイント確認
   - 音声認識テスト
   - PDF出力テスト

2. **Day 30：UI/UXテスト**
   - 高齢者向けUI確認
   - レスポンシブ対応確認
   - アクセシビリティ確認

3. **Day 31：デプロイ準備**
   - Renderへのデプロイ
   - 環境変数設定
   - 本番テスト

**合計予定期間：31日（約5週間）**

---

## 10. 技術的な注意点

### 10.1 高齢者向けUI/UX

- **フォント：** 大きく（16px以上）、読みやすいもの
- **色：** はっきりした色（黒＋白背景推奨）
- **ボタン：** 大きく（50x50px以上）、クリアなラベル
- **操作：** シンプル、必要最小限のボタンのみ
- **音声確認：** 音声入力後、確認画面を必ず表示

### 10.2 AI処理の最適化

- **画像分析：** Vision APIは1リクエスト～5秒かかる可能性 → 非同期処理
- **質問生成：** ステージごとにテンプレートを用意、AIはカスタマイズのみ
- **テキスト編集：** バッチ処理で複数回答を一度に処理

### 10.3 セキュリティ

- **個人情報：** SQLiteはローカル、バックアップ必須
- **ファイルアップロード：** ファイルサイズ制限（10MB）、形式チェック（jpg/png）
- **HTTPS：** 本番環境は必須
- **認証：** 出版社管理画面のみ（初期はシンプル）

### 10.4 スケーラビリティ

- **現状：** SQLite（1社のみ）
- **将来：** PostgreSQL + テナント分離で複数社対応

---

## 11. 次のステップ

1. ✅ このドキュメントの確認・修正
2. 📝 バックエンド開発開始
3. 🎨 フロントエンド開発開始
4. 🧪 統合テスト
5. 🚀 デプロイ

---

## 付録：ファイル一覧

### 環境変数 (.env)
```
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# Server
NODE_ENV=production
PORT=5000

# Database
DATABASE_PATH=./data/jibunshi.db

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

### package.json（バックエンド）
```json
{
  "name": "jibunshi-generator-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@anthropic-ai/sdk": "^0.20.0",
    "better-sqlite3": "^9.2.2",
    "multer": "^1.4.5",
    "puppeteer": "^21.6.1",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/better-sqlite3": "^7.6.8",
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0"
  }
}
```

### package.json（フロントエンド）
```json
{
  "name": "jibunshi-generator-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16"
  }
}
```

---

**ドキュメント完成日：2025-11-16**
**次回更新予定：実装開始後の調整**
