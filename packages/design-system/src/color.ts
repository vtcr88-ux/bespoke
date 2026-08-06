const lightText = "#ffffff";
const darkText = "#090907";

function parseHexColor(color: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match) return null;

  return [match[1], match[2], match[3]].map((channel) =>
    Number.parseInt(channel!, 16),
  );
}

function relativeLuminance(color: string) {
  const channels = parseHexColor(color);
  if (!channels) return null;

  const [red, green, blue] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

function contrastRatio(firstColor: string, secondColor: string) {
  const first = relativeLuminance(firstColor);
  const second = relativeLuminance(secondColor);
  if (first === null || second === null) return 0;

  const lightest = Math.max(first, second);
  const darkest = Math.min(first, second);
  return (lightest + 0.05) / (darkest + 0.05);
}

export function accessibleTextColor(
  backgroundColor: string,
  preferredDarkColor = darkText,
) {
  const candidates = [preferredDarkColor, lightText, darkText];
  const accessible = candidates.find(
    (candidate) => contrastRatio(backgroundColor, candidate) >= 4.5,
  );

  if (accessible) return accessible;

  return candidates.reduce((best, candidate) =>
    contrastRatio(backgroundColor, candidate) >
    contrastRatio(backgroundColor, best)
      ? candidate
      : best,
  );
}
