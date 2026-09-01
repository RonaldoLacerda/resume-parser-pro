export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export const NIVEIS_ENSINO = [
  "Ensino Fundamental",
  "Ensino Médio",
  "Técnico",
  "Tecnólogo",
  "Superior",
  "Pós-graduação",
  "Mestrado",
  "Doutorado",
] as const;

export const SITUACOES = ["Completo", "Cursando", "Trancado", "Incompleto"] as const;

export const MODALIDADES = ["Presencial", "EAD", "Semipresencial"] as const;

export const TIPOS_CONTRATO = ["CLT", "PJ", "Estágio", "Temporário", "Freelancer", "Aprendiz"] as const;

/** Opções aceitas nos selects de dados gerais — usadas também como enum no schema da IA. */
export const SEXOS = ["Feminino", "Masculino", "Prefiro não informar"] as const;

export const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)"] as const;

/** Radios Sim/Não do formulário. */
export const SIM_NAO = ["Sim", "Não"] as const;

/** Nome por extenso → sigla, para normalizar estados vindos do currículo. */
export const UF_POR_NOME: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};
