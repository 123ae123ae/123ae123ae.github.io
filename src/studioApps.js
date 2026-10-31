const summaries = {
  'zh-CN': {
    hamham: '供家庭共同使用的宝宝辅食记录工具。',
    pulum: '记录日常收支，与家人共享账本，查看账户、预算和统计。',
  },
  fr: {
    hamham: 'Un journal de diversification alimentaire à partager en famille.',
    pulum: 'Vos dépenses, comptes et budgets dans un carnet à partager en famille.',
  },
  en: {
    hamham: 'A shared baby food journal for the whole family.',
    pulum: 'Track everyday spending, accounts and budgets in a shared family ledger.',
  },
};

export function studioAppsFor(locale = 'en') {
  const copy = summaries[locale] || summaries.en;
  const pulumLang = locale === 'zh-CN' ? 'zh' : locale === 'fr' ? 'fr' : 'en';
  return [
    { id: 'hamham', name: 'Ham Ham', summary: copy.hamham, links: [
      { label: 'privacy', href: '/hamham/privacy/' },
      { label: 'support', href: '/hamham/support/' },
    ] },
    { id: 'pulum', name: 'Pulum', summary: copy.pulum, links: [
      { label: 'appPage', href: `/pulum/?lang=${pulumLang}` },
      { label: 'privacy', href: `/pulum/privacy/?lang=${pulumLang}` },
      { label: 'terms', href: `/pulum/terms/?lang=${pulumLang}` },
      { label: 'support', href: `/pulum/support/?lang=${pulumLang}` },
    ] },
  ];
}
