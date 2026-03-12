# カード家計簿

クレジットカードの利用通知メール（Gmail）を自動取得し、カテゴリ別に集計・可視化するWebアプリです。
**PC・スマホ両方から使えます。データはクラウドに保存され、全端末で自動同期されます。**

---

## 使い方の流れ

```
① Firebase プロジェクトを作成（無料）
② GitHub にコードをアップロードして GitHub Pages で公開
③ ブラウザ（PC・スマホ）でURLを開き、Googleでログイン
```

---

## ① Firebase のセットアップ（無料）

### 1. Firebase プロジェクト作成

1. https://console.firebase.google.com/ を開く
2. **「プロジェクトを追加」** をクリック
3. プロジェクト名：`kakeibo`（任意）→ 作成

### 2. Authentication（ログイン機能）を有効化

1. 左メニュー →「**Authentication**」→「**始める**」
2. 「**ログイン方法**」タブ → **Google** を選択 → **有効にする** → 保存

### 3. Firestore（データベース）を有効化

1. 左メニュー →「**Firestore Database**」→「**データベースの作成**」
2. 「**本番環境モードで開始**」→ リージョンは `asia-northeast1`（東京）→ 完了

### 4. Firestore セキュリティルールを設定

「**ルール**」タブで以下に変更して「公開」：
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Firebase 設定値を取得

1. プロジェクト概要 →「**アプリを追加**」→「**ウェブ**」（`</>`アイコン）
2. アプリのニックネーム：`kakeibo`→「**アプリを登録**」
3. 表示される `firebaseConfig` の内容をコピー

### 6. firebase-config.js を編集

`js/firebase-config.js` を開き、取得した値を貼り付ける：

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIza...",
  authDomain:        "kakeibo-xxxx.firebaseapp.com",
  projectId:         "kakeibo-xxxx",
  storageBucket:     "kakeibo-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

---

## ② GitHub Pages で公開する

### 1. GitHub アカウント作成（未作成の場合）

https://github.com/ でアカウント作成（無料）

### 2. リポジトリ作成 & ファイルをアップロード

1. GitHub で「**New repository**」→ リポジトリ名：`kakeibo`
2. 「**Add file**」→「**Upload files**」→ `kakeibo` フォルダの中身を全部アップロード
3. 「**Commit changes**」

### 3. GitHub Pages を有効化

1. リポジトリの「**Settings**」タブ
2. 左メニュー「**Pages**」→ Branch：`main`、フォルダ：`/ (root)` → 保存
3. しばらく待つと `https://あなたのユーザー名.github.io/kakeibo/` が公開される

### 4. Firebase に GitHub Pages URL を登録

1. Firebase コンソール →「**Authentication**」→「**設定**」→「**承認済みドメイン**」
2. 「**ドメインを追加**」→ `あなたのユーザー名.github.io` を追加

---

## ③ アプリを使う

1. `https://あなたのユーザー名.github.io/kakeibo/` をスマホ・PCのブラウザで開く
2. **「Googleでログイン」** でログイン
3. データは自動的にクラウド保存 → どの端末からでも同じデータが見られる

---

## Gmail同期の設定（メール自動取得）

Gmail連携を使う場合のみ追加で設定が必要です。

1. https://console.cloud.google.com/ にアクセス（Firebase と同じ Google アカウント）
2. Firebase が使っているプロジェクトを選択
3. 「**APIとサービス**」→「**ライブラリ**」→「Gmail API」→「**有効にする**」
4. 「**APIとサービス**」→「**認証情報**」→「**認証情報を作成**」→「**OAuth クライアント ID**」
5. アプリの種類：「**ウェブアプリケーション**」
6. 「**承認済みの JavaScript 生成元**」に追加：
   ```
   https://あなたのユーザー名.github.io
   ```
7. 作成 → **クライアントID** をコピー
8. アプリの「**設定**」タブ → 「Google Client ID」に貼り付け → 保存
9. 右上「**📧 メール同期**」ボタンでメールを取得

---

## 機能一覧

| 機能 | 内容 |
|------|------|
| **クラウド同期** | PC・スマホで同じデータを共有 |
| **予算管理** | カテゴリ別に月ごとの予算を設定。残り金額を表示 |
| **Gmail同期** | カード通知メールを自動取得・解析 |
| **自動振り分け** | 店名キーワードで食費・物品費に自動分類 → 手動で確認・修正 |
| **グラフ** | カテゴリ別ドーナツグラフ ＋ 6ヶ月分の月別棒グラフ |
| **カテゴリ管理** | 設定タブで追加・編集・削除 |

---

## ファイル構成

```
kakeibo/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js  ← ★ Firebaseの設定値を記入する
│   ├── storage.js          # データ操作（Firestore）
│   ├── parser.js           # メール本文の解析
│   ├── categorizer.js      # カテゴリ自動判定
│   ├── gmail.js            # Gmail API連携
│   ├── charts.js           # グラフ描画（Chart.js）
│   └── app.js              # メインコントローラー
└── README.md
```
