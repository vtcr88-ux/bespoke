import crypto from "node:crypto";
import type { WhatsappRequest, WhatsappResponse } from "@bespoke/contracts";
import type { AppEnv } from "../../config/env.js";
import { formatBrl } from "../../shared/money.js";
import { CartService } from "../cart/cart.service.js";
import type { CommerceStoreAdapter } from "../store/commerce.store.js";

export class WhatsappService {
  constructor(
    private readonly cart: CartService,
    private readonly store: CommerceStoreAdapter,
    private readonly env: AppEnv
  ) {}

  async createRequest(input: WhatsappRequest): Promise<WhatsappResponse> {
    const priced = await this.cart.assertAvailable(input.items, input.destinationPostalCode);
    const requestReference = `WSP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await this.store.createWhatsappRequest({ requestReference, priced });

    const lines = priced.lines
      .map(
        (line) =>
          `- ${line.name} (${line.sku}) x${line.quantity} | ${formatBrl(line.unitPriceInCents)} cada | ${formatBrl(line.subtotalInCents)}`
      )
      .join("\n");
    const message = [
      "Ola, Bespoke.",
      `Gostaria de continuar uma compra assistida. Referencia: ${requestReference}.`,
      "Itens:",
      lines,
      `Subtotal dos produtos: ${formatBrl(priced.subtotalInCents)}.`,
      priced.shipping.destinationPostalCode
        ? `Frete: ${formatBrl(priced.shippingInCents)} para CEP ${priced.shipping.destinationPostalCode}.`
        : "Frete: a combinar no atendimento.",
      priced.shipping.destinationPostalCode ? `Total estimado: ${formatBrl(priced.totalInCents)}.` : `Total sem frete: ${formatBrl(priced.subtotalInCents)}.`,
      "Entendo que preco e estoque serao confirmados antes da finalizacao."
    ].join("\n");

    const url = new URL(`https://wa.me/${this.env.WHATSAPP_STORE_PHONE}`);
    url.searchParams.set("text", message);

    return {
      requestReference,
      url: url.toString(),
      status: "contact_requested"
    };
  }
}
