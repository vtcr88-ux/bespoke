type LogoContentBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};

const logoContentBounds = new WeakMap<HTMLImageElement, LogoContentBounds>();

export function resetNormalizedLogo(mark: HTMLElement) {
  mark.removeAttribute("data-logo-normalized");
  mark.removeAttribute("data-logo-shape");
  for (const property of [
    "--brand-logo-image-width",
    "--brand-logo-image-height",
    "--brand-logo-image-left",
    "--brand-logo-image-top",
  ]) {
    mark.style.removeProperty(property);
  }
}

export function normalizeLogoImage(
  image: HTMLImageElement,
  inspectPixels = true,
) {
  const mark = image.parentElement;
  if (!mark || !image.naturalWidth || !image.naturalHeight) return;

  image.dataset.logoFit = "contain";
  if (inspectPixels) {
    const bounds = readVisibleLogoBounds(image);
    if (bounds) {
      logoContentBounds.set(image, bounds);
      setLogoShape(mark, bounds.width / bounds.height);
      updateNormalizedLogoLayout(image);
      return;
    }
  }

  setLogoShape(mark, image.naturalWidth / image.naturalHeight);
}

export function updateNormalizedLogoLayout(image: HTMLImageElement) {
  const mark = image.parentElement;
  const bounds = logoContentBounds.get(image);
  if (!mark || !bounds || !mark.clientWidth || !mark.clientHeight) return;

  const insetX = Math.min(6, mark.clientWidth * 0.03);
  const insetY = Math.min(4, mark.clientHeight * 0.06);
  const scale = Math.min(
    (mark.clientWidth - insetX * 2) / bounds.width,
    (mark.clientHeight - insetY * 2) / bounds.height,
  );
  const visibleHeight = bounds.height * scale;
  mark.style.setProperty(
    "--brand-logo-image-width",
    `${bounds.naturalWidth * scale}px`,
  );
  mark.style.setProperty(
    "--brand-logo-image-height",
    `${bounds.naturalHeight * scale}px`,
  );
  mark.style.setProperty(
    "--brand-logo-image-left",
    `${insetX - bounds.x * scale}px`,
  );
  mark.style.setProperty(
    "--brand-logo-image-top",
    `${(mark.clientHeight - visibleHeight) / 2 - bounds.y * scale}px`,
  );
  mark.dataset.logoNormalized = "true";
}

function setLogoShape(mark: HTMLElement, aspectRatio: number) {
  mark.dataset.logoShape =
    aspectRatio >= 2.4
      ? "wide"
      : aspectRatio >= 1.2
        ? "horizontal"
        : "portrait";
}

function readVisibleLogoBounds(
  image: HTMLImageElement,
): LogoContentBounds | null {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (!naturalWidth || !naturalHeight) return null;

  const sampleScale = Math.min(1, 320 / Math.max(naturalWidth, naturalHeight));
  const sampleWidth = Math.max(1, Math.round(naturalWidth * sampleScale));
  const sampleHeight = Math.max(1, Math.round(naturalHeight * sampleScale));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  try {
    context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    let minX = sampleWidth;
    let minY = sampleHeight;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        if ((pixels[(y * sampleWidth + x) * 4 + 3] ?? 0) <= 12) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return null;

    const scaleX = naturalWidth / sampleWidth;
    const scaleY = naturalHeight / sampleHeight;
    const rawX = minX * scaleX;
    const rawY = minY * scaleY;
    const rawWidth = (maxX - minX + 1) * scaleX;
    const rawHeight = (maxY - minY + 1) * scaleY;
    const paddingX = rawWidth * 0.025;
    const paddingY = rawHeight * 0.05;
    const x = Math.max(0, rawX - paddingX);
    const y = Math.max(0, rawY - paddingY);
    return {
      x,
      y,
      width: Math.min(naturalWidth - x, rawWidth + paddingX * 2),
      height: Math.min(naturalHeight - y, rawHeight + paddingY * 2),
      naturalWidth,
      naturalHeight,
    };
  } catch {
    return null;
  }
}
