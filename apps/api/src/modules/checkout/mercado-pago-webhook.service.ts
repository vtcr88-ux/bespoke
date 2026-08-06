import crypto from "node:crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import type { PaymentStatus } from "@bespoke/contracts";
import type { AppEnv } from "../../config/env.js";
import { ApiError } from "../../shared/api-error.js";
import type {
  CommerceStoreAdapter,
  PaymentUpdateResult,
} from "../store/commerce.store.js";

export type MercadoPagoPaymentSnapshot = {
  id: string;
  externalReference: string;
  status: string;
  transactionAmount: number;
  currency: string;
};

export type MercadoPagoPaymentLookup = (
  paymentId: string,
) => Promise<MercadoPagoPaymentSnapshot>;

export type MercadoPagoWebhookInput = {
  notificationId: string;
  action: string;
  type: string;
  dataId: string;
  xSignature: string;
  xRequestId: string;
};

export class MercadoPagoWebhookService {
  private readonly paymentLookup: MercadoPagoPaymentLookup;

  constructor(
    private readonly store: CommerceStoreAdapter,
    private readonly env: AppEnv,
    paymentLookup?: MercadoPagoPaymentLookup,
  ) {
    this.paymentLookup = paymentLookup ?? this.lookupPayment.bind(this);
  }

  async process(input: MercadoPagoWebhookInput): Promise<PaymentUpdateResult> {
    if (input.type !== "payment") return "ignored";
    validateWebhookSignature({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.dataId,
      secret: this.env.MERCADO_PAGO_WEBHOOK_SECRET,
    });

    const payment = await this.paymentLookup(input.dataId);
    if (
      payment.id !== input.dataId ||
      payment.currency !== "BRL" ||
      !payment.externalReference ||
      !Number.isFinite(payment.transactionAmount)
    ) {
      throw new ApiError(
        502,
        "MERCADO_PAGO_PAYMENT_INVALID",
        "O provedor retornou um pagamento incompleto.",
      );
    }

    return this.store.processMercadoPagoPayment({
      eventId: `${input.notificationId}:${input.action}`,
      eventType: input.action,
      providerPaymentId: payment.id,
      orderReference: payment.externalReference,
      status: normalizePaymentStatus(payment.status),
      amountInCents: Math.round(payment.transactionAmount * 100),
    });
  }

  private async lookupPayment(
    paymentId: string,
  ): Promise<MercadoPagoPaymentSnapshot> {
    const client = new MercadoPagoConfig({
      accessToken: this.env.MERCADO_PAGO_ACCESS_TOKEN,
      options: { timeout: 8000 },
    });
    const response = await new Payment(client).get({ id: paymentId });
    return {
      id: String(response.id ?? paymentId),
      externalReference: response.external_reference ?? "",
      status: response.status ?? "pending",
      transactionAmount: response.transaction_amount ?? Number.NaN,
      currency: response.currency_id ?? "",
    };
  }
}

export function normalizePaymentStatus(status: string): PaymentStatus {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded" || status === "charged_back") return "refunded";
  return "pending";
}

export function validateWebhookSignature(input: {
  xSignature: string;
  xRequestId: string;
  dataId: string;
  secret: string;
}) {
  const parts = Object.fromEntries(
    input.xSignature.split(",").map((part) => {
      const [key, value] = part.trim().split("=", 2);
      return [key, value];
    }),
  );
  const timestamp = parts.ts;
  const received = parts.v1;
  if (!timestamp || !received || !/^[a-f0-9]{64}$/i.test(received)) {
    throw invalidSignature();
  }

  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.xRequestId};ts:${timestamp};`;
  const expected = crypto
    .createHmac("sha256", input.secret)
    .update(manifest)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw invalidSignature();
  }
}

function invalidSignature() {
  return new ApiError(
    401,
    "INVALID_WEBHOOK_SIGNATURE",
    "Assinatura do webhook invalida.",
  );
}
