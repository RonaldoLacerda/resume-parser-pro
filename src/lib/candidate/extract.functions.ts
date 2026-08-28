import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  /** Tipo de fonte já resolvido no cliente (texto extraído local = mais barato). */
  fonte: z.enum(["texto", "imagem", "pdf", "audio"]),
  filename: z.string().default("arquivo"),
  /** Texto puro (fonte=texto) ou data URL base64 (imagem/pdf/audio). */
  payload: z.string(),
});

type Resultado =
  | { ok: true; dadosJson: string; transcricao: string }
  | { ok: false; status: number; message: string };

export const extrairCurriculo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<Resultado> => {
    const mod = await import("./extract.server");
    try {
      if (data.fonte === "texto") {
        const dados = await mod.extrairDeTexto(data.payload);
        return { ok: true, dadosJson: JSON.stringify(dados), transcricao: "" };
      }
      if (data.fonte === "imagem") {
        const dados = await mod.extrairDeImagem(data.payload);
        return { ok: true, dadosJson: JSON.stringify(dados), transcricao: "" };
      }
      if (data.fonte === "pdf") {
        const dados = await mod.extrairDePdf(data.filename, data.payload);
        return { ok: true, dadosJson: JSON.stringify(dados), transcricao: "" };
      }
      const transcricao = await mod.transcreverAudio(data.payload, data.filename);
      const dados = await mod.extrairDeTexto(transcricao);
      return { ok: true, dadosJson: JSON.stringify(dados), transcricao };
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      const message = error instanceof Error ? error.message : "Falha na extração.";
      return { ok: false, status, message };
    }
  });
