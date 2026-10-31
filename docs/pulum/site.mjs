import { config, content } from './content.mjs';
import { mountRecovery } from './recovery.mjs';

const root = document.querySelector('#content');
const page = document.body.dataset.page;
let lang = new URLSearchParams(location.search).get('lang') || navigator.language.slice(0, 2);
if (!content[lang]) lang = 'en';
let updateRecovery;
function render() {
  const copy = content[lang];
  document.documentElement.lang = lang;
  document.title = `${config.appName} · ${copy[`${page}Title`] || config.appName}`;
  document.querySelectorAll('[data-page-link]').forEach((link) => {
    const type = link.dataset.pageLink;
    link.textContent = copy[`${type}Title`]; link.href = `/pulum/${type}/?lang=${lang}`;
  });
  document.querySelectorAll('[data-lang]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === lang)));
  if (['recovery', 'confirmation'].includes(page)) {
    if (updateRecovery) updateRecovery(lang);
    else updateRecovery = mountRecovery(root, config, page, lang);
    document.title = `${config.appName} · ${root.querySelector('h1').textContent}`;
    return;
  }
  root.replaceChildren();
  const heading = document.createElement('h1'); heading.textContent = copy[`${page}Title`] || config.appName; root.append(heading);
  const summary = document.createElement('p'); summary.textContent = copy.summary; root.append(summary);
  if (config.privacyStatus.startsWith('DRAFT')) {
    const notice = document.createElement('p'); notice.className = 'notice'; notice.textContent = copy.draft; root.append(notice);
  }
  for (const [title, text] of copy[page] || []) {
    const section = document.createElement('section'), h2 = document.createElement('h2'), p = document.createElement('p');
    h2.textContent = title; p.textContent = text; section.append(h2, p); root.append(section);
  }
  const contact = document.createElement('a'); contact.href = `mailto:${config.supportEmail}`; contact.textContent = config.supportEmail; root.append(contact);
}
document.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => {
  lang = button.dataset.lang;
  history.replaceState(null, '', `${location.pathname}?lang=${lang}`);
  render();
}));
render();
