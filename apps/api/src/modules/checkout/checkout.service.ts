import crypto from "node:crypto";
import { MercadoPagoConfig, Preference } from "mercadopago";
import type { CheckoutRequest, CheckoutResponse } from "@bespoke/contracts";
import type { AppEnv } from "../../config/env.js";
import { ApiError } from "../../shared/api-error.js";
import type { CommerceStoreAdapter } from "../store/commerce.store.js";
import { CartService } from "../cart/cart.service.js";

export class CheckoutService {
  constructor(
    private readonly cart: CartService,
    private readonly store: CommerceStoreAdapter,
    private readonly env: AppEnv
  ) {}

  async createPreference(input: CheckoutRequest): Promise<CheckoutResponse> {
    const priced = await this.cart.assertAvailable(input.items, input.shipping.destinationPostalCode);
    const orderReference = `BSP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await this.store.createOnlineOrder({ orderReference, customer: input.customer, priced });

    if (this.isPlaceholderToken()) {
      const checkoutUrl = this.localCheckoutUrl(orderReference, priced.totalInCents);
      await this.store.attachMercadoPagoPreference(orderReference, null, checkoutUrl);
      return {
        orderReference,
        preferenceId: null,
        checkoutUrl,
        status: "pending_payment"
      };
    }

    const idempotencyKey = `checkout-${orderReference}`;
    const client = new MercadoPagoConfig({
      accessToken: this.env.MERCADO_PAGO_ACCESS_TOKEN,
      options: { timeout: 8000 }
    });
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        external_reference: orderReference,
        statement_descriptor: "BESPOKE",
        auto_return: "approved",
        notification_url: `${this.env.PUBLIC_API_URL}/webhooks/mercado-pago`,
        back_urls: {
          success: `${this.env.PUBLIC_WEB_URL}/checkout/sandbox?status=success&order=${orderReference}`,
          pending: `${this.env.PUBLIC_WEB_URL}/checkout/sandbox?status=pending&order=${orderReference}`,
          failure: `${this.env.PUBLIC_WEB_URL}/checkout/sandbox?status=failure&order=${orderReference}`
        },
        payer: {
          name: input.customer.name,
          email: input.customer.email,
          phone: parsePhone(input.customer.phone)
        },
        shipments: {
          cost: centsToMercadoPagoAmount(priced.shippingInCents),
          receiver_address: {
            zip_code: input.shipping.destinationPostalCode
          }
        },
        items: priced.lines.map((line) => ({
          id: line.sku,
          title: line.name,
          quantity: line.quantity,
          currency_id: "BRL",
          unit_price: centsToMercadoPagoAmount(line.unitPriceInCents),
          picture_url: line.imageUrl
        }))
      },
      requestOptions: { idempotencyKey }
    });

    const checkoutUrl = response.init_point ?? response.sandbox_init_point;
    if (!checkoutUrl) {
      throw new ApiError(502, "MERCADO_PAGO_CHECKOUT_URL_MISSING", "Mercado Pago did not return a checkout URL.");
    }

    await this.store.attachMercadoPagoPreference(orderReference, response.id ?? null, checkoutUrl);

    return {
      orderReference,
      preferenceId: response.id ?? null,
      checkoutUrl,
      status: "pending_payment"
    };
  }

  private isPlaceholderToken() {
    return this.env.MERCADO_PAGO_ACCESS_TOKEN.includes("replace_me");
  }

  private localCheckoutUrl(orderReference: string, totalInCents: number) {
    const checkoutUrl = new URL("/checkout/sandbox", this.env.PUBLIC_WEB_URL);
    checkoutUrl.searchParams.set("order", orderReference);
    checkoutUrl.searchParams.set("amount", String(totalInCents));
    return checkoutUrl.toString();
  }
}

function centsToMercadoPagoAmount(value: number) {
  return Number((value / 100).toFixed(2));
}

function parsePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 9) {
    return { number: digits };
  }

  return {
    area_code: digits.slice(0, 2),
    number: digits.slice(2)
  };
}
