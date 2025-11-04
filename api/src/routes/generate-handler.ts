import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { webhooks } from '@/db/schema'
import { db } from '@/db'
import { inArray } from 'drizzle-orm'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export const generateHandler: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/api/generate',
    {
      schema: {
        summary: 'Generate a TypeScript handler',
        tags: ['Webhooks'],
        body: z.object({
          webhookIds: z.array(z.string())
        }),
        response: {
          201: z.object({
            code: z.string()
          }),
        }
      }
    }, 
    async (request, reply) => {
      const { webhookIds } = request.body

      const result = await db
        .select({
          body: webhooks.body
        })
        .from(webhooks)
        .where(inArray(webhooks.id, webhookIds))

      const webhooksBodies = result.map((webhook) => webhook.body).join('\n\n')

      const { text } = await generateText({
        model: google('gemini-2.5-flash'), //  model: google('gemini-2.5-flash-lite'),
        prompt: `
You will receive one or more webhook request body examples (raw JSON payloads).
Your task is to generate a TypeScript webhook handler that:

- Detects every webhook event present in the examples
- Infers TypeScript types from the payload structure
- Creates Zod schemas for validation
- Creates a handler function for each event type
- Exposes a main function that:
  - Reads the incoming body
  - Validates the body with the correct Zod schema
  - Routes execution to the right handler based on the event name
  - Returns a structured JSON response
  - Fails safely when the event is unknown

Rules:
- Infer only from the provided payloads
- If a field exists in some events but not others, treat it as optional
- Output must be valid runnable TypeScript
- Use Zod
- No comments
- No explanation text
- No markdown formatting
- Do NOT wrap the output in \`\`\` or any code block
- Return ONLY the raw TypeScript code

The function should handle the following webhook events with example payloads:

"""
${webhooksBodies}
"""

Return ONLY the code. Do not include any markdown fences (no \`\`\`typescript or similar).

})`.trim()
      })

      return reply.status(201).send({ code: text })
    })
}