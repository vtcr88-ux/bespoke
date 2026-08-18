import crypto from "node:crypto";
import { MercadoPagoConfig, Preference } from "mercadopago";
import type {
  CheckoutRequest,
  CheckoutResponse,
  CheckoutStatusResponse,
} from "@bespoke/contracts";
import type { AppEnv } from "../../config/env.js";
import { ApiError } from "../../shared/api-error.js";
import type { CommerceStoreAdapter } from "../store/commerce.store.js";
import { CartService } from "../cart/cart.service.js";
import { WhatsappService } from "../whatsapp/whatsapp.service.js";
import { publicMediaUrl } from "../media/public-media-url.js";

export type MercadoPagoPreferenceCreate = Preference["create"];

export class CheckoutService {
  constructor(
    private readonly cart: CartService,
    private readonly store: CommerceStoreAdapter,
    private readonly env: AppEnv,
    private readonly whatsapp: WhatsappService,
    private readonly mercadoPagoPreferenceCreate?: MercadoPagoPreferenceCreate,
  ) {}

  async createPreference(input: CheckoutRequest): Promise<CheckoutResponse> {
    const priced = await this.cart.assertAvailable(input.items);
    const orderReference = `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const checkoutAccessToken = crypto.randomBytes(32).toString("base64url");
    const providerReturnUrl = this.isPlaceholderToken()
      ? null
      : this.mercadoPagoReturnUrl(orderReference);
    await this.store.createOnlineOrder({
      orderReference,
      checkoutAccessTokenHash: hashAccessToken(checkoutAccessToken),
      customer: input.customer,
      priced,
    });

    if (this.isPlaceholderToken()) {
      const checkoutUrl = this.localCheckoutUrl(
        orderReference,
      );
      await this.store.attachMercadoPagoPreference(orderReference, null, checkoutUrl);
      return {
        orderReference,
        preferenceId: null,
        checkoutUrl,
        checkoutAccessToken,
        status: "pending_payment"
      };
    }

    const idempotencyKey = `checkout-${orderReference}`;
    const client = new MercadoPagoConfig({
      accessToken: this.env.MERCADO_PAGO_ACCESS_TOKEN,
      options: { timeout: 8000 }
    });
    const preference = new Preference(client);
    const createPreference =
      this.mercadoPagoPreferenceCreate ?? preference.create.bind(preference);

    const storefront = await this.store.storefront();
    let response;
    try {
      response = await createPreference({
        body: {
          external_reference: orderReference,
          statement_descriptor: statementDescriptor(storefront.brandName),
          auto_return: "approved",
          notification_url: `${this.env.PUBLIC_API_URL}/webhooks/mercado-pago`,
          back_urls: {
            success: providerReturnUrl!,
            pending: providerReturnUrl!,
            failure: providerReturnUrl!,
          },
          payer: {
            name: input.customer.name,
            email: input.customer.email,
            phone: parsePhone(input.customer.phone),
          },
          items: priced.lines.map((line) => ({
            id: line.sku,
            title: line.name,
            quantity: line.quantity,
            currency_id: "BRL",
            unit_price: centsToMercadoPagoAmount(line.unitPriceInCents),
            picture_url: line.imageUrl,
          })),
        },
        requestOptions: { idempotencyKey },
      });
    } catch (error) {
      throw new ApiError(
        502,
        "MERCADO_PAGO_PREFERENCE_FAILED",
        "Nao foi possivel iniciar o pagamento no Mercado Pago. Tente novamente em instantes.",
        { cause: error },
      );
    }

    const checkoutUrl = response.init_point ?? response.sandbox_init_point;
    if (!checkoutUrl) {
      throw new ApiError(502, "MERCADO_PAGO_CHECKOUT_URL_MISSING", "Mercado Pago did not return a checkout URL.");
    }

    await this.store.attachMercadoPagoPreference(orderReference, response.id ?? null, checkoutUrl);

    return {
      orderReference,
      preferenceId: response.id ?? null,
      checkoutUrl,
      checkoutAccessToken,
      status: "pending_payment"
    };
  }

  async status(
    orderReference: string,
    checkoutAccessToken: string,
  ): Promise<CheckoutStatusResponse> {
    const order = await this.store.findCheckoutOrder(
      orderReference,
      hashAccessToken(checkoutAccessToken),
    );
    if (!order || !order.paymentStatus || !order.shippingStatus) {
      throw new ApiError(404, "CHECKOUT_NOT_FOUND", "Pedido nao encontrado.");
    }
    const approved = order.paymentStatus === "approved";
    return {
      orderReference: order.publicReference,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      shippingAmountInCents: order.shippingAmountInCents,
      totalPaidInCents: order.totalInCents,
      currency: "BRL",
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        subtotalInCents: item.subtotalInCents,
        imageUrl: publicMediaUrl(item.imageUrl, this.env.PUBLIC_API_URL),
      })),
      whatsappUrl: approved ? await this.whatsapp.postPaymentUrl(order) : null,
      canContinueOnWhatsapp: approved,
    };
  }

  async recordWhatsappOpen(
    orderReference: string,
    checkoutAccessToken: string,
  ) {
    const recorded = await this.store.recordWhatsappOpen(
      orderReference,
      hashAccessToken(checkoutAccessToken),
    );
    if (!recorded) {
      throw new ApiError(
        409,
        "PAYMENT_NOT_APPROVED",
        "O atendimento sera liberado apos a confirmacao do pagamento.",
      );
    }
  }

  private isPlaceholderToken() {
    return this.env.MERCADO_PAGO_ACCESS_TOKEN
      .toLowerCase()
      .includes("replace_me");
  }

  private localCheckoutUrl(
    orderReference: string,
  ) {
    return checkoutPageUrl(this.env.PUBLIC_WEB_URL, orderReference);
  }

  private mercadoPagoReturnUrl(orderReference: string) {
    const publicWebUrl = new URL(this.env.PUBLIC_WEB_URL);
    if (isPublicHttpsUrl(publicWebUrl)) {
      return checkoutPageUrl(publicWebUrl, orderReference);
    }

    const publicApiUrl = new URL(this.env.PUBLIC_API_URL);
    if (!isPublicHttpsUrl(publicApiUrl)) {
      throw new ApiError(
        503,
        "MERCADO_PAGO_RETURN_URL_INVALID",
        "O pagamento online esta temporariamente indisponivel.",
      );
    }

    const callbackUrl = new URL("/checkout/return", publicApiUrl);
    callbackUrl.searchParams.set("order", orderReference);
    return callbackUrl.toString();
  }
}

export function checkoutPageUrl(
  publicWebUrl: string | URL,
  orderReference: string,
) {
  const url = new URL("/checkout/sandbox", publicWebUrl);
  url.searchParams.set("order", orderReference);
  return url.toString();
}

function isPublicHttpsUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return (
    url.protocol === "https:" &&
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    hostname !== "::1"
  );
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

export function hashAccessToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function statementDescriptor(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, 22)
    .toUpperCase();
  return normalized || "LOJA ONLINE";
}
