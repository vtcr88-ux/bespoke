import crypto from "node:crypto";
import type { WhatsappRequest, WhatsappResponse } from "@bespoke/contracts";
import type { AppEnv } from "../../config/env.js";
import { formatBrl } from "../../shared/money.js";
import { CartService } from "../cart/cart.service.js";
import type {
  CommerceStoreAdapter,
  StoredOrder,
} from "../store/commerce.store.js";

export class WhatsappService {
  constructor(
    private readonly cart: CartService,
    private readonly store: CommerceStoreAdapter,
    private readonly env: AppEnv
  ) {}

  async createRequest(input: WhatsappRequest): Promise<WhatsappResponse> {
    const priced = await this.cart.assertAvailable(input.items);
    const requestReference = `WSP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await this.store.createWhatsappRequest({ requestReference, priced });
    const settings = await this.store.storefront();
    const message = [
      `Ola, ${settings.brandName}.`,
      `Gostaria de continuar uma compra assistida. Referencia: ${requestReference}.`,
      "Itens:",
      productLines(priced.lines),
      `Subtotal dos produtos: ${formatBrl(priced.subtotalInCents)}.`,
      "Frete: a combinar pelo WhatsApp.",
      `Total sem frete: ${formatBrl(priced.totalInCents)}.`,
      settings.whatsappPurchaseMessage,
    ].join("\n");

    const url = this.url(message, settings.whatsappNumber);

    return {
      requestReference,
      url: url.toString(),
      status: "contact_requested"
    };
  }

  async postPaymentUrl(order: StoredOrder) {
    const settings = await this.store.storefront();
    const message = [
      `Ola, ${settings.brandName}.`,
      `Meu pagamento do pedido ${order.publicReference} foi confirmado.`,
      "Itens:",
      productLines(order.items),
      `Total pago: ${formatBrl(order.totalInCents)}.`,
      "Frete: a combinar pelo WhatsApp.",
      settings.postPaymentWhatsappMessage,
    ].join("\n");
    return this.url(message, settings.whatsappNumber).toString();
  }

  private url(message: string, configuredPhone: string) {
    const phone = configuredPhone || this.env.WHATSAPP_STORE_PHONE;
    const url = new URL(`https://wa.me/${phone}`);
    url.searchParams.set("text", message);
    return url;
  }
}

function productLines(
  lines: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unitPriceInCents: number;
    subtotalInCents: number;
  }>,
) {
  return lines
    .map(
      (line) =>
        `- ${line.name}${line.sku ? ` (${line.sku})` : ""} x${line.quantity} | ${formatBrl(line.unitPriceInCents)} cada | ${formatBrl(line.subtotalInCents)}`,
    )
    .join("\n");
}
