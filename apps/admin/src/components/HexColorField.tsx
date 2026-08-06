import { useEffect, useId, useState } from "react";
import {
  HEX_COLOR_PATTERN,
  isValidHexColor,
  normalizeHexColorInput,
} from "../lib/hex-color";

export function HexColorField({
  label,
  value,
  disabled = false,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const fieldId = useId();
  const descriptionId = `${fieldId}-description`;
  const labelId = `${fieldId}-label`;
  const [draft, setDraft] = useState(() => normalizeHexColorInput(value));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setDraft(normalizeHexColorInput(value));
    setTouched(false);
  }, [value]);

  const invalid = !disabled && !isValidHexColor(draft);
  const showError = invalid && (touched || draft.length >= 7);

  const updateDraft = (nextValue: string) => {
    const normalizedValue = normalizeHexColorInput(nextValue);
    setDraft(normalizedValue);

    if (isValidHexColor(normalizedValue)) {
      onChange(normalizedValue.toLowerCase());
    }
  };

  return (
    <div
      className="hex-color-field"
      data-disabled={disabled || undefined}
      data-invalid={showError || undefined}
    >
      <span className="hex-color-field__label" id={labelId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <div className="hex-color-field__controls">
        <input
          aria-describedby={labelId}
          aria-label="Selecionar cor visualmente"
          className="hex-color-field__picker"
          disabled={disabled}
          type="color"
          value={isValidHexColor(value) ? value : "#000000"}
          onChange={(event) => updateDraft(event.target.value)}
        />
        <input
          aria-describedby={descriptionId}
          aria-invalid={showError}
          aria-label={label}
          autoCapitalize="characters"
          autoComplete="off"
          className="hex-color-field__input"
          disabled={disabled}
          inputMode="text"
          maxLength={7}
          pattern={HEX_COLOR_PATTERN.source}
          placeholder="#C9A76D"
          required={required && !disabled}
          spellCheck={false}
          type="text"
          value={draft}
          onBlur={() => setTouched(true)}
          onChange={(event) => updateDraft(event.target.value)}
        />
      </div>
      <small id={descriptionId}>
        {showError
          ? "Informe uma cor com # e seis digitos, como #C9A76D."
          : "Codigo hexadecimal no formato #RRGGBB."}
      </small>
    </div>
  );
}
