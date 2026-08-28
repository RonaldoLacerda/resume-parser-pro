import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Lock, Trash2, FileSignature } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/cadastro/Sidebar";
import { ETAPAS, Stepper } from "@/components/cadastro/Stepper";
import { ImportarCurriculo } from "@/components/cadastro/ImportarCurriculo";
import { EtapaDadosGerais } from "@/components/cadastro/EtapaDadosGerais";
import { EtapaEndereco } from "@/components/cadastro/EtapaEndereco";
import { EtapaExperiencias } from "@/components/cadastro/EtapaExperiencias";
import { EtapaFormacao } from "@/components/cadastro/EtapaFormacao";
import { EtapaProfissionais } from "@/components/cadastro/EtapaProfissionais";
import {
  EtapaAnexos,
  EtapaConhecimentos,
  EtapaTreinamento,
} from "@/components/cadastro/EtapasSimples";
import { CandidatoProvider, useCandidato } from "@/lib/candidate/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cadastro de Candidato com IA | Menvie" },
      {
        name: "description",
        content:
          "Anexe seu currículo em PDF, DOCX, imagem ou áudio e a IA preenche automaticamente dados gerais, experiências e formações do cadastro.",
      },
      { property: "og:title", content: "Cadastro de Candidato com IA | Menvie" },
      {
        property: "og:description",
        content:
          "Currículo anexado vira cadastro preenchido: dados gerais, experiências e formações extraídos por IA.",
      },
    ],
  }),
  component: () => (
    <CandidatoProvider>
      <Cadastro />
      <Toaster position="top-right" richColors />
    </CandidatoProvider>
  ),
});

function Cadastro() {
  const [etapa, setEtapa] = useState(0);
  const { candidato } = useCandidato();
  const ultima = etapa === ETAPAS.length - 1;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar nome={candidato.geral.nomeCompleto} />

      <main className="min-w-0 flex-1">
        <Stepper atual={etapa} onSelecionar={setEtapa} />

        <div className="p-4 lg:p-6">
          <div className="rounded-lg bg-card p-6 shadow-sm lg:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm text-warning">
                <AlertTriangle className="size-4" /> Cadastro está incompleto.
              </p>
              <button className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Lock className="size-4" /> Alterar Senha
              </button>
            </div>

            {etapa === 0 ? <ImportarCurriculo onAvancar={() => setEtapa(1)} /> : null}
            {etapa === 1 ? <EtapaDadosGerais /> : null}
            {etapa === 2 ? <EtapaEndereco /> : null}
            {etapa === 3 ? <EtapaExperiencias /> : null}
            {etapa === 4 ? <EtapaFormacao /> : null}
            {etapa === 5 ? <EtapaTreinamento /> : null}
            {etapa === 6 ? <EtapaProfissionais /> : null}
            {etapa === 7 ? <EtapaConhecimentos /> : null}
            {etapa === 8 ? <EtapaAnexos /> : null}

            {etapa > 0 ? (
              <div className="mt-10 flex justify-end gap-3">
                <Button
                  type="button"
                  className="bg-danger text-danger-foreground hover:bg-danger/90"
                  onClick={() => setEtapa((e) => Math.max(0, e - 1))}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => setEtapa((e) => Math.min(ETAPAS.length - 1, e + 1))}
                >
                  {ultima ? "Concluir Cadastro" : "Avançar"}
                </Button>
              </div>
            ) : null}

            <div className="mt-10 space-y-2 text-sm">
              <button className="flex cursor-pointer items-center gap-2 text-info">
                <FileSignature className="size-4" /> Termo de aceite
              </button>
              <button className="flex cursor-pointer items-center gap-2 text-danger">
                <Trash2 className="size-4" /> Excluir Cadastro
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
