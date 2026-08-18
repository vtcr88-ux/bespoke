import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import sharp from "sharp";
import { ApiError } from "../../shared/api-error.js";
import { ImageUploadService, inspectImage } from "./image-upload.service.js";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function jpeg(width: number, height: number) {
  return Buffer.from([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x00,
    0x03,
    0x11,
    0x00,
    0xff,
    0xd9,
  ]);
}

function webp(width: number, height: number) {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(22, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUInt32LE(10, 16);
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
}

describe("inspectImage", () => {
  it("reads PNG dimensions", () => {
    expect(inspectImage(png)).toMatchObject({
      contentType: "image/png",
      extension: "png",
      width: 1,
      height: 1,
    });
  });

  it("reads JPEG dimensions", () => {
    expect(inspectImage(jpeg(640, 480))).toMatchObject({
      contentType: "image/jpeg",
      extension: "jpg",
      width: 640,
      height: 480,
    });
  });

  it("reads WebP dimensions", () => {
    expect(inspectImage(webp(1200, 900))).toMatchObject({
      contentType: "image/webp",
      extension: "webp",
      width: 1200,
      height: 900,
    });
  });

  it("rejects a truncated or renamed file", () => {
    expect(() => inspectImage(png.subarray(0, 24))).toThrow(ApiError);
    expect(() => inspectImage(Buffer.from("not-an-image"))).toThrow(ApiError);
  });
});

describe("ImageUploadService", () => {
  it("auto-orients, removes metadata and stores only the re-encoded image", async () => {
    const uploadsRoot = await mkdtemp(join(tmpdir(), "bespoke-images-"));
    const source = await sharp({
      create: { width: 2, height: 1, channels: 3, background: "#c9a76d" },
    })
      .withMetadata({ orientation: 6 })
      .jpeg({ quality: 100 })
      .toBuffer();

    try {
      const service = new ImageUploadService(
        uploadsRoot,
        "http://localhost:3333",
      );
      const uploaded = await service.save(source, "image/jpeg");
      const stored = await readFile(
        join(uploadsRoot, "images", basename(new URL(uploaded.url).pathname)),
      );
      const storedMetadata = await sharp(stored).metadata();

      expect(uploaded).toMatchObject({
        width: 1,
        height: 2,
        contentType: "image/jpeg",
        sizeBytes: stored.length,
      });
      expect(stored).not.toEqual(source);
      expect(storedMetadata.orientation).toBeUndefined();
      expect(storedMetadata.exif).toBeUndefined();
    } finally {
      await rm(uploadsRoot, { recursive: true, force: true });
    }
  });

  it("rejects a file whose header is plausible but whose pixels cannot be decoded", async () => {
    const service = new ImageUploadService(tmpdir(), "http://localhost:3333");

    await expect(
      service.save(jpeg(640, 480), "image/jpeg"),
    ).rejects.toMatchObject({ code: "IMAGE_DECODE_FAILED" });
  });

  it("creates a compact logo variant without changing the original upload", async () => {
    const uploadsRoot = await mkdtemp(join(tmpdir(), "bespoke-logo-"));
    const mark = await sharp({
      create: {
        width: 100,
        height: 40,
        channels: 4,
        background: "#c9a76d",
      },
    })
      .png()
      .toBuffer();
    const source = await sharp({
      create: {
        width: 300,
        height: 200,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: mark, left: 100, top: 80 }])
      .png()
      .toBuffer();

    try {
      const service = new ImageUploadService(
        uploadsRoot,
        "http://localhost:3333",
      );
      const uploaded = await service.save(source, "image/png");
      const fileName = basename(new URL(uploaded.url).pathname);
      const variant = await service.logoVariant(fileName);
      const metadata = await sharp(variant.data).metadata();

      expect(variant.contentType).toBe("image/webp");
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(40);
      expect(uploaded).toMatchObject({ width: 300, height: 200 });
    } finally {
      await rm(uploadsRoot, { recursive: true, force: true });
    }
  });
});
