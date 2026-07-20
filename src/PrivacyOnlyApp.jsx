import React, { useState } from "react";
import {
  policyLocale,
  privacyPolicies,
  PRIVACY_CONTACT,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_VERSION,
} from "./privacy.js";

const initialLocale = () => policyLocale(navigator.language?.toLowerCase().startsWith("fr")
  ? "fr"
  : navigator.language?.toLowerCase().startsWith("en") ? "en" : "zh-CN");

export function PrivacyOnlyApp() {
  const [locale, setLocale] = useState(initialLocale);
  const policy = privacyPolicies[locale];

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
