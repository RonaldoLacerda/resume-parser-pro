/**
 * Gravação em trechos com análise de qualidade no navegador.
 * Cada trecho vira um WAV completo (16 kHz mono) — evita fragmentos sem header
 * e permite regravar apenas o trecho ruim, sem re-transcrever o resto.
 */

export type QualidadeAudio = {
  duracao: number;
  volumeMedio: number;
  silencioPct: number;
  clipPct: number;
  nivel: "bom" | "atencao" | "ruim";
  aviso: string;
};

const TAXA_SAIDA = 16000;

function reamostrar(dados: Float32Array, origem: number, destino: number) {
  if (origem === destino) return dados;
  const razao = origem / destino;
  const saida = new Float32Array(Math.floor(dados.length / razao));
  for (let i = 0; i < saida.length; i++) saida[i] = dados[Math.floor(i * razao)] ?? 0;
  return saida;
}

function encodeWav(amostras: Float32Array, taxa: number) {
  const buffer = new ArrayBuffer(44 + amostras.length * 2);
  const view = new DataView(buffer);
  const texto = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  texto(0, "RIFF");
  view.setUint32(4, 36 + amostras.length * 2, true);
  texto(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, taxa, true);
  view.setUint32(28, taxa * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  texto(36, "data");
  view.setUint32(40, amostras.length * 2, true);
  for (let i = 0; i < amostras.length; i++) {
    const v = Math.max(-1, Math.min(1, amostras[i] ?? 0));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function analisarQualidade(amostras: Float32Array, taxa: number): QualidadeAudio {
  const duracao = amostras.length / taxa;
  let soma = 0;
  let silencio = 0;
  let clip = 0;
  for (let i = 0; i < amostras.length; i++) {
    const v = Math.abs(amostras[i] ?? 0);
    soma += v * v;
    if (v < 0.01) silencio++;
    if (v > 0.98) clip++;
  }
  const volumeMedio = Math.sqrt(soma / Math.max(1, amostras.length));
  const silencioPct = (silencio / Math.max(1, amostras.length)) * 100;
  const clipPct = (clip / Math.max(1, amostras.length)) * 100;

  let nivel: QualidadeAudio["nivel"] = "bom";
  let aviso = "";
  if (duracao < 1.5) {
    nivel = "ruim";
    aviso = "Trecho muito curto — grave novamente falando por alguns segundos.";
  } else if (volumeMedio < 0.012 || silencioPct > 92) {
    nivel = "ruim";
    aviso = "Quase nenhum som captado. Verifique o microfone e regrave este trecho.";
  } else if (volumeMedio < 0.03 || silencioPct > 75) {
    nivel = "atencao";
    aviso = "Volume baixo. Fale mais perto do microfone se a transcrição sair incompleta.";
  } else if (clipPct > 1) {
    nivel = "atencao";
    aviso = "Áudio distorcido (muito alto). Afaste-se um pouco do microfone.";
  }
  return { duracao, volumeMedio, silencioPct, clipPct, nivel, aviso };
}

export type Gravacao = { blob: Blob; qualidade: QualidadeAudio };

export type ControleGravacao = {
  parar: () => Promise<Gravacao>;
  cancelar: () => void;
};

export async function iniciarGravacao(): Promise<ControleGravacao> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const pedacos: Float32Array[] = [];
  node.onaudioprocess = (e) => pedacos.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(node);
  node.connect(ctx.destination);

  const encerrar = async () => {
    stream.getTracks().forEach((t) => t.stop());
    node.disconnect();
    source.disconnect();
    const taxa = ctx.sampleRate;
    await ctx.close();
    return taxa;
  };

  return {
    cancelar: () => void encerrar(),
    parar: async () => {
      const taxa = await encerrar();
      const total = pedacos.reduce((acc, p) => acc + p.length, 0);
      const bruto = new Float32Array(total);
      let offset = 0;
      for (const p of pedacos) {
        bruto.set(p, offset);
        offset += p.length;
      }
      const amostras = reamostrar(bruto, taxa, TAXA_SAIDA);
      return {
        blob: encodeWav(amostras, TAXA_SAIDA),
        qualidade: analisarQualidade(amostras, TAXA_SAIDA),
      };
    },
  };
}
