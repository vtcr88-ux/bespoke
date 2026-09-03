import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

const passwordHashVersion = "1";
const passwordKeyLength = 64;
const passwordSaltLength = 16;
const passwordScryptOptions: ScryptOptions = {
  N: 32_768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};
const sessionTokenBytes = 32;
const csrfTokenBytes = 32;
const loginWindowMs = 15 * 60 * 1000;
const maxIdentityFailures = 8;
const maxIpFailures = 30;

export type AdminPrincipal = {
  id: string;
  email: string;
  role: "owner" | "manager" | "support" | "platform_owner";
  permissions: string[];
};

export type AdminSession = {
  admin: AdminPrincipal;
  csrfToken: string;
  expiresAt: number;
};

export type AdminSessionResponse = {
  admin: Pick<AdminPrincipal, "email" | "role">;
  csrfToken: string;
  expiresAt: string;
};

type StoredSession = AdminSession;

type LoginAttempt = {
  count: number;
  resetAt: number;
};

type LoginResult =
  | { status: "authenticated"; session: AdminSession; token: string }
  | { status: "invalid" }
  | { status: "rate_limited"; retryAfterSeconds: number };

export type AdminAuthConfig = {
  instanceId: string;
  email: string;
  passwordHash: string;
  sessionTtlMinutes: number;
  csrfSecret: string;
  cookieName?: string;
  permissions?: readonly string[];
  principalId?: string;
  role?: AdminPrincipal["role"];
};

const ownerPermissions = [
  "products:write",
  "orders:read",
  "orders:write",
  "reports:read",
  "settings:write",
];

export class AdminAuthService {
  readonly sessionCookieName: string;
  private readonly configuredEmail: string;
  private readonly configuredEmailDigest: Buffer;
  private readonly principal: AdminPrincipal;
  private readonly sessionTtlMs: number;
  private readonly sessions = new Map<string, StoredSession>();
  private readonly loginAttempts = new Map<string, LoginAttempt>();

  constructor(private readonly config: AdminAuthConfig) {
    this.sessionCookieName =
      config.cookieName ?? `catalog_admin_${config.instanceId}`;
    this.configuredEmail = normalizeEmail(config.email);
    this.configuredEmailDigest = digest(this.configuredEmail);
    this.sessionTtlMs = config.sessionTtlMinutes * 60 * 1000;
    this.principal = {
      id: config.principalId ?? "00000000-0000-4000-8000-000000000001",
      email: this.configuredEmail,
      role: config.role ?? "owner",
      permissions: [...(config.permissions ?? ownerPermissions)],
    };
  }

  async login(ipAddress: string, email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = normalizeEmail(email);
    const rateLimit = this.loginRateLimit(ipAddress, normalizedEmail);
    if (rateLimit) {
      return {
        status: "rate_limited",
        retryAfterSeconds: rateLimit,
      };
    }

    const passwordMatches = await verifyAdminPasswordHash(
      password,
      this.config.passwordHash,
    );
    const emailMatches = timingSafeEqual(
      digest(normalizedEmail),
      this.configuredEmailDigest,
    );

    if (!emailMatches || !passwordMatches) {
      this.recordLoginFailure(ipAddress, normalizedEmail);
      return { status: "invalid" };
    }

    this.clearLoginFailures(ipAddress, normalizedEmail);
    this.pruneExpiredSessions();
    const token = randomToken(sessionTokenBytes);
    const session: StoredSession = {
      admin: this.principal,
      csrfToken: createHmac(
        "sha256",
        this.config.csrfSecret,
      )
        .update(randomToken(csrfTokenBytes))
        .digest("base64url"),
      expiresAt: Date.now() + this.sessionTtlMs,
    };
    this.sessions.set(sessionKey(token), session);
    return { status: "authenticated", session, token };
  }

