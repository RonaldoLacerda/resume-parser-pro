/**
 * Pós-processamento determinístico da extração (roda no servidor, sem custo de IA).
 *
 * Objetivo: aumentar a taxa de acerto sem gastar mais tokens.
 *  1. `extrairPorRegex` acha campos de formato fixo (e-mail, CPF, CEP, telefone,
 *     data de nascimento, RG, links) direto no texto — 100% de confiança.
 *  2. `normalizarExtracao` padroniza o que a IA devolveu para os mesmos valores
 *     usados nos selects do formulário (UF em sigla, datas mm/aaaa, níveis de
 *     ensino, situação, modalidade, tipo de contrato, sexo, estado civil, Sim/Não).
 *
 * Sem isso, o modelo devolve "São Paulo"/"Ensino superior completo"/"03-2020",
 * que não casam com as opções dos <select> e o campo aparece vazio para o usuário.
 */

import {
  ESTADOS_CIVIS,
  MODALIDADES,
  NIVEIS_ENSINO,
  SEXOS,
  SITUACOES,
  TIPOS_CONTRATO,
  UFS,
  UF_POR_NOME,
} from "./opcoes";

type Registro = Record<string, unknown>;

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const somenteDigitos = (s: string) => s.replace(/\D/g, "");

const MESES: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

/** Converte variações comuns para mm/aaaa (mantém "" quando não reconhece). */
export function normalizarMesAno(valor: unknown): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  if (/^(atual|presente|hoje|momento)$/i.test(semAcento(texto))) return "";

  let m = texto.match(/^(\d{1,2})[/\-.](\d{4})$/);
  if (m) return `${m[1]!.padStart(2, "0")}/${m[2]}`;

  m = texto.match(/^(\d{4})[/\-.](\d{1,2})$/);
  if (m) return `${m[2]!.padStart(2, "0")}/${m[1]}`;

  m = texto.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) return `${m[2]!.padStart(2, "0")}/${m[3]}`;

  m = semAcento(texto).match(/^([a-z]{3})[a-z]*\.?[\s/\-de]+(\d{4})$/);
  if (m && MESES[m[1]!]) return `${MESES[m[1]!]}/${m[2]}`;

  m = texto.match(/^(\d{4})$/);
  if (m) return `01/${m[1]}`;

  return "";
}

/** Converte variações para dd/mm/aaaa. */
export function normalizarData(valor: unknown): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";

  let m = texto.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const ano = m[3]!.length === 2 ? `19${m[3]}` : m[3]!;
    return `${m[1]!.padStart(2, "0")}/${m[2]!.padStart(2, "0")}/${ano}`;
  }

  m = texto.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (m) return `${m[3]!.padStart(2, "0")}/${m[2]!.padStart(2, "0")}/${m[1]}`;

  m = semAcento(texto).match(/^(\d{1,2})\s*de\s*([a-z]{3})[a-z]*\s*de\s*(\d{4})$/);
  if (m && MESES[m[2]!]) return `${m[1]!.padStart(2, "0")}/${MESES[m[2]!]}/${m[3]}`;

  return "";
}

/** "São Paulo" → "SP"; já em sigla, mantém. */
export function normalizarUf(valor: unknown): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  const sigla = texto.toUpperCase();
  if ((UFS as readonly string[]).includes(sigla)) return sigla;
  return UF_POR_NOME[semAcento(texto)] ?? "";
}

/** Escolhe a opção da lista cujo texto melhor casa com o valor recebido. */
function casarOpcao(valor: unknown, opcoes: readonly string[]): string {
  const alvo = semAcento(String(valor ?? ""));
  if (!alvo) return "";
  const exato = opcoes.find((o) => semAcento(o) === alvo);
  if (exato) return exato;
  const parcial = opcoes.find((o) => alvo.includes(semAcento(o)) || semAcento(o).includes(alvo));
  return parcial ?? "";
}

function normalizarNivelEnsino(valor: unknown): string {
  const t = semAcento(String(valor ?? ""));
  if (!t) return "";
  if (/(doutor|phd)/.test(t)) return "Doutorado";
  if (/mestr/.test(t)) return "Mestrado";
  if (/(pos|mba|especializ|latu|stricto)/.test(t)) return "Pós-graduação";
  if (/tecnolog/.test(t)) return "Tecnólogo";
  if (/tecnic/.test(t)) return "Técnico";
  if (/(superior|bacharel|graduac|licenciatur|univers)/.test(t)) return "Superior";
  if (/(medio|2o grau|segundo grau)/.test(t)) return "Ensino Médio";
  if (/(fundamental|1o grau|primeiro grau)/.test(t)) return "Ensino Fundamental";
  return casarOpcao(valor, NIVEIS_ENSINO);
}

