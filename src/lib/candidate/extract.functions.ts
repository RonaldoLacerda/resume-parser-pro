import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  /** Tipo de fonte já resolvido no cliente (texto extraído local = mais barato). */
  fonte: z.enum(["texto", "imagem", "pdf", "audio"]),
  filename: z.string().default("arquivo"),
  /** Texto puro (fonte=texto) ou data URL base64 (imagem/pdf/audio). */
  payload: z.string(),
});

export const extrairCurriculo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const mod = await import("./extract.server");
    try {
      if (data.fonte === "texto") {
        return { ok: true as const, dados: await mod.extrairDeTexto(data.payload), transcricao: "" };
      }
      if (data.fonte === "imagem") {
        return { ok: true as const, dados: await mod.extrairDeImagem(data.payload), transcricao: "" };
      }
      if (data.fonte === "pdf") {
        return {
          ok: true as const,
          dados: await mod.extrairDePdf(data.filename, data.payload),
          transcricao: "",
        };
      }
      const transcricao = await mod.transcreverAudio(data.payload, data.filename);
      return { ok: true as const, dados: await mod.extrairDeTexto(transcricao), transcricao };
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      const message = error instanceof Error ? error.message : "Falha na extração.";
      return { ok: false as const, status, message };
    }
  });
