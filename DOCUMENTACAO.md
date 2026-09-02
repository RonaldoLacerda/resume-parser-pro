# Cadastro de Candidato com IA — Documentação funcional

Documento de referência para entender **tudo o que o sistema faz, passo a passo**,
de forma independente de linguagem/framework. Se um dia for reescrito em Python,
Java, C#, etc., basta seguir este documento — a stack atual (React + TanStack Start)
é apenas um detalhe de implementação.

---

## 1. Visão geral

O candidato normalmente preencheria ~9 etapas de formulário manualmente.
A ideia é inverter o fluxo:

```
Etapa 0 (Currículo IA)  →  Revisão assistida  →  Formulário já preenchido
```

1. O candidato envia **um ou vários materiais** (PDF, DOCX, foto, TXT) e/ou grava
   **trechos de áudio** falando sobre sua carreira.
2. O sistema extrai texto **no navegador** sempre que possível (barato) e só usa o
   modelo multimodal quando não há texto (imagem/PDF escaneado).
3. A IA devolve um JSON estruturado + **evidências** (confiança e trecho original) por campo.
4. Os resultados de todos os materiais são **consolidados** em uma lista única de propostas.
5. O candidato **revisa** cada proposta (aceitar / editar / recusar) e aplica ao cadastro.
6. Os campos preenchidos por IA ficam **destacados** nas etapas do formulário.

Princípios de custo: extrair texto localmente, 1 chamada de IA por arquivo,
1 chamada única para todo o áudio já transcrito, e nunca transcrever áudio inaproveitável.

---

## 2. Modelo de dados

Definido em `src/lib/candidate/types.ts` (Zod). Todos os campos são strings simples
com default `""` — sem regex/min/max — para o modelo nunca falhar validação.

```
Candidato
├── geral         : nomeCompleto, email, cpf, dataNascimento, sexo, estadoCivil,
│                   ddiCelular, celular, telefone, nomePai, nomeMae, rg,
│                   paisNascimento(=Brasil), estadoNascimento, cidadeNascimento
├── endereco      : pais(=Brasil), cep, estado, cidade, bairro, logradouro,
│                   numero, complemento, pontoReferencia, regiao
├── experiencias[]: id, empresa, cargo, atual(bool), inicio(mm/aaaa),
│                   desligamento, cidade, estado, tipoContrato, atividades
├── formacoes[]   : id, nivelEnsino, situacao, curso, instituicao, inicio,
│                   conclusao, modalidade
└── profissionais : idiomas[], cargosInteresse[], conhecimentos[],
                    pretensaoSalarial, resumoProfissional, objetivosProfissionais,
                    disponibilidadeMudanca, disponibilidadeViagens
```

Persistência: `localStorage` sob a chave `menvie:candidato` (gravado a cada mudança).
Em outra linguagem, troque por qualquer storage local/servidor equivalente.

---

## 3. Pipeline de extração — passo a passo

### 3.1 Preparo no cliente — `src/lib/candidate/client-parse.ts`

Função `prepararArquivo(file)` decide a **rota mais barata** por tipo:

| Entrada | O que acontece | `fonte` enviada ao servidor |
|---|---|---|
| Áudio | vira data URL base64 | `audio` |
| PDF com camada de texto | texto extraído com pdf.js (máx. 8 páginas); se >200 caracteres úteis, envia só o texto | `texto` |
| PDF escaneado/protegido | fallback: base64 do arquivo | `pdf` |
| DOCX | texto extraído com mammoth | `texto` |
| Imagem (jpg/png/webp) | data URL base64 | `imagem` |
| TXT/MD/RTF | conteúdo lido direto | `texto` |
| Outros | erro "Formato não suportado" | — |

Limite: 12 MB por arquivo (`MAX_BYTES`).
**Regra de ouro para reescrita:** texto puro custa ordens de grandeza menos que base64;
sempre tente extrair texto antes de mandar o binário.

### 3.2 Chamada de IA — `src/lib/ai/gateway.server.ts`

Camada única de acesso ao provedor. Dois métodos:

- `responderJson({ instructions, content, schemaName, schema })`
  → `POST /v1/responses` com `text.format = json_schema` (structured output estrito).
  Regras do modo estrito: todo objeto precisa de `additionalProperties: false`
  e **todas** as chaves em `required` (por isso o helper `obj()`).
- `transcrever(blob, filename)` → `POST /v1/audio/transcriptions` (multipart).

Erros são traduzidos por `mensagemDeErro(status)`:
402 = créditos esgotados, 429 = excesso de requisições, 403 = uso bloqueado.
Somente 429/5xx fazem sentido tentar de novo; 4xx é definitivo.

