import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2, Mic, Sparkles, Square, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extrairCurriculo } from "@/lib/candidate/extract.functions";
import { prepararArquivo, toDataUrl } from "@/lib/candidate/client-parse";
import { useCandidato } from "@/lib/candidate/store";
import { cn } from "@/lib/utils";

type Resumo = { campos: number; experiencias: number; formacoes: number; transcricao?: string };

export function ImportarCurriculo({ onAvancar }: { onAvancar: () => void }) {
  const { aplicarExtracao } = useCandidato();
  const extrair = useServerFn(extrairCurriculo);
  const inputRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [arraste, setArraste] = useState(false);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [gravando, setGravando] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const processar = useCallback(
    async (file: File) => {
      setProcessando(true);
      setResumo(null);
      try {
        const preparo = await prepararArquivo(file);
        const resposta = await extrair({ data: preparo });
        if (!resposta.ok) {
          toast.error(resposta.message);
          return;
        }
        const totais = aplicarExtracao(JSON.parse(resposta.dadosJson));
        setResumo({ ...totais, transcricao: resposta.transcricao });
        toast.success(
          `Preenchemos ${totais.campos} campos, ${totais.experiencias} experiências e ${totais.formacoes} formações.`,
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao processar o arquivo.");
      } finally {
        setProcessando(false);
      }
    },
    [aplicarExtracao, extrair],
  );

  const alternarGravacao = useCallback(async () => {
    if (gravando) {
      recorderRef.current?.stop();
      setGravando(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 2048) {
          toast.error("Gravação muito curta. Tente novamente.");
          return;
        }
        setProcessando(true);
        try {
          const payload = await toDataUrl(blob);
          const ext = blob.type.includes("mp4") ? "m4a" : "webm";
          const resposta = await extrair({
            data: { fonte: "audio", filename: `relato.${ext}`, payload },
          });
          if (!resposta.ok) {
            toast.error(resposta.message);
            return;
          }
          const totais = aplicarExtracao(JSON.parse(resposta.dadosJson));
          setResumo({ ...totais, transcricao: resposta.transcricao });
          toast.success("Áudio transcrito e informações preenchidas.");
        } finally {
          setProcessando(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setGravando(true);
    } catch {
      toast.error("Não conseguimos acessar o microfone.");
    }
  }, [aplicarExtracao, extrair, gravando]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Comece anexando seu currículo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A IA lê o arquivo (PDF, DOCX, imagem ou TXT) e preenche automaticamente os dados gerais,
          experiências e formações. Você revisa tudo nas próximas etapas.
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
          const file = e.dataTransfer.files?.[0];
          if (file) void processar(file);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          arraste ? "border-primary bg-primary/5" : "border-border bg-card",
        )}
      >
        {processando ? (
          <>
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Lendo e extraindo informações…</p>
          </>
        ) : (
          <>
            <FileUp className="size-8 text-primary" />
            <p className="mt-3 text-sm text-foreground">
              Arraste o currículo aqui ou selecione o arquivo
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, JPG, PNG, TXT ou áudio · até 12 MB
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={() => inputRef.current?.click()}>
                <FileUp /> Anexar currículo
              </Button>
              <Button
                type="button"
                variant={gravando ? "destructive" : "outline"}
                onClick={() => void alternarGravacao()}
              >
                {gravando ? <Square /> : <Mic />}
                {gravando ? "Parar gravação" : "Gravar áudio"}
              </Button>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.rtf,.md,image/*,audio/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void processar(file);
            e.target.value = "";
          }}
        />
      </div>

      {resumo ? (
        <div className="mt-6 rounded-lg border border-success/40 bg-success/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle2 className="size-4 text-success" />
            {resumo.campos} campos, {resumo.experiencias} experiências e {resumo.formacoes} formações
            preenchidos pela IA.
          </p>
          {resumo.transcricao ? (
            <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">
              Transcrição: {resumo.transcricao}
            </p>
          ) : null}
          <div className="mt-4 flex gap-3">
            <Button type="button" className="bg-success text-success-foreground hover:bg-success/90" onClick={onAvancar}>
              Revisar dados
            </Button>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              Enviar outro arquivo
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-brand" />
          Prefere digitar? <button type="button" className="cursor-pointer underline" onClick={onAvancar}>Preencher manualmente</button>
        </p>
      )}
    </div>
  );
}
