/**
 * Pré-processamento no navegador: extrai texto localmente sempre que possível.
 * Isso reduz drasticamente tokens enviados (texto << base64 de PDF/imagem).
 */

export type FonteExtracao = "texto" | "imagem" | "pdf" | "audio";

export type PreparoArquivo = {
  fonte: FonteExtracao;
  payload: string;
  filename: string;
};

export const MAX_BYTES = 12 * 1024 * 1024;

export function toDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

async function pdfParaTexto(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ).default;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const paginas: string[] = [];
  const total = Math.min(doc.numPages, 8); // currículos longos: 8 páginas bastam
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    paginas.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim(),
    );
  }
  return paginas.join("\n\n");
}

async function docxParaTexto(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

/** Decide a rota mais barata para cada tipo de arquivo. */
export async function prepararArquivo(file: File): Promise<PreparoArquivo> {
  if (file.size > MAX_BYTES) throw new Error("Arquivo maior que 12 MB.");
  const nome = file.name;
  const tipo = file.type;
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";

  if (tipo.startsWith("audio/") || ["mp3", "wav", "m4a", "webm", "ogg"].includes(ext)) {
    return { fonte: "audio", payload: await toDataUrl(file), filename: nome };
  }

  if (tipo === "application/pdf" || ext === "pdf") {
    try {
      const texto = await pdfParaTexto(file);
      if (texto.replace(/\s/g, "").length > 200) {
        return { fonte: "texto", payload: texto, filename: nome };
      }
    } catch {
      /* PDF protegido/escaneado: cai para o modelo multimodal */
    }
    return { fonte: "pdf", payload: await toDataUrl(file), filename: nome };
  }

  if (ext === "docx") {
    const texto = await docxParaTexto(file);
    if (texto.trim().length > 0) return { fonte: "texto", payload: texto, filename: nome };
    throw new Error("Não foi possível ler o conteúdo do .docx.");
  }

  if (tipo.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return { fonte: "imagem", payload: await toDataUrl(file), filename: nome };
  }

  if (tipo.startsWith("text/") || ["txt", "md", "rtf"].includes(ext)) {
    return { fonte: "texto", payload: await file.text(), filename: nome };
  }

  throw new Error("Formato não suportado. Use PDF, DOCX, imagem, TXT ou áudio.");
}
