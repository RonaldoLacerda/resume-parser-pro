/**
 * Etapa 0 do cadastro: upload de vários materiais (PDF, DOCX, foto, TXT) e
 * gravação de trechos de áudio com análise de qualidade. Consolida todas as
 * extrações em uma lista única de propostas revisáveis.
 * Ver DOCUMENTACAO.md, seções 3 a 6.1.
 */
import { useCallback, useRef, useState } from "react";

import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
  Mic,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extrairCurriculo, transcreverTrecho } from "@/lib/candidate/extract.functions";
import { prepararArquivo, toDataUrl } from "@/lib/candidate/client-parse";
import { iniciarGravacao, type ControleGravacao, type QualidadeAudio } from "@/lib/candidate/audio";
import { consolidar, montarExtracao, type Propostas } from "@/lib/candidate/consolidar";
import { useCandidato } from "@/lib/candidate/store";
import { RevisaoExtracao } from "./RevisaoExtracao";
import { cn } from "@/lib/utils";

type Anexo = { id: string; file: File };

type Trecho = {
  id: string;
  blob: Blob;
  qualidade: QualidadeAudio;
  texto: string;
  estado: "pendente" | "transcrevendo" | "pronto" | "erro";
  erro?: string;
};

const CORES_NIVEL: Record<QualidadeAudio["nivel"], string> = {
  bom: "text-success",
  atencao: "text-warning",
  ruim: "text-danger",
};

