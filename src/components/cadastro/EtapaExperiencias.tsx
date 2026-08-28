import { Plus, Sparkles, Trash2 } from "lucide-react";
import { AreaTexto, Campo, RadioSimNao, SecaoTitulo, SelectInput, TextoInput } from "./Campos";
import { Button } from "@/components/ui/button";
import { TIPOS_CONTRATO, UFS } from "@/lib/candidate/opcoes";
import { useCandidato } from "@/lib/candidate/store";
import { novaExperiencia, type Experiencia } from "@/lib/candidate/types";

export function EtapaExperiencias() {
  const { candidato, replace, preenchidosPelaIa } = useCandidato();
  const lista = candidato.experiencias;

  const atualizar = (id: string, patch: Partial<Experiencia>) =>
    replace({
      ...candidato,
      experiencias: lista.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });

  const remover = (id: string) =>
    replace({ ...candidato, experiencias: lista.filter((item) => item.id !== id) });

  return (
    <div>
      <RadioSimNao label="Primeiro Emprego" name="primeiroEmprego" value="" onChange={() => undefined} />

      <div className="mt-8">
        <SecaoTitulo>Cadastrar Experiência</SecaoTitulo>

        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma experiência cadastrada.</p>
        ) : null}

        <div className="space-y-8">
          {lista.map((exp) => {
            const daIa = preenchidosPelaIa.has(`experiencia.${exp.id}`);
            return (
              <article key={exp.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={exp.atual}
                      onChange={(e) => atualizar(exp.id, { atual: e.target.checked })}
                      className="size-4 accent-[var(--primary)]"
                    />
                    Atual
                    {daIa ? <Sparkles className="size-3.5 text-brand" /> : null}
                  </label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remover(exp.id)}>
                    <Trash2 className="text-danger" />
                  </Button>
                </div>

                <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                  <Campo label="Empresa" ia={daIa}>
                    <TextoInput
                      value={exp.empresa}
                      ia={daIa}
                      onChange={(e) => atualizar(exp.id, { empresa: e.target.value })}
                    />
                  </Campo>
                  <Campo label="Cargo" ia={daIa}>
                    <TextoInput
                      value={exp.cargo}
                      ia={daIa}
                      onChange={(e) => atualizar(exp.id, { cargo: e.target.value })}
                    />
                  </Campo>
                  <Campo label="Tipo de Contrato">
                    <SelectInput
                      value={exp.tipoContrato}
                      onChange={(e) => atualizar(exp.id, { tipoContrato: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {TIPOS_CONTRATO.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </SelectInput>
                  </Campo>
                  <Campo label="Estado">
                    <SelectInput
                      value={exp.estado}
                      onChange={(e) => atualizar(exp.id, { estado: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {UFS.map((uf) => (
                        <option key={uf}>{uf}</option>
                      ))}
                    </SelectInput>
                  </Campo>
                  <Campo label="Cidade">
                    <TextoInput
                      value={exp.cidade}
                      onChange={(e) => atualizar(exp.id, { cidade: e.target.value })}
                    />
                  </Campo>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Início" ia={daIa}>
                      <TextoInput
                        placeholder="mm/aaaa"
                        value={exp.inicio}
                        ia={daIa}
                        onChange={(e) => atualizar(exp.id, { inicio: e.target.value })}
                      />
                    </Campo>
                    <Campo label="Desligamento">
                      <TextoInput
                        placeholder="mm/aaaa"
                        value={exp.desligamento}
                        disabled={exp.atual}
                        onChange={(e) => atualizar(exp.id, { desligamento: e.target.value })}
                      />
                    </Campo>
                  </div>
                  <Campo label="Atividades Exercidas" className="md:col-span-2 xl:col-span-3" ia={daIa}>
                    <AreaTexto
                      value={exp.atividades}
                      ia={daIa}
                      onChange={(e) => atualizar(exp.id, { atividades: e.target.value })}
                    />
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
          onClick={() => replace({ ...candidato, experiencias: [...lista, novaExperiencia()] })}
        >
          <Plus /> Adicionar experiência
        </Button>
      </div>
    </div>
  );
}
