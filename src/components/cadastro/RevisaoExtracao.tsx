import { useMemo, useState } from "react";
import { Check, Quote, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextoInput } from "./Campos";
import {
  montarExtracao,
  nivelConfianca,
  rotuloSecao,
  type PropostaCampo,
  type PropostaItem,
  type Propostas,
} from "@/lib/candidate/consolidar";
import { cn } from "@/lib/utils";

function Selo({ confianca }: { confianca: number }) {
  const { texto, classe } = nivelConfianca(confianca);
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", classe)}>
      {texto} · {Math.round(confianca * 100)}%
    </span>
  );
}

function Trecho({ trecho, origem }: { trecho: string; origem: string }) {
  return (
    <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
      <Quote className="mt-0.5 size-3 shrink-0" aria-hidden />
      <span>
        {trecho ? `“${trecho}”` : "Sem trecho citado pela IA."}
        <span className="ml-1 opacity-70">— {origem}</span>
      </span>
    </p>
  );
}

export function RevisaoExtracao({
  propostas,
  onAplicar,
  onRecomecar,
}: {
  propostas: Propostas;
  onAplicar: (selecionadas: Propostas) => void;
  onRecomecar: () => void;
}) {
  const [campos, setCampos] = useState<PropostaCampo[]>(propostas.campos);
  const [itens, setItens] = useState<PropostaItem[]>(propostas.itens);

  const aceitos = useMemo(
    () => campos.filter((c) => c.aceito).length + itens.filter((i) => i.aceito).length,
    [campos, itens],
  );
  const baixa = useMemo(() => campos.filter((c) => c.confianca < 0.6).length, [campos]);

  const secoes = useMemo(() => {
    const mapa = new Map<PropostaCampo["secao"], PropostaCampo[]>();
    for (const campo of campos) {
      const lista = mapa.get(campo.secao) ?? [];
      lista.push(campo);
      mapa.set(campo.secao, lista);
    }
    return [...mapa.entries()];
  }, [campos]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <h1 className="flex items-center justify-center gap-2 text-xl font-semibold text-foreground">
          <Sparkles className="size-5 text-brand" /> Revise o que a IA encontrou
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada campo mostra o grau de confiança e o trecho original do seu currículo. Desmarque ou
          corrija o que estiver errado antes de aplicar.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <span className="text-foreground">
          {aceitos} de {campos.length + itens.length} itens selecionados
        </span>
        {baixa > 0 ? (
          <span className="text-danger">{baixa} campo(s) com confiança baixa — confira</span>
        ) : null}
      </div>

      <div className="space-y-6">
        {secoes.map(([secao, lista]) => (
          <section key={secao}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              {rotuloSecao(secao)}
            </h2>
            <div className="space-y-2">
              {lista.map((campo) => (
                <div
                  key={campo.id}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    campo.aceito ? "border-border bg-card" : "border-dashed border-border bg-muted/30 opacity-70",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="checkbox"
                      checked={campo.aceito}
                      onChange={(e) =>
                        setCampos((atual) =>
                          atual.map((c) =>
                            c.id === campo.id ? { ...c, aceito: e.target.checked } : c,
                          ),
                        )
                      }
                      className="size-4 accent-[var(--primary)]"
                      aria-label={`Usar ${campo.rotulo}`}
                    />
                    <span className="min-w-40 text-sm text-foreground">{campo.rotulo}</span>
                    <TextoInput
                      className="h-9 flex-1"
                      value={Array.isArray(campo.valor) ? campo.valor.join(", ") : campo.valor}
                      onChange={(e) =>
                        setCampos((atual) =>
                          atual.map((c) =>
                            c.id === campo.id
                              ? {
                                  ...c,
                                  valor: Array.isArray(c.valor)
                                    ? e.target.value.split(",").map((v) => v.trim()).filter(Boolean)
                                    : e.target.value,
                                }
                              : c,
                          ),
                        )
                      }
                    />
                    <Selo confianca={campo.confianca} />
                  </div>
                  <Trecho trecho={campo.trecho} origem={campo.origem} />
                </div>
              ))}
            </div>
          </section>
        ))}

        {itens.length > 0 ? (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              Experiências e formações
            </h2>
            <div className="space-y-2">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-lg border p-3",
                    item.aceito ? "border-border bg-card" : "border-dashed border-border bg-muted/30 opacity-70",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.aceito}
                      onChange={(e) =>
                        setItens((atual) =>
                          atual.map((i) =>
                            i.id === item.id ? { ...i, aceito: e.target.checked } : i,
                          ),
                        )
                      }
                      className="size-4 accent-[var(--primary)]"
                      aria-label={`Usar ${item.rotulo}`}
                    />
                    <span className="flex-1 text-sm text-foreground">
                      <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[11px] uppercase text-muted-foreground">
                        {item.tipo === "experiencia" ? "Experiência" : "Formação"}
                      </span>
                      {item.rotulo}
                    </span>
                    <Selo confianca={item.confianca} />
                  </div>
                  <Trecho trecho={item.trecho} origem={item.origem} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onRecomecar}>
          <RotateCcw /> Enviar outros arquivos
        </Button>
        <Button
          type="button"
          className="bg-success text-success-foreground hover:bg-success/90"
          disabled={aceitos === 0}
          onClick={() => onAplicar({ campos, itens })}
        >
          <Check /> Aplicar {aceitos} itens ao cadastro
        </Button>
      </div>
    </div>
  );
}

export { montarExtracao };
