/**
 * Normalização pós-IA: converte o que o modelo devolveu para os valores exatos
 * que os selects/radios do formulário aceitam (UF em sigla, "Masculino" em vez
 * de "M", "CLT" em vez de "Carteira assinada", etc.) e padroniza máscaras
 * (CPF, CEP, telefone, datas).
 *
 * É código puro (sem IA) — roda no servidor logo após a extração e custa zero
 * tokens. Sem isso, um valor como "São Paulo" no campo `estado` não casa com
 * a opção "SP" e o select fica vazio mesmo com a IA tendo acertado.
 */

import { MODALIDADES, NIVEIS_ENSINO, SITUACOES, TIPOS_CONTRATO, UFS } from "./opcoes";

/** Remove acentos, pontuação e caixa para comparação tolerante. */
export function chave(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const NOME_UF: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE",
  "distrito federal": "DF", "espirito santo": "ES", goias: "GO", maranhao: "MA",
  "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG", para: "PA",
  paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI", "rio de janeiro": "RJ",
  "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};

/** "São Paulo" | "sp" | "SP - São Paulo" → "SP". Desconhecido → "" (não inventa). */
export function normalizarUf(valor: string) {
  const k = chave(valor);
  if (!k) return "";
  const sigla = k.toUpperCase().match(/\b[A-Z]{2}\b/)?.[0];
  if (sigla && (UFS as readonly string[]).includes(sigla)) return sigla;
  for (const [nome, uf] of Object.entries(NOME_UF)) if (k.includes(nome)) return uf;
  return "";
}

/** Casa um valor livre com uma lista de opções usando sinônimos + prefixo. */
function casarOpcao(valor: string, opcoes: readonly string[], sinonimos: Record<string, string> = {}) {
  const k = chave(valor);
  if (!k) return "";
  for (const [padrao, alvo] of Object.entries(sinonimos)) if (k.includes(padrao)) return alvo;
  const exata = opcoes.find((o) => chave(o) === k);
  if (exata) return exata;
  const parcial = opcoes.find((o) => k.startsWith(chave(o)) || chave(o).startsWith(k));
  return parcial ?? valor;
}

export const normalizarSexo = (v: string) =>
  casarOpcao(v, ["Feminino", "Masculino", "Prefiro não informar"], {
    fem: "Feminino", mulher: "Feminino", masc: "Masculino", homem: "Masculino",
  });

export const normalizarEstadoCivil = (v: string) =>
  casarOpcao(v, ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)"], {
    solteir: "Solteiro(a)", casad: "Casado(a)", "uniao estavel": "Casado(a)",
    divorciad: "Divorciado(a)", separad: "Divorciado(a)", viuv: "Viúvo(a)",
  });

export const normalizarTipoContrato = (v: string) =>
  casarOpcao(v, TIPOS_CONTRATO, {
    clt: "CLT", "carteira assinada": "CLT", efetivo: "CLT", pj: "PJ", "pessoa juridica": "PJ",
    mei: "PJ", estag: "Estágio", tempor: "Temporário", free: "Freelancer", autonom: "Freelancer",
    aprendiz: "Aprendiz",
  });

export const normalizarNivelEnsino = (v: string) =>
  casarOpcao(v, NIVEIS_ENSINO, {
    fundamental: "Ensino Fundamental", medio: "Ensino Médio", tecnic: "Técnico",
    tecnolog: "Tecnólogo", bacharel: "Superior", licenciatura: "Superior", graduac: "Superior",
    superior: "Superior", mba: "Pós-graduação", especializ: "Pós-graduação", pos: "Pós-graduação",
    mestr: "Mestrado", doutor: "Doutorado",
  });

export const normalizarSituacao = (v: string) =>
  casarOpcao(v, SITUACOES, {
    conclu: "Completo", complet: "Completo", formad: "Completo", cursand: "Cursando",
    andamento: "Cursando", trancad: "Trancado", incomplet: "Incompleto", interromp: "Incompleto",
  });

export const normalizarModalidade = (v: string) =>
  casarOpcao(v, MODALIDADES, { presenc: "Presencial", ead: "EAD", distancia: "EAD", online: "EAD", semi: "Semipresencial", hibrid: "Semipresencial" });

