import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import OneSignal from "react-onesignal";
OneSignal.init({
    appId: "e92aa139-18cd-4df0-ab5b-138bfbbf57c4",
    allowLocalhostAsSecureOrigin: true,
  });
createRoot(document.getElementById("root")!).render(<App />);
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    });
  }
