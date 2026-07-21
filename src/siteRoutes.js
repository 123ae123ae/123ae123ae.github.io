export const SITE_ROUTES = {
  home: "/",
  privacy: "/hamham/privacy/",
  confirmation: "/hamham/auth/confirm/",
  recovery: "/hamham/auth/recovery/",
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
  if (normalized === SITE_ROUTES.recovery) return "recovery";
  if (normalized === SITE_ROUTES.support) return "support";
  return "home";
};
