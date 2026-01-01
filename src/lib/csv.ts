import { parse } from "csv-parse/sync";

export type RecipientRow = {
  email: string;
  name?: string;
  tags?: string[];
};

export function parseRecipientsCsv(input: Buffer): RecipientRow[] {
  const records = parse(input, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records
    .map((row) => ({
      email: row.email?.toLowerCase(),
      name: row.name || undefined,
      tags: row.tags ? row.tags.split(";").map((t) => t.trim()).filter(Boolean) : [],
    }))
    .filter((row) => !!row.email);
}
