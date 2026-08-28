import { AreaTexto, Campo, RadioSimNao, TextoInput } from "./Campos";
import { useCandidato } from "@/lib/candidate/store";

function ListaCard({
  titulo,
  itens,
  vazio,
  onChange,
}: {
  titulo: string;
  itens: string[];
  vazio: string;
  onChange: (itens: string[]) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-foreground">{titulo}</p>
      {itens.length === 0 ? (
        <p className="mt-1 text-xs text-warning">{vazio}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {itens.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="rounded-full bg-primary/15 px-3 py-1 text-xs text-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      )}
      <TextoInput
        className="mt-3 h-9"
        placeholder="Digite e pressione Enter"
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const valor = e.currentTarget.value.trim();
          if (!valor) return;
          onChange([...itens, valor]);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}

export function EtapaProfissionais() {
  const { candidato, set, preenchidosPelaIa } = useCandidato();
  const p = candidato.profissionais;
  const ia = (c: string) => preenchidosPelaIa.has(`profissionais.${c}`);

  return (
    <div className="space-y-8">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ListaCard
          titulo="Idiomas"
          itens={p.idiomas}
          vazio="Nenhum idioma cadastrado."
          onChange={(idiomas) => set("profissionais", { idiomas })}
        />
        <ListaCard
          titulo="Cargos de Interesse"
          itens={p.cargosInteresse}
          vazio="Nenhum cargo de interesse registrado."
          onChange={(cargosInteresse) => set("profissionais", { cargosInteresse })}
        />
        <ListaCard
          titulo="Conhecimentos"
          itens={p.conhecimentos}
          vazio="Nenhum conhecimento cadastrado."
          onChange={(conhecimentos) => set("profissionais", { conhecimentos })}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <RadioSimNao
          label="Tem disponibilidade de mudança"
          name="mudanca"
          value={p.disponibilidadeMudanca}
          onChange={(v) => set("profissionais", { disponibilidadeMudanca: v })}
        />
        <RadioSimNao
          label="Tem disponibilidade para viagens"
          name="viagens"
          value={p.disponibilidadeViagens}
          onChange={(v) => set("profissionais", { disponibilidadeViagens: v })}
        />
        <Campo label="Pretensão Salarial" ia={ia("pretensaoSalarial")}>
          <TextoInput
            value={p.pretensaoSalarial}
            ia={ia("pretensaoSalarial")}
            onChange={(e) => set("profissionais", { pretensaoSalarial: e.target.value })}
          />
        </Campo>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Campo label="Resumo Profissional" ia={ia("resumoProfissional")}>
          <AreaTexto
            value={p.resumoProfissional}
            ia={ia("resumoProfissional")}
            onChange={(e) => set("profissionais", { resumoProfissional: e.target.value })}
          />
        </Campo>
        <Campo label="Objetivos Profissionais" ia={ia("objetivosProfissionais")}>
          <AreaTexto
            value={p.objetivosProfissionais}
            ia={ia("objetivosProfissionais")}
            onChange={(e) => set("profissionais", { objetivosProfissionais: e.target.value })}
          />
        </Campo>
      </div>
    </div>
  );
}
