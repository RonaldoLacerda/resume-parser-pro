import { responderJson, transcrever } from "@/lib/ai/gateway.server";
import { MODALIDADES, NIVEIS_ENSINO, SITUACOES, TIPOS_CONTRATO, UFS } from "./opcoes";
import { normalizarExtracao } from "./normalizar";

/**
 * Prompt e JSON Schema únicos, compartilhados por currículo em texto,
 * imagem e áudio transcrito — uma só chamada de IA por arquivo.
 *
 * O schema mantém TODAS as chaves do padrão atual do formulário (camelCase,
 * datas "mm/aaaa", enums do formulário) e ADICIONA as estruturas novas
 * exigidas pelo banco de dados (objetos chave/valor e datas separadas em
 * mês/ano inteiros). Nada foi removido — apenas acrescentado.
 */

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const int = { type: "integer" } as const;
const bool = { type: "boolean" } as const;
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
 * Schema: chaves existentes preservadas + novas estruturas do banco
 * (objetos de chave/valor e datas separadas).
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
      atual: bool,
      inicio: str,
      desligamento: str,
      cidade: str,
      estado: str,
      tipoContrato: str,
      atividades: str,
      // Novas estruturas do banco de dados
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
      // Novas estruturas do banco de dados
      nivel_ensino: obj({
        nivel_ensino: str,
        value: str,
      }),
      situacao_db: obj({
        situacao: str,
        value: str,
      }),
      inicio_db: obj({
        inicio_mes: int,
        inicio_ano: int,
      }),
      conclusao_db: obj({
        fim_mes: int,
        fim_ano: int,
      }),
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
    // Nova estrutura do banco de dados
    idiomas_db: {
      type: "array",
      items: obj({
        idioma: str,
        situacao: obj({
          situacao: str,
          value: num,
        }),
      }),
    },
  }),
  evidencias: {
    type: "array",
    items: obj({
      campo: str,
      confianca: num,
      trecho: str,
    }),
  },
});

/**
 * Instruções: regras do formulário atual + mapeamentos de enums do banco.
 */
const INSTRUCOES = [
  "Você extrai dados de currículos brasileiros para preencher um cadastro.",
  "Priorize: dados gerais, experiências profissionais e formação acadêmica.",
  "Responda apenas com o JSON do schema. Sem informação, use string vazia, lista vazia ou 0 nos inteiros — nunca invente dados nem deduza CPF/RG/datas.",
  // Formatos do formulário atual (chaves preservadas)
  "Formatos: CPF 000.000.000-00; CEP 00000-000; celular/telefone (DD) 9XXXX-XXXX sem +55 (coloque 55 em ddiCelular);",
  "datas inicio/conclusao/desligamento em texto mm/aaaa; dataNascimento dd/mm/aaaa; pretensaoSalarial só o número em reais (ex.: 3500).",
  // Enumerações dos selects do formulário
  `Estados nos campos de texto (estadoNascimento, endereco.estado, experiencias.estado) SEMPRE em sigla: ${UFS.join(", ")}.`,
  "sexo: Feminino | Masculino. estadoCivil: Solteiro(a) | Casado(a) | Divorciado(a) | Viúvo(a).",
  `tipoContrato: ${TIPOS_CONTRATO.join(" | ")}. nivelEnsino: ${NIVEIS_ENSINO.join(" | ")}.`,
  `situacao (texto): ${SITUACOES.join(" | ")}. modalidade: ${MODALIDADES.join(" | ")}.`,
  "disponibilidadeMudanca/disponibilidadeViagens: Sim | Não (só se o texto mencionar).",
  // Heurísticas de currículo BR
  "Reconheça sinônimos: 'Objetivo'/'Cargo pretendido' → cargosInteresse; 'Perfil'/'Sobre mim' → resumoProfissional;",
  "'Habilidades'/'Competências'/'Ferramentas'/'Informática' → conhecimentos (um item por tecnologia/competência, sem frases);",
  "idiomas no formato 'Inglês - Avançado'. Bacharelado/Licenciatura → nivelEnsino Superior; MBA/Especialização → Pós-graduação.",
  "Endereço: separe logradouro, número, complemento, bairro, cidade, estado e CEP mesmo quando vierem numa linha só.",
  "Experiências e formações da mais recente para a mais antiga; 'atual'/'presente'/'até o momento' → atual=true e desligamento vazio.",
  "Atividades exercidas: até 400 caracteres, texto corrido, sem bullets; replique o mesmo texto em atividades_exercidas.",
  // Novas estruturas do banco de dados
  "ESTADOS nos campos do banco: quando houver ambiguidade, os campos de texto mantêm a sigla; os objetos *_db seguem os mapeamentos abaixo.",
  "Experiências: replique as datas em data_inicio (inicio_mes, inicio_ano inteiros) e data_desligamento (desligamento_mes, desligamento_ano inteiros; 0 quando não houver ou quando atual=true).",
  "Formações: replique as datas em inicio_db (inicio_mes, inicio_ano inteiros) e conclusao_db (fim_mes, fim_ano inteiros; 0 quando não houver). Se houver data de conclusão/fim, a situação é Concluído/Finalizado.",
  "nivel_ensino (objeto) deve mapear nivel_ensino e value -> Ensino Fundamental: F | Ensino Médio: E | Ensino Médio - Técnico Integrado: I | Técnico/Profissionalizante: C | Curso Extra Currícular: D | Certificação: R | Superior: S | Mestrado: M | Pós Graduação/Master/MBA: P | Doutorado: U | PhD: H.",
  "situacao_db deve mapear situacao e value -> Concluído: C | Em Andamento: A | Trancada: T | Não Finalizado: N.",
  "Idiomas: além da lista de texto, preencha idiomas_db com idioma (string) e situacao com chave/valor: Básico (value: 1), Intermediário (value: 2), Avançado (value: 3), Fluente (value: 4).",
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
