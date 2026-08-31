import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  candidatoVazio,
  extracaoSchema,
  experienciaSchema,
  formacaoSchema,
  type Candidato,
  type Extracao,
} from "./types";

/**
 * Estado global do cadastro: edição manual, persistência local e aplicação
 * não destrutiva dos dados vindos da IA. Ver DOCUMENTACAO.md, seção 6.3.
 */

const STORAGE_KEY = "menvie:candidato";

type CampoPreenchido = string;

type Store = {
  candidato: Candidato;
  /** Caminhos preenchidos pela IA ("geral.cpf", "experiencia.<id>") para destaque visual. */
  preenchidosPelaIa: Set<CampoPreenchido>;
  /** Edição manual de uma seção do cadastro. */
  set: <K extends keyof Candidato>(secao: K, valor: Partial<Candidato[K]>) => void;
  replace: (proximo: Candidato) => void;
  /** Valida o payload da IA e preenche apenas o que estiver vazio. */
  aplicarExtracao: (bruto: unknown) => { campos: number; experiencias: number; formacoes: number };
  limpar: () => void;
};

const CandidatoContext = createContext<Store | null>(null);

/**
 * Copia para `atual` apenas as chaves novas cujo valor atual esteja vazio,
 * registrando cada caminho preenchido em `marcados`.
 */
function mesclarObjeto<T extends Record<string, unknown>>(
  atual: T,
  novo: Record<string, unknown>,
  prefixo: string,
  marcados: Set<string>,
) {

  const resultado = { ...atual };
  let contador = 0;
  for (const [chave, valor] of Object.entries(novo)) {
    if (valor === undefined || valor === null || valor === "") continue;
    const atualValor = (atual as Record<string, unknown>)[chave];
    const vazio =
      atualValor === "" ||
      atualValor === undefined ||
      (Array.isArray(atualValor) && atualValor.length === 0) ||
      (chave === "paisNascimento" && atualValor === "Brasil") ||
      (chave === "pais" && atualValor === "Brasil");
    if (!vazio) continue;
    (resultado as Record<string, unknown>)[chave] = valor;
    marcados.add(`${prefixo}.${chave}`);
    contador++;
  }
  return { resultado, contador };
}

export function CandidatoProvider({ children }: { children: ReactNode }) {
  const [candidato, setCandidato] = useState<Candidato>(candidatoVazio);
  const [preenchidosPelaIa, setPreenchidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCandidato((atual) => ({ ...atual, ...JSON.parse(raw) }));
    } catch {
      /* estado local corrompido: ignora */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(candidato));
    } catch {
      /* quota cheia: ignora */
    }
  }, [candidato]);

  const set = useCallback<Store["set"]>((secao, valor) => {
    setCandidato((atual) => ({ ...atual, [secao]: { ...atual[secao], ...valor } }));
  }, []);

  const aplicarExtracao = useCallback((bruto: unknown) => {
    let parsed: Extracao;
    try {
      parsed = extracaoSchema.parse(bruto);
    } catch {
      parsed = extracaoSchema.parse({});
    }

    const marcados = new Set<string>();
    let campos = 0;
    let experiencias = 0;
    let formacoes = 0;

    setCandidato((atual) => {
      const geral = mesclarObjeto(atual.geral, parsed.geral, "geral", marcados);
      const endereco = mesclarObjeto(atual.endereco, parsed.endereco, "endereco", marcados);
      const profissionais = mesclarObjeto(
        atual.profissionais,
        parsed.profissionais,
        "profissionais",
        marcados,
      );
      campos = geral.contador + endereco.contador + profissionais.contador;

      const novasExp = parsed.experiencias
        .filter((e) => e.empresa || e.cargo)
        .map((e) => experienciaSchema.parse({ ...e, id: crypto.randomUUID() }));
      const novasForm = parsed.formacoes
        .filter((f) => f.curso || f.instituicao || f.nivelEnsino)
        .map((f) => formacaoSchema.parse({ ...f, id: crypto.randomUUID() }));

      const chaveExp = (e: { empresa: string; cargo: string }) =>
        `${e.empresa}|${e.cargo}`.toLowerCase();
      const existentesExp = new Set(atual.experiencias.map(chaveExp));
      const adicionarExp = novasExp.filter((e) => !existentesExp.has(chaveExp(e)));

      const chaveForm = (f: { curso: string; instituicao: string }) =>
        `${f.curso}|${f.instituicao}`.toLowerCase();
      const existentesForm = new Set(atual.formacoes.map(chaveForm));
      const adicionarForm = novasForm.filter((f) => !existentesForm.has(chaveForm(f)));

      experiencias = adicionarExp.length;
      formacoes = adicionarForm.length;
      adicionarExp.forEach((e) => marcados.add(`experiencia.${e.id}`));
      adicionarForm.forEach((f) => marcados.add(`formacao.${f.id}`));

      return {
        ...atual,
        geral: geral.resultado,
        endereco: endereco.resultado,
        profissionais: profissionais.resultado,
        experiencias: [...atual.experiencias, ...adicionarExp],
        formacoes: [...atual.formacoes, ...adicionarForm],
      };
    });

    setPreenchidos((atual) => new Set([...atual, ...marcados]));
    return { campos, experiencias, formacoes };
  }, []);

  const limpar = useCallback(() => {
    setCandidato(candidatoVazio());
    setPreenchidos(new Set());
  }, []);

  const value = useMemo<Store>(
    () => ({
      candidato,
      preenchidosPelaIa,
      set,
      replace: setCandidato,
      aplicarExtracao,
      limpar,
    }),
    [candidato, preenchidosPelaIa, set, aplicarExtracao, limpar],
  );

  return <CandidatoContext.Provider value={value}>{children}</CandidatoContext.Provider>;
}

export function useCandidato() {
  const ctx = useContext(CandidatoContext);
  if (!ctx) throw new Error("useCandidato deve ser usado dentro de CandidatoProvider");
  return ctx;
}
