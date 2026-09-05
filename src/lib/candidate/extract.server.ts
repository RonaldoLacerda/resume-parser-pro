import { responderJson, transcrever } from "@/lib/ai/gateway.server";
import { normalizarExtracao } from "./normalizar";

/**
 * Prompt e JSON Schema únicos, compartilhados por currículo em texto,
 * imagem e áudio transcrito — uma só chamada de IA por arquivo.
 */

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const int = { type: "integer" } as const;
const strArray = { type: "array", items: str } as const;

/** OpenAI strict mode exige `required` com todas as chaves. */
function obj<T extends Record<string, unknown>>(properties: T) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  } as const;
}

/**
 * Schema ajustado para os padrões do banco de dados (objetos de chave/valor e datas separadas).
 */
const EXTRACAO_SCHEMA = obj({
  dados_gerais: obj({
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
      data_inicio: obj({
        inicio_mes: int,
        inicio_ano: int,
      }),
      data_desligamento: obj({
        desligamento_mes: int,
        desligamento_ano: int,
      }),
      atividades_exercidas: str,
      motivo_saida: str,
      estado: str,
      cidade: str,
    }),
  },
  formacoes: {
    type: "array",
    items: obj({
      nivel_ensino: obj({
        nivel_ensino: str,
        value: str,
      }),
      situacao: obj({
        situacao: str,
        value: str,
      }),
      inicio: obj({
        inicio_mes: int,
        inicio_ano: int,
      }),
      conclusao: obj({
        fim_mes: int,
        fim_ano: int,
      }),
      instituicao: str,
      modalidade: str,
    }),
  },
  profissionais: obj({
    idiomas: {
      type: "array",
      items: obj({
        idioma: str,
        situacao: obj({
          situacao: str,
          value: num,
        }),
      }),
    },
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
      confianca: num,
    }),
  },
});

/**
 * Instruções alinhadas com as regras do banco de dados e mapeamentos de enums.
 */
const INSTRUCOES = [
  "Você extrai dados de currículos brasileiros para preencher um cadastro.",
  "Priorize: dados gerais, experiências profissionais e formação acadêmica.",
  "Responda apenas com o JSON do schema.",
  "NÃO inclua chaves vazias ou com valor 0 se o dado não for explicitamente encontrado.",
  // Regra de Estados
  "ESTADOS: Traga SEMPRE o NOME COMPLETO do estado por extenso (ex: 'São Paulo' ao invés de 'SP', 'Rio de Janeiro' ao invés de 'RJ').",
  // Experiências
  "Experiências: data_inicio (inicio_mes, inicio_ano como inteiros) e data_desligamento (desligamento_mes, desligamento_ano como inteiros). Se houver data de desligamento/fim, considere concluído/finalizado.",
  // Formações e Mapeamentos
  "Formações: Se houver data de conclusão/fim, a situação deve ser obrigatoriamente Concluído/Finalizado.",
  "nivel_ensino deve mapear nivel_ensino e value -> Ensino Fundamental: F | Ensino Médio: E | Ensino Médio - Técnico Integrado: I | Técnico/Profissionalizante: C | Curso Extra Currícular: D | Certificação: R | Superior: S | Mestrado: M | Pós Graduação/Master/MBA: P | Doutorado: U | PhD: H.",
  "situacao de formação deve mapear situacao e value -> Concluído: C | Em Andamento: A | Trancada: T | Não Finalizado: N.",
  "inicio das formações possui inicio_mes e inicio_ano (inteiros); conclusao possui fim_mes e fim_ano (inteiros).",
  // Idiomas
  "Idiomas em profissionais.idiomas devem conter idioma (string) e situacao com chave/valor: Básico (value: 1), Intermediário (value: 2), Avançado (value: 3), Fluente (value: 4).",
  // Evidências
  "Em 'evidencias', inclua um item para CADA campo extraído contendo apenas 'campo' e 'confianca' (número de 0 a 1). Não inclua o trecho.",
].join(" ");

const MAX_CHARS = 18000;

export type ExtracaoBruta = Record<string, unknown>;

export function normalizarTexto(texto: string) {
  return texto.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_CHARS);
}

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
