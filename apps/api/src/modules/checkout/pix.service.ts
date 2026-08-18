import crypto from "node:crypto";
import {
  buildBrCodeRef,
  generateStaticBrCode,
  isValidBrCode,
  projectCity,
  projectReceiverName,
} from "@thiagoprazeres/pix-static-brcode";
import QRCode from "qrcode";
import type {
  PaymentMethodsResponse,
  PixCheckoutRequest,
  PixCheckoutResponse,
  PixPaymentDetails,
} from "@bespoke/contracts";
import type { AppEnv } from "../../config/env.js";
import { ApiError } from "../../shared/api-error.js";
import type {
  CommerceStoreAdapter,
  StoredOrder,
} from "../store/commerce.store.js";
import { WhatsappService } from "../whatsapp/whatsapp.service.js";
import { CartService } from "../cart/cart.service.js";
import { hashAccessToken } from "./checkout.service.js";

export class PixService {
  constructor(
    private readonly cart: CartService,
    private readonly store: CommerceStoreAdapter,
    private readonly env: AppEnv,
    private readonly whatsapp: WhatsappService,
  ) {}

  async paymentMethods(): Promise<PaymentMethodsResponse> {
    const settings = await this.store.pixSettings();
    return {
      pixManualEnabled: settings.enabled,
      mercadoPagoEnabled: true,
    };
  }

  async create(input: PixCheckoutRequest): Promise<PixCheckoutResponse> {
    const settings = await this.store.pixSettings();
    if (!settings.enabled) {
      throw new ApiError(
        503,
        "PIX_DISABLED",
        "O pagamento via Pix esta temporariamente indisponivel.",
      );
    }

    const priced = await this.cart.assertAvailable(input.items);
    const orderReference = pixOrderReference(input.operationId);
    const checkoutAccessToken = pixCheckoutAccessToken(
      input.operationId,
      this.env.SESSION_SECRET,
    );
    const generatedPayload = generatePayload({
      key: settings.key,
      receiverName: settings.receiverName,
      receiverCity: settings.receiverCity,
      orderReference,
      amountInCents: priced.totalInCents,
    });
    const requestHash = pixRequestHash(input, priced.totalInCents);
    const result = await this.store.createPixOrder({
      orderReference,
      operationId: input.operationId,
      requestHash,
      checkoutAccessTokenHash: hashAccessToken(checkoutAccessToken),
      customer: input.customer,
      priced,
      pixPayload: generatedPayload,
    });
    const pixCode = result.order.pixPayload ?? generatedPayload;
    const details = await this.detailsFromOrder(result.order, pixCode);

    return {
      ...details,
      checkoutAccessToken,
      reused: result.reused,
    };
  }

  async details(
    orderReference: string,
    checkoutAccessToken: string,
  ): Promise<PixPaymentDetails> {
    const order = await this.store.findCheckoutOrder(
      orderReference,
      hashAccessToken(checkoutAccessToken),
    );
    if (
      !order ||
      order.paymentMethod !== "pix_manual" ||
      !order.paymentStatus ||
      !order.pixPayload
    ) {
      throw new ApiError(404, "PIX_ORDER_NOT_FOUND", "Pedido Pix nao encontrado.");
    }
    return this.detailsFromOrder(order, order.pixPayload);
  }

  async recordWhatsappOpen(
    orderReference: string,
    checkoutAccessToken: string,
  ) {
    const recorded = await this.store.recordPixWhatsappOpen(
      orderReference,
      hashAccessToken(checkoutAccessToken),
    );
    if (!recorded) {
      throw new ApiError(
        409,
        "PIX_ORDER_NOT_AVAILABLE",
        "Este pedido Pix nao esta disponivel para envio de comprovante.",
      );
    }
  }

  private async detailsFromOrder(
    order: StoredOrder,
    pixCode: string,
  ): Promise<PixPaymentDetails> {
    const status =
      order.paymentStatus === "approved"
        ? "approved"
        : order.paymentStatus === "rejected"
          ? "rejected"
          : "pending_confirmation";
    return {
      orderReference: order.publicReference,
      amountInCents: order.totalInCents,
      currency: "BRL",
      pixCode,
      qrCodeDataUrl: await qrCodeDataUrl(pixCode),
      whatsappUrl: await this.whatsapp.pixProofUrl(order),
      paymentStatus: order.paymentStatus ?? "pending",
      status,
    };
  }
}

function generatePayload(input: {
  key: string;
  receiverName: string;
  receiverCity: string;
  orderReference: string;
  amountInCents: number;
}) {
  try {
    const payload = generateStaticBrCode({
      pixKey: input.key,
      receiverName: projectReceiverName(input.receiverName),
      receiverCity: projectCity(input.receiverCity),
      referenceLabel: buildBrCodeRef(input.orderReference),
      amount: Number((input.amountInCents / 100).toFixed(2)),
      description: `Pedido ${input.orderReference}`,
    });
    if (!isValidBrCode(payload)) throw new Error("Invalid BR Code payload");
    return payload;
  } catch (error) {
    throw new ApiError(
      422,
      "PIX_CONFIGURATION_INVALID",
      "A configuracao Pix da loja e invalida. Revise a chave e os dados do recebedor.",
      { cause: error },
    );
  }
}

async function qrCodeDataUrl(pixCode: string) {
  return QRCode.toDataURL(pixCode, {
    type: "image/png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
    color: { dark: "#090907", light: "#ffffff" },
  });
}

function pixOrderReference(operationId: string) {
  return `PIX-${crypto
    .createHash("sha256")
    .update(operationId)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase()}`;
}

function pixCheckoutAccessToken(operationId: string, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(`pix-checkout:${operationId}`)
    .digest("base64url");
}

function pixRequestHash(input: PixCheckoutRequest, totalInCents: number) {
  const canonical = {
    customer: {
      name: input.customer.name.trim(),
      email: input.customer.email.trim().toLowerCase(),
      phone: input.customer.phone.replace(/\D/g, ""),
    },
    items: [...input.items]
      .map((item) => ({ productId: item.productId, quantity: item.quantity }))
      .sort((left, right) => left.productId.localeCompare(right.productId)),
    totalInCents,
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}
