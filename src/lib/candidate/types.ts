import { z } from "zod";

/**
 * Esquema único e enxuto compartilhado entre IA, formulário e persistência.
 * Mantido "flat" e sem restrições (min/max/regex) para reduzir custo de tokens
 * e evitar falhas de validação pós-geração do modelo.
 */

export const experienciaSchema = z.object({
  id: z.string(),
  empresa: z.string().default(""),
  cargo: z.string().default(""),
  atual: z.boolean().default(false),
  inicio: z.string().default(""), // mm/aaaa
  desligamento: z.string().default(""), // mm/aaaa
  cidade: z.string().default(""),
  estado: z.string().default(""),
  tipoContrato: z.string().default(""),
  atividades: z.string().default(""),
});

export const formacaoSchema = z.object({
  id: z.string(),
  nivelEnsino: z.string().default(""),
  situacao: z.string().default(""),
  curso: z.string().default(""),
  instituicao: z.string().default(""),
  inicio: z.string().default(""),
  conclusao: z.string().default(""),
  modalidade: z.string().default(""),
});

export const dadosGeraisSchema = z.object({
  nomeCompleto: z.string().default(""),
  email: z.string().default(""),
  cpf: z.string().default(""),
  dataNascimento: z.string().default(""),
  sexo: z.string().default(""),
  estadoCivil: z.string().default(""),
  ddiCelular: z.string().default(""),
  celular: z.string().default(""),
  telefone: z.string().default(""),
  nomePai: z.string().default(""),
  nomeMae: z.string().default(""),
  rg: z.string().default(""),
  paisNascimento: z.string().default("Brasil"),
  estadoNascimento: z.string().default(""),
  cidadeNascimento: z.string().default(""),
});

export const enderecoSchema = z.object({
  pais: z.string().default("Brasil"),
  cep: z.string().default(""),
  estado: z.string().default(""),
  cidade: z.string().default(""),
  bairro: z.string().default(""),
  logradouro: z.string().default(""),
  numero: z.string().default(""),
  complemento: z.string().default(""),
  pontoReferencia: z.string().default(""),
  regiao: z.string().default(""),
});

export const profissionaisSchema = z.object({
  idiomas: z.array(z.string()).default([]),
  cargosInteresse: z.array(z.string()).default([]),
  conhecimentos: z.array(z.string()).default([]),
  pretensaoSalarial: z.string().default(""),
  resumoProfissional: z.string().default(""),
  objetivosProfissionais: z.string().default(""),
  disponibilidadeMudanca: z.string().default(""),
  disponibilidadeViagens: z.string().default(""),
});

export const candidatoSchema = z.object({
  geral: dadosGeraisSchema,
  endereco: enderecoSchema,
  experiencias: z.array(experienciaSchema).default([]),
  formacoes: z.array(formacaoSchema).default([]),
  profissionais: profissionaisSchema,
});

export type Experiencia = z.infer<typeof experienciaSchema>;
export type Formacao = z.infer<typeof formacaoSchema>;
export type Candidato = z.infer<typeof candidatoSchema>;

/** Payload devolvido pela IA (sem ids — gerados no cliente). */
export const extracaoSchema = z.object({
  geral: dadosGeraisSchema.partial().default({}),
  endereco: enderecoSchema.partial().default({}),
  experiencias: z.array(experienciaSchema.omit({ id: true }).partial()).default([]),
  formacoes: z.array(formacaoSchema.omit({ id: true }).partial()).default([]),
  profissionais: profissionaisSchema.partial().default({}),
});

export type Extracao = z.infer<typeof extracaoSchema>;

export const candidatoVazio = (): Candidato => candidatoSchema.parse({
  geral: {},
  endereco: {},
  experiencias: [],
  formacoes: [],
  profissionais: {},
});

export const novaExperiencia = (): Experiencia =>
  experienciaSchema.parse({ id: crypto.randomUUID() });

export const novaFormacao = (): Formacao => formacaoSchema.parse({ id: crypto.randomUUID() });
