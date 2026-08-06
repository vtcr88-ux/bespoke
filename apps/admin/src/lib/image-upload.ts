import {
  maxImageUploadBytes,
  supportedImageContentTypes,
  type SupportedImageContentType
} from "@bespoke/contracts";

type ImageFile = Pick<File, "name" | "size" | "type">;

const contentTypeByExtension: Record<string, SupportedImageContentType> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp"
};

export function getImageContentType(file: ImageFile): SupportedImageContentType | null {
  if (supportedImageContentTypes.includes(file.type as SupportedImageContentType)) {
    return file.type as SupportedImageContentType;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return contentTypeByExtension[extension] ?? null;
}

export function validateImageFile(file: ImageFile): string | null {
  if (!getImageContentType(file)) return "Escolha uma imagem PNG, JPG ou WebP.";
  if (file.size === 0) return "A imagem selecionada esta vazia.";
  if (file.size > maxImageUploadBytes) return "A imagem deve ter no maximo 8 MB.";
  return null;
}

export function formatImageSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
