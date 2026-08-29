import * as XLSX from "xlsx";
import Papa from "papaparse";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export function fileTypeLabel(file) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext || "arquivo";
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    r.readAsArrayBuffer(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    r.readAsText(file, "utf-8");
  });
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Converte um arquivo (PDF, CSV ou XLSX) para o formato de anexo aceito
 * pela Edge Function: { kind: "pdf" | "text", name, data }
 */
export async function fileToAttachment(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`"${file.name}" é maior que 15MB.`);
  }
  const ext = fileTypeLabel(file);

  if (ext === "pdf") {
    const buf = await readAsArrayBuffer(file);
    return { kind: "pdf", name: file.name, data: arrayBufferToBase64(buf) };
  }

  if (ext === "csv") {
    const text = await readAsText(file);
    const parsed = Papa.parse(text, { skipEmptyLines: true });
    const preview = parsed.data
      .slice(0, 500)
      .map((row) => row.join(", "))
      .join("\n");
    return { kind: "text", name: file.name, data: preview };
  }

  if (ext === "xlsx" || ext === "xls") {
    const buf = await readAsArrayBuffer(file);
    const wb = XLSX.read(buf, { type: "array" });
    const sheets = wb.SheetNames.slice(0, 5).map((sheetName) => {
      const sheet = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      return `--- Aba: ${sheetName} ---\n${csv.slice(0, 8000)}`;
    });
    return { kind: "text", name: file.name, data: sheets.join("\n\n") };
  }

  if (ext === "txt" || ext === "md") {
    const text = await readAsText(file);
    return { kind: "text", name: file.name, data: text.slice(0, 20000) };
  }

  throw new Error(`Tipo de arquivo ".${ext}" ainda não é suportado. Use PDF, CSV, XLSX, XLS, TXT ou MD.`);
}
