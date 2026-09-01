/**
 * Consolidação de múltiplas extrações (PDF + foto + DOCX + áudio) em um
 * conjunto único de propostas revisáveis, com score de confiança e o trecho
 * original que originou cada campo.
 */

export type Evidencia = { campo: string; confianca: number; trecho: string };

export type PropostaCampo = {
  id: string;
  secao: "geral" | "endereco" | "profissionais";
  chave: string;
  rotulo: string;
  valor: string | string[];
  confianca: number;
  trecho: string;
  origem: string;
  aceito: boolean;
};

export type PropostaItem = {
  id: string;
  tipo: "experiencia" | "formacao";
  rotulo: string;
  dados: Record<string, unknown>;
  confianca: number;
  trecho: string;
  origem: string;
  aceito: boolean;
};

export type Propostas = { campos: PropostaCampo[]; itens: PropostaItem[] };

export type ExtracaoBrutaArquivo = { origem: string; bruto: unknown };

const ROTULOS: Record<string, string> = {
  nomeCompleto: "Nome completo",
  email: "E-mail",
  cpf: "CPF",
  dataNascimento: "Data de nascimento",
  sexo: "Sexo",
  estadoCivil: "Estado civil",
  ddiCelular: "DDI",
  celular: "Celular",
  telefone: "Telefone",
  nomePai: "Nome do pai",
  nomeMae: "Nome da mãe",
  rg: "RG",
  paisNascimento: "País de nascimento",
  estadoNascimento: "Estado de nascimento",
  cidadeNascimento: "Cidade de nascimento",
  pais: "País",
  cep: "CEP",
  estado: "Estado",
  cidade: "Cidade",
  bairro: "Bairro",
  logradouro: "Logradouro",
  numero: "Número",
  complemento: "Complemento",
  pontoReferencia: "Ponto de referência",
  regiao: "Região",
  idiomas: "Idiomas",
  cargosInteresse: "Cargos de interesse",
  conhecimentos: "Conhecimentos",
  pretensaoSalarial: "Pretensão salarial",
  resumoProfissional: "Resumo profissional",
  objetivosProfissionais: "Objetivos profissionais",
  disponibilidadeMudanca: "Disponibilidade de mudança",
  disponibilidadeViagens: "Disponibilidade para viagens",
};


const SECAO_ROTULO: Record<PropostaCampo["secao"], string> = {
  geral: "Dados gerais",
  endereco: "Endereço",
  profissionais: "Dados profissionais",
};

export const rotuloSecao = (s: PropostaCampo["secao"]) => SECAO_ROTULO[s];

function humanizar(chave: string) {
  return (
    ROTULOS[chave] ??
    chave.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
  );
}

function mapaEvidencias(bruto: unknown): Map<string, Evidencia> {
  const lista = (bruto as { evidencias?: Evidencia[] })?.evidencias ?? [];
  const mapa = new Map<string, Evidencia>();
  for (const ev of lista) {
    if (!ev?.campo) continue;
    mapa.set(ev.campo.trim(), {
      campo: ev.campo,
      confianca: Math.max(0, Math.min(1, Number(ev.confianca) || 0)),
      trecho: String(ev.trecho ?? ""),
    });
  }
  return mapa;
}

const vazio = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

/** Une extrações de vários arquivos; em conflito vence a maior confiança. */
export function consolidar(entradas: ExtracaoBrutaArquivo[]): Propostas {
  const campos = new Map<string, PropostaCampo>();
  const itens = new Map<string, PropostaItem>();

  for (const { origem, bruto } of entradas) {
    const dados = (bruto ?? {}) as Record<string, Record<string, unknown>>;
    const evidencias = mapaEvidencias(bruto);

    for (const secao of ["geral", "endereco", "profissionais"] as const) {
      const bloco = dados[secao];
      if (!bloco || typeof bloco !== "object") continue;
      for (const [chave, valor] of Object.entries(bloco)) {
        if (vazio(valor)) continue;
        if (chave === "pais" || chave === "paisNascimento") {
          if (norm(valor) === "brasil") continue;
        }
        const caminho = `${secao}.${chave}`;
        const ev = evidencias.get(caminho);
        const proposta: PropostaCampo = {
          id: caminho,
          secao,
          chave,
          rotulo: humanizar(chave),
          valor: valor as string | string[],
          confianca: ev?.confianca ?? 0.6,
          trecho: ev?.trecho ?? "",
          origem,
          aceito: true,
        };
        const existente = campos.get(caminho);
        if (!existente || proposta.confianca > existente.confianca) campos.set(caminho, proposta);
      }
    }

    for (const tipo of ["experiencia", "formacao"] as const) {
      const lista = (dados[tipo === "experiencia" ? "experiencias" : "formacoes"] ??
        []) as unknown as Record<string, unknown>[];
      if (!Array.isArray(lista)) continue;
      lista.forEach((item, indice) => {
        if (!item || typeof item !== "object") return;
        const rotulo =
          tipo === "experiencia"
            ? [item["cargo"], item["empresa"]].filter(Boolean).join(" · ")
            : [item["curso"], item["instituicao"]].filter(Boolean).join(" · ");
        if (!rotulo) return;
        const chaveDedup = `${tipo}:${norm(rotulo)}`;
        const ev =
          evidencias.get(`${tipo === "experiencia" ? "experiencias" : "formacoes"}.${indice}`) ??
          evidencias.get(`${tipo}.${indice}`);
        const proposta: PropostaItem = {
          id: chaveDedup,
          tipo,
          rotulo,
          dados: item,
          confianca: ev?.confianca ?? 0.6,
          trecho: ev?.trecho ?? "",
          origem,
          aceito: true,
        };
        const existente = itens.get(chaveDedup);
        if (!existente || proposta.confianca > existente.confianca) itens.set(chaveDedup, proposta);
      });
    }
  }

  const ordem = (a: { confianca: number }, b: { confianca: number }) => b.confianca - a.confianca;
  return {
    campos: [...campos.values()].sort(ordem),
    itens: [...itens.values()].sort(ordem),
  };
}

/** Converte as propostas aceitas no payload aplicado ao formulário. */
export function montarExtracao(propostas: Propostas) {
  const saida: Record<string, unknown> = {
    geral: {},
    endereco: {},
    profissionais: {},
    experiencias: [],
    formacoes: [],
  };
  for (const campo of propostas.campos) {
    if (!campo.aceito) continue;
    (saida[campo.secao] as Record<string, unknown>)[campo.chave] = campo.valor;
  }
  for (const item of propostas.itens) {
    if (!item.aceito) continue;
    const alvo = item.tipo === "experiencia" ? "experiencias" : "formacoes";
    (saida[alvo] as unknown[]).push(item.dados);
  }
  return saida;
}

export function nivelConfianca(c: number) {
  if (c >= 0.85) return { texto: "Alta", classe: "bg-success/10 text-success border-success/30" };
  if (c >= 0.6) return { texto: "Média", classe: "bg-warning/10 text-warning border-warning/30" };
  return { texto: "Baixa", classe: "bg-danger/10 text-danger border-danger/30" };
}
