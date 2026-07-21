import test from "node:test";
import assert from "node:assert/strict";
import { confirmationCopy, confirmationStatusFromLocation } from "../src/authConfirmation.js";
import { recoveryConfirmationUrlFromLocation, recoveryCopy } from "../src/authRecovery.js";
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
  const confirmationUrl = "https://vqxzrydqnlpxyjafjdoh.supabase.co/auth/v1/verify?token=secret&type=recovery&redirect_to=babyfood://reset-password";
  assert.equal(
    recoveryConfirmationUrlFromLocation(`?confirmation_url=${confirmationUrl}`),
    confirmationUrl,
  );
  assert.equal(
    recoveryConfirmationUrlFromLocation(`?confirmation_url=${encodeURIComponent(confirmationUrl)}`),
    confirmationUrl,
  );
  assert.equal(
    recoveryConfirmationUrlFromLocation("?confirmation_url=https://evil.example/auth/v1/verify?type=recovery&redirect_to=babyfood://reset-password"),
    null,
  );
  assert.equal(
    recoveryConfirmationUrlFromLocation("?confirmation_url=https://vqxzrydqnlpxyjafjdoh.supabase.co/auth/v1/verify?token=secret&type=signup&redirect_to=babyfood://reset-password"),
    null,
  );
});

test("password recovery gateway copy is complete in all supported languages", () => {
  for (const locale of ["zh-CN", "fr", "en"]) {
    assert.ok(recoveryCopy[locale].title);
    assert.ok(recoveryCopy[locale].continue);
    assert.ok(recoveryCopy[locale].invalidTitle);
  }
});
