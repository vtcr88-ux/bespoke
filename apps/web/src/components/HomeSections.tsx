import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ManifestoItem, StorefrontSettings } from "@bespoke/contracts";
import {
  getHomeMotionVariants,
  scrollRevealViewport,
} from "@bespoke/design-system";
import {
  hasProductDropMotion,
  HeroProductDropScene,
} from "./HeroProductDropScene";

type HeroSectionProps = {
  eyebrow: string;
  eyebrowFontSize: number;
  title: string;
  titleFontSize: number;
  image: string;
  height: StorefrontSettings["heroHeight"];
  imagePosition?: CSSProperties["objectPosition"];
  contentAlignment?: "start" | "center" | "end";
  overlayOpacity?: number;
};

export function HeroSection({
  eyebrow,
  eyebrowFontSize,
  title,
  titleFontSize,
  image,
  height,
  imagePosition = "center",
  contentAlignment = "start",
  overlayOpacity = 1,
}: HeroSectionProps) {
  const productDropMotion = hasProductDropMotion(image);
  const visibleEyebrow = eyebrow.trim();
  const visibleTitle = title.trim();

  return (
    <section
      className={`hero hero--${height} hero--align-${contentAlignment}${
        productDropMotion ? " hero--product-drop" : ""
      }${visibleEyebrow || visibleTitle ? " hero--has-content" : ""}`}
      style={
        {
          "--hero-eyebrow-font-size": `${eyebrowFontSize}px`,
          "--hero-title-font-size": `${titleFontSize}px`,
        } as CSSProperties
      }
    >
      {productDropMotion ? (
        <HeroProductDropScene image={image} />
      ) : (
        <img
          alt=""
          aria-hidden="true"
          className="hero__media"
          decoding="async"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
          src={image}
          style={{ objectPosition: imagePosition }}
        />
      )}
      <div
        aria-hidden="true"
        className="hero__veil"
        style={{ opacity: Math.min(Math.max(overlayOpacity, 0.45), 1) }}
      />
      {visibleEyebrow || visibleTitle ? (
        <div className="hero__content">
          {visibleEyebrow ? (
            <span className="hero__eyebrow">{visibleEyebrow}</span>
          ) : null}
          {visibleTitle ? <h1>{visibleTitle}</h1> : null}
        </div>
      ) : null}
    </section>
  );
}

type EditorialStatementProps = {
  items: ManifestoItem[];
  maxWidth: number;
  divider: StorefrontSettings["manifestoDivider"];
  motionEnabled: boolean;
  motionPreset: StorefrontSettings["homeMotionPreset"];
  motionIntensity: StorefrontSettings["homeMotionIntensity"];
};

export function EditorialStatement({
  items,
  maxWidth,
  divider,
  motionEnabled,
  motionPreset,
  motionIntensity,
}: EditorialStatementProps) {
  const reducedMotion = useReducedMotion();
  const variants = getHomeMotionVariants({
    enabled: motionEnabled,
    preset: motionPreset,
    intensity: motionIntensity,
  });
  const visibleItems = items.filter(
    (item) => item.enabled && item.content.trim(),
  );

  if (!visibleItems.length) return null;

  return (
    <section
      className={`editorial-statement editorial-statement--divider-${divider}`}
      style={{ "--manifesto-max-width": `${maxWidth}px` } as CSSProperties}
    >
      <div className="editorial-statement__visual">
        {visibleItems.map((item, index) => {
          const Component = item.type === "headline" ? motion.h2 : motion.p;
          return (
            <Component
              className={`editorial-statement__line editorial-statement__line--${item.type} editorial-statement__line--${item.emphasis} editorial-statement__line--${item.alignment}`}
              custom={index}
              initial={reducedMotion ? false : "hidden"}
              key={item.id}
              variants={variants.manifesto}
              viewport={
                index === 0
                  ? scrollRevealViewport.editorialLead
                  : scrollRevealViewport.editorialLine
              }
              whileInView="visible"
            >
              {item.content}
            </Component>
          );
        })}
      </div>
    </section>
  );
}

export type EditorialNavigationItem = {
  label: string;
  to: string;
};

export function EditorialNavigation({
  items,
  ariaLabel,
  mobileEnabled,
  motionEnabled,
  motionPreset,
  motionIntensity,
}: {
  items: EditorialNavigationItem[];
  ariaLabel: string;
  mobileEnabled: boolean;
  motionEnabled: boolean;
  motionPreset: StorefrontSettings["homeMotionPreset"];
  motionIntensity: StorefrontSettings["homeMotionIntensity"];
}) {
  const reducedMotion = useReducedMotion();
  const navigationRef = useRef<HTMLElement>(null);
  const [passedRevealPoint, setPassedRevealPoint] = useState(false);
  const variants = getHomeMotionVariants({
    enabled: motionEnabled,
    preset: motionPreset,
    intensity: motionIntensity,
  });
  const visibleItems = items.filter((item) => item.label.trim());

  useEffect(() => {
    if (passedRevealPoint || reducedMotion) return;

    const checkPosition = () => {
      const navigation = navigationRef.current;
      if (!navigation) return;
      if (navigation.getBoundingClientRect().top <= window.innerHeight * 0.78) {
        setPassedRevealPoint(true);
      }
    };
    const frame = window.requestAnimationFrame(checkPosition);
    window.addEventListener("scroll", checkPosition, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", checkPosition);
    };
  }, [passedRevealPoint, reducedMotion]);

  if (!visibleItems.length) return null;

  return (
    <nav
      ref={navigationRef}
      aria-label={ariaLabel}
      className="home-editorial-nav"
      data-mobile-enabled={mobileEnabled}
    >
      {visibleItems.map((item, index) => (
        <motion.div
          custom={index}
          animate={passedRevealPoint ? "visible" : undefined}
          initial={reducedMotion ? false : "hidden"}
          key={item.to}
          variants={variants.navigationItem}
          viewport={scrollRevealViewport.homeLinks}
          whileInView="visible"
        >
          <Link to={item.to}>
            <span>{item.label}</span>
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </motion.div>
      ))}
    </nav>
  );
}

export function FeaturedCollectionHeading({
  eyebrow,
  title,
  actionLabel,
  actionTo,
  motionEnabled,
  motionPreset,
  motionIntensity,
}: {
  eyebrow: string;
  title: string;
  actionLabel: string;
  actionTo: string;
  motionEnabled: boolean;
  motionPreset: StorefrontSettings["homeMotionPreset"];
  motionIntensity: StorefrontSettings["homeMotionIntensity"];
}) {
  const reducedMotion = useReducedMotion();
  const variants = getHomeMotionVariants({
    enabled: motionEnabled,
    preset: motionPreset,
    intensity: motionIntensity,
  });

  return (
    <motion.div
      className="section-heading section-heading--featured"
      initial={reducedMotion ? false : "hidden"}
      variants={variants.sectionContainer}
      viewport={scrollRevealViewport.homeSection}
      whileInView="visible"
    >
      <div className="section-heading__copy">
        {eyebrow.trim() ? (
          <motion.p variants={variants.eyebrow}>
            <Star aria-hidden="true" size={14} />
            <span>{eyebrow}</span>
          </motion.p>
        ) : null}
        {title.trim() ? (
          <motion.h2 variants={variants.title}>{title}</motion.h2>
        ) : null}
      </div>
      {actionLabel.trim() ? (
        <motion.div variants={variants.action}>
          <Link className="store-button store-button--ghost" to={actionTo}>
            <span>{actionLabel}</span>
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
