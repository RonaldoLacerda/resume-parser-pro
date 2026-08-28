/**
 * Camada única de acesso ao Lovable AI Gateway.
 * Toda chamada de IA do app passa por aqui (fácil trocar modelo/observabilidade).
 */

const BASE_URL = "https://ai.gateway.lovable.dev/v1";

export const MODELS = {
  /** Extração estruturada (texto e imagem). */
  extraction: "openai/gpt-5.6-luna",
  /** Transcrição de áudio. */
  transcription: "openai/gpt-4o-transcribe",
} as const;

export class GatewayError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new GatewayError(401, "LOVABLE_API_KEY ausente no servidor.");
  return key;
}

export function mensagemDeErro(status: number, fallback: string) {
  if (status === 402) return "Créditos de IA esgotados. Adicione créditos no workspace para continuar.";
  if (status === 429) return "Muitas requisições em sequência. Aguarde alguns segundos e tente novamente.";
  if (status === 403) return "O uso de IA está bloqueado para este workspace.";
  return fallback;
}

type ResponsesContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string }
  | { type: "input_file"; filename: string; file_data: string };

/** Chamada estruturada (JSON Schema) via Responses API. */
export async function responderJson<T>(params: {
  instructions: string;
  content: ResponsesContent[];
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const res = await fetch(`${BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
    },
    body: JSON.stringify({
      model: MODELS.extraction,
      instructions: params.instructions,
      input: [{ role: "user", content: params.content }],
      text: {
        format: {
          type: "json_schema",
          name: params.schemaName,
          schema: params.schema,
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GatewayError(res.status, mensagemDeErro(res.status, body || "Falha na extração."));
  }

  const data = (await res.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  const text =
    data.output_text ??
    data.output
      ?.flatMap((item) => item.content ?? [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text ?? "")
      .join("");

  if (!text) throw new GatewayError(502, "A IA não retornou conteúdo.");

  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new GatewayError(502, "Resposta da IA em formato inesperado.");
  }
}

/** Transcrição de áudio (multipart). */
export async function transcrever(file: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("model", MODELS.transcription);
  form.append("file", file, filename);

  const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GatewayError(res.status, mensagemDeErro(res.status, body || "Falha ao transcrever o áudio."));
  }

  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new GatewayError(502, "Transcrição vazia.");
  return data.text;
}
