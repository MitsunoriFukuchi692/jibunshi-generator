# 📥 ダウンロードガイド

## 🎯 ダウンロード可能なファイル一覧

### 1️⃣ プロジェクト全体（推奨）
**ファイル名:** `jibunshi-generator.zip` (28KB)

📦 **内容物：**
- ✅ バックエンド全ファイル（Express + TypeScript）
- ✅ フロントエンド全ファイル（React + Vite）
- ✅ 共通ファイル（型定義）
- ✅ 設定ファイル（package.json, tsconfig.json等）
- ✅ 環境変数テンプレート（.env.example）

**使用方法：**
```bash
unzip jibunshi-generator.zip
cd jibunshi-generator
```

---

### 2️⃣ ドキュメント（参考資料）

#### 📋 **設計ドキュメント** `jibunshi_architecture.md` (21KB)
システム全体の設計・仕様書
- 技術スタック詳細
- DB設計図
- API仕様一覧
- 実装ロードマップ（31日間）
- 注意点・ベストプラクティス

#### 📊 **完成レポート** `DAY_1-2_completion_report.md` (6KB)
Day 1-2 の実装完成報告書
- 実装内容一覧
- コード統計
- 品質チェック
- セットアップ手順

#### 📁 **ファイル構造** `FILES_STRUCTURE.txt` (7KB)
プロジェクトの詳細なファイル構成
- フォルダ構造
- ファイルサイズ
- 含まれている機能
- セットアップコマンド

#### 📄 **このガイド** `DOWNLOAD_GUIDE.md`
ダウンロード方法とセットアップ手順

---

## 🚀 クイックスタート

### Step 1: ZIPを展開
```bash
unzip jibunshi-generator.zip
cd jibunshi-generator
```

### Step 2: バックエンド セットアップ
```bash
cd backend
npm install
cp .env.example .env

# .env ファイルに ANTHROPIC_API_KEY を設定
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

### Step 3: データベース初期化
```bash
npm run init-db
```

### Step 4: 開発サーバー起動（Terminal 1）
```bash
npm run dev
# サーバーが起動：http://localhost:5000
```

### Step 5: フロントエンド セットアップ（Terminal 2）
```bash
cd ../frontend
npm install
npm run dev
# ブラウザで自動的に http://localhost:5173 が開きます
```

### Step 6: ブラウザでアクセス
```
http://localhost:5173
```

---

## 📦 ZIPファイル内容詳細

```
jibunshi-generator/
├── 📄 README.md                         プロジェクト説明書
├── 📄 .gitignore                        Git設定
│
├── 📁 backend/                          🔧 バックエンド
│   ├── 📄 package.json                  依存関係
│   ├── 📄 tsconfig.json                 TypeScript設定
│   ├── 📄 .env.example                  環境変数テンプレート
│   ├── 📁 src/
│   │   ├── 📄 index.ts                  メインサーバー
│   │   ├── 📄 db.ts                     DB初期化
│   │   └── 📁 routes/
│   │       ├── 📄 users.ts              ユーザーAPI
│   │       ├── 📄 photos.ts             写真API
│   │       ├── 📄 responses.ts          回答API
│   │       ├── 📄 ai.ts                 Claude API
│   │       ├── 📄 pdf.ts                PDF生成
│   │       └── 📄 publisher.ts          管理画面API
│   ├── 📁 uploads/                      アップロード画像
│   ├── 📁 pdfs/                         生成PDF
│   ├── 📁 data/                         SQLite DB
│   └── 📁 templates/                    PDFテンプレート
│
├── 📁 frontend/                         🎨 フロントエンド
│   ├── 📄 package.json                  依存関係
│   ├── 📄 tsconfig.json                 TypeScript設定
│   ├── 📄 vite.config.ts                Vite設定
│   ├── 📄 index.html                    メインHTML
│   └── 📁 src/
│       ├── 📄 main.tsx                  エントリーポイント
│       ├── 📄 App.tsx                   メインアプリ
│       ├── 📄 App.css                   アプリスタイル
│       ├── 📁 components/
│       │   └── 📁 Common/
│       │       └── 📄 Header.tsx        ヘッダー
│       ├── 📁 pages/
│       │   ├── 📄 UserPage.tsx          ユーザーページ
│       │   └── 📄 PublisherPage.tsx     管理画面
│       └── 📁 styles/
│           └── 📄 index.css             グローバルスタイル
│
└── 📁 shared/                           🔗 共通
    └── 📄 types.ts                      型定義
