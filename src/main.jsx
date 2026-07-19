import React from "react";
import { createRoot } from "react-dom/client";
import { PrivacyOnlyApp } from "./PrivacyOnlyApp.jsx";
import "./styles.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(registrations.map(registration => registration.unregister()))));
}
if ("caches" in window) caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))));

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PrivacyOnlyApp />
  </React.StrictMode>,
);
