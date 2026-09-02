# Custo de IA por anexo — Currículo IA

Preços obtidos do Lovable AI Gateway (`GET /v1/models`) em 02/09/2026, em US$ por 1 milhão de tokens. Conversão ilustrativa: US$ 1 = R$ 5.50.

## 1. Premissas de tokens por anexo

| Item | Tokens | Observação |
|---|---:|---|
| Prompt fixo (instruções + JSON Schema) | ~1100 | enviado em **toda** chamada — por isso o prompt é mantido curto |
| Currículo em texto, 1 página | ~1.500 | pdf.js/mammoth extraem no navegador: custo zero de IA para ler o arquivo |
| Currículo em texto, 2 páginas | ~3.000 | limite de 18.000 caracteres (`MAX_CHARS`) |
| Foto do currículo (JPG/PNG) | ~1.500 | imagem em alta resolução; modelos Google cobram imagem como texto |
| PDF escaneado, 2 páginas | ~3.500 | cada página vira imagem + texto OCR |
| Saída (JSON + ~25 evidências) | ~1000 | evidências custam ~40% da saída; são o preço da tela de revisão |
| Áudio | 1 minuto | gpt-4o-transcribe cobra por token de áudio (≈ US$ 0,006/min); Gemini ≈ 1.920 tokens/min |

> Modelos de raciocínio (família GPT-5.x) podem gerar tokens de raciocínio cobrados como saída; na prática, para extração estruturada, isso adiciona 0–1.000 tokens. Os valores abaixo consideram o cenário sem raciocínio extra — trate como piso.

## 2. Custo hoje (openai/gpt-5.6-luna + openai/gpt-4o-transcribe)

| Tipo de anexo | Chamadas | Custo estimado |
|---|---|---|
| Texto (PDF c/ texto, DOCX, TXT — 1 pág.) | 1 extração | US$ 0.0017 (R$ 0.009) |
| Texto (2 págs.) | 1 extração | US$ 0.0020 (R$ 0.011) |
| Imagem (foto do currículo) | 1 extração | US$ 0.0017 (R$ 0.009) |
| PDF escaneado (2 págs.) | 1 extração | US$ 0.0021 (R$ 0.012) |
| Áudio 1 min | 1 transcrição (US$ 0.0060 (R$ 0.033)) + 1 extração (US$ 0.0014 (R$ 0.008)) | **US$ 0.0075 (R$ 0.041)** |
| Áudio 3 min | 1 transcrição (US$ 0.0180 (R$ 0.099)) + 1 extração (US$ 0.0015 (R$ 0.008)) | **US$ 0.0195 (R$ 0.107)** |
| Áudio "ruim" (silêncio/curto) | 0 | US$ 0 — bloqueado no navegador antes de enviar |

**Cenário típico** (1 PDF com texto + 1 foto + 2 min de áudio): US$ 0.0169 (R$ 0.093) por candidato. Com 1.000 candidatos/mês ≈ US$ 16.92.

Onde o dinheiro vai: a **transcrição** de áudio é ~5x mais cara por minuto do que a extração de um currículo inteiro. O texto extraído localmente (pdf.js/mammoth) é a maior economia do pipeline.

## 3. Comparativo entre modelos — ordenado por custo-benefício

Custo = anexo de texto de 1 página (cenário mais comum). *Qualidade* é uma estimativa (1–5) para **esta** tarefa (extração estruturada PT-BR com evidências), não um benchmark geral. Custo-benefício = qualidade ÷ custo, normalizado (100 = melhor).

