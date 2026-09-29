import assert from "node:assert/strict";
import test from "node:test";
import {
  consumeRequestBudget,
  ensurePhoneUser,
  storeOtpHash,
  verifyAndConsumeOtp,
  type VerificationAdapter,
  type VerificationRecord,
} from "../convex/otpState.ts";
import { normalizePhoneNumber } from "../convex/phone.ts";

const SECRET = "test-only-phone-mail-auth-secret";
const PHONE = "+12025550123";
const NOW = 1_800_000_000_000;

test("normalizes phone number formatting to canonical E.164", () => {
  assert.equal(normalizePhoneNumber("+1 (202) 555-0123"), PHONE);
  assert.equal(normalizePhoneNumber("001 202 555 0123"), PHONE);
  assert.equal(normalizePhoneNumber("202-555-0123"), null);
});

class MemoryVerificationAdapter implements VerificationAdapter {
  readonly records = new Map<string, VerificationRecord>();
  now = NOW;

  async findVerificationValue(identifier: string) {
    return this.records.get(identifier) ?? null;
  }

  async createVerificationValue(record: VerificationRecord & { identifier: string }) {
    this.records.set(record.identifier, {
      value: record.value,
      expiresAt: record.expiresAt instanceof Date ? record.expiresAt.getTime() : record.expiresAt,
    });
  }

  async updateVerificationByIdentifier(
    identifier: string,
    update: { value: string; expiresAt?: Date },
  ) {
    const current = this.records.get(identifier);
    if (!current) throw new Error("Missing verification record");
    this.records.set(identifier, {
      value: update.value,
      expiresAt: update.expiresAt ? update.expiresAt.getTime() : current.expiresAt,
    });
  }

  async consumeVerificationValue(identifier: string) {
    const record = this.records.get(identifier);
    this.records.delete(identifier);
    if (!record) return null;
    const expiresAt = record.expiresAt instanceof Date
      ? record.expiresAt.getTime()
      : record.expiresAt;
    if (expiresAt <= this.now) return null;
    return record;
  }
}

async function storeCode(adapter: MemoryVerificationAdapter, code: string, expiresAt: Date) {
  await adapter.createVerificationValue({ identifier: PHONE, value: `${code}:0`, expiresAt });
  await storeOtpHash(adapter, SECRET, PHONE, code);
}

test("creates a new PhoneMail user and leaves an existing user unchanged", async () => {
  let created = 0;
  const create = async () => { created += 1; };

  assert.equal(await ensurePhoneUser(async () => null, create), true);
  assert.equal(created, 1);
  assert.equal(await ensurePhoneUser(async () => ({ id: "existing" }), create), false);
  assert.equal(created, 1);
});

test("rejects a wrong code and then accepts the right code", async () => {
  const adapter = new MemoryVerificationAdapter();
  await storeCode(adapter, "284193", new Date(NOW + 5 * 60_000));

  assert.equal(await verifyAndConsumeOtp(adapter, SECRET, PHONE, "000000", NOW, 5), false);
  assert.equal(await verifyAndConsumeOtp(adapter, SECRET, PHONE, "284193", NOW, 5), true);
  assert.equal(adapter.records.has(PHONE), false);
});

test("rejects an expired code", async () => {
  const adapter = new MemoryVerificationAdapter();
  await storeCode(adapter, "284193", new Date(NOW - 1));

  assert.equal(await verifyAndConsumeOtp(adapter, SECRET, PHONE, "284193", NOW, 5), false);
});

test("locks the code after five failed attempts", async () => {
  const adapter = new MemoryVerificationAdapter();
  await storeCode(adapter, "284193", new Date(NOW + 5 * 60_000));

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(await verifyAndConsumeOtp(adapter, SECRET, PHONE, "000000", NOW, 5), false);
  }
  assert.equal(await verifyAndConsumeOtp(adapter, SECRET, PHONE, "284193", NOW, 5), false);
  assert.equal(adapter.records.has(PHONE), false);
});

test("applies a resend cooldown and a five-per-hour request limit", async () => {
  const adapter = new MemoryVerificationAdapter();

  await consumeRequestBudget(adapter, SECRET, PHONE, NOW);
  await assert.rejects(() => consumeRequestBudget(adapter, SECRET, PHONE, NOW + 10_000));

  for (let request = 2; request <= 5; request += 1) {
    await consumeRequestBudget(adapter, SECRET, PHONE, NOW + (request - 1) * 30_000);
  }
  await assert.rejects(() => consumeRequestBudget(adapter, SECRET, PHONE, NOW + 150_000));
});
