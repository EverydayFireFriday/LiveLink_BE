import * as admin from 'firebase-admin';
import logger from '../../utils/logger/logger';

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Firebase 서비스 계정 JSON 파일 경로 또는 환경변수에서 읽기
    const serviceAccount: admin.ServiceAccount = process.env
      .FIREBASE_SERVICE_ACCOUNT_PATH
      ? (require(
          process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        ) as admin.ServiceAccount)
      : {
          projectId: process.env.FIREBASE_PROJECT_ID || '',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
          privateKey:
            process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
        };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info('✅ Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    logger.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

export const getFirebaseApp = (): admin.app.App => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
};
