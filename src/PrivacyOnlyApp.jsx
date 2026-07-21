import React, { useEffect, useState } from "react";
import {
  policyLocale,
  privacyPolicies,
  PRIVACY_CONTACT,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_VERSION,
} from "./privacy.js";
import { confirmationCopy, confirmationStatusFromLocation } from "./authConfirmation.js";
import { pageForPath, SITE_ROUTES } from "./siteRoutes.js";

const initialLocale = () => policyLocale(navigator.language?.toLowerCase().startsWith("fr")
  ? "fr"
  : navigator.language?.toLowerCase().startsWith("en") ? "en" : "zh-CN");

const siteCopy = {
  "zh-CN": {
    studioTagline: "用心制作简单、可靠的独立应用。",
    hamhamSummary: "供家庭共同使用的宝宝辅食记录工具。",
    privacy: "隐私政策",
    support: "帮助与联系",
    supportTitle: "Ham Ham 帮助与联系",
    supportBody: "如果你在注册、同步、家庭共享或使用 App 时遇到问题，请通过下面的邮箱联系我们。",
    response: "请说明所用设备、App 版本和遇到问题的大致时间；不要发送宝宝不必要的身份信息。",
    email: "发送邮件",
    home: "返回 Uzum Studio",
  },
  fr: {
    studioTagline: "Des applications indépendantes, simples et fiables, conçues avec soin.",
    hamhamSummary: "Un journal de diversification alimentaire à partager en famille.",
    privacy: "Politique de confidentialité",
    support: "Aide et contact",
    supportTitle: "Aide et contact Ham Ham",
    supportBody: "Pour toute question concernant l’inscription, la synchronisation, le partage familial ou l’utilisation de l’application, contactez-nous par e-mail.",
    response: "Indiquez votre appareil, la version de l’app et l’heure approximative du problème. N’envoyez pas d’informations d’identité inutiles concernant le bébé.",
    email: "Envoyer un e-mail",
    home: "Retour à Uzum Studio",
  },
  en: {
    studioTagline: "Simple, dependable independent apps, made with care.",
    hamhamSummary: "A shared baby food journal for the whole family.",
    privacy: "Privacy policy",
    support: "Help and contact",
    supportTitle: "Ham Ham help and contact",
    supportBody: "For help with registration, sync, family sharing or using the app, contact us by email.",
    response: "Include your device, app version and the approximate time of the issue. Do not send unnecessary identity information about the baby.",
    email: "Send an email",
    home: "Back to Uzum Studio",
  },
};

function LanguagePicker({ locale, setLocale, label }) {
  return (
    <div className="privacy-language" role="group" aria-label={label}>
      {Object.entries(privacyPolicies).map(([code, item]) => (
        <button key={code} className={locale === code ? "active" : ""} onClick={() => setLocale(code)}>
          {item.language}
        </button>
      ))}
    </div>
  );
}

function HomePage({ locale, setLocale }) {
  const copy = siteCopy[locale];
  return (
    <main className="studio-page">
      <section className="studio-hero">
        <LanguagePicker locale={locale} setLocale={setLocale} label="Website language" />
        <p className="studio-kicker">UZUM STUDIO</p>
        <h1>Uzum Studio</h1>
        <p className="studio-tagline">{copy.studioTagline}</p>
        <article className="studio-app-card">
          <div className="studio-app-mark" aria-hidden="true">H</div>
          <div>
            <p className="privacy-brand">Ham Ham</p>
            <h2>Ham Ham</h2>
            <p>{copy.hamhamSummary}</p>
          </div>
          <nav>
            <a href={SITE_ROUTES.privacy}>{copy.privacy}</a>
            <a href={SITE_ROUTES.support}>{copy.support}</a>
          </nav>
        </article>
      </section>
    </main>
  );
}

function ConfirmationPage({ locale, setLocale, status }) {
  const copy = confirmationCopy[locale];
  const success = status === "success";
  return (
    <main className="privacy-page auth-confirm-page">
      <article className="privacy-card auth-confirm-card">
        <LanguagePicker locale={locale} setLocale={setLocale} label="Confirmation language" />
        <p className="privacy-brand">Ham Ham</p>
        <div className={`auth-confirm-mark ${success ? "success" : "error"}`} aria-hidden="true">
          {success ? "✓" : "!"}
        </div>
        <h1>{success ? copy.successTitle : copy.errorTitle}</h1>
        <p className="auth-confirm-body">{success ? copy.successBody : copy.errorBody}</p>
        <a className="auth-confirm-primary" href="babyfood://">{copy.openApp}</a>
        <p className="auth-confirm-fallback">{copy.fallback}</p>
        <div className="auth-confirm-links">
          <a href={SITE_ROUTES.privacy}>{copy.privacy}</a>
        </div>
      </article>
    </main>
  );
}

function PrivacyPage({ locale, setLocale }) {
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
          <LanguagePicker locale={locale} setLocale={setLocale} label="Privacy policy language" />
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
            <a href={SITE_ROUTES.home}>Uzum Studio</a>
            <a href={SITE_ROUTES.support}>{siteCopy[locale].support}</a>
            <a href={policy.cnilUrl} target="_blank" rel="noreferrer">CNIL</a>
          </p>
        </div>
      </article>
    </main>
  );
}

function SupportPage({ locale, setLocale }) {
  const copy = siteCopy[locale];
  return (
    <main className="privacy-page support-page">
      <article className="privacy-card support-card">
        <LanguagePicker locale={locale} setLocale={setLocale} label="Support language" />
        <p className="privacy-brand">Ham Ham</p>
        <h1>{copy.supportTitle}</h1>
        <p>{copy.supportBody}</p>
        <p>{copy.response}</p>
        <a className="auth-confirm-primary" href={`mailto:${PRIVACY_CONTACT}`}>{copy.email}</a>
        <p className="support-email">{PRIVACY_CONTACT}</p>
        <nav className="auth-confirm-links">
          <a href={SITE_ROUTES.home}>{copy.home}</a>
          <a href={SITE_ROUTES.privacy}>{copy.privacy}</a>
        </nav>
      </article>
    </main>
  );
}

export function PrivacyOnlyApp() {
  const [locale, setLocale] = useState(initialLocale);
  const [page] = useState(() => pageForPath(window.location.pathname));
  const [confirmationStatus] = useState(() => (
    page === "confirmation"
      ? confirmationStatusFromLocation(window.location.search, window.location.hash) || "error"
      : null
  ));

  useEffect(() => {
    if (page !== "confirmation" || !confirmationStatus) return;
    const cleanState = confirmationStatus === "success" ? "confirmed" : "error";
    window.history.replaceState(null, "", `${SITE_ROUTES.confirmation}?auth=${cleanState}`);
  }, [confirmationStatus, page]);

  useEffect(() => {
    if (page === "confirmation") {
      document.title = `Ham Ham · ${confirmationStatus === "success" ? confirmationCopy[locale].successTitle : confirmationCopy[locale].errorTitle}`;
    } else if (page === "privacy") document.title = "Ham Ham · Privacy Policy";
    else if (page === "support") document.title = "Ham Ham · Support";
    else document.title = "Uzum Studio";
  }, [confirmationStatus, locale, page]);

  if (page === "confirmation") return <ConfirmationPage locale={locale} setLocale={setLocale} status={confirmationStatus} />;
  if (page === "privacy") return <PrivacyPage locale={locale} setLocale={setLocale} />;
  if (page === "support") return <SupportPage locale={locale} setLocale={setLocale} />;
  return <HomePage locale={locale} setLocale={setLocale} />;
}
