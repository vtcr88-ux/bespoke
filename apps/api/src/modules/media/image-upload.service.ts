import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import {
  maxImageUploadBytes,
  type ImageUploadResponse,
  type SupportedImageContentType,
} from "@bespoke/contracts";
import { ApiError } from "../../shared/api-error.js";

type ImageMetadata = {
  contentType: SupportedImageContentType;
  extension: "png" | "jpg" | "webp";
  width: number;
  height: number;
};

const maximumImageDimension = 12_000;
const maximumImagePixels = 40_000_000;

export class ImageUploadService {
  constructor(
    private readonly uploadsRoot: string,
    private readonly publicApiUrl: string,
  ) {}

  async save(
    buffer: Buffer,
    declaredContentType: string | undefined,
  ): Promise<ImageUploadResponse> {
    if (!buffer.length) {
      throw new ApiError(
        400,
        "IMAGE_EMPTY",
        "Selecione uma imagem valida para enviar.",
      );
    }

    if (buffer.length > maxImageUploadBytes) {
      throw new ApiError(
        413,
        "IMAGE_TOO_LARGE",
        "A imagem deve ter no maximo 8 MB.",
      );
    }

    const metadata = inspectImage(buffer);
    const normalizedContentType = declaredContentType
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();

    if (normalizedContentType !== metadata.contentType) {
      throw new ApiError(
        415,
        "IMAGE_TYPE_MISMATCH",
        "O conteudo do arquivo nao corresponde ao formato informado.",
      );
    }

    if (
      metadata.width > maximumImageDimension ||
      metadata.height > maximumImageDimension ||
      metadata.width * metadata.height > maximumImagePixels
    ) {
      throw new ApiError(
        400,
        "IMAGE_DIMENSIONS_TOO_LARGE",
        "A imagem excede o limite seguro de dimensoes.",
      );
    }

    const sanitized = await sanitizeImage(buffer, metadata);
    if (sanitized.data.length > maxImageUploadBytes) {
      throw new ApiError(
        413,
        "IMAGE_TOO_LARGE",
        "A imagem processada deve ter no maximo 8 MB.",
      );
    }

    const imagesDirectory = resolve(this.uploadsRoot, "images");
    const fileName = `${randomUUID()}.${metadata.extension}`;
    await mkdir(imagesDirectory, { recursive: true });
    await writeFile(resolve(imagesDirectory, fileName), sanitized.data, {
      flag: "wx",
    });

    return {
      url: new URL(`/uploads/images/${fileName}`, this.publicApiUrl).toString(),
      width: sanitized.width,
      height: sanitized.height,
      contentType: metadata.contentType,
      sizeBytes: sanitized.data.length,
    };
  }

  async remove(
    url: string,
    isReferenced: (url: string) => Promise<boolean>,
  ): Promise<boolean> {
    const fileName = this.managedFileName(url);
    if (!fileName || (await isReferenced(url))) return false;

    try {
      await unlink(resolve(this.uploadsRoot, "images", fileName));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw new ApiError(
        500,
        "IMAGE_DELETE_FAILED",
        "Nao foi possivel remover a imagem com seguranca.",
      );
    }
  }

  private managedFileName(url: string) {
    try {
      const candidate = new URL(url);
      const publicUrl = new URL(this.publicApiUrl);
      if (candidate.origin !== publicUrl.origin) return null;
      return (
        candidate.pathname.match(
          /^\/uploads\/images\/([0-9a-f-]{36}\.(?:png|jpg|webp))$/i,
        )?.[1] ?? null
      );
    } catch {
      return null;
    }
  }
}

async function sanitizeImage(buffer: Buffer, metadata: ImageMetadata) {
  try {
    let pipeline = sharp(buffer, {
      failOn: "error",
      limitInputPixels: maximumImagePixels,
    }).rotate();

    if (metadata.contentType === "image/png") {
      pipeline = pipeline.png({ adaptiveFiltering: true, compressionLevel: 9 });
    } else if (metadata.contentType === "image/jpeg") {
      pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
    } else {
      pipeline = pipeline.webp({ quality: 90 });
    }

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    if (!validDimensions(info.width, info.height))
      throw new Error("Invalid output dimensions");

    return { data, width: info.width, height: info.height };
  } catch {
    throw new ApiError(
      415,
      "IMAGE_DECODE_FAILED",
      "A imagem nao pode ser decodificada com seguranca.",
    );
  }
}

export function inspectImage(buffer: Buffer): ImageMetadata {
  const metadata =
    inspectPng(buffer) ?? inspectJpeg(buffer) ?? inspectWebp(buffer);
  if (!metadata) {
    throw new ApiError(
      415,
      "IMAGE_TYPE_UNSUPPORTED",
      "Envie uma imagem PNG, JPG ou WebP valida.",
    );
  }
  return metadata;
}

function inspectPng(buffer: Buffer): ImageMetadata | null {
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (
    buffer.length < 45 ||
    !buffer.subarray(0, 8).equals(pngSignature) ||
    buffer.readUInt32BE(8) !== 13 ||
    buffer.toString("ascii", 12, 16) !== "IHDR" ||
    buffer.toString("ascii", buffer.length - 8, buffer.length - 4) !== "IEND"
  ) {
    return null;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return validDimensions(width, height)
    ? { contentType: "image/png", extension: "png", width, height }
    : null;
}

function inspectJpeg(buffer: Buffer): ImageMetadata | null {
  if (
    buffer.length < 4 ||
    buffer[0] !== 0xff ||
    buffer[1] !== 0xd8 ||
    buffer.lastIndexOf(Buffer.from([0xff, 0xd9])) < 2
  ) {
    return null;
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  let offset = 2;

  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1]!;
    if (marker === 0xd8 || marker === 0x01) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda || offset + 3 >= buffer.length)
      break;

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) break;

    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return validDimensions(width, height)
        ? { contentType: "image/jpeg", extension: "jpg", width, height }
        : null;
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function inspectWebp(buffer: Buffer): ImageMetadata | null {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }
  if (buffer.readUInt32LE(4) + 8 > buffer.length) return null;

  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8X") {
    const width = 1 + readUInt24LE(buffer, 24);
    const height = 1 + readUInt24LE(buffer, 27);
    return validDimensions(width, height)
      ? { contentType: "image/webp", extension: "webp", width, height }
      : null;
  }

  if (
    chunkType === "VP8 " &&
    buffer[23] === 0x9d &&
    buffer[24] === 0x01 &&
    buffer[25] === 0x2a
  ) {
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return validDimensions(width, height)
      ? { contentType: "image/webp", extension: "webp", width, height }
      : null;
  }

  if (chunkType === "VP8L" && buffer[20] === 0x2f) {
    const width = 1 + (((buffer[22]! & 0x3f) << 8) | buffer[21]!);
    const height =
      1 +
      (((buffer[24]! & 0x0f) << 10) |
        (buffer[23]! << 2) |
        ((buffer[22]! & 0xc0) >> 6));
    return validDimensions(width, height)
      ? { contentType: "image/webp", extension: "webp", width, height }
      : null;
  }

  return null;
}

function readUInt24LE(buffer: Buffer, offset: number) {
  return (
    buffer[offset]! | (buffer[offset + 1]! << 8) | (buffer[offset + 2]! << 16)
  );
}

function validDimensions(width: number, height: number) {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0
  );
}
