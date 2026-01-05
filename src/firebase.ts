import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAVzbbOPaF0BVzkU_T_x-Wpl1-lpPu3Xzs",
  authDomain: "vision-accounts.firebaseapp.com",
  projectId: "vision-accounts",
  storageBucket: "vision-accounts.firebasestorage.app",
  messagingSenderId: "116082993720",
  appId: "1:116082993720:web:bb2f0ea0ea56e208dd94cd",
  measurementId: "G-Z8PGYL209D"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(() => undefined);
}
