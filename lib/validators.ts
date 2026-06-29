/**
 * Esquemas Zod para validar los bodies de las API routes.
 * Centraliza la validación para evitar duplicación y garantizar
 * que ningún campo inválido llegue a Groq ni a Supabase.
 */
import { z } from 'zod'

const taskSchema = z.object({
  title:    z.string().max(200),
  status:   z.string().max(30),
  priority: z.string().max(20).optional(),
  assignee: z.string().max(100).optional(),
})

const projectContextSchema = z.object({
  projectName:        z.string().max(100),
  projectDescription: z.string().max(1000).optional(),
  tasks:              z.array(taskSchema).max(50).optional().default([]),
  recentHistory:      z.array(z.string().max(200)).max(20).optional().default([]),
})

export const draftBodySchema = z.object({
  documentTitle: z.string().min(1).max(200),
  template:      z.enum(['free', 'apa', 'scientific']),
  userPrompt:    z.string().max(1500).optional().default(''),
  projectContext: projectContextSchema.optional(),
})

export const suggestBodySchema = z.object({
  documentTitle:  z.string().min(1).max(200),
  template:       z.enum(['free', 'apa', 'scientific']),
  currentContent: z.string().max(6000).optional().default(''),
  userRequest:    z.string().max(800).optional().default(''),
  projectContext: projectContextSchema.optional(),
})

export type DraftBody   = z.infer<typeof draftBodySchema>
export type SuggestBody = z.infer<typeof suggestBodySchema>
