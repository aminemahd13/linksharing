import crypto from "crypto";

function getPepper(): string {
  const pepper = process.env.TOKEN_PEPPER;
  if (!pepper) {
    throw new Error("TOKEN_PEPPER is not set");
  }
  return pepper;
}

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(`${token}${getPepper()}`).digest("hex");
}
