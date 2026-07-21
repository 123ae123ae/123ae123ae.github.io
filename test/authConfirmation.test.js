import test from "node:test";
import assert from "node:assert/strict";
import { confirmationCopy, confirmationStatusFromLocation } from "../src/authConfirmation.js";
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
  assert.equal(pageForPath(SITE_ROUTES.support), "support");
});