  session(token: string | undefined): AdminSession | null {
    if (!token) return null;
    const key = sessionKey(token);
    const session = this.sessions.get(key);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(key);
      return null;
    }
    return session;
  }

  revoke(token: string | undefined) {
    if (token) this.sessions.delete(sessionKey(token));
  }

  csrfMatches(session: AdminSession, candidate: string | undefined) {
    if (!candidate) return false;
    return timingSafeEqual(digest(candidate), digest(session.csrfToken));
  }

  sessionResponse(session: AdminSession): AdminSessionResponse {
    return {
      admin: {
        email: session.admin.email,
        role: session.admin.role,
      },
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
    };
  }

  private loginRateLimit(ipAddress: string, email: string) {
    this.pruneLoginAttempts();
    const limits = this.loginAttemptLimits(ipAddress, email);
    const blocked = limits
      .map(({ key, maximum }) => ({
        attempt: this.loginAttempts.get(key),
        maximum,
      }))
      .filter(
        (
          entry,
        ): entry is { attempt: LoginAttempt; maximum: number } =>
          Boolean(entry.attempt),
      )
      .filter(({ attempt, maximum }) => attempt.count >= maximum);

    if (!blocked.length) return null;
    return Math.max(
      1,
      ...blocked.map(({ attempt }) =>
        Math.ceil((attempt.resetAt - Date.now()) / 1000),
      ),
    );
  }

  private recordLoginFailure(ipAddress: string, email: string) {
    const now = Date.now();
    for (const { key } of this.loginAttemptLimits(ipAddress, email)) {
      const current = this.loginAttempts.get(key);
      this.loginAttempts.set(key, {
        count: current && current.resetAt > now ? current.count + 1 : 1,
        resetAt: current && current.resetAt > now ? current.resetAt : now + loginWindowMs,
      });
    }
  }

  private clearLoginFailures(ipAddress: string, email: string) {
    for (const { key } of this.loginAttemptLimits(ipAddress, email)) {
      this.loginAttempts.delete(key);
    }
  }

  private loginAttemptLimits(ipAddress: string, email: string) {
    return [
      { key: `ip:${digestText(ipAddress)}`, maximum: maxIpFailures },
      {
        key: `identity:${digestText(`${ipAddress}|${email}`)}`,
        maximum: maxIdentityFailures,
      },
    ];
  }

  private pruneExpiredSessions() {
    const now = Date.now();
    for (const [key, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(key);
    }
  }

  private pruneLoginAttempts() {
    const now = Date.now();
    for (const [key, attempt] of this.loginAttempts) {
      if (attempt.resetAt <= now) this.loginAttempts.delete(key);
    }
  }
}

export async function createAdminPasswordHash(password: string) {
  const salt = randomBytes(passwordSaltLength);
  const derivedKey = await derivePassword(password, salt, passwordScryptOptions);
  return [
    "scrypt",
    passwordHashVersion,
    String(passwordScryptOptions.N),
    String(passwordScryptOptions.r),
    String(passwordScryptOptions.p),
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export function isAdminPasswordHash(value: string) {
  return parsePasswordHash(value) != null;
}

export async function verifyAdminPasswordHash(
  password: string,
  passwordHash: string,
) {
  const parsed = parsePasswordHash(passwordHash);
  if (!parsed) return false;
  const derivedKey = await derivePassword(password, parsed.salt, parsed.options);
  return timingSafeEqual(derivedKey, parsed.expectedKey);
}

function parsePasswordHash(value: string) {
  const [algorithm, version, rawN, rawR, rawP, rawSalt, rawKey, ...extra] =
    value.split("$");
  if (
    algorithm !== "scrypt" ||
    version !== passwordHashVersion ||
    !rawN ||
    !rawR ||
    !rawP ||
    !rawSalt ||
    !rawKey ||
    extra.length
  ) {
    return null;
  }

  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (
    !Number.isInteger(N) ||
    N < 16_384 ||
    N > 131_072 ||
    (N & (N - 1)) !== 0 ||
    !Number.isInteger(r) ||
    r < 8 ||
    r > 16 ||
    !Number.isInteger(p) ||
    p < 1 ||
    p > 4 ||
    !/^[A-Za-z0-9_-]+$/.test(rawSalt) ||
    !/^[A-Za-z0-9_-]+$/.test(rawKey)
  ) {
    return null;
  }

  const salt = Buffer.from(rawSalt, "base64url");
  const expectedKey = Buffer.from(rawKey, "base64url");
  if (salt.length < passwordSaltLength || expectedKey.length !== passwordKeyLength) {
    return null;
  }

  return {
    expectedKey,
    salt,
    options: {
      N,
      r,
      p,
      maxmem: Math.max(64 * 1024 * 1024, 256 * N * r),
    } satisfies ScryptOptions,
  };
}

function derivePassword(
  password: string,
  salt: Buffer,
  options: ScryptOptions,
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, passwordKeyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

function randomToken(size: number) {
  return randomBytes(size).toString("base64url");
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function digestText(value: string) {
  return digest(value).toString("base64url");
}

function sessionKey(token: string) {
  return digestText(token);
}
