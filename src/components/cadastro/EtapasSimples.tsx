import { Camera, Plus, UploadCloud } from "lucide-react";
import { Campo, SecaoTitulo, SelectInput, TextoInput } from "./Campos";
import { Button } from "@/components/ui/button";
import { SITUACOES } from "@/lib/candidate/opcoes";

export function EtapaTreinamento() {
  return (
    <div>
      <SecaoTitulo>Cadastrar Treinamento</SecaoTitulo>
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
        <Campo label="Situação">
          <SelectInput defaultValue="">
            <option value="">Selecione</option>
            {SITUACOES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectInput>
        </Campo>
        <Campo label="Treinamento">
          <TextoInput />
        </Campo>
        <Campo label="Período">
          <TextoInput />
        </Campo>
        <Campo label="Início">
          <TextoInput placeholder="mm/aaaa" />
        </Campo>
        <Campo label="Conclusão">
          <TextoInput placeholder="mm/aaaa" />
        </Campo>
        <Campo label="Instituição">
          <TextoInput />
        </Campo>
        <Campo label="Carga Horária">
          <TextoInput />
        </Campo>
        <Campo label="Matrícula">
          <TextoInput />
        </Campo>
      </div>
      <div className="mt-6 flex justify-end">
        <Button type="button" className="bg-success text-success-foreground hover:bg-success/90">
          <Plus /> Cadastrar
        </Button>
      </div>
      <p className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground">
        Nenhum Treinamento Cadastrado.
      </p>
    </div>
  );
}

const PROGRAMAS = [
  "AutoCAD",
  "CRM",
  "Edição de Som",
  "Edição de Vídeo",
  "ERP",
  "Microsoft Project",
  "SAP",
  "Servidores",
];

export function EtapaConhecimentos() {
  return (
    <div className="max-w-2xl rounded-lg border border-border bg-card p-5">
      <p className="mb-4 text-sm text-foreground">
        Outros Programas <span className="text-danger">*</span>
      </p>
      <div className="grid grid-cols-[1fr_repeat(4,2.5rem)] items-center gap-y-3 text-xs text-muted-foreground">
        <span />
        {["B", "I", "A", "N/I"].map((n) => (
          <span key={n} className="text-center font-semibold">
            {n}
          </span>
        ))}
        {PROGRAMAS.map((programa) => (
          <Fragmento key={programa} programa={programa} />
        ))}
      </div>
    </div>
  );
}

function Fragmento({ programa }: { programa: string }) {
  return (
    <>
      <span className="text-sm text-foreground">{programa}</span>
      {["B", "I", "A", "N/I"].map((nivel) => (
        <span key={nivel} className="flex justify-center">
          <input type="radio" name={programa} className="size-4 accent-[var(--primary)]" />
        </span>
      ))}
    </>
  );
}

export function EtapaAnexos() {
  const blocos = ["Foto", "Currículo", "Pdf", "Documentos complementares"];
  return (
    <div className="space-y-8">
      {blocos.map((bloco) => (
        <section key={bloco}>
          <h3 className="border-b border-border pb-2 text-base text-muted-foreground">{bloco}</h3>
          <p className="mt-3 text-sm text-muted-foreground">Nenhum arquivo enviado</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button type="button" className="bg-info text-info-foreground hover:bg-info/90">
              <UploadCloud /> Adicionar arquivos
            </Button>
            <Button type="button" className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
              <Camera /> Upload da câmera
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}
