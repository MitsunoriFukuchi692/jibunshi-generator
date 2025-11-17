# 自分史ジェネレーター（Jibunshi Generator）

高齢者が自分の人生を振り返り、AIの力を借りて自分史本を自動作成するWEBアプリケーション。

## プロジェクト構成

```
jibunshi-generator/
├── backend/                # Node.js + Express バックエンド
│   ├── src/
│   │   ├── index.ts       # メインサーバー
│   │   ├── db.ts          # DB初期化
│   │   ├── routes/        # APIルート
│   │   └── ...
│   ├── package.json
│   └── .env.example
├── frontend/               # React + Vite フロントエンド
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── shared/                 # 共通ファイル（型定義など）
│   └── types.ts
└── README.md
```

## セットアップ手順

### 1. バックエンド初期化

```bash
cd backend
npm install
npm run init-db
```

.env ファイルを作成:
```bash
cp .env.example .env
# ANTHROPIC_API_KEY を設定
```

### 2. フロントエンド初期化

```bash
cd ../frontend
npm install
```

### 3. 開発サーバー起動

**ターミナル1（バックエンド）:**
```bash
cd backend
npm run dev
```

**ターミナル2（フロントエンド）:**
```bash
cd frontend
npm run dev
```

ブラウザで `http://localhost:5173` を開く

## 技術スタック

- **バックエンド:** Node.js 20 + Express + TypeScript
- **フロントエンド:** React 18 + Vite + TypeScript
- **データベース:** SQLite 3
- **AI:** Anthropic Claude 3.5 Sonnet（Vision API）
- **PDF生成:** Puppeteer
- **ホスティング:** Render

## 主要機能（実装予定）

### 高齢者ユーザー向け
- ✅ ユーザー登録
- ⏳ 写真アップロード
- ⏳ AI質問生成
- ⏳ 音声/テキスト入力
- ⏳ 年表自動整理
- ⏳ テキスト自動編集
- ⏳ PDF本生成

### 出版社管理画面
- ⏳ ユーザー管理
- ⏳ 進捗確認
- ⏳ PDF編集・最終化
- ⏳ ダッシュボード

## API エンドポイント

### ユーザー関連
- `GET /api/users` - ユーザー一覧
- `POST /api/users` - ユーザー登録
- `GET /api/users/:id` - ユーザー取得
- `PUT /api/users/:id` - ユーザー更新

### 写真関連
- `POST /api/photos` - 写真アップロード
- `GET /api/photos` - 写真一覧
- `DELETE /api/photos/:id` - 写真削除

### 回答関連
- `POST /api/responses` - 回答保存
- `GET /api/responses` - 回答一覧

### AI処理
- `POST /api/ai/analyze-photo` - 写真分析
- `POST /api/ai/generate-questions` - 質問生成
- `POST /api/ai/edit-text` - テキスト自動編集

### PDF生成
- `POST /api/pdf/generate` - PDF生成
- `GET /api/pdf/versions/:userId` - PDF版履歴

### 出版社管理
- `GET /api/publisher/users` - ユーザー一覧（管理用）
- `GET /api/publisher/dashboard` - ダッシュボード統計

## 実装ロードマップ

- **Day 1-2:** ✅ プロジェクト初期化
- **Day 3-7:** バックエンド基本機能
- **Day 8-14:** AI連携・質問生成
- **Day 15-19:** テキスト編集・年表整理
- **Day 20-24:** PDF生成
- **Day 25-28:** 出版社管理画面
- **Day 29-31:** テスト・デプロイ

## 環境変数

### バックエンド (.env)
```
ANTHROPIC_API_KEY=your-key-here
NODE_ENV=development
PORT=5000
DATABASE_PATH=./data/jibunshi.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## デプロイ

Render へのデプロイ予定

## ライセンス

Private - クライアント用

## サポート

問題が発生した場合は、コンソールログを確認してください。

---

**プロジェクト作成日:** 2025-11-16  
**最終更新:** 2025-11-16
