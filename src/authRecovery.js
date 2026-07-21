const SUPABASE_AUTH_ORIGIN = "https://vqxzrydqnlpxyjafjdoh.supabase.co";

export const recoveryConfirmationUrlFromLocation = (search = "") => {
  const prefix = "?confirmation_url=";
  if (!search.startsWith(prefix)) return null;

  try {
    const rawValue = search.slice(prefix.length);
    const candidate = /^https?%3A/i.test(rawValue) ? decodeURIComponent(rawValue) : rawValue;
    const url = new URL(candidate);
    if (url.origin !== SUPABASE_AUTH_ORIGIN) return null;
    if (url.pathname !== "/auth/v1/verify") return null;
    if (url.searchParams.get("type") !== "recovery") return null;
    if (!url.searchParams.get("redirect_to")?.startsWith("babyfood://reset-password")) return null;
    return url.toString();
  } catch {
    return null;
  }
};

export const recoveryCopy = {
  "zh-CN": {
    title: "重置 Ham Ham 密码",
    body: "为了保护一次性重置链接，请在这里确认后再继续。只有在你刚刚申请过重置密码时才点击下面的按钮。",
    continue: "继续重置密码",
    invalidTitle: "重置链接无效或已过期",
    invalidBody: "请返回 Ham Ham，重新发送一封密码重置邮件，并使用最新收到的邮件。",
    returnToApp: "返回 Ham Ham",
    privacy: "查看隐私政策",
  },
  fr: {
    title: "Réinitialiser le mot de passe Ham Ham",
    body: "Pour protéger ce lien à usage unique, confirmez ici avant de continuer. Appuyez sur le bouton uniquement si vous venez de demander une réinitialisation.",
    continue: "Continuer la réinitialisation",
    invalidTitle: "Lien de réinitialisation invalide ou expiré",
    invalidBody: "Retournez dans Ham Ham, demandez un nouvel e-mail de réinitialisation et utilisez le message le plus récent.",
    returnToApp: "Retour à Ham Ham",
    privacy: "Voir la politique de confidentialité",
  },
  en: {
    title: "Reset your Ham Ham password",
    body: "To protect this one-time link, confirm here before continuing. Only press the button if you just requested a password reset.",
    continue: "Continue password reset",
    invalidTitle: "Reset link invalid or expired",
    invalidBody: "Return to Ham Ham, request a new reset email, and use the most recent message.",
    returnToApp: "Return to Ham Ham",
    privacy: "View privacy policy",
  },
};