function normalizarSituacao(valor: unknown): string {
  const t = semAcento(String(valor ?? ""));
  if (!t) return "";
  if (/(cursando|em andamento|em curso)/.test(t)) return "Cursando";
  if (/(tranc)/.test(t)) return "Trancado";
  if (/(incomplet|interromp|abandon)/.test(t)) return "Incompleto";
  if (/(complet|conclu|formad|titulad)/.test(t)) return "Completo";
  return casarOpcao(valor, SITUACOES);
}

function normalizarModalidade(valor: unknown): string {
  const t = semAcento(String(valor ?? ""));
  if (!t) return "";
  if (/(ead|distancia|online|remot)/.test(t)) return "EAD";
  if (/(semi|hibrid)/.test(t)) return "Semipresencial";
  if (/presencial/.test(t)) return "Presencial";
  return casarOpcao(valor, MODALIDADES);
}

function normalizarContrato(valor: unknown): string {
  const t = semAcento(String(valor ?? ""));
  if (!t) return "";
  if (/(clt|carteira|efetiv)/.test(t)) return "CLT";
  if (/(pj|juridic|contrato de prestacao)/.test(t)) return "PJ";
  if (/estagi/.test(t)) return "Estágio";
  if (/(temporar|safra)/.test(t)) return "Temporário";
  if (/(freela|autonom)/.test(t)) return "Freelancer";
  if (/(aprendiz|jovem)/.test(t)) return "Aprendiz";
  return casarOpcao(valor, TIPOS_CONTRATO);
}

function normalizarSexo(valor: unknown): string {
  const t = semAcento(String(valor ?? ""));
  if (!t) return "";
  if (/^(f|fem)/.test(t)) return "Feminino";
  if (/^(m|masc)/.test(t)) return "Masculino";
  return casarOpcao(valor, SEXOS);
}

function normalizarEstadoCivil(valor: unknown): string {
  const t = semAcento(String(valor ?? ""));
  if (!t) return "";
  if (/solteir/.test(t)) return "Solteiro(a)";
  if (/(casad|uniao estavel|amasi)/.test(t)) return "Casado(a)";
  if (/(divorc|separad)/.test(t)) return "Divorciado(a)";
  if (/viuv/.test(t)) return "Viúvo(a)";
  return casarOpcao(valor, ESTADOS_CIVIS);
}

function normalizarSimNao(valor: unknown): string {
  const t = semAcento(String(valor ?? ""));
  if (!t) return "";
  if (/^(sim|s|true|yes|disponivel)/.test(t)) return "Sim";
  if (/^(nao|n|false|no)/.test(t)) return "Não";
  return "";
}

const mascaraCpf = (v: string) => {
  const d = somenteDigitos(v);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : v.trim();
};

const mascaraCep = (v: string) => {
  const d = somenteDigitos(v);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, "$1-$2") : v.trim();
};

const mascaraTelefone = (v: string) => {
  const d = somenteDigitos(v).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return v.trim();
};

const limparLista = (v: unknown): string[] =>
  Array.isArray(v)
    ? [...new Set(v.map((i) => String(i ?? "").trim()).filter(Boolean))].slice(0, 30)
    : [];

/** Aplica todas as regras acima ao objeto devolvido pela IA. */
export function normalizarExtracao(bruto: unknown): Registro {
  const dados = (bruto ?? {}) as Registro;
  const geral = { ...((dados["geral"] as Registro) ?? {}) };
  const endereco = { ...((dados["endereco"] as Registro) ?? {}) };
  const profissionais = { ...((dados["profissionais"] as Registro) ?? {}) };

  if (geral["dataNascimento"]) geral["dataNascimento"] = normalizarData(geral["dataNascimento"]);
  if (geral["cpf"]) geral["cpf"] = mascaraCpf(String(geral["cpf"]));
  if (geral["celular"]) geral["celular"] = mascaraTelefone(String(geral["celular"]));
  if (geral["telefone"]) geral["telefone"] = mascaraTelefone(String(geral["telefone"]));
  if (geral["email"]) geral["email"] = String(geral["email"]).trim().toLowerCase();
  geral["sexo"] = normalizarSexo(geral["sexo"]);
  geral["estadoCivil"] = normalizarEstadoCivil(geral["estadoCivil"]);
  geral["estadoNascimento"] = normalizarUf(geral["estadoNascimento"]);
  if (geral["celular"] && !geral["ddiCelular"]) geral["ddiCelular"] = "+55";

  if (endereco["cep"]) endereco["cep"] = mascaraCep(String(endereco["cep"]));
  endereco["estado"] = normalizarUf(endereco["estado"]);

  profissionais["idiomas"] = limparLista(profissionais["idiomas"]);
  profissionais["cargosInteresse"] = limparLista(profissionais["cargosInteresse"]);
  profissionais["conhecimentos"] = limparLista(profissionais["conhecimentos"]);
  profissionais["disponibilidadeMudanca"] = normalizarSimNao(profissionais["disponibilidadeMudanca"]);
  profissionais["disponibilidadeViagens"] = normalizarSimNao(profissionais["disponibilidadeViagens"]);

  const experiencias = (Array.isArray(dados["experiencias"]) ? dados["experiencias"] : [])
    .map((item) => {
      const e = { ...((item ?? {}) as Registro) };
      e["inicio"] = normalizarMesAno(e["inicio"]);
      e["desligamento"] = e["atual"] ? "" : normalizarMesAno(e["desligamento"]);
      e["estado"] = normalizarUf(e["estado"]);
      e["tipoContrato"] = normalizarContrato(e["tipoContrato"]);
      e["atividades"] = String(e["atividades"] ?? "").trim().slice(0, 400);
      return e;
    })
    .filter((e) => e["empresa"] || e["cargo"]);

  const formacoes = (Array.isArray(dados["formacoes"]) ? dados["formacoes"] : [])
    .map((item) => {
      const f = { ...((item ?? {}) as Registro) };
      f["inicio"] = normalizarMesAno(f["inicio"]);
      f["conclusao"] = normalizarMesAno(f["conclusao"]);
      f["nivelEnsino"] = normalizarNivelEnsino(f["nivelEnsino"]);
      f["situacao"] = normalizarSituacao(f["situacao"]);
      f["modalidade"] = normalizarModalidade(f["modalidade"]);
      return f;
    })
    .filter((f) => f["curso"] || f["instituicao"] || f["nivelEnsino"]);

  return { ...dados, geral, endereco, profissionais, experiencias, formacoes };
}

