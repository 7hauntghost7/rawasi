/* =========================================================
   صحيفة الرواسي — إعدادات Firebase (للتصويت والتعليقات المباشرة)

   ما دام هذا الملف فارغًا (null) تعمل المناظرة المباشرة عبر serve.py
   على شبكة الواي فاي فقط. لتعمل للجميع من أي مكان (مجانًا):

   1) ادخل https://console.firebase.google.com  ← Add project (بلا Google Analytics)
   2) Build ← Firestore Database ← Create database ← Production mode ← أقرب منطقة (مثل europe-west)
   3) Firestore ← Rules ← الصق محتوى ملف firestore.rules (وضع بريدك مكان ADMIN_EMAIL) ← Publish
   4) Build ← Authentication ← Get started ← Email/Password ← Enable
      ثم Users ← Add user ← بريدك وكلمة مرور (هذا حساب المشرف لصفحة moderate.html)
   5) Project settings (⚙) ← Your apps ← أيقونة </> (Web) ← سجّل التطبيق
      ← انسخ كائن firebaseConfig والصقه مكان null بالأسفل.
   ========================================================= */

window.RAWASI_FIREBASE = {
  apiKey: "AIzaSyDMz8ONRAXihcg0cNAmOk0Zk4XEicYNKa8",
  authDomain: "rawasi101.firebaseapp.com",
  projectId: "rawasi101",
  storageBucket: "rawasi101.firebasestorage.app",
  messagingSenderId: "573407299761",
  appId: "1:573407299761:web:8bd29dfbfd1f6e625aba90"
};

/* مثال على الشكل بعد اللصق:
window.RAWASI_FIREBASE = {
  apiKey: "AIza...",
  authDomain: "rawasi101.firebaseapp.com",
  projectId: "rawasi101",
  storageBucket: "rawasi101.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
*/
