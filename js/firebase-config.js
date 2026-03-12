// ============================================================
//  firebase-config.js
//  Firebaseコンソールで取得した設定値をここに入力してください
//  設定方法は README.md を参照してください
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Firebase初期化
try {
  firebase.initializeApp(FIREBASE_CONFIG);
} catch (e) {
  console.error("Firebase初期化エラー:", e);
}
