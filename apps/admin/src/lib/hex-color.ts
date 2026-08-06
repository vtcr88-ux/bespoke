export const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;

export function normalizeHexColorInput(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return "";

  const prefixedValue = trimmedValue.startsWith("#")
    ? trimmedValue
    : `#${trimmedValue}`;

  return prefixedValue.toUpperCase();
}

export function isValidHexColor(value: string) {
  return HEX_COLOR_PATTERN.test(normalizeHexColorInput(value));
}
