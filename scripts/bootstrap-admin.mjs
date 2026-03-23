import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value.replace(/^"(.*)"$/, "$1");
    }
  }
}

function loadLocalEnv() {
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));
}

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Thiếu biến môi trường ${name}.`);
  }

  return value;
}

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function getGoogleAccessToken({ clientEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    })
  );
  const payload = toBase64Url(
    JSON.stringify({
      iss: clientEmail,
      sub: clientEmail,
      aud: "https://oauth2.googleapis.com/token",
      scope:
        "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore",
      iat: now,
      exp: now + 3600,
    })
  );

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();

  const signature = signer.sign(privateKey, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${payload}.${signature}`,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Không lấy được Google access token: ${response.status} ${await response.text()}`
    );
  }

  const data = await response.json();
  return data.access_token;
}

function toFirestoreValue(value) {
  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item)),
      },
    };
  }

  if (value && typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nestedValue]) => [
            key,
            toFirestoreValue(nestedValue),
          ])
        ),
      },
    };
  }

  return { nullValue: null };
}

async function writeFirestoreDocument({
  accessToken,
  projectId,
  collection,
  documentId,
  data,
}) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${documentId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])
        ),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Không ghi được document ${collection}/${documentId}: ${response.status} ${await response.text()}`
    );
  }
}

async function createAdminAuthUser({
  accessToken,
  apiKey,
  projectId,
  email,
  password,
  displayName,
}) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        displayName,
        emailVerified: true,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Không tạo được tài khoản Auth admin: ${response.status} ${await response.text()}`
    );
  }

  const data = await response.json();
  return data.localId;
}

async function main() {
  loadLocalEnv();

  const name = getArg("name", "TruckGo Admin");
  const email = getArg("email", "admin@truckgo.example.com");
  const password = getArg("password");

  if (!password) {
    throw new Error(
      "Thiếu mật khẩu. Hãy chạy: npm run admin:bootstrap -- --password=MatKhauCuaBan"
    );
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(
    /\\n/g,
    "\n"
  );
  const apiKey = requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY");

  if (!projectId) {
    throw new Error("Thiếu FIREBASE_ADMIN_PROJECT_ID hoặc NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
  }

  const accessToken = await getGoogleAccessToken({
    clientEmail,
    privateKey,
  });
  const uid = await createAdminAuthUser({
    accessToken,
    apiKey,
    projectId,
    email,
    password,
    displayName: name,
  });

  const now = new Date().toISOString();
  const userProfile = {
    id: uid,
    name,
    email,
    role: "admin",
    isVerified: true,
    emailVerified: true,
    verificationDocs: [],
    verificationStatus: "verified",
    avgRating: 0,
    totalReviews: 0,
    createdAt: now,
    updatedAt: now,
  };

  const publicProfile = {
    id: uid,
    name,
    role: "admin",
    isVerified: true,
    avgRating: 0,
    totalReviews: 0,
    createdAt: now,
    updatedAt: now,
  };

  await writeFirestoreDocument({
    accessToken,
    projectId,
    collection: "users",
    documentId: uid,
    data: userProfile,
  });
  await writeFirestoreDocument({
    accessToken,
    projectId,
    collection: "publicProfiles",
    documentId: uid,
    data: publicProfile,
  });

  console.log("Đã tạo tài khoản admin thành công.");
  console.log(`UID: ${uid}`);
  console.log(`Email: ${email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
