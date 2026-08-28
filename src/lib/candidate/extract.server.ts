import { responderJson, transcrever } from "@/lib/ai/gateway.server";

/**
 * Prompt e JSON Schema únicos, compartilhados por currículo em texto,
 * imagem e áudio transcrito — uma só chamada de IA por arquivo.
 */

const str = { type: "string" } as const;

const EXTRACAO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    geral: {
      type: "object",
      additionalProperties: false,
      properties: {
        nomeCompleto: str,
        email: str,
        cpf: str,
        dataNascimento: str,
        sexo: str,
        estadoCivil: str,
        ddiCelular: str,
        celular: str,
        telefone: str,
        rg: str,
        paisNascimento: str,
        estadoNascimento: str,
        cidadeNascimento: str,
      },
    },
    endereco: {
      type: "object",
      additionalProperties: false,
      properties: {
        pais: str,
        cep: str,
        estado: str,
        cidade: str,
        bairro: str,
        logradouro: str,
        numero: str,
        complemento: str,
      },
    },
    experiencias: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          empresa: str,
          cargo: str,
          atual: { type: "boolean" },
          inicio: str,
          desligamento: str,
          cidade: str,
          estado: str,
          tipoContrato: str,
          atividades: str,
        },
      },
    },
    formacoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          nivelEnsino: str,
          situacao: str,
          curso: str,
          instituicao: str,
          inicio: str,
          conclusao: str,
          modalidade: str,
        },
      },
    },
    profissionais: {
      type: "object",
      additionalProperties: false,
      properties: {
        idiomas: { type: "array", items: str },
        cargosInteresse: { type: "array", items: str },
        conhecimentos: { type: "array", items: str },
        pretensaoSalarial: str,
        resumoProfissional: str,
        objetivosProfissionais: str,
      },
    },
  },
} as const;

const INSTRUCOES = [
  "Você extrai dados de currículos brasileiros para preencher um cadastro.",
  "Priorize: dados gerais, experiências profissionais e formação acadêmica.",
  "Responda apenas com o JSON do schema. Omita campos sem informação — nunca invente dados.",
  "Datas de início/conclusão no formato mm/aaaa; data de nascimento dd/mm/aaaa.",
  "Experiências e formações em ordem da mais recente para a mais antiga.",
  "Marque atual=true quando a experiência estiver em andamento e deixe desligamento vazio.",
  "Atividades exercidas: no máximo 400 caracteres, em texto corrido.",
].join(" ");

/** Limite de contexto: currículos raramente passam disso e evita custo desnecessário. */
const MAX_CHARS = 18000;

export type ExtracaoBruta = Record<string, unknown>;

export function normalizarTexto(texto: string) {
  return texto.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_CHARS);
}

export function extrairDeTexto(texto: string) {
  return responderJson<ExtracaoBruta>({
    instructions: INSTRUCOES,
    content: [{ type: "input_text", text: `Currículo:\n${normalizarTexto(texto)}` }],
    schemaName: "extracao_curriculo",
    schema: EXTRACAO_SCHEMA,
  });
}

export function extrairDeImagem(dataUrl: string) {
  return responderJson<ExtracaoBruta>({
    instructions: INSTRUCOES,
    content: [
      { type: "input_text", text: "Extraia os dados do currículo desta imagem." },
      { type: "input_image", image_url: dataUrl },
    ],
    schemaName: "extracao_curriculo",
    schema: EXTRACAO_SCHEMA,
  });
}

export function extrairDePdf(filename: string, dataUrl: string) {
  return responderJson<ExtracaoBruta>({
    instructions: INSTRUCOES,
    content: [
      { type: "input_text", text: "Extraia os dados do currículo em anexo." },
      { type: "input_file", filename, file_data: dataUrl },
    ],
    schemaName: "extracao_curriculo",
    schema: EXTRACAO_SCHEMA,
  });
}

export async function transcreverAudio(dataUrl: string, filename: string) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta?.match(/data:([^;]+)/)?.[1] ?? "audio/webm";
  const bytes = Uint8Array.from(atob(b64 ?? ""), (c) => c.charCodeAt(0));
  return transcrever(new Blob([bytes], { type: mime }), filename);
}
