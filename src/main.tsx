import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import OneSignal from "react-onesignal";

OneSignal.init({
  appId: "e92aa139-18cd-4df0-ab5b-138bfbbf57c4",
  allowLocalhostAsSecureOrigin: true,
  serviceWorkerPath: "/OneSignalSDKWorker.js",
  serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
});

createRoot(document.getElementById("root")!).render(<App />);