export const SITE_ROUTES = {
  home: "/",
  privacy: "/hamham/privacy/",
  confirmation: "/hamham/auth/confirm/",
  support: "/hamham/support/",
};

const normalizedPath = path => {
  const value = `/${String(path || "").replace(/^\/+|\/+$/g, "")}`;
  return value === "/" ? value : `${value}/`;
};

export const pageForPath = path => {
  const normalized = normalizedPath(path);
  if (normalized === SITE_ROUTES.privacy) return "privacy";
  if (normalized === SITE_ROUTES.confirmation) return "confirmation";
  if (normalized === SITE_ROUTES.support) return "support";
  return "home";
};
