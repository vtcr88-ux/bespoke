import { Loader2 } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { clsx } from "clsx";
import "./tokens.css";
import "./ui.css";

export {
  MotionProvider,
  PageTransition,
  cardVariants,
  drawerVariants,
  fadeInVariants,
  fadeUpVariants,
  getHomeMotionVariants,
  motionTokens,
  scrollRevealViewport,
  staggerContainerVariants,
} from "./motion.js";
export type { HomeMotionIntensity, HomeMotionPreset } from "./motion.js";
export { accessibleTextColor } from "./color.js";
export {
  normalizeLogoImage,
  resetNormalizedLogo,
  updateNormalizedLogoLayout,
} from "./logo.js";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx("ds-button", `ds-button--${variant}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="ds-spin" size={16} />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & PropsWithChildren<{ label: string }>
>(function IconButton({ label, className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={clsx("ds-icon-button", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
});

export function Badge({
  tone = "neutral",
  children,
}: PropsWithChildren<{ tone?: "neutral" | "success" | "warning" | "danger" }>) {
  return (
    <span className={clsx("ds-badge", `ds-badge--${tone}`)}>{children}</span>
  );
}

export function TextField({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const errorId = error ? `${props.id ?? props.name}-error` : undefined;
  return (
    <label className="ds-field">
      <span>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        {...props}
      />
      {error ? <small id={errorId}>{error}</small> : null}
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> &
  PropsWithChildren<{ label: string }>) {
  return (
    <label className="ds-field">
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={clsx("ds-skeleton", className)} aria-hidden="true" />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <section className="ds-empty" aria-live="polite">
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}
