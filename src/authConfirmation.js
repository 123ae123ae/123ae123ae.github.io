export const confirmationStatusFromLocation = (search = "", hash = "") => {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const error = fragment.get("error") || fragment.get("error_code") || query.get("error") || query.get("error_code");
  if (error) return "error";
  if (fragment.get("type") === "signup" || query.get("auth") === "confirmed") return "success";
  return null;
};

export const confirmationCopy = {
  "zh-CN": {
    successTitle: "邮箱验证成功",
    successBody: "你的 Ham Ham 账号已经可以使用。请返回 App，使用注册时的邮箱和密码登录。",
    errorTitle: "验证链接无效或已过期",
    errorBody: "请返回 Ham Ham 重新注册，或使用最新收到的验证邮件。",
    openApp: "打开 Ham Ham",
    fallback: "如果没有自动打开，请手动返回 Ham Ham。",
    privacy: "查看隐私政策",
  },
  fr: {
    successTitle: "Adresse e-mail confirmée",
    successBody: "Votre compte Ham Ham est prêt. Retournez dans l’application et connectez-vous avec l’adresse e-mail et le mot de passe utilisés lors de l’inscription.",
    errorTitle: "Lien invalide ou expiré",
    errorBody: "Retournez dans Ham Ham pour vous réinscrire ou utilisez le lien de l’e-mail de confirmation le plus récent.",
    openApp: "Ouvrir Ham Ham",
    fallback: "Si l’application ne s’ouvre pas, revenez manuellement dans Ham Ham.",
    privacy: "Voir la politique de confidentialité",
  },
  en: {
    successTitle: "Email confirmed",
    successBody: "Your Ham Ham account is ready. Return to the app and sign in with the email address and password used during registration.",
    errorTitle: "Link invalid or expired",
    errorBody: "Return to Ham Ham to register again, or use the link in the most recent confirmation email.",
    openApp: "Open Ham Ham",
    fallback: "If the app does not open, return to Ham Ham manually.",
    privacy: "View privacy policy",
  },
};