### 3.3 Prompt e schema — `src/lib/candidate/extract.server.ts`

Um único prompt/schema serve texto, imagem, PDF e áudio transcrito.
Instruções principais dadas ao modelo:

- extrair dados gerais, experiências e formações (prioridade);
- **nunca inventar**: sem informação → string vazia / lista vazia;
- datas `mm/aaaa` (nascimento `dd/mm/aaaa`);
- ordem do mais recente para o mais antigo; `atual=true` sem `desligamento`;
- atividades em até 400 caracteres;
- preencher **`evidencias[]`**, um item por dado extraído:
  - `campo`: caminho (`geral.nomeCompleto`, `endereco.cep`, `experiencias.0`, `formacoes.1`);
  - `confianca`: 0..1 (1 = literal no documento, <0,6 = inferido);
  - `trecho`: citação literal curta (≤160 caracteres) que embasou o dado.

O texto de entrada é normalizado e truncado em 18.000 caracteres (`MAX_CHARS`).

### 3.3.1 Normalização pós-IA — `src/lib/candidate/normalizar.ts`

Logo após a resposta do modelo, sem custo de tokens, `normalizarExtracao()` converte os
valores para o formato exato dos selects/máscaras: UF por extenso → sigla; sexo, estado civil,
tipo de contrato, nível de ensino, situação e modalidade → opções do formulário (sinônimos +
prefixo); CPF/CEP/telefone com máscara; datas `aaaa-mm` / "março de 2021" → `mm/aaaa`;
"atual/presente" em desligamento → `atual=true`. O prompt também lista as enumerações aceitas,
então a normalização é uma segunda barreira, não a única.

### 3.4 Fronteira servidor — `src/lib/candidate/extract.functions.ts`

Dois endpoints RPC (equivalentes a duas rotas HTTP em outra linguagem):

- `extrairCurriculo({ fonte, filename, payload })`
  → roteia para texto / imagem / pdf / áudio e devolve
  `{ ok: true, dadosJson, transcricao }` ou `{ ok: false, status, message }`.
- `transcreverTrecho({ payload, filename })`
  → devolve apenas o texto transcrito de **um trecho** de áudio.
  Existe justamente para permitir regravar só o pedaço ruim sem refazer o resto.

Nenhuma chave de API vive no cliente: tudo passa pelo servidor.

---

## 4. Múltiplos arquivos e consolidação — `src/lib/candidate/consolidar.ts`

Entrada: lista de `{ origem: nomeDoArquivo, bruto: jsonDaIA }` (um por material).

Passos de `consolidar(entradas)`:

1. Para cada material, indexa `evidencias[]` por `campo` (mapa `caminho → {confianca, trecho}`).
2. Para cada seção plana (`geral`, `endereco`, `profissionais`) e cada chave não vazia:
   cria uma **proposta de campo** `{ id: "secao.chave", valor, confianca, trecho, origem, aceito:true }`.
   Valores default irrelevantes (`pais = Brasil`) são ignorados.
3. Para `experiencias`/`formacoes`, cria uma **proposta de item**, rotulada por
   `cargo · empresa` ou `curso · instituição`.
4. **Deduplicação**: chave = caminho do campo (ou rótulo normalizado do item).
   Em conflito entre arquivos, **vence a maior confiança**.
5. Ordena tudo por confiança decrescente.

`montarExtracao(propostas)` converte apenas as propostas **aceitas** de volta
no formato `{ geral, endereco, profissionais, experiencias[], formacoes[] }`
que o formulário entende.

`nivelConfianca(c)`: ≥0,85 = Alta (verde), ≥0,6 = Média (amarelo), abaixo = Baixa (vermelho).

---

## 5. Áudio com controle de qualidade — `src/lib/candidate/audio.ts`

Não usar `MediaRecorder` com `timeslice`: pedaços após o primeiro não têm cabeçalho
de container e o provedor rejeita. Aqui capturamos **PCM** via Web Audio e geramos
um **WAV completo (16 kHz, mono, 16 bits)** por trecho.

Fluxo:

1. `iniciarGravacao()` → abre microfone, acumula blocos `Float32` e devolve
   `{ parar, cancelar }`.
2. `parar()` → concatena, reamostra para 16 kHz, gera o WAV e roda `analisarQualidade`.
3. `analisarQualidade(amostras, taxa)` calcula:
   - `duracao` (segundos),
   - `volumeMedio` = RMS das amostras,
   - `silencioPct` = % de amostras com |v| < 0,01,
   - `clipPct` = % de amostras com |v| > 0,98 (distorção).

Classificação e ação:

