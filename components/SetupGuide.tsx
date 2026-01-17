
import React from 'react';

export const SetupGuide: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8 mb-12">
      <h2 className="text-2xl font-bold text-indigo-700 mb-4 flex items-center">
        <i className="fas fa-tools mr-2"></i> Firebase セットアップ詳細ガイド
      </h2>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h3 className="font-semibold text-lg border-b pb-2 mb-2">1. Firebase Console での基本設定</h3>
          <p className="mb-2">1. <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-600 underline">Firebase Console</a> で新しいプロジェクトを作成します。</p>
          <p className="mb-2">2. 「ウェブアプリ」を追加し、表示される `firebaseConfig` オブジェクトを `firebase-config.ts` に貼り付けてください。</p>
        </section>

        <section>
          <h3 className="font-semibold text-lg border-b pb-2 mb-2">2. Authentication (認証)</h3>
          <p className="mb-2">ユーザーがログイン・新規登録できるようにします。</p>
          <ul className="list-disc ml-5 space-y-1 text-sm">
            <li><strong>Build > Authentication > Get Started</strong> をクリック。</li>
            <li><strong>Sign-in method</strong> タブで「メール / パスワード」を選択して有効にします。</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-lg border-b pb-2 mb-2">3. Cloud Firestore (データベース)</h3>
          <p className="mb-2">ユーザーの権限（管理者か一般ユーザーか）を保存するために必要です。</p>
          <ul className="list-disc ml-5 space-y-1 text-sm mb-3">
            <li><strong>Build > Firestore Database > Create database</strong> をクリック。</li>
            <li>ロケーションを選択し、「テストモード」で開始します（後でルールを適用します）。</li>
          </ul>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <h4 className="font-bold text-indigo-900 text-sm mb-1">管理者権限の付与方法：</h4>
            <p className="text-xs mb-2">新規登録したユーザーはデフォルトで `role: "user"` になります。特定のユーザーを管理者にするには：</p>
            <ol className="list-decimal ml-4 text-xs space-y-1">
              <li>Firebase Console の Firestore タブを開く。</li>
              <li>`users` コレクション内の該当ユーザーのドキュメントを選択。</li>
              <li>`role` フィールドの値を `"admin"` に書き換えて保存します。</li>
            </ol>
          </div>
        </section>

        <section>
          <h3 className="font-semibold text-lg border-b pb-2 mb-2">4. セキュリティルールの適用</h3>
          <p className="text-sm mb-2">Firestore の「ルール」タブに以下を貼り付けることで、自分以外のユーザーが勝手に権限を書き換えるのを防げます。</p>
          <div className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto">
            {`service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // ログイン済みなら誰でも読み取り可能
      allow read: if request.auth != null;
      // 管理者のみがユーザー情報を更新可能
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      // 新規作成時は自分自身のデータのみ作成可能（デフォルトロールを強制する場合は追加ロジックが必要）
      allow create: if request.auth != null && request.auth.uid == userId;
    }
  }
}`}
          </div>
        </section>
      </div>
    </div>
  );
};
