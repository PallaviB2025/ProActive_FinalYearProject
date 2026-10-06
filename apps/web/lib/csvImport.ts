import { credentialSchema, type Credential } from "@proactive/shared";
export const MAX_CSV_BYTES = 2_000_000;
export const MAX_CSV_ROWS = 1000;

const aliases = {
  website: ["url", "website", "login_uri", "name"],
  username: ["username", "login", "login_username"],
  password: ["password", "login_password"],
} as const;

export type ImportRow = {
  row: number;
  credential: Credential | null;
  duplicate: boolean;
  error?: string;
};

export type ImportPreview = {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  rows: ImportRow[];
};

function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  for (let index = 0; index < csv.length; index++) {
    const character = csv[index]!;
    if (quoted) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index++;
        } else { quoted = false; closed = true; }
      } else field += character;
      continue;
    }
    if (closed && ![",", "\r", "\n"].includes(character))
      throw new Error("Malformed CSV");
    if (character === '"') {
      if (field.length) throw new Error("Malformed CSV");
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
      closed = false;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index++;
      row.push(field);
      rows.push(row);
      if (rows.length > MAX_CSV_ROWS + 1) throw new Error("CSV exceeds 1,000 rows");
      row = [];
      field = "";
      closed = false;
    } else field += character;
  }
  if (quoted) throw new Error("Malformed CSV");
  row.push(field);
  if (row.some((value) => value.length) || rows.length === 0) rows.push(row);
  return rows;
}

export const credentialIdentity = (credential: Credential) =>
  JSON.stringify([
    credential.website,
    credential.username,
    credential.password,
  ]);

export function parseCredentialCsv(
  csv: string,
  existing: readonly Credential[] = [],
): ImportPreview {
  if (!csv.trim()) throw new Error("CSV file is empty");
  if (new TextEncoder().encode(csv).byteLength > MAX_CSV_BYTES)
    throw new Error("CSV exceeds 2 MB");
  const records = parseRows(csv.replace(/^\uFEFF/, ""));
  const header = records.shift()?.map((value) => value.trim().toLowerCase());
  if (!header?.length) throw new Error("CSV file is empty");
  if (new Set(header).size !== header.length) throw new Error("Duplicate CSV column names");
  if (records.length > MAX_CSV_ROWS) throw new Error("CSV exceeds 1,000 rows");
  const column = (names: readonly string[]) => {
    for (const name of names) {
      const index = header.indexOf(name);
      if (index >= 0) return index;
    }
    return -1;
  };
  const websiteIndex = column(aliases.website);
  const usernameIndex = column(aliases.username);
  const passwordIndex = column(aliases.password);
  if ([websiteIndex, usernameIndex, passwordIndex].some((value) => value < 0))
    throw new Error("CSV must include website, username, and password columns");

  const seen = new Set(existing.map(credentialIdentity));
  const rows = records.map((values, index): ImportRow => {
    if (values.length !== header.length)
      return { row: index + 2, credential: null, duplicate: false, error: "Unsupported column count" };
    const parsed = credentialSchema.safeParse({
      website: values[websiteIndex]?.trim() ?? "",
      username: values[usernameIndex] ?? "",
      password: values[passwordIndex] ?? "",
    });
    if (!parsed.success)
      return { row: index + 2, credential: null, duplicate: false, error: "Missing or unsupported field" };
    const key = credentialIdentity(parsed.data);
    const duplicate = seen.has(key);
    seen.add(key);
    return { row: index + 2, credential: parsed.data, duplicate };
  });
  return {
    total: rows.length,
    valid: rows.filter((row) => row.credential !== null).length,
    invalid: rows.filter((row) => row.credential === null).length,
    duplicates: rows.filter((row) => row.duplicate).length,
    rows,
  };
}

export async function readCsvFile(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".csv"))
    throw new Error("Choose a CSV file");
  if (file.size > MAX_CSV_BYTES) throw new Error("CSV exceeds 2 MB");
  return new TextDecoder("utf-8", { fatal: true }).decode(
    await file.arrayBuffer(),
  );
}
