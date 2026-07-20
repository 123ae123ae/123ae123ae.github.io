import React, { useEffect, useState } from "react";
import {
  policyLocale,
  privacyPolicies,
  PRIVACY_CONTACT,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_VERSION,
} from "./privacy.js";
import { confirmationCopy, confirmationStatusFromLocation } from "./authConfirmation.js";

const initialLocale = () => policyLocale(navigator.language?.toLowerCase().startsWith("fr")
  ? "fr"
  : navigator.language?.toLowerCase().startsWith("en") ? "en" : "zh-CN");

export function PrivacyOnlyApp() {
  const [locale, setLocale] = useState(initialLocale);
  const [confirmationStatus] = useState(() => confirmationStatusFromLocation(window.location.search, window.location.hash));
  const policy = privacyPolicies[locale];

  useEffect(() => {
    if (!confirmationStatus) return;
    const cleanState = confirmationStatus === "success" ? "confirmed" : "error";
    window.history.replaceState(null, "", `${window.location.pathname}?auth=${cleanState}`);
  }, [confirmationStatus]);

  useEffect(() => {
    document.title = confirmationStatus
      ? `Ham Ham · ${confirmationStatus === "success" ? confirmationCopy[locale].successTitle : confirmationCopy[locale].errorTitle}`
      : "Ham Ham · Privacy Policy";
  }, [confirmationStatus, locale]);

  if (confirmationStatus) {
    const copy = confirmationCopy[locale];
    const success = confirmationStatus === "success";
    return (
      <main className="privacy-page auth-confirm-page">
        <article className="privacy-card auth-confirm-card">
          <div className="privacy-language" role="group" aria-label="Confirmation language">
            {Object.entries(privacyPolicies).map(([code, item]) => (
              <button key={code} className={locale === code ? "active" : ""} onClick={() => setLocale(code)}>
                {item.language}
              </button>
            ))}
          </div>
          <p className="privacy-brand">Ham Ham</p>
          <div className={`auth-confirm-mark ${success ? "success" : "error"}`} aria-hidden="true">
            {success ? "✓" : "!"}
          </div>
          <h1>{success ? copy.successTitle : copy.errorTitle}</h1>
          <p className="auth-confirm-body">{success ? copy.successBody : copy.errorBody}</p>
          <a className="auth-confirm-primary" href="babyfood://">{copy.openApp}</a>
          <p className="auth-confirm-fallback">{copy.fallback}</p>
          <div className="auth-confirm-links">
            <a href="/#privacy">{copy.privacy}</a>
            <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className="privacy-page">
      <article className="privacy-card">
        <header className="privacy-page-head">
          <div>
            <p className="privacy-brand">Ham Ham</p>
            <h1>{policy.title}</h1>
            <p>{policy.effective}：{PRIVACY_EFFECTIVE_DATE} · {policy.version}：{PRIVACY_VERSION}</p>
          </div>
          <div className="privacy-language" role="group" aria-label="Privacy policy language">
            {Object.entries(privacyPolicies).map(([code, item]) => (
              <button key={code} className={locale === code ? "active" : ""} onClick={() => setLocale(code)}>
                {item.language}
              </button>
            ))}
          </div>
        </header>

        <p className="privacy-summary">{policy.summary}</p>
        <div className="privacy-page-content">
          {policy.sections.map(section => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map(text => <p key={text}>{text}</p>)}
              {section.bullets && <ul>{section.bullets.map(text => <li key={text}>{text}</li>)}</ul>}
            </section>
          ))}
          <p className="privacy-links">
            <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>
            <a href={policy.cnilUrl} target="_blank" rel="noreferrer">CNIL</a>
          </p>
        </div>
      </article>
    </main>
  );
}
