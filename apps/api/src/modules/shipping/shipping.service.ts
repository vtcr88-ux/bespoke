import type { CartItemInput, ShippingQuote } from "@bespoke/contracts";
import type { AppEnv } from "../../config/env.js";
import { ApiError } from "../../shared/api-error.js";

type CorreiosPriceResponse = {
  pcFinal?: string;
  precoFinal?: string;
  valor?: string;
  prazoEntrega?: string | number;
  msgErro?: string;
  txErro?: string;
};

export class ShippingService {
  constructor(private readonly env: AppEnv) {}

  async quote(input: {
    items: CartItemInput[];
    subtotalInCents: number;
    destinationPostalCode?: string;
  }): Promise<ShippingQuote> {
    const destinationPostalCode = input.destinationPostalCode ? normalizePostalCode(input.destinationPostalCode) : undefined;
    if (input.destinationPostalCode && !destinationPostalCode) {
      throw new ApiError(400, "INVALID_POSTAL_CODE", "CEP invalido.");
    }

    if (!destinationPostalCode) {
      return {
        provider: "store_policy",
        serviceCode: this.env.CORREIOS_SERVICE_CODE ?? "03220",
        priceInCents: 0,
        estimatedDays: null,
        message: "Frete calculado somente no checkout online."
      };
    }

    if (!this.env.CORREIOS_ACCESS_TOKEN || !this.env.CORREIOS_ORIGIN_POSTAL_CODE) {
      return this.fallbackQuote(input.subtotalInCents, destinationPostalCode, "Frete estimado ate configurar a API dos Correios.");
    }

    try {
      const quote = await this.quoteCorreios({
        items: input.items,
        destinationPostalCode
      });
      if (quote) return quote;
    } catch {
      return this.fallbackQuote(input.subtotalInCents, destinationPostalCode, "Correios indisponivel; exibindo frete estimado.");
    }

    return this.fallbackQuote(input.subtotalInCents, destinationPostalCode, "Correios nao retornou preco; exibindo frete estimado.");
  }

  private async quoteCorreios(input: { items: CartItemInput[]; destinationPostalCode: string }): Promise<ShippingQuote | null> {
    const serviceCode = this.env.CORREIOS_SERVICE_CODE ?? "03220";
    const originPostalCode = normalizePostalCode(this.env.CORREIOS_ORIGIN_POSTAL_CODE ?? "");
    if (!originPostalCode) return null;

    const quantity = input.items.reduce((total, item) => total + item.quantity, 0);
    const weightInGrams = Math.max(300, quantity * (this.env.CORREIOS_OBJECT_WEIGHT_GRAMS ?? 500));
    const baseUrl = (this.env.CORREIOS_PRICE_API_URL ?? "https://api.correios.com.br/preco/v1").replace(/\/$/, "");
    const url = new URL(`${baseUrl}/nacional/${serviceCode}`);
    url.searchParams.set("cepDestino", input.destinationPostalCode);
    url.searchParams.set("cepOrigem", originPostalCode);
    url.searchParams.set("psObjeto", String(weightInGrams));
    url.searchParams.set("tpObjeto", "2");
    url.searchParams.set("comprimento", String(this.env.CORREIOS_PACKAGE_LENGTH_CM ?? 20));
    url.searchParams.set("largura", String(this.env.CORREIOS_PACKAGE_WIDTH_CM ?? 20));
    url.searchParams.set("altura", String(this.env.CORREIOS_PACKAGE_HEIGHT_CM ?? 8));

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.env.CORREIOS_ACCESS_TOKEN}`
      }
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as CorreiosPriceResponse | CorreiosPriceResponse[];
    const data = Array.isArray(payload) ? payload[0] : payload;
    if (!data || data.msgErro || data.txErro) return null;

    const priceInCents = parseCorreiosMoney(data.pcFinal ?? data.precoFinal ?? data.valor);
    if (priceInCents == null) return null;

    return {
      provider: "correios",
      serviceCode,
      destinationPostalCode: input.destinationPostalCode,
      priceInCents,
      estimatedDays: parseEstimatedDays(data.prazoEntrega)
    };
  }

  private fallbackQuote(subtotalInCents: number, destinationPostalCode: string | undefined, message: string): ShippingQuote {
    const freeShippingThreshold = 50000;
    const priceInCents = subtotalInCents >= freeShippingThreshold ? 0 : 1900;

    return {
      provider: priceInCents === 0 ? "store_policy" : "fallback",
      serviceCode: this.env.CORREIOS_SERVICE_CODE ?? "03220",
      destinationPostalCode,
      priceInCents,
      estimatedDays: destinationPostalCode ? 5 : null,
      message
    };
  }
}

export function normalizePostalCode(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

function parseCorreiosMoney(value: string | undefined) {
  if (!value) return null;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

function parseEstimatedDays(value: string | number | undefined) {
  if (typeof value === "number") return value;
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
