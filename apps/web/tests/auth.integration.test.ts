import { randomUUID } from "node:crypto";
import { db } from "@content-center/db";
import { afterAll, describe, expect, it } from "vitest";
import { auth } from "../lib/auth";

describe("Better Auth integration", () => {
  const email = `auth-${randomUUID()}@example.test`;

  afterAll(async () => {
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  });

  it("registers and signs in with email/password using the database", async () => {
    const registration = await auth.api.signUpEmail({
      body: { name: "Auth Test", email, password: "safe-test-password" },
    });
    expect(registration.user.email).toBe(email);
    await expect(db.user.findUnique({ where: { email } })).resolves.not.toBeNull();

    const login = await auth.api.signInEmail({ body: { email, password: "safe-test-password" } });
    expect(login.user.email).toBe(email);
  });
});
