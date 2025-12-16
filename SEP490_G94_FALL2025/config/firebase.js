const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');

// Cấu hình Firebase (thay thế bằng config của bạn)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN ,
  projectId: process.env.FIREBASE_PROJECT_ID ,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET ,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ,
  appId: process.env.FIREBASE_APP_ID
};

// Log config để debug
console.log('🔥 Firebase Config:');
console.log('   Project ID:', firebaseConfig.projectId);
console.log('   Storage Bucket:', firebaseConfig.storageBucket);
console.log('   API Key:', firebaseConfig.apiKey ? '✅ Set' : '❌ Not Set');

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

console.log('✅ Firebase initialized');
console.log('   Storage bucket from app:', storage.app.options.storageBucket);

module.exports = {
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};
