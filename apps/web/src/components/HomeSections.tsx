import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Pause, Play, Star } from "lucide-react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import type { ManifestoItem, StorefrontSettings } from "@bespoke/contracts";
import {
  getHomeMotionVariants,
  scrollRevealViewport,
} from "@bespoke/design-system";
import {
  hasProductDropMotion,
  HeroProductDropScene,
} from "./HeroProductDropScene";
import { useStorefrontPreviewMedia } from "../lib/storefront-preview-media";

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
  const previewMedia = useStorefrontPreviewMedia(image);
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
      ) : previewMedia.url ? (
        <img
          alt=""
          aria-hidden="true"
          className="hero__media"
          decoding="async"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
          src={previewMedia.url}
          style={{ objectPosition: imagePosition }}
        />
      ) : null}
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
  mobileDividerEnabled: boolean;
  motionEnabled: boolean;
  motionPreset: StorefrontSettings["homeMotionPreset"];
  motionIntensity: StorefrontSettings["homeMotionIntensity"];
};

export function EditorialStatement({
  items,
  maxWidth,
  divider,
  mobileDividerEnabled,
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
      data-mobile-divider-enabled={mobileDividerEnabled}
      style={{ "--manifesto-max-width": `${maxWidth}px` } as CSSProperties}
    >
      <div className="editorial-statement__visual">
        {visibleItems.map((item, index) => {
          const Component = item.type === "headline" ? motion.h2 : motion.p;
          return (
            <Component
              className={`editorial-statement__line editorial-statement__line--${item.type} editorial-statement__line--${item.emphasis} editorial-statement__line--${item.alignment} editorial-statement__line--font-${item.fontFamily}`}
              custom={index}
              initial={reducedMotion ? false : "hidden"}
              key={item.id}
              style={
                {
                  "--manifesto-item-size": item.fontSize
                    ? `${item.fontSize}px`
                    : undefined,
                  "--manifesto-item-space": `${item.spacingAfter}px`,
                } as CSSProperties
              }
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

type ReviewsSectionProps = {
  eyebrow: string;
  items: StorefrontSettings["reviewsItems"];
  motionEnabled: boolean;
  motionIntensity: StorefrontSettings["homeMotionIntensity"];
  motionPreset: StorefrontSettings["homeMotionPreset"];
  speedSeconds: number;
  title: string;
};

export function ReviewsSection({
  eyebrow,
  items,
  motionEnabled,
  motionIntensity,
  motionPreset,
  speedSeconds,
  title,
}: ReviewsSectionProps) {
  const reducedMotion = useReducedMotion();
  const trackX = useMotionValue(0);
  const sectionRef = useRef<HTMLElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const [loopWidth, setLoopWidth] = useState(0);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const inView = useInView(sectionRef, { amount: 0.05 });
  const variants = getHomeMotionVariants({
    enabled: motionEnabled,
    preset: motionPreset,
    intensity: motionIntensity,
  });
  const visibleItems = items.filter(
    (item) => item.enabled && item.author.trim() && item.content.trim(),
  );
  const paused = Boolean(
    reducedMotion || !inView || interactionPaused || userPaused,
  );

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const measure = () => {
      const width = group.getBoundingClientRect().width;
      setLoopWidth(width);
      trackX.set(0);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    measure();
    return () => observer.disconnect();
  }, [trackX, visibleItems.length]);

  useAnimationFrame((_, delta) => {
    if (paused || loopWidth <= 0) return;
    const pixelsPerSecond = loopWidth / speedSeconds;
    let next = trackX.get() - (pixelsPerSecond * delta) / 1000;
    if (next <= -loopWidth) next += loopWidth;
    trackX.set(next);
  });

  if (!visibleItems.length) return null;

  const renderItems = (duplicate: boolean) =>
    visibleItems.map((item) => (
      <article
        className="review-card"
        key={`${duplicate ? "copy" : "item"}-${item.id}`}
        role={duplicate ? undefined : "listitem"}
      >
        <div
          aria-label={`${item.rating} de 5 estrelas`}
          className="review-card__rating"
          role="img"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              aria-hidden="true"
              fill={index < item.rating ? "currentColor" : "none"}
              key={index}
              size={15}
            />
          ))}
        </div>
        <blockquote>{item.content}</blockquote>
        <footer>
          <strong>{item.author}</strong>
          {item.context ? <span>{item.context}</span> : null}
        </footer>
      </article>
    ));

  return (
    <section
      aria-label={title.trim() ? undefined : "Avaliacoes"}
      aria-labelledby={title.trim() ? "reviews-title" : undefined}
      className="reviews-section"
      ref={sectionRef}
    >
      <motion.div
        className="reviews-section__heading"
        initial={reducedMotion ? false : "hidden"}
        variants={variants.sectionContainer}
        viewport={scrollRevealViewport.homeSection}
        whileInView="visible"
      >
        <div>
          {eyebrow.trim() ? (
            <motion.p variants={variants.eyebrow}>{eyebrow}</motion.p>
          ) : null}
          {title.trim() ? (
            <motion.h2 id="reviews-title" variants={variants.title}>
              {title}
            </motion.h2>
          ) : null}
        </div>
        {!reducedMotion ? (
          <button
            aria-pressed={userPaused}
            className="reviews-carousel__control"
            type="button"
            onClick={() => setUserPaused((current) => !current)}
          >
            {userPaused ? (
              <Play aria-hidden="true" size={16} />
            ) : (
              <Pause aria-hidden="true" size={16} />
            )}
            <span>{userPaused ? "Continuar" : "Pausar"}</span>
          </button>
        ) : null}
      </motion.div>
      <div
        className="reviews-carousel"
        data-paused={paused ? "true" : "false"}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setInteractionPaused(false);
        }}
        onFocusCapture={() => setInteractionPaused(true)}
        onMouseEnter={() => setInteractionPaused(true)}
        onMouseLeave={() => setInteractionPaused(false)}
      >
        <motion.div
          className="reviews-carousel__track"
          style={reducedMotion ? undefined : { x: trackX }}
        >
          <div className="reviews-carousel__group" ref={groupRef} role="list">
            {renderItems(false)}
          </div>
          {!reducedMotion ? (
            <div aria-hidden="true" className="reviews-carousel__group">
              {renderItems(true)}
            </div>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
