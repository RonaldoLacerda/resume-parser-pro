import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Campo, SecaoTitulo, SelectInput, TextoInput } from "./Campos";
import { Button } from "@/components/ui/button";
import { MODALIDADES, NIVEIS_ENSINO, SITUACOES } from "@/lib/candidate/opcoes";
import { useCandidato } from "@/lib/candidate/store";
import { novaFormacao, type Formacao } from "@/lib/candidate/types";

export function EtapaFormacao() {
  const { candidato, replace, preenchidosPelaIa } = useCandidato();
  const lista = candidato.formacoes;

  const atualizar = (id: string, patch: Partial<Formacao>) =>
    replace({
      ...candidato,
      formacoes: lista.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });

  return (
    <div>
      <SecaoTitulo>Cadastrar Formação</SecaoTitulo>

      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma Formação Cadastrada.</p>
      ) : null}

      <div className="space-y-8">
        {lista.map((f) => {
          const daIa = preenchidosPelaIa.has(`formacao.${f.id}`);
          return (
            <article key={f.id} className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  {f.curso || "Formação"}
                  {daIa ? <Sparkles className="size-3.5 text-brand" /> : null}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    replace({ ...candidato, formacoes: lista.filter((i) => i.id !== f.id) })
                  }
                >
                  <Trash2 className="text-danger" />
                </Button>
              </div>

              <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                <Campo label="Nível de Ensino" ia={daIa}>
                  <SelectInput
                    value={f.nivelEnsino}
                    ia={daIa}
                    onChange={(e) => atualizar(f.id, { nivelEnsino: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {NIVEIS_ENSINO.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </SelectInput>
                </Campo>
                <Campo label="Situação" ia={daIa}>
                  <SelectInput
                    value={f.situacao}
                    ia={daIa}
                    onChange={(e) => atualizar(f.id, { situacao: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {SITUACOES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </SelectInput>
                </Campo>
                <Campo label="Início" ia={daIa}>
                  <TextoInput
                    placeholder="mm/aaaa"
                    value={f.inicio}
                    ia={daIa}
                    onChange={(e) => atualizar(f.id, { inicio: e.target.value })}
                  />
                </Campo>
                <Campo label="Curso" ia={daIa}>
                  <TextoInput
                    value={f.curso}
                    ia={daIa}
                    onChange={(e) => atualizar(f.id, { curso: e.target.value })}
                  />
                </Campo>
                <Campo label="Instituição" ia={daIa}>
                  <TextoInput
                    value={f.instituicao}
                    ia={daIa}
                    onChange={(e) => atualizar(f.id, { instituicao: e.target.value })}
                  />
                </Campo>
                <Campo label="Conclusão" ia={daIa}>
                  <TextoInput
                    placeholder="mm/aaaa"
                    value={f.conclusao}
                    ia={daIa}
                    onChange={(e) => atualizar(f.id, { conclusao: e.target.value })}
                  />
                </Campo>
                <Campo label="Modalidade">
                  <SelectInput
                    value={f.modalidade}
                    onChange={(e) => atualizar(f.id, { modalidade: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {MODALIDADES.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </SelectInput>
                </Campo>
              </div>
            </article>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-6"
        onClick={() => replace({ ...candidato, formacoes: [...lista, novaFormacao()] })}
      >
        <Plus /> Adicionar formação
      </Button>
    </div>
  );
}