| Condição | Nível | Ação na interface |
|---|---|---|
| duração < 1,5 s | ruim | bloqueia transcrição, pede regravar |
| RMS < 0,012 ou silêncio > 92% | ruim | bloqueia transcrição, pede regravar |
| RMS < 0,03 ou silêncio > 75% | atenção | transcreve, mas avisa volume baixo |
| clipping > 1% | atenção | transcreve, mas avisa distorção |
| caso contrário | bom | transcreve normalmente |

**Economia:** áudio "ruim" nunca é enviado ao provedor, e cada trecho é transcrito
isoladamente — regravar o trecho 3 não retranscreve 1, 2 e 4.

---

## 6. Interface do fluxo

### 6.1 `ImportarCurriculo.tsx` (Etapa 0)

Estados: `anexos[]` (arquivos), `trechos[]` (áudios com qualidade/transcrição),
`gravando`, `regravandoId`, `processando`, `propostas`.

Ações:
- **Anexar arquivos / arrastar**: acumula vários arquivos numa lista removível.
- **Gravar trecho**: inicia/para gravação; ao parar, analisa a qualidade e
  transcreve automaticamente (salvo se "ruim").
- **Regravar trecho**: mesma gravação, mas substitui o trecho pelo id existente.
- **Analisar com IA**: para cada anexo, 1 chamada de extração; para todo o áudio
  transcrito, **1 chamada única** (concatenando os textos). Depois `consolidar()`
  e troca a tela para a revisão.

### 6.2 `RevisaoExtracao.tsx`

Lista as propostas agrupadas por seção. Para cada campo mostra:
checkbox de aceite, rótulo, **valor editável**, selo de confiança
(`Alta/Média/Baixa + %`) e o **trecho original citado** com o arquivo de origem.
Experiências e formações aparecem como cards com o mesmo selo e trecho.
Rodapé mostra quantos itens estão selecionados e alerta sobre confiança baixa.
"Aplicar" chama `montarExtracao` → `aplicarExtracao` → avança para o formulário.

### 6.3 Estado global — `src/lib/candidate/store.tsx`

- `set(secao, valores)`: edição manual de campos.
- `aplicarExtracao(bruto)`: valida com Zod e **só preenche campos vazios**
  (nunca sobrescreve o que o usuário já digitou); deduplica experiências por
  `empresa|cargo` e formações por `curso|instituição`; registra os caminhos
  preenchidos em `preenchidosPelaIa` e retorna os totais aplicados.
- `preenchidosPelaIa`: conjunto de caminhos (`geral.cpf`, `experiencia.<id>`…)
  usado pelos componentes para destacar o campo (borda laranja + ícone ✨).
- `limpar()`: zera cadastro e marcações.

---

## 7. Como reescrever em outra linguagem — checklist

1. Modelo de dados do candidato + schema de extração com `evidencias[]`.
2. Extrator local de texto (PDF/DOCX) no cliente; fallback binário só quando necessário.
3. Endpoint servidor `extrair(fonte, filename, payload)` chamando o provedor com
   structured output estrito.
4. Endpoint servidor `transcrever(trecho)` isolado.
5. Consolidador multi-arquivo com dedupe por caminho/rótulo e desempate por confiança.
6. Gravador PCM → WAV 16 kHz com métricas RMS/silêncio/clipping e limiares da seção 5.
7. Tela de revisão com aceite/edição por campo + confiança + trecho original.
8. Merge não destrutivo no formulário, marcando os campos preenchidos por IA.

---

## 8. Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/candidate/types.ts` | Schemas Zod do candidato e da extração |
| `src/lib/candidate/client-parse.ts` | Preparo/extração de texto no navegador |
| `src/lib/candidate/extract.server.ts` | Prompt, JSON Schema e chamadas de extração |
| `src/lib/candidate/extract.functions.ts` | Endpoints de extração e transcrição |
| `src/lib/ai/gateway.server.ts` | Acesso único ao provedor de IA e erros |
| `src/lib/candidate/normalizar.ts` | Normalização pós-IA (UF, selects, máscaras CPF/CEP/telefone/datas) |
| `src/lib/candidate/consolidar.ts` | Consolidação multi-arquivo e propostas |
| `CUSTOS_IA.md` | Custo por anexo e comparativo de modelos |
| `src/lib/candidate/audio.ts` | Gravação PCM→WAV e análise de qualidade |
| `src/lib/candidate/store.tsx` | Estado global, persistência e merge não destrutivo |
| `src/components/cadastro/ImportarCurriculo.tsx` | Etapa 0: upload múltiplo + áudio |
| `src/components/cadastro/RevisaoExtracao.tsx` | Etapa de revisão com confiança/trecho |
| `src/components/cadastro/Etapa*.tsx` | Etapas do formulário |
| `src/routes/index.tsx` | Orquestração das etapas |
