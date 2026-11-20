import { z } from 'zod'

const schema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
})

const parsed = schema.safeParse(import.meta.env)
if (!parsed.success) {
  throw new Error(
    `Invalid environment variables. Copy apps/web/.env.example to .env.local.\n${z.prettifyError(parsed.error)}`,
  )
}

export const env = parsed.data
