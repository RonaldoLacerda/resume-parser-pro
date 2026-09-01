import { responderJson, transcrever } from "@/lib/ai/gateway.server";
import { combinarComRegex, normalizarExtracao } from "./normalizar";
import {
  ESTADOS_CIVIS,
  MODALIDADES,
  NIVEIS_ENSINO,
  SEXOS,
  SIM_NAO,
  SITUACOES,
  TIPOS_CONTRATO,
  UFS,
} from "./opcoes";

/**
 * Prompt e JSON Schema únicos, compartilhados por currículo em texto,
 * imagem e áudio transcrito — uma só chamada de IA por arquivo.
 *
 * O schema cobre TODOS os campos que o formulário possui e usa `enum` nos
 * campos de seleção, para o modelo já devolver exatamente a opção do <select>.
 * Depois da resposta, `normalizarExtracao`/`combinarComRegex` padronizam datas,
 * máscaras e siglas sem custo adicional de IA (ver normalizar.ts).
 */

const str = { type: "string" } as const;
const strArray = { type: "array", items: str } as const;
/** Enum + "" para o modelo poder deixar o campo em branco no strict mode. */
const enumStr = (valores: readonly string[]) =>
  ({ type: "string", enum: ["", ...valores] }) as const;

/** OpenAI strict mode exige `required` com todas as chaves; use "" quando não houver dado. */
function obj<T extends Record<string, unknown>>(properties: T) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  } as const;
}

const EXTRACAO_SCHEMA = obj({
  geral: obj({
    nomeCompleto: str,
    email: str,
    cpf: str,
    dataNascimento: str,
    sexo: enumStr(SEXOS),
    estadoCivil: enumStr(ESTADOS_CIVIS),
    ddiCelular: str,
    celular: str,
    telefone: str,
    nomePai: str,
    nomeMae: str,
    rg: str,
    paisNascimento: str,
    estadoNascimento: enumStr(UFS),
    cidadeNascimento: str,
  }),
  endereco: obj({
    pais: str,
    cep: str,
    estado: enumStr(UFS),
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
      estado: enumStr(UFS),
      tipoContrato: enumStr(TIPOS_CONTRATO),
      atividades: str,
    }),
  },
  formacoes: {
    type: "array",
    items: obj({
      nivelEnsino: enumStr(NIVEIS_ENSINO),
      situacao: enumStr(SITUACOES),
      curso: str,
      instituicao: str,
      inicio: str,
      conclusao: str,
      modalidade: enumStr(MODALIDADES),
    }),
  },
  profissionais: obj({
    idiomas: strArray,
    cargosInteresse: strArray,
    conhecimentos: strArray,
    pretensaoSalarial: str,
    resumoProfissional: str,
    objetivosProfissionais: str,
    disponibilidadeMudanca: enumStr(SIM_NAO),
    disponibilidadeViagens: enumStr(SIM_NAO),
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

const INSTRUCOES = [
  "Você extrai dados de currículos brasileiros para preencher um cadastro.",
  "Priorize: dados gerais, experiências profissionais e formação acadêmica.",
  "Responda apenas com o JSON do schema. Sem informação, use string vazia ou lista vazia — nunca invente dados.",
  "Nos campos com enum, use exatamente uma das opções listadas ou string vazia.",
  "Datas de início/conclusão no formato mm/aaaa; data de nascimento dd/mm/aaaa. Estados sempre em sigla (SP, RJ).",
  "Experiências e formações em ordem da mais recente para a mais antiga.",
  "Marque atual=true quando a experiência estiver em andamento e deixe desligamento vazio.",
  "Atividades exercidas: no máximo 400 caracteres, em texto corrido.",
  "Sinônimos comuns: 'Fone/Cel/WhatsApp' = celular; 'Naturalidade' = cidade/estado de nascimento;",
  "'Filiação' = nome do pai e da mãe; 'Endereço/Rua/Av.' = logradouro, número e complemento;",
  "'Objetivo' = objetivos profissionais; 'Resumo/Perfil/Sobre mim' = resumo profissional;",
  "'Habilidades/Competências/Ferramentas/Tecnologias' = conhecimentos; 'Pretensão' = pretensão salarial;",
  "'Disponibilidade para mudança/viagens' = Sim ou Não.",
  "Cargos de interesse: derive do objetivo ou do cargo mais recente quando não houver seção específica.",
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

export async function extrairDeTexto(texto: string) {
  const limpo = normalizarTexto(texto);
  const bruto = await responderJson<ExtracaoBruta>({
    instructions: INSTRUCOES,
    content: [{ type: "input_text", text: `Currículo:\n${limpo}` }],
    schemaName: "extracao_curriculo",
    schema: EXTRACAO_SCHEMA,
  });
  return combinarComRegex(bruto, limpo);
}

export async function extrairDeImagem(dataUrl: string) {
  const bruto = await responderJson<ExtracaoBruta>({
    instructions: INSTRUCOES,
    content: [
      { type: "input_text", text: "Extraia os dados do currículo desta imagem." },
      { type: "input_image", image_url: dataUrl },
    ],
    schemaName: "extracao_curriculo",
    schema: EXTRACAO_SCHEMA,
  });
  return normalizarExtracao(bruto);
}

export async function extrairDePdf(filename: string, dataUrl: string) {
  const bruto = await responderJson<ExtracaoBruta>({
    instructions: INSTRUCOES,
    content: [
      { type: "input_text", text: "Extraia os dados do currículo em anexo." },
      { type: "input_file", filename, file_data: dataUrl },
    ],
    schemaName: "extracao_curriculo",
    schema: EXTRACAO_SCHEMA,
  });
  return normalizarExtracao(bruto);
}

export async function transcreverAudio(dataUrl: string, filename: string) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta?.match(/data:([^;]+)/)?.[1] ?? "audio/webm";
  const bytes = Uint8Array.from(atob(b64 ?? ""), (c) => c.charCodeAt(0));
  return transcrever(new Blob([bytes], { type: mime }), filename);
}
