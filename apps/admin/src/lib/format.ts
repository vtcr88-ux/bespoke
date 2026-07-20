export function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "****";
  return `${name.slice(0, 2)}***@${domain}`;
}
