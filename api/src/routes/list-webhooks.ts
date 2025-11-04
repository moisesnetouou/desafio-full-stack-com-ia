import { db } from '@/db'
import { webhooks } from '@/db/schema'
import { desc, lt } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
export const listWebhooks: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/webhooks',
    {
      schema: {
        summary: 'List webhooks',
        tags: ['Webhooks'],
        querystring: z.object({
          limit: z.coerce.number().min(1).max(100).default(20),
          cursor: z.string().optional()
        }),
        response: {
          200: z.object({
            webhooks: z.array(
              createSelectSchema(webhooks).pick({
                id: true,
                method: true,
                pathname: true,
                createdAt: true
              }),
            ),
            nextCursor: z.string().nullable() // nullable pq quando estiver na última página, não temos mais cursor
          })
        }
      }
    }, 
    async (request, reply) => {
      const { limit, cursor  } = request.query

      const result = await db
        .select({
          id: webhooks.id,
          method: webhooks.method,
          pathname: webhooks.pathname,
          createdAt: webhooks.createdAt
        })
        .from(webhooks)
        .where(cursor ? lt(webhooks.id, cursor) : undefined)
        .orderBy(desc(webhooks.id))
        .limit(limit + 1) // +1 para ver se tem mais

      const hasMore = result.length > limit
      const items = hasMore ? result.slice(0, limit) : result
      const nextCursor = hasMore ? items[items.length - 1].id : null

      return reply.send({
        webhooks: items,
        nextCursor
      })
    })
}


/*

Paginação: por que evitar OFFSET em listas grandes?

Exemplo de lista:
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

Caso com OFFSET:
OFFSET 3 LIMIT 2 => retorna [4, 5]

Problema:
Mesmo “pulando” os itens, o banco ainda precisa carregá-los antes de descartar.
Em listas grandes (ex: 100.000+ registros), isso deixa a query lenta, pois todos os registros anteriores ao offset ainda são processados.

Por isso, para listas extensas ou scroll infinito, preferimos paginação baseada em cursor.

---

Cursor-based pagination:

LIMIT 2
Cursor = 5 (último id exibido anteriormente)

Query:
SELECT * FROM webhooks
WHERE id > 5
LIMIT 2

Nesse caso:
- O `id` funciona como cursor  
- O WHERE reduz os dados direto no banco (diferente do OFFSET, que só “descarta” depois)

Vantagens:
- Não processa registros desnecessários
- Melhor performance em listas grandes
- Ótimo para scroll infinito

Observação:
Não é solução perfeita para todos os cenários, mas evita gargalos comuns com OFFSET em grandes volumes.

*/
