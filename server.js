import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

const app = express();
app.use(cors());

const port = 3001;

let raffleTickets = { 123: 0 };

app.use(cors());
app.use(bodyParser.json());

// ✅ Get raffle status
app.get('/api/raffle-status', (req, res) => {
  const userId = req.query.userId;
  const tickets = raffleTickets[userId] || 0;
  return res.json({ tickets });
});

// ✅ Enter raffle (extra option if needed)
app.post('/api/raffle-entry', (req, res) => {
  const userId = req.body.userId;
  raffleTickets[userId] = (raffleTickets[userId] || 0) + 1;
  return res.json({ success: true, tickets: raffleTickets[userId] });
});

// ✅ Create Stripe Checkout session
// ✅ Create Stripe Checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Raffle Ticket' },
            unit_amount: 100,
          },
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/payment-canceled',
    });
console.log('✅ Created Stripe session:', session);
console.log('✅ Checkout URL:', session.url);
    res.json({ sessionUrl: session.url }); // ✅ Return the Stripe Checkout URL!
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ✅ Stripe webhook to confirm payment
app.post(
  '/api/stripe-webhook',
  bodyParser.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed.', err);
      return res.sendStatus(400);
    }

    if (event.type === 'checkout.session.completed') {
      const userId = 123; // Replace with metadata for real user
      raffleTickets[userId] = (raffleTickets[userId] || 0) + 1;
      console.log(`✅ Payment received. User ${userId} now has ${raffleTickets[userId]} tickets.`);
    }

    res.json({ received: true });
  }
);

app.listen(port, () => {
  console.log(`Raffle backend listening at http://localhost:${port}`);
});