```

---

## ⚙️ システム要件

- **Node.js:** 20.x 以上
- **npm:** 10.x 以上
- **Python:** 3.8 以上（Puppeteer/puppeteer の依存）
- **メモリ:** 2GB 以上
- **ディスク:** 500MB 以上

---

## 🔐 環境変数設定

### .env ファイル内容例

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_PATH=./data/jibunshi.db

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

**ANTHROPIC_API_KEY の取得方法：**
1. https://console.anthropic.com にアクセス
2. API Key を生成
3. .env に貼り付け

---

## ✨ 主要機能

### 🎯 高齢者向け機能
- ✅ ユーザー登録
- ✅ 写真アップロード
- ✅ AI質問生成
- ✅ 音声/テキスト入力
- ✅ 年表自動整理
- ✅ テキスト自動編集
- ✅ PDF本生成

### 👔 出版社管理画面
- ✅ ユーザー管理
- ✅ 進捗確認
- ✅ PDF編集
- ✅ ダッシュボード

---

## 🔧 トラブルシューティング

### ❌ `npm install` でエラー

```bash
# Node.js バージョン確認
node --version  # v20以上必要

# npm キャッシュクリア
npm cache clean --force
npm install
```

### ❌ PORT が既に使用されている

```bash
# macOS/Linux - プロセス確認
lsof -i :5000
lsof -i :5173

# Windows - プロセスキル
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### ❌ ANTHROPIC_API_KEY エラー

```bash
# .env ファイルが正しく配置されているか確認
cat backend/.env | grep ANTHROPIC_API_KEY

# キーが正しい形式か確認
# 正: sk-ant-xxx（sk-ant-で始まる）
# 誤: sk-xxx, api-xxx 等
```

### ❌ DB初期化失敗

```bash
# data フォルダが存在するか確認
ls -la backend/data/

# 手動で data フォルダ作成
mkdir -p backend/data

# DB初期化を再実行
npm run init-db
```

---

## 📞 サポート情報

| 項目 | 詳細 |
|------|------|
| バックエンド | http://localhost:5000 |
| フロントエンド | http://localhost:5173 |
| ヘルスチェック | http://localhost:5000/health |
| API仕様書 | `jibunshi_architecture.md` 参照 |

---

## 📋 チェックリスト

セットアップ完了前に以下を確認：

- [ ] Node.js 20.x がインストールされている
- [ ] ZIPファイルが展開されている
- [ ] `backend/package.json` が存在する
- [ ] `frontend/package.json` が存在する
- [ ] `npm install` が両方で完了している
- [ ] `.env` ファイルが `backend/` に存在する
- [ ] `ANTHROPIC_API_KEY` が設定されている
- [ ] `npm run init-db` が成功している
- [ ] ポート 5000, 5173 が使用可能である

---

## 🎉 次のステップ

セットアップが完了したら：

1. **UserPage で高齢者登録をテスト**
2. **PhotoAPI で写真アップロードをテスト**
3. **AI API で質問生成をテスト**
4. **PublisherPage で管理画面をテスト**

---

## 📝 ファイルハッシュ（検証用）

```
jibunshi-generator.zip: 28KB
DAY_1-2_completion_report.md: 6KB
jibunshi_architecture.md: 21KB
FILES_STRUCTURE.txt: 7KB
DOWNLOAD_GUIDE.md: (このファイル)
```

---

**作成日:** 2025-11-16  
**最終更新:** 2025-11-16  
**ステータス:** ✅ 完成・ダウンロード可能

🎊 **すべてのファイルがダウンロード可能です！** 🎊