export function ImportarCurriculo({ onAvancar }: { onAvancar: () => void }) {
  const { aplicarExtracao } = useCandidato();
  const extrair = useServerFn(extrairCurriculo);
  const transcrever = useServerFn(transcreverTrecho);
  const inputRef = useRef<HTMLInputElement>(null);
  const gravacaoRef = useRef<ControleGravacao | null>(null);

  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [trechos, setTrechos] = useState<Trecho[]>([]);
  const [gravando, setGravando] = useState(false);
  const [regravandoId, setRegravandoId] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [arraste, setArraste] = useState(false);
  const [propostas, setPropostas] = useState<Propostas | null>(null);

  const adicionar = useCallback((lista: FileList | File[]) => {
    const novos = Array.from(lista).map((file) => ({ id: crypto.randomUUID(), file }));
    if (novos.length) setAnexos((atual) => [...atual, ...novos]);
  }, []);

  /** Transcreve um trecho isolado (regravar só o ruim não refaz os demais). */
  const transcreverUm = useCallback(
    async (trecho: Trecho) => {
      setTrechos((atual) =>
        atual.map((t) => (t.id === trecho.id ? { ...t, estado: "transcrevendo" } : t)),
      );
      try {
        const payload = await toDataUrl(trecho.blob);
        const resposta = await transcrever({ data: { payload, filename: "trecho.wav" } });
        setTrechos((atual) =>
          atual.map((t) =>
            t.id === trecho.id
              ? resposta.ok
                ? { ...t, texto: resposta.texto, estado: "pronto" }
                : { ...t, estado: "erro", erro: resposta.message }
              : t,
          ),
        );
        if (!resposta.ok) toast.error(resposta.message);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao transcrever.";
        setTrechos((atual) =>
          atual.map((t) => (t.id === trecho.id ? { ...t, estado: "erro", erro: message } : t)),
        );
        toast.error(message);
      }
    },
    [transcrever],
  );

  const pararGravacao = useCallback(async () => {
    const controle = gravacaoRef.current;
    gravacaoRef.current = null;
    setGravando(false);
    if (!controle) return;
    const { blob, qualidade } = await controle.parar();
    const alvo = regravandoId;
    setRegravandoId(null);

    const novo: Trecho = {
      id: alvo ?? crypto.randomUUID(),
      blob,
      qualidade,
      texto: "",
      estado: "pendente",
    };
    setTrechos((atual) =>
      alvo ? atual.map((t) => (t.id === alvo ? novo : t)) : [...atual, novo],
    );

    if (qualidade.nivel === "ruim") {
      toast.error(qualidade.aviso);
      return; // não gasta transcrição em áudio inaproveitável
    }
    if (qualidade.aviso) toast.warning(qualidade.aviso);
    void transcreverUm(novo);
  }, [regravandoId, transcreverUm]);

  const gravar = useCallback(
    async (substituirId?: string) => {
      if (gravando) {
        await pararGravacao();
        return;
      }
      try {
        gravacaoRef.current = await iniciarGravacao();
        setRegravandoId(substituirId ?? null);
        setGravando(true);
      } catch {
        toast.error("Não conseguimos acessar o microfone.");
      }
    },
    [gravando, pararGravacao],
  );

  /** Uma chamada de IA por arquivo + uma única chamada para todo o áudio transcrito. */
  const analisar = useCallback(async () => {
    const textoAudio = trechos
      .filter((t) => t.estado === "pronto" && t.texto.trim())
      .map((t) => t.texto.trim())
      .join("\n");

    if (!anexos.length && !textoAudio) {
      toast.error("Anexe pelo menos um arquivo ou grave um áudio.");
      return;
    }

    setProcessando(true);
    try {
      const resultados: { origem: string; bruto: unknown }[] = [];

      for (const anexo of anexos) {
        try {
          const preparo = await prepararArquivo(anexo.file);
          const resposta = await extrair({ data: preparo });
          if (!resposta.ok) {
            toast.error(`${anexo.file.name}: ${resposta.message}`);
            continue;
          }
          resultados.push({ origem: anexo.file.name, bruto: JSON.parse(resposta.dadosJson) });
        } catch (error) {
          toast.error(
            `${anexo.file.name}: ${error instanceof Error ? error.message : "falha ao ler."}`,
          );
        }
      }

      if (textoAudio) {
        const resposta = await extrair({
          data: { fonte: "texto", filename: "audio.txt", payload: textoAudio },
        });
        if (resposta.ok) {
          resultados.push({ origem: "Áudio gravado", bruto: JSON.parse(resposta.dadosJson) });
        } else {
          toast.error(resposta.message);
        }
      }

      if (!resultados.length) {
        toast.error("Não conseguimos extrair informações dos materiais enviados.");
        return;
      }

      const consolidado = consolidar(resultados);
      if (!consolidado.campos.length && !consolidado.itens.length) {
        toast.error("Nenhuma informação reconhecida. Tente outro arquivo.");
        return;
      }
      setPropostas(consolidado);
      toast.success(
        `${consolidado.campos.length} campos e ${consolidado.itens.length} registros para revisar.`,
      );
    } finally {
      setProcessando(false);
    }
  }, [anexos, extrair, trechos]);

  if (propostas) {
    return (
      <RevisaoExtracao
        propostas={propostas}
        onRecomecar={() => setPropostas(null)}
        onAplicar={(selecionadas) => {
          const totais = aplicarExtracao(montarExtracao(selecionadas));
          toast.success(
            `Aplicamos ${totais.campos} campos, ${totais.experiencias} experiências e ${totais.formacoes} formações.`,
          );
          onAvancar();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Comece anexando seu currículo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie quantos materiais quiser (PDF, DOCX, foto, TXT) e grave áudios complementares. A IA
          consolida tudo em um único preenchimento e você revisa antes de aplicar.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArraste(true);
        }}
        onDragLeave={() => setArraste(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArraste(false);
          if (e.dataTransfer.files?.length) adicionar(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          arraste ? "border-primary bg-primary/5" : "border-border bg-card",
        )}
      >
        <FileUp className="size-8 text-primary" />
        <p className="mt-3 text-sm text-foreground">
          Arraste os arquivos aqui ou selecione (pode enviar vários)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, DOCX, JPG, PNG ou TXT · até 12 MB cada
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => inputRef.current?.click()}>
            <FileUp /> Anexar arquivos
          </Button>
          <Button
            type="button"
            variant={gravando && !regravandoId ? "destructive" : "outline"}
            onClick={() => void gravar()}
          >
            {gravando && !regravandoId ? <Square /> : <Mic />}
            {gravando && !regravandoId ? "Parar trecho" : "Gravar trecho de áudio"}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.txt,.rtf,.md,image/*"
          onChange={(e) => {
            if (e.target.files?.length) adicionar(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {anexos.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {anexos.map((anexo) => (
            <li
              key={anexo.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <FileUp className="size-4 text-primary" />
              <span className="min-w-0 flex-1 truncate text-foreground">{anexo.file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(anexo.file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                type="button"
                className="cursor-pointer text-muted-foreground hover:text-danger"
                aria-label={`Remover ${anexo.file.name}`}
                onClick={() => setAnexos((atual) => atual.filter((a) => a.id !== anexo.id))}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {trechos.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Trechos de áudio</h2>
          {trechos.map((trecho, indice) => (
            <div key={trecho.id} className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <Mic className={cn("size-4", CORES_NIVEL[trecho.qualidade.nivel])} />
                <span className="text-foreground">Trecho {indice + 1}</span>
                <span className="text-xs text-muted-foreground">
                  {trecho.qualidade.duracao.toFixed(1)}s · silêncio{" "}
                  {Math.round(trecho.qualidade.silencioPct)}%
                </span>
                <span className={cn("flex items-center gap-1 text-xs", CORES_NIVEL[trecho.qualidade.nivel])}>
                  {trecho.qualidade.nivel === "bom" ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <AlertTriangle className="size-3.5" />
                  )}
                  {trecho.qualidade.nivel === "bom" ? "Boa qualidade" : trecho.qualidade.aviso}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {trecho.estado === "transcrevendo" ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : null}
                  {trecho.estado === "pendente" || trecho.estado === "erro" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void transcreverUm(trecho)}
                    >
                      Transcrever
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant={gravando && regravandoId === trecho.id ? "destructive" : "outline"}
                    onClick={() => void gravar(trecho.id)}
                  >
                    {gravando && regravandoId === trecho.id ? "Parar" : "Regravar trecho"}
                  </Button>
                  <button
                    type="button"
                    className="cursor-pointer text-muted-foreground hover:text-danger"
                    aria-label={`Remover trecho ${indice + 1}`}
                    onClick={() => setTrechos((atual) => atual.filter((t) => t.id !== trecho.id))}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              {trecho.texto ? (
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{trecho.texto}</p>
              ) : null}
              {trecho.erro ? <p className="mt-2 text-xs text-danger">{trecho.erro}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-brand" />
          Prefere digitar?{" "}
          <button type="button" className="cursor-pointer underline" onClick={onAvancar}>
            Preencher manualmente
          </button>
        </p>
        <Button type="button" disabled={processando} onClick={() => void analisar()}>
          {processando ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {processando ? "Analisando…" : "Analisar com IA"}
        </Button>
      </div>
    </div>
  );
}
