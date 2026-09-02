import { responderJson, transcrever } from "@/lib/ai/gateway.server";
import { MODALIDADES, NIVEIS_ENSINO, SITUACOES, TIPOS_CONTRATO, UFS } from "./opcoes";
import { normalizarExtracao } from "./normalizar";

/**
 * Prompt e JSON Schema únicos, compartilhados por currículo em texto,
 * imagem e áudio transcrito — uma só chamada de IA por arquivo.
 */

const str = { type: "string" } as const;
const strArray = { type: "array", items: str } as const;

/** OpenAI strict mode exige `required` com todas as chaves; use "" quando não houver dado. */
function obj<T extends Record<string, unknown>>(properties: T) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  } as const;
}

/**
 * Schema espelha 1:1 os campos do formulário (types.ts) que fazem sentido
 * extrair de um currículo/áudio. Campos puramente operacionais (senha,
 * "como nos encontrou", antecedentes) ficam de fora de propósito.
 */
const EXTRACAO_SCHEMA = obj({
  geral: obj({
    nomeCompleto: str,
    email: str,
    cpf: str,
    dataNascimento: str,
    sexo: str,
    estadoCivil: str,
    ddiCelular: str,
    celular: str,
    telefone: str,
    nomePai: str,
    nomeMae: str,
    rg: str,
    paisNascimento: str,
    estadoNascimento: str,
    cidadeNascimento: str,
  }),
  endereco: obj({
    pais: str,
    cep: str,
    estado: str,
    cidade: str,
    bairro: str,
    logradouro: str,
    numero: str,
    complemento: str,
    pontoReferencia: str,
    regiao: str,
  }),
  experiencias: {
    type: "array",
    items: obj({
      empresa: str,
      cargo: str,
      atual: { type: "boolean" },
      inicio: str,
      desligamento: str,
      cidade: str,
      estado: str,
      tipoContrato: str,
      atividades: str,
    }),
  },
  formacoes: {
    type: "array",
    items: obj({
      nivelEnsino: str,
      situacao: str,
      curso: str,
      instituicao: str,
      inicio: str,
      conclusao: str,
      modalidade: str,
    }),
  },
  profissionais: obj({
    idiomas: strArray,
    cargosInteresse: strArray,
    conhecimentos: strArray,
    pretensaoSalarial: str,
    resumoProfissional: str,
    objetivosProfissionais: str,
    disponibilidadeMudanca: str,
    disponibilidadeViagens: str,
  }),
  evidencias: {
    type: "array",
    items: obj({
      campo: str,
      confianca: { type: "number" },
      trecho: str,
    }),
  },
});

/**
 * Prompt em blocos: (1) papel e regra anti-alucinação, (2) formatos/máscaras,
 * (3) valores exatos aceitos pelos selects (evita "São Paulo" onde o form quer "SP"),
 * (4) heurísticas de reconhecimento de currículo BR, (5) evidências.
 * Mantido curto — cada 100 tokens aqui se repetem em TODA chamada.
 */
const INSTRUCOES = [
  "Você extrai dados de currículos brasileiros para preencher um cadastro.",
  "Priorize: dados gerais, experiências profissionais e formação acadêmica.",
  "Responda apenas com o JSON do schema. Sem informação, use string vazia ou lista vazia — nunca invente dados nem deduza CPF/RG/datas.",
  // Formatos
  "Formatos: CPF 000.000.000-00; CEP 00000-000; celular/telefone (DD) 9XXXX-XXXX sem +55 (coloque 55 em ddiCelular);",
  "datas de início/conclusão/desligamento mm/aaaa; dataNascimento dd/mm/aaaa; pretensaoSalarial só o número em reais (ex.: 3500).",
  // Enumerações dos selects
  `Estados (estadoNascimento, endereco.estado, experiencias.estado) SEMPRE em sigla: ${UFS.join(", ")}.`,
  "sexo: Feminino | Masculino. estadoCivil: Solteiro(a) | Casado(a) | Divorciado(a) | Viúvo(a).",
  `tipoContrato: ${TIPOS_CONTRATO.join(" | ")}. nivelEnsino: ${NIVEIS_ENSINO.join(" | ")}.`,
  `situacao: ${SITUACOES.join(" | ")}. modalidade: ${MODALIDADES.join(" | ")}.`,
  "disponibilidadeMudanca/disponibilidadeViagens: Sim | Não (só se o texto mencionar).",
  // Heurísticas
  "Reconheça sinônimos: 'Objetivo'/'Cargo pretendido' → cargosInteresse; 'Perfil'/'Sobre mim' → resumoProfissional;",
  "'Habilidades'/'Competências'/'Ferramentas'/'Informática' → conhecimentos (um item por tecnologia/competência, sem frases);",
  "idiomas no formato 'Inglês - Avançado'. Bacharelado/Licenciatura → nivelEnsino Superior; MBA/Especialização → Pós-graduação.",
  "Endereço: separe logradouro, número, complemento, bairro, cidade, estado e CEP mesmo quando vierem numa linha só.",
  "Experiências e formações da mais recente para a mais antiga; 'atual'/'presente'/'até o momento' → atual=true e desligamento vazio.",
  "Atividades exercidas: até 400 caracteres, texto corrido, sem bullets.",
  // Evidências
  "Em 'evidencias', inclua um item para CADA campo preenchido e para cada experiência/formação:",
  "campo = caminho do dado ('geral.nomeCompleto', 'endereco.cep', 'profissionais.idiomas', 'experiencias.0', 'formacoes.1');",
  "confianca = número de 0 a 1 indicando o quanto o dado é explícito na fonte (1 = literal, <0.6 = inferido);",
  "trecho = citação curta e literal (até 160 caracteres) do texto original que embasou o dado.",
].join(" ");

/** Limite de contexto: currículos raramente passam disso e evita custo desnecessário. */
const MAX_CHARS = 18000;

export type ExtracaoBruta = Record<string, unknown>;

export function normalizarTexto(texto: string) {
  return texto.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_CHARS);
}

/** Chamada única + normalização determinística (custo zero) dos valores para os selects. */
async function extrair(content: Parameters<typeof responderJson>[0]["content"]) {
  const bruto = await responderJson<ExtracaoBruta>({
    instructions: INSTRUCOES,
    content,
    schemaName: "extracao_curriculo",
    schema: EXTRACAO_SCHEMA,
  });
  return normalizarExtracao(bruto);
}

export function extrairDeTexto(texto: string) {
  return extrair([{ type: "input_text", text: `Currículo:\n${normalizarTexto(texto)}` }]);
}

export function extrairDeImagem(dataUrl: string) {
  return extrair([
    {
      type: "input_text",
      text: "Faça a leitura (OCR) cuidadosa de todo o texto desta imagem de currículo, inclusive cabeçalho, rodapé e colunas laterais, e extraia os dados.",
    },
    { type: "input_image", image_url: dataUrl },
  ]);
}

export function extrairDePdf(filename: string, dataUrl: string) {
  return extrair([
    {
      type: "input_text",
      text: "Leia todas as páginas do currículo em anexo (inclusive colunas laterais e rodapés) e extraia os dados.",
    },
    { type: "input_file", filename, file_data: dataUrl },
  ]);
}

export async function transcreverAudio(dataUrl: string, filename: string) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta?.match(/data:([^;]+)/)?.[1] ?? "audio/webm";
  const bytes = Uint8Array.from(atob(b64 ?? ""), (c) => c.charCodeAt(0));
  return transcrever(new Blob([bytes], { type: mime }), filename);
}