type Evidencia = { campo: string; confianca: number; trecho: string };

const trechoAoRedor = (texto: string, indice: number, tamanho = 90) =>
  texto.slice(Math.max(0, indice - 30), Math.max(0, indice - 30) + tamanho).replace(/\s+/g, " ").trim();

/**
 * Varredura por regex no texto original. Campos de formato fixo passam a ser
 * capturados mesmo quando o modelo os ignora, com confiança 0.99.
 */
export function extrairPorRegex(texto: string): { geral: Registro; endereco: Registro; evidencias: Evidencia[] } {
  const geral: Registro = {};
  const endereco: Registro = {};
  const evidencias: Evidencia[] = [];

  const registrar = (secao: Registro, chave: string, valor: string, caminho: string, indice: number) => {
    if (!valor) return;
    secao[chave] = valor;
    evidencias.push({ campo: caminho, confianca: 0.99, trecho: trechoAoRedor(texto, indice) });
  };

  const email = texto.match(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/);
  if (email) registrar(geral, "email", email[0].toLowerCase(), "geral.email", email.index ?? 0);

  const cpf = texto.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
  if (cpf) registrar(geral, "cpf", mascaraCpf(cpf[0]), "geral.cpf", cpf.index ?? 0);

  const cep = texto.match(/\b\d{5}-?\d{3}\b/);
  if (cep) registrar(endereco, "cep", mascaraCep(cep[0]), "endereco.cep", cep.index ?? 0);

  const celular = texto.match(/(?:\+?55\s*)?\(?\d{2}\)?[\s.-]?9\d{4}[\s.-]?\d{4}/);
  if (celular) {
    registrar(geral, "celular", mascaraTelefone(celular[0]), "geral.celular", celular.index ?? 0);
    geral["ddiCelular"] = "+55";
  }

  const fixo = texto.match(/(?:\+?55\s*)?\(?\d{2}\)?[\s.-]?[2-5]\d{3}[\s.-]?\d{4}/);
  if (fixo) registrar(geral, "telefone", mascaraTelefone(fixo[0]), "geral.telefone", fixo.index ?? 0);

  const nascimento = texto.match(
    /(?:nascimento|nascid[oa]|data de nasc\.?)[^\d]{0,20}(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i,
  );
  if (nascimento) {
    registrar(
      geral,
      "dataNascimento",
      normalizarData(nascimento[1]),
      "geral.dataNascimento",
      nascimento.index ?? 0,
    );
  }

  const rg = texto.match(/\bRG\b[^\dA-Za-z]{0,10}([\d.\-]{5,15}[\dXx]?)/);
  if (rg) registrar(geral, "rg", rg[1]!.trim(), "geral.rg", rg.index ?? 0);

  return { geral, endereco, evidencias };
}

/** Junta o resultado da IA com o da regex; a regex tem prioridade (formato fixo). */
export function combinarComRegex(extracao: Registro, texto: string): Registro {
  const { geral, endereco, evidencias } = extrairPorRegex(texto);
  const base = normalizarExtracao(extracao);
  const evAtuais = Array.isArray(base["evidencias"]) ? (base["evidencias"] as Evidencia[]) : [];
  const caminhosRegex = new Set(evidencias.map((e) => e.campo));

  return {
    ...base,
    geral: { ...(base["geral"] as Registro), ...geral },
    endereco: { ...(base["endereco"] as Registro), ...endereco },
    evidencias: [...evAtuais.filter((e) => !caminhosRegex.has(e?.campo)), ...evidencias],
  };
}
