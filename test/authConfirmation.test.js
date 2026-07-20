import test from "node:test";
import assert from "node:assert/strict";
import { confirmationCopy, confirmationStatusFromLocation } from "../src/authConfirmation.js";

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