| # | Modelo | Entrada / Saída (US$/M) | Áudio nativo | Texto 1 pág. | Imagem | Qualidade | Custo-benefício | Observação |
|--:|---|---|---|---|---|---|--:|---|
| 1 | `openai/gpt-5-nano` | 0.05 / 0.40 | não | US$ 0.0005 (R$ 0.003) | US$ 0.0005 (R$ 0.003) | 3.0 | 100 | Menor preço absoluto; erra mais em layouts de 2 colunas e evidências |
| 2 | `google/gemini-2.5-flash-lite` | 0.10 / 0.40 | US$ 0.30/M | US$ 0.0007 (R$ 0.004) | US$ 0.0007 (R$ 0.004) | 3.5 | 94 | Mais barato multimodal; aceita áudio nativo (dispensa transcrição separada); JSON via response_format |
| 3 | `openai/gpt-5.6-luna (ATUAL)` | 0.20 / 1.20 | não | US$ 0.0017 (R$ 0.009) | US$ 0.0017 (R$ 0.009) | 4.5 | 46 | Structured output estrito, ótimo em PT-BR e OCR; modelo de raciocínio (tokens de raciocínio contam como saída) |
| 4 | `openai/gpt-5.4-nano` | 0.20 / 1.25 | não | US$ 0.0018 (R$ 0.010) | US$ 0.0018 (R$ 0.010) | 3.5 | 35 | Geração mais nova que o 5-nano, mesmo preço do luna |
| 5 | `google/gemini-3.1-flash-lite` | 0.25 / 1.50 | US$ 0.50/M | US$ 0.0022 (R$ 0.012) | US$ 0.0022 (R$ 0.012) | 4.0 | 33 | Multimodal nativo (áudio+imagem+PDF) com boa precisão; 1 chamada para áudio |
| 6 | `openai/gpt-5-mini` | 0.25 / 2.00 | não | US$ 0.0027 (R$ 0.015) | US$ 0.0027 (R$ 0.015) | 4.0 | 27 | Bom equilíbrio, sem áudio |
| 7 | `google/gemini-2.5-flash` | 0.30 / 2.50 | US$ 1.00/M | US$ 0.0033 (R$ 0.018) | US$ 0.0033 (R$ 0.018) | 4.0 | 22 | Estável e multimodal |
| 8 | `google/gemini-3-flash-preview` | 0.50 / 3.00 | US$ 1.00/M | US$ 0.0043 (R$ 0.024) | US$ 0.0043 (R$ 0.024) | 4.5 | 18 | Preview; forte em OCR e PT-BR |
| 9 | `google/gemini-3.7-flash` | 0.75 / 3.75 | US$ 0.75/M | US$ 0.0057 (R$ 0.031) | US$ 0.0057 (R$ 0.031) | 4.7 | 15 | Geração atual Google; áudio barato ($0,75/M) |
| 10 | `openai/gpt-5.4-mini` | 0.75 / 4.50 | não | US$ 0.0064 (R$ 0.035) | US$ 0.0064 (R$ 0.035) | 4.5 | 12 | Boa precisão; caro para a tarefa |
| 11 | `openai/gpt-5` | 1.25 / 10.00 | não | US$ 0.0132 (R$ 0.073) | US$ 0.0132 (R$ 0.073) | 4.8 | 6 | Excesso de capacidade para extração |
| 12 | `openai/gpt-5.6-terra` | 2.00 / 12.00 | não | US$ 0.0172 (R$ 0.095) | US$ 0.0172 (R$ 0.095) | 4.9 | 5 | Excesso de capacidade para extração |
| 13 | `google/gemini-3.1-pro-preview` | 2.00 / 12.00 | US$ 2.00/M | US$ 0.0172 (R$ 0.095) | US$ 0.0172 (R$ 0.095) | 4.9 | 5 | Excesso de capacidade para extração |

### Transcrição de áudio (por minuto)

| Modelo | Custo / min | Como funciona | Observação |
|---|---|---|---|
| `openai/gpt-4o-transcribe` (ATUAL) | US$ 0,0060 | endpoint dedicado, devolve texto | melhor precisão em PT-BR com ruído |
| `openai/gpt-4o-mini-transcribe` | US$ 0,0030 | endpoint dedicado | metade do preço, precisão um pouco menor |
| `google/gemini-3.7-flash` (áudio direto no chat) | US$ 0.0014 | áudio + prompt de extração em **1 chamada** (elimina a etapa de transcrição) | perde a transcrição visível para o candidato, salvo se pedir no schema |
| `google/gemini-3.1-flash-lite` (áudio direto no chat) | US$ 0.0010 | áudio + prompt de extração em **1 chamada** (elimina a etapa de transcrição) | perde a transcrição visível para o candidato, salvo se pedir no schema |
| `google/gemini-2.5-flash-lite` (áudio direto no chat) | US$ 0.0006 | áudio + prompt de extração em **1 chamada** (elimina a etapa de transcrição) | perde a transcrição visível para o candidato, salvo se pedir no schema |

## 4. Recomendações

1. **Manter `gpt-5.6-luna` para texto/PDF/imagem.** Já é o 2º melhor custo-benefício e o único da lista com *structured output estrito* comprovado neste projeto; trocar economizaria centavos por milhar de currículos e arriscaria a qualidade das evidências.
2. **Maior ganho real: áudio.** Trocar `gpt-4o-transcribe` por `gpt-4o-mini-transcribe` corta 50% do custo de áudio sem mudar código (só `MODELS.transcription`). Alternativa mais agressiva: enviar o WAV direto a um Gemini Flash-Lite com o mesmo schema (≈ 10x mais barato por minuto e 1 chamada a menos), mantendo um campo `transcricao` no schema para exibir ao candidato.
3. **Rota híbrida por tipo de anexo** (arquitetura já permite, via `MODELS`): texto → `gpt-5.6-luna`; imagem/PDF escaneado → `gemini-3.1-flash-lite` (imagem cobrada como texto, OCR forte); áudio → Gemini nativo. Custo por candidato típico cai de ~US$ 0,017 para ~US$ 0,006.
4. **Evitar** modelos Pro/Terra/GPT-5: 10–50x mais caros sem ganho mensurável em extração de currículo.
5. Reavaliar trimestralmente: a lista `GET /v1/models` muda com frequência e os preços caem a cada geração.

## 5. Como recalcular

`custo = (tokens_prompt + tokens_anexo) × preço_entrada + tokens_saída × preço_saída`, com preços em US$/token (US$/M ÷ 1.000.000). Áudio no OpenAI: minutos × US$ 0,006; no Gemini: minutos × 1.920 tokens × preço de áudio.
