export const CSV_ROW_CAP = 200;

export type CsvMemberRow = {
  email: string;
  full_name: string;
};

export function parseMemberCsv(text: string): { rows: CsvMemberRow[]; error?: string } {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return { rows: [], error: "The file is empty." };

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], error: "The file is empty." };

  const header = splitCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const emailIndex = header.findIndex((cell) => cell === "email");
  const nameIndex = header.findIndex(
    (cell) => cell === "full_name" || cell === "full name" || cell === "name"
  );
  if (emailIndex < 0 || nameIndex < 0) {
    return { rows: [], error: "CSV must include email and full_name columns." };
  }

  const body = lines.slice(1);
  if (body.length > CSV_ROW_CAP) {
    return {
      rows: [],
      error: `CSV is limited to ${CSV_ROW_CAP} rows. Split the file and try again.`,
    };
  }

  const seen = new Set<string>();
  const rows: CsvMemberRow[] = [];
  for (const line of body) {
    const cells = splitCsvLine(line);
    const email = (cells[emailIndex] ?? "").trim().toLowerCase();
    const full_name = (cells[nameIndex] ?? "").trim();
    if (!email) continue;
    if (!email.includes("@")) {
      return { rows: [], error: `“${email}” is not a valid email address.` };
    }
    if (seen.has(email)) continue;
    seen.add(email);
    rows.push({ email, full_name });
  }

  if (rows.length === 0) {
    return { rows: [], error: "No data rows found after the header." };
  }
  return { rows };
}

export function toCsv(headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  return `\uFEFF${lines.join("\n")}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}
