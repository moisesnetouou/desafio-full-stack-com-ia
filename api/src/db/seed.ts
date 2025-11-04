import { faker } from '@faker-js/faker'
import { db } from '.'
import { webhooks } from './schema'

async function seed() {
  console.log('🌱 Seeding database...')

  const stripeEventTypes = [
    'payment_intent.succeeded',
    'payment_intent.created',
    'payment_intent.payment_failed',
    'invoice.paid',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.created',
    'customer.updated',
    'checkout.session.completed',
    'charge.succeeded',
  ]

  const webhooksToInsert: (typeof webhooks.$inferInsert)[] = []

  for (let i = 0; i < 60; i++) {
    const eventType = faker.helpers.arrayElement(stripeEventTypes)
    const eventBody = {
      id: `evt_${faker.string.alphanumeric(24)}`,
      object: 'event',
      api_version: '2024-04-10',
      created: faker.date.past().getTime() / 1000,
      data: {
        object: {
          id: `${eventType.split('.')[0]}_${faker.string.alphanumeric(24)}`,
          object: eventType.split('.')[0],
          amount: faker.finance.amount({ min: 1000, max: 50000, dec: 0 }),
          currency: 'brl',
          customer: `cus_${faker.string.alphanumeric(14)}`,
          status: faker.helpers.arrayElement(['succeeded', 'processing', 'requires_payment_method']),
        },
      },
      livemode: false,
      pending_webhooks: faker.number.int({ min: 0, max: 3 }),
      request: {
        id: `req_${faker.string.alphanumeric(14)}`,
        idempotency_key: faker.string.uuid(),
      },
      type: eventType,
    }

    const body = JSON.stringify(eventBody, null, 2)

    webhooksToInsert.push({
      method: 'POST',
      pathname: '/stripe',
      ip: faker.internet.ip(),
      contentType: 'application/json',
      contentLength: body.length,
      body,
      headers: {
        'stripe-signature': `t=${faker.date.recent().getTime()},v1=${faker.string.hexadecimal({ length: 64 })},v0=${faker.string.hexadecimal({ length: 64 })}`,
        'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
        'content-type': 'application/json; charset=utf-8',
      },
    })
  }

  await db.insert(webhooks).values(webhooksToInsert)

  console.log('✅ Database seeded successfully!')
}

seed()
  .catch((error) => {
    console.error('❌ Error seeding database', error)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })