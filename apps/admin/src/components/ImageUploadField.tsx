import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import type { ImageUploadResponse } from "@bespoke/contracts";
import { uploadImage } from "../lib/api";
import {
  formatImageSize,
  getImageContentType,
  validateImageFile,
} from "../lib/image-upload";

type ImageUploadFieldProps = {
  label: string;
  value: string;
  alt: string;
  recommendation: string;
  variant: "hero" | "product" | "logo" | "icon";
  required?: boolean;
  disabled?: boolean;
  error?: string;
  onChange: (upload: ImageUploadResponse) => void;
  onRemove?: () => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export function ImageUploadField({
  label,
  value,
  alt,
  recommendation,
  variant,
  required = false,
  disabled = false,
  error,
  onChange,
  onRemove,
  onUploadingChange,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localError, setLocalError] = useState("");
  const [lastUpload, setLastUpload] = useState<ImageUploadResponse | null>(
    null,
  );
  const [previewFailed, setPreviewFailed] = useState(false);
  const visibleError = localError || error;

  useEffect(() => {
    setPreviewFailed(false);
  }, [value]);

  async function processFile(file: File | undefined) {
    if (!file || disabled || uploading) return;

    const validationError = validateImageFile(file);
    const contentType = getImageContentType(file);
    if (validationError || !contentType) {
      setLocalError(validationError ?? "Formato de imagem nao reconhecido.");
      setLastUpload(null);
      return;
    }

    setLocalError("");
    setUploadProgress(0);
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const uploaded = await uploadImage(file, contentType, setUploadProgress);
      setLastUpload(uploaded);
      onChange(uploaded);
    } catch (uploadError) {
      setLastUpload(null);
      setLocalError(
        uploadError instanceof Error
          ? uploadError.message
          : "Nao foi possivel enviar a imagem.",
      );
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void processFile(event.dataTransfer.files[0]);
  }

  return (
    <div className="image-upload-field">
      <div className="image-upload-field__label">
        <strong>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </strong>
        <span>{recommendation}</span>
      </div>
      <div
        className={`image-upload image-upload--${variant}${dragging ? " image-upload--dragging" : ""}${visibleError ? " image-upload--error" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        aria-busy={uploading}
      >
        <div className="image-upload__preview">
          {value && !previewFailed ? (
            <img src={value} alt={alt} onError={() => setPreviewFailed(true)} />
          ) : (
            <ImageIcon size={32} aria-hidden="true" />
          )}
          {uploading ? (
            <span className="image-upload__progress">
              <Loader2 className="ds-spin" size={22} aria-hidden="true" />
              Enviando {uploadProgress}%
              <progress
                aria-label={`Progresso do upload de ${label}`}
                max={100}
                value={uploadProgress}
              />
            </span>
          ) : null}
          {value && onRemove && !uploading ? (
            <button
              type="button"
              className="image-upload__remove"
              aria-label={`Remover ${label.toLocaleLowerCase("pt-BR")}`}
              title="Remover imagem"
              disabled={disabled}
              onClick={onRemove}
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="image-upload__content">
          <div>
            <strong>{value ? "Substituir imagem" : "Adicionar imagem"}</strong>
            <span>PNG, JPG ou WebP, ate 8 MB</span>
          </div>
          <input
            ref={inputRef}
            id={inputId}
            className="image-upload__input"
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            disabled={disabled || uploading}
            onChange={(event) => void processFile(event.target.files?.[0])}
          />
          <button
            type="button"
            className="image-upload__button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <Upload size={16} aria-hidden="true" />
            Escolher arquivo
          </button>
          <span className="image-upload__drop-hint">
            ou arraste a imagem para esta area
          </span>
        </div>
      </div>
      {lastUpload && !visibleError ? (
        <p className="image-upload-field__success" role="status">
          <CheckCircle2 size={15} aria-hidden="true" />
          Upload concluido: {lastUpload.width} x {lastUpload.height}px,{" "}
          {formatImageSize(lastUpload.sizeBytes)}
        </p>
      ) : null}
      {visibleError ? (
        <p className="image-upload-field__error" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          {visibleError}
        </p>
      ) : null}
    </div>
  );
}
