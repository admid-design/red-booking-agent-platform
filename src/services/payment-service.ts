import Stripe from 'stripe';
import { config } from '../config';
import {
  createPayment,
  updatePaymentStatus,
  findPaymentByStripeId,
  updateBookingStatus,
} from '../database/models';
import { Payment } from '../types';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
    });
  }
  return stripeClient;
}

/**
 * Create a Stripe PaymentIntent and record the pending payment.
 */
export async function createDepositPayment(
  bookingId: string,
  amountCents: number,
  currency = 'usd'
): Promise<{ payment: Payment; clientSecret: string }> {
  const stripe = getStripe();

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    metadata: { bookingId, type: 'deposit' },
  });

  const payment = await createPayment({
    bookingId,
    stripePaymentIntentId: intent.id,
    amount: amountCents / 100,
    currency,
    status: 'pending',
    type: 'deposit',
  });

  return { payment, clientSecret: intent.client_secret! };
}

/**
 * Handle a Stripe webhook event to update payment and booking status.
 */
export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<void> {
  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripe.webhookSecret
    );
  } catch (err) {
    throw new Error(`Stripe webhook validation failed: ${(err as Error).message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await findPaymentByStripeId(intent.id);
    if (payment) {
      await updatePaymentStatus(payment.id, 'succeeded');
      if (payment.type === 'deposit') {
        await updateBookingStatus(payment.bookingId, 'deposit_paid');
      }
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await findPaymentByStripeId(intent.id);
    if (payment) {
      await updatePaymentStatus(payment.id, 'failed');
    }
  }
}

/**
 * Refund a payment.
 */
export async function refundPayment(paymentId: string): Promise<void> {
  const stripe = getStripe();
  const payment = await findPaymentByStripeId(paymentId);
  if (!payment?.stripePaymentIntentId) {
    throw new Error('Payment not found or has no Stripe ID');
  }

  await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
  });

  await updatePaymentStatus(payment.id, 'refunded');
}
