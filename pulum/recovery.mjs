import { readRecoveryMaterial, validNewPassword, verifyMaterial, authRequest } from './recovery-core.mjs';

const copies = {
  zh: { title: '重置 Pulum 密码', confirmTitle: '确认 Pulum 邮箱', intro: '只有你刚刚申请过此操作时才继续。链接不会在打开网页时自动使用。', next: '继续', working: '正在验证…', missing: '链接无效或已过期。请回到 Pulum 重新申请邮件。', password: '新密码（8–128 位）', repeat: '再次输入新密码', save: '保存新密码', mismatch: '两次密码需一致，长度为 8–128 位。', done: '密码已修改。请回到 Pulum，使用新密码登录。', confirmed: '邮箱已确认。请回到 Pulum 登录。', failed: '操作失败，或链接已失效。请重试或重新申请邮件。', same: '请选择与旧密码不同的新密码。' },
  en: { title: 'Reset your Pulum password', confirmTitle: 'Confirm your Pulum email', intro: 'Continue only if you requested this action. Opening this page does not use the link automatically.', next: 'Continue', working: 'Verifying…', missing: 'Invalid or expired link. Request another email in Pulum.', password: 'New password (8–128 characters)', repeat: 'Repeat new password', save: 'Save password', mismatch: 'Passwords must match and contain 8–128 characters.', done: 'Password changed. Return to Pulum and sign in with your new password.', confirmed: 'Email confirmed. Return to Pulum to sign in.', failed: 'The request failed or the link expired. Try again or request a new email.', same: 'Choose a password different from your old password.' },
  fr: { title: 'Réinitialiser le mot de passe Pulum', confirmTitle: 'Confirmer votre e-mail Pulum', intro: 'Continuez uniquement si vous avez demandé cette action. L’ouverture de cette page ne consomme pas le lien.', next: 'Continuer', working: 'Vérification…', missing: 'Lien invalide ou expiré. Demandez un nouvel e-mail dans Pulum.', password: 'Nouveau mot de passe (8–128 caractères)', repeat: 'Confirmer le mot de passe', save: 'Enregistrer', mismatch: 'Les mots de passe doivent être identiques et contenir 8 à 128 caractères.', done: 'Mot de passe modifié. Reconnectez-vous à Pulum avec le nouveau mot de passe.', confirmed: 'E-mail confirmé. Vous pouvez vous connecter à Pulum.', failed: 'Échec de la demande ou lien expiré. Réessayez ou demandez un nouvel e-mail.', same: 'Choisissez un mot de passe différent de l’ancien.' },
  es: { title: 'Restablecer contraseña de Pulum', confirmTitle: 'Confirmar correo de Pulum', intro: 'Continúa solo si solicitaste esta acción. Abrir esta página no utiliza el enlace automáticamente.', next: 'Continuar', working: 'Verificando…', missing: 'Enlace inválido o caducado. Solicita otro correo en Pulum.', password: 'Nueva contraseña (8–128 caracteres)', repeat: 'Repetir contraseña', save: 'Guardar contraseña', mismatch: 'Las contraseñas deben coincidir y tener entre 8 y 128 caracteres.', done: 'Contraseña cambiada. Vuelve a Pulum e inicia sesión con la nueva contraseña.', confirmed: 'Correo confirmado. Vuelve a Pulum para iniciar sesión.', failed: 'La solicitud falló o el enlace caducó. Inténtalo de nuevo o solicita otro correo.', same: 'Elige una contraseña diferente de la anterior.' },
};

export function mountRecovery(element, config, kind, language) {
  let lang = language;
  let material = readRecoveryMaterial(location.search, location.hash, kind);
  if (window.top !== window.self) material = null;
  // Strip credentials before loading any further assets or making an API request.
  history.replaceState(null, '', `${location.pathname}?lang=${lang}`);
  let phase = material ? 'gateway' : 'missing';
  let accessToken = null, busy = false, status = '';
  const node = (tag, text) => { const item = document.createElement(tag); if (text) item.textContent = text; return item; };
  const clearSession = async () => {
    const token = accessToken; accessToken = null; material = null;
    if (token) await authRequest(config, 'logout?scope=local', {}, token).catch(() => {});
  };
  function render() {
    const copy = copies[lang] || copies.en;
    element.replaceChildren();
    element.append(node('h1', kind === 'confirmation' ? copy.confirmTitle : copy.title));
    const message = node('p', status ? copy[status] : copy[phase] || copy.intro);
    message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
    element.append(message);
    if (phase === 'gateway') {
      const button = node('button', copy.next); button.type = 'button'; button.className = 'primary';
      button.disabled = busy;
      button.onclick = async () => {
        if (busy) return;
        busy = true; status = 'working'; render();
        try {
          const result = await verifyMaterial(config, material);
          material = null;
          accessToken = result.access_token;
          if (!accessToken) throw new Error('NO_SESSION');
          phase = kind === 'confirmation' ? 'confirmed' : 'ready'; status = '';
          if (kind === 'confirmation') await clearSession();
        } catch { phase = 'missing'; status = 'failed'; material = null; }
        finally { busy = false; render(); }
      };
      element.append(button);
    }
    if (phase === 'ready') {
      const form = node('form');
      const password = node('input'), confirmation = node('input');
      for (const [index, input] of [password, confirmation].entries()) {
        input.type = 'password'; input.autocomplete = 'new-password'; input.required = true;
        input.minLength = 8; input.maxLength = 128; input.id = `password-${index}`;
        const label = node('label', index ? copy.repeat : copy.password); label.htmlFor = input.id;
        form.append(label, input);
      }
      const save = node('button', copy.save); save.type = 'submit'; save.className = 'primary'; save.disabled = busy;
      form.append(save);
      form.onsubmit = async (event) => {
        event.preventDefault(); if (busy) return;
        if (!validNewPassword(password.value, confirmation.value)) { status = 'mismatch'; message.textContent = copy.mismatch; return; }
        busy = true; save.disabled = true; message.textContent = copy.working;
        try {
          await authRequest(config, 'user', { password: password.value }, accessToken);
          password.value = ''; confirmation.value = '';
          phase = 'done'; status = ''; render();
          await clearSession();
        } catch (error) { status = error.code === 'same_password' ? 'same' : 'failed'; }
        finally { busy = false; render(); }
      };
      element.append(form);
    }
  }
  render();
  window.addEventListener('pagehide', () => { material = null; accessToken = null; });
  return (next) => { lang = next; render(); };
}