export const normalizarSimNao = (v: string) => {
  const k = chave(v);
  if (!k) return "";
  if (/^(sim|s|yes|true|disponivel|possui|tem)\b/.test(k)) return "Sim";
  if (/^(nao|n|no|false|indisponivel)\b/.test(k)) return "Não";
  return "";
};

const digitos = (v: string) => v.replace(/\D/g, "");

/** 11 dígitos → 000.000.000-00; caso contrário devolve como veio. */
export function normalizarCpf(v: string) {
  const d = digitos(v);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : v.trim();
}

/** 8 dígitos → 00000-000. */
export function normalizarCep(v: string) {
  const d = digitos(v);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, "$1-$2") : v.trim();
}

/** Remove +55 e formata (DD) 9XXXX-XXXX / (DD) XXXX-XXXX. */
export function normalizarTelefone(v: string) {
  let d = digitos(v);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return v.trim();
}

const MESES: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

/** "março de 2021" | "2021-03" | "03/2021" | "2021" → "03/2021" (ano só → "01/aaaa" NÃO: mantém "aaaa"). */
export function normalizarMesAno(v: string) {
  const t = v.trim();
  if (!t) return "";
  if (/^\d{2}\/\d{4}$/.test(t)) return t;
  const iso = t.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[2]}/${iso[1]}`;
  const num = t.match(/(\d{1,2})\s*[\/.-]\s*(\d{4})/);
  if (num) return `${(num[1] ?? "").padStart(2, "0")}/${num[2]}`;
  const ext = chave(t).match(/^([a-z]{3})[a-z]*\s*(?:de\s*)?(\d{4})$/);
  const mes = ext?.[1] ? MESES[ext[1]] : undefined;
  if (ext && mes) return `${mes}/${ext[2]}`;
  return t;
}

/** "1990-05-12" | "12.05.1990" → "12/05/1990". */
export function normalizarDataCompleta(v: string) {
  const t = v.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (br) return `${(br[1] ?? "").padStart(2, "0")}/${(br[2] ?? "").padStart(2, "0")}/${br[3]}`;
  return t;
}

type Dict = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");

function aplicar(obj: Dict | undefined, regras: Record<string, (v: string) => string>) {
  if (!obj) return;
  for (const [campo, fn] of Object.entries(regras)) {
    if (typeof obj[campo] === "string" && obj[campo]) obj[campo] = fn(obj[campo] as string);
  }
}

/**
 * Aplica todas as normalizações in-place sobre o JSON bruto devolvido pela IA.
 * Campos vazios permanecem vazios; valores não reconhecidos em selects viram ""
 * apenas para UF (evita lixo no select) — nos demais mantêm o texto original.
 */
export function normalizarExtracao<T extends Dict>(bruto: T): T {
  aplicar(bruto["geral"] as Dict, {
    cpf: normalizarCpf,
    celular: normalizarTelefone,
    telefone: normalizarTelefone,
    dataNascimento: normalizarDataCompleta,
    sexo: normalizarSexo,
    estadoCivil: normalizarEstadoCivil,
    estadoNascimento: normalizarUf,
  });
  aplicar(bruto["endereco"] as Dict, { cep: normalizarCep, estado: normalizarUf });
  aplicar(bruto["profissionais"] as Dict, {
    disponibilidadeMudanca: normalizarSimNao,
    disponibilidadeViagens: normalizarSimNao,
  });
  for (const exp of (Array.isArray(bruto["experiencias"]) ? bruto["experiencias"] : []) as Dict[]) {
    aplicar(exp, {
      estado: normalizarUf,
      tipoContrato: normalizarTipoContrato,
      inicio: normalizarMesAno,
      desligamento: normalizarMesAno,
    });
    if (exp["atual"] === true) exp["desligamento"] = "";
    if (!exp["atual"] && /atual|presente|hoje|momento/i.test(s(exp["desligamento"]))) {
      exp["atual"] = true;
      exp["desligamento"] = "";
    }
  }
  for (const f of (Array.isArray(bruto["formacoes"]) ? bruto["formacoes"] : []) as Dict[]) {
    aplicar(f, {
      nivelEnsino: normalizarNivelEnsino,
      situacao: normalizarSituacao,
      modalidade: normalizarModalidade,
      inicio: normalizarMesAno,
      conclusao: normalizarMesAno,
    });
  }
  return bruto;
}
