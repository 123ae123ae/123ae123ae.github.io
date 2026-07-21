import test from "node:test";
import assert from "node:assert/strict";
import { confirmationCopy, confirmationStatusFromLocation } from "../src/authConfirmation.js";
import {
  prepareWebRecoverySession,
  recoveryConfirmationUrlFromLocation,
  recoveryCopy,
  recoveryCredentialsFromLocation,
  recoveryErrorFromLocation,
  resetWebRecoveryAttemptForTests,
  updateWebRecoveryPassword,
} from "../src/authRecovery.js";
import { pageForPath, SITE_ROUTES } from "../src/siteRoutes.js";

test("Supabase signup fragment opens the success page", () => {
  assert.equal(confirmationStatusFromLocation("", "#access_token=secret&type=signup"), "success");
});

test("expired or invalid confirmation links open the error page", () => {
  assert.equal(confirmationStatusFromLocation("?auth=confirmed", "#error=access_denied&error_code=otp_expired"), "error");
});

test("normal visits keep showing the privacy policy", () => {
  assert.equal(confirmationStatusFromLocation("", "#privacy"), null);
});

test("confirmation copy is complete in all supported languages", () => {
  for (const locale of ["zh-CN", "fr", "en"]) {
    assert.ok(confirmationCopy[locale].successTitle);
    assert.ok(confirmationCopy[locale].errorTitle);
    assert.ok(confirmationCopy[locale].openApp);
  }
});

test("public website routes keep home, privacy, confirmation and support separate", () => {
  assert.equal(pageForPath("/"), "home");
  assert.equal(pageForPath(SITE_ROUTES.privacy), "privacy");
  assert.equal(pageForPath("/hamham/privacy"), "privacy");
  assert.equal(pageForPath(SITE_ROUTES.confirmation), "confirmation");
  assert.equal(pageForPath(SITE_ROUTES.recovery), "recovery");
  assert.equal(pageForPath(SITE_ROUTES.support), "support");
});

test("password recovery gateway accepts only this Supabase project and recovery redirect", () => {
  const confirmationUrl = "https://vqxzrydqnlpxyjafjdoh.supabase.co/auth/v1/verify?token=secret&type=recovery&redirect_to=https%3A%2F%2Fuzumstudio.com%2Fhamham%2Fauth%2Frecovery%2F";
  assert.equal(
    recoveryConfirmationUrlFromLocation(`?confirmation_url=${confirmationUrl}`),
    confirmationUrl,
  );
  assert.equal(
    recoveryConfirmationUrlFromLocation(`?confirmation_url=${encodeURIComponent(confirmationUrl)}`),
    confirmationUrl,
  );
  assert.equal(
    recoveryConfirmationUrlFromLocation("?confirmation_url=https://evil.example/auth/v1/verify?type=recovery&redirect_to=https%3A%2F%2Fuzumstudio.com%2Fhamham%2Fauth%2Frecovery%2F"),
    null,
  );
  assert.equal(
    recoveryConfirmationUrlFromLocation("?confirmation_url=https://vqxzrydqnlpxyjafjdoh.supabase.co/auth/v1/verify?token=secret&type=signup&redirect_to=https%3A%2F%2Fuzumstudio.com%2Fhamham%2Fauth%2Frecovery%2F"),
    null,
  );
  const legacyUrl = recoveryConfirmationUrlFromLocation(
    "?confirmation_url=https://vqxzrydqnlpxyjafjdoh.supabase.co/auth/v1/verify?token=secret&type=recovery&redirect_to=babyfood%3A%2F%2Freset-password",
  );
  assert.equal(new URL(legacyUrl).searchParams.get("redirect_to"), "https://uzumstudio.com/hamham/auth/recovery/");
});

test("password recovery page accepts only a complete recovery session", () => {
  assert.deepEqual(
    recoveryCredentialsFromLocation("", "#access_token=access-secret&refresh_token=refresh-secret&type=recovery"),
    { accessToken: "access-secret", refreshToken: "refresh-secret" },
  );
  assert.equal(recoveryCredentialsFromLocation("", "#access_token=access-secret&type=recovery"), null);
  assert.equal(recoveryCredentialsFromLocation("", "#access_token=a&refresh_token=r&type=signup"), null);
  assert.equal(recoveryCredentialsFromLocation("", "#error=access_denied&error_code=otp_expired"), null);
  assert.equal(recoveryErrorFromLocation("", "#error=access_denied&error_code=otp_expired"), "otp_expired");
});

test("password recovery session setup is idempotent for repeated renders", async () => {
  resetWebRecoveryAttemptForTests();
  const credentials = { accessToken: "access-secret", refreshToken: "refresh-secret" };
  let calls = 0;
  const setSession = async () => {
    calls += 1;
    return { error: null };
  };

  assert.equal(await prepareWebRecoverySession(credentials, setSession), "ready");
  assert.equal(await prepareWebRecoverySession(credentials, setSession), "ready");
  assert.equal(calls, 1);
});

test("password update reports success and handles Supabase failures", async () => {
  assert.equal(await updateWebRecoveryPassword("new-password", async () => ({ error: null })), "success");
  assert.equal(await updateWebRecoveryPassword("new-password", async () => ({ error: new Error("rejected") })), "error");
  assert.equal(await updateWebRecoveryPassword("new-password", async () => { throw new Error("offline"); }), "error");
});

test("password recovery gateway copy is complete in all supported languages", () => {
  for (const locale of ["zh-CN", "fr", "en"]) {
    assert.ok(recoveryCopy[locale].gatewayTitle);
    assert.ok(recoveryCopy[locale].formTitle);
    assert.ok(recoveryCopy[locale].successTitle);
    assert.ok(recoveryCopy[locale].openApp);
    assert.ok(recoveryCopy[locale].manualReturn);
    assert.ok(recoveryCopy[locale].invalidTitle);
  }
});
