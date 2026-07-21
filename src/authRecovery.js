export const SUPABASE_URL = "https://vqxzrydqnlpxyjafjdoh.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Pn-dEaqu0oWYJ8eK8OgUAg_PPORfQFF";
export const PASSWORD_RECOVERY_URL = "https://uzumstudio.com/hamham/auth/recovery/";

let recoveryAttempt = null;

const readParams = (value = "") => new URLSearchParams(value.replace(/^[?#]/, ""));

const recoveryKey = credentials => {
  const source = `${credentials.accessToken}:${credentials.refreshToken}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  }
  return `${source.length}:${hash >>> 0}`;
};

export const recoveryConfirmationUrlFromLocation = (search = "") => {
  const prefix = "?confirmation_url=";
  const rawValue = search.startsWith(prefix)
    ? search.slice(prefix.length)
    : readParams(search).get("confirmation_url");
  if (!rawValue) return null;

  try {
    const candidate = /^https?%3A/i.test(rawValue) ? decodeURIComponent(rawValue) : rawValue;
    const url = new URL(candidate);
    if (url.origin !== SUPABASE_URL) return null;
    if (url.pathname !== "/auth/v1/verify") return null;
    if (url.searchParams.get("type") !== "recovery") return null;

    const redirect = new URL(url.searchParams.get("redirect_to") || "");
    const isWebRecovery = redirect.origin === "https://uzumstudio.com"
      && redirect.pathname === "/hamham/auth/recovery/";
    const isLegacyAppRecovery = redirect.protocol === "babyfood:"
      && redirect.hostname === "reset-password";
    if (!isWebRecovery && !isLegacyAppRecovery) return null;
    if (isLegacyAppRecovery) url.searchParams.set("redirect_to", PASSWORD_RECOVERY_URL);
    return url.toString();
  } catch {
    return null;
  }
};

export const recoveryErrorFromLocation = (search = "", hash = "") => {
  const query = readParams(search);
  const fragment = readParams(hash);
  return fragment.get("error_code") || fragment.get("error")
    || query.get("error_code") || query.get("error") || null;
};

export const recoveryCredentialsFromLocation = (search = "", hash = "") => {
  if (recoveryErrorFromLocation(search, hash)) return null;
  const query = readParams(search);
  const fragment = readParams(hash);
  const read = key => fragment.get(key) || query.get(key);
  if (read("type") !== "recovery") return null;

  const accessToken = read("access_token");
  const refreshToken = read("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
};

export const prepareWebRecoverySession = (credentials, setSession) => {
  if (!credentials) return Promise.resolve("error");
  const key = recoveryKey(credentials);
  if (recoveryAttempt?.key === key) return recoveryAttempt.promise;

  const promise = Promise.resolve()
    .then(() => setSession({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    }))
    .then(({ error }) => error ? "error" : "ready")
    .catch(() => "error");

  recoveryAttempt = { key, promise };
  return promise;
};

export const updateWebRecoveryPassword = async (password, updateUser) => {
  try {
    const { error } = await updateUser({ password });
    return error ? "error" : "success";
  } catch {
    return "error";
  }
};

export const resetWebRecoveryAttemptForTests = () => {
  recoveryAttempt = null;
};

export const recoveryCopy = {
  "zh-CN": {
    gatewayTitle: "重置 Ham Ham 密码",
    gatewayBody: "为了保护一次性重置链接，请确认后再继续。只有在你刚刚申请过重置密码时才点击下面的按钮。",
    continue: "继续重置密码",
    verifyingTitle: "正在验证重置链接…",
    verifyingBody: "请稍候，不要关闭此页面。",
    formTitle: "设置新密码",
    formBody: "输入至少 8 位的新密码。保存后，新密码会立即生效。",
    password: "新密码",
    confirmation: "再次输入新密码",
    placeholder: "至少 8 位",
    show: "显示密码",
    hide: "隐藏密码",
    mismatch: "两次输入的密码不一致。",
    tooShort: "密码至少需要 8 位。",
    updateError: "密码修改失败，请重新打开最新收到的重置邮件链接。",
    save: "保存新密码",
    saving: "正在保存…",
    successTitle: "密码重置成功",
    successBody: "新密码已经生效。现在可以回到 Ham Ham，使用新密码登录。",
    openApp: "打开 Ham Ham",
    manualReturn: "你也可以关闭此页面，自己打开 Ham Ham，然后输入新密码登录。",
    invalidTitle: "重置链接无效或已过期",
    invalidBody: "请回到 Ham Ham，重新发送一封密码重置邮件，并使用最新收到的邮件。",
    returnToApp: "返回 Ham Ham",
    privacy: "查看隐私政策",
  },
  fr: {
    gatewayTitle: "Réinitialiser le mot de passe Ham Ham",
    gatewayBody: "Pour protéger ce lien à usage unique, confirmez avant de continuer. Appuyez sur le bouton uniquement si vous venez de demander une réinitialisation.",
    continue: "Continuer la réinitialisation",
    verifyingTitle: "Vérification du lien…",
    verifyingBody: "Veuillez patienter et ne fermez pas cette page.",
    formTitle: "Définir un nouveau mot de passe",
    formBody: "Saisissez un nouveau mot de passe d’au moins 8 caractères. Il prendra effet dès son enregistrement.",
    password: "Nouveau mot de passe",
    confirmation: "Confirmer le nouveau mot de passe",
    placeholder: "8 caractères minimum",
    show: "Afficher le mot de passe",
    hide: "Masquer le mot de passe",
    mismatch: "Les deux mots de passe ne correspondent pas.",
    tooShort: "Le mot de passe doit contenir au moins 8 caractères.",
    updateError: "Impossible de modifier le mot de passe. Ouvrez le lien de l’e-mail de réinitialisation le plus récent.",
    save: "Enregistrer le nouveau mot de passe",
    saving: "Enregistrement…",
    successTitle: "Mot de passe réinitialisé",
    successBody: "Votre nouveau mot de passe est actif. Vous pouvez maintenant retourner dans Ham Ham et vous connecter avec celui-ci.",
    openApp: "Ouvrir Ham Ham",
    manualReturn: "Vous pouvez aussi fermer cette page, ouvrir Ham Ham vous-même, puis saisir votre nouveau mot de passe.",
    invalidTitle: "Lien de réinitialisation invalide ou expiré",
    invalidBody: "Retournez dans Ham Ham, demandez un nouvel e-mail de réinitialisation et utilisez le message le plus récent.",
    returnToApp: "Retour à Ham Ham",
    privacy: "Voir la politique de confidentialité",
  },
  en: {
    gatewayTitle: "Reset your Ham Ham password",
    gatewayBody: "To protect this one-time link, confirm before continuing. Only press the button if you just requested a password reset.",
    continue: "Continue password reset",
    verifyingTitle: "Verifying reset link…",
    verifyingBody: "Please wait and keep this page open.",
    formTitle: "Set a new password",
    formBody: "Enter a new password with at least 8 characters. It will take effect as soon as you save it.",
    password: "New password",
    confirmation: "Confirm new password",
    placeholder: "At least 8 characters",
    show: "Show password",
    hide: "Hide password",
    mismatch: "The passwords do not match.",
    tooShort: "The password must contain at least 8 characters.",
    updateError: "Could not update the password. Open the link in the most recent reset email.",
    save: "Save new password",
    saving: "Saving…",
    successTitle: "Password reset successful",
    successBody: "Your new password is active. You can now return to Ham Ham and sign in with it.",
    openApp: "Open Ham Ham",
    manualReturn: "You can also close this page, open Ham Ham yourself, and enter your new password.",
    invalidTitle: "Reset link invalid or expired",
    invalidBody: "Return to Ham Ham, request a new reset email, and use the most recent message.",
    returnToApp: "Return to Ham Ham",
    privacy: "View privacy policy",
  },
};
