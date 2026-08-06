import { Fragment, memo, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { motionTokens } from "@bespoke/design-system";
import heroProductBackground from "../assets/hero-product-background.png";

type HeroProductDropSceneProps = {
  image: string;
};

type SceneBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ProductDropConfig = {
  id: "left" | "center" | "right";
  delay: number;
  mass: number;
  bounds: SceneBounds;
  shadowBounds: SceneBounds;
};

type ProductDropMotion = ProductDropConfig & {
  distance: number;
};

const productClipPaths: Record<ProductDropConfig["id"], string> = {
  left: "M415 218C382 218 358 222 352 229C351 231 351 234 351 238V270C351 277 354 280 360 282V296C344 305 336 322 336 346V628C336 651 347 662 369 665C422 668 520 668 568 665C587 662 596 650 596 628V346C596 322 587 305 572 296V282C577 280 579 276 579 270V236C579 228 555 221 510 218C480 216 444 216 415 218Z",
  center:
    "M724 271C691 271 666 273 651 276C628 280 616 285 616 293V310C616 317 619 321 625 324V631C625 654 636 664 658 666C714 668 829 668 864 666C892 664 906 653 906 631V324C906 321 906 317 906 310V293C906 284 894 280 870 276C832 270 763 269 724 271Z",
  right:
    "M981 255C1035 249 1139 249 1188 255C1218 258 1233 263 1233 271V293C1233 301 1230 306 1227 309V628C1227 651 1215 662 1192 665C1134 668 1018 668 976 665C946 662 932 651 932 628V309C932 306 932 301 932 293V271C932 263 948 258 981 255Z",
};

const productDropConfigs: ProductDropConfig[] = [
  {
    id: "left",
    delay: 0.04,
    mass: 1.16,
    bounds: { left: 332, top: 212, width: 268, height: 455 },
    shadowBounds: { left: 270, top: 668, width: 392, height: 210 },
  },
  {
    id: "center",
    delay: 0,
    mass: 1.24,
    bounds: { left: 612, top: 264, width: 297, height: 403 },
    shadowBounds: { left: 548, top: 668, width: 425, height: 210 },
  },
  {
    id: "right",
    delay: 0.06,
    mass: 1.2,
    bounds: { left: 930, top: 240, width: 310, height: 427 },
    shadowBounds: { left: 845, top: 668, width: 480, height: 210 },
  },
];

const heroSourceWidth = 1536;
const heroSourceHeight = 878;
const productSpring = {
  type: "spring" as const,
  stiffness: 64,
  damping: 26,
  velocity: 0,
  restDelta: 0.5,
  restSpeed: 1,
};

const productDropVariants: Variants = {
  hidden: ({ distance }: ProductDropMotion) => ({
    opacity: 0,
    y: -distance,
    transition: { duration: 0 },
  }),
  visible: ({ delay, mass }: ProductDropMotion) => ({
    opacity: 1,
    y: 0,
    transition: {
      opacity: {
        delay,
        duration: motionTokens.duration.deliberate,
        ease: motionTokens.easing.outQuart,
      },
      y: {
        ...productSpring,
        delay,
        mass,
      },
    },
  }),
  rest: { opacity: 1, y: 0 },
};

const productShadowVariants: Variants = {
  hidden: { opacity: 0, scaleX: 0.58, scaleY: 0.42 },
  visible: ({ delay }: ProductDropMotion) => ({
    opacity: [0, 0.72, 1],
    scaleX: [0.58, 1.04, 1],
    scaleY: [0.42, 0.94, 1],
    transition: {
      delay: delay + 1.28,
      duration: 0.55,
      ease: motionTokens.easing.outQuart,
      times: [0, 0.72, 1],
    },
  }),
  rest: { opacity: 1, scaleX: 1, scaleY: 1 },
};

let heroProductEntranceConsumed = false;

function addImagePreload(source: string) {
  const existing = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>(
      'link[rel="preload"][as="image"]',
    ),
  ).find((link) => link.href === new URL(source, document.baseURI).href);

  if (existing) return () => undefined;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = source;
  link.setAttribute("fetchpriority", "high");
  document.head.append(link);

  return () => link.remove();
}

function decodeImage(image: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    const decodeLoadedImage = () => {
      if (typeof image.decode !== "function") {
        resolve();
        return;
      }

      image
        .decode()
        .then(resolve)
        .catch(() => {
          if (image.complete && image.naturalWidth > 0) resolve();
          else
            reject(
              new Error(`Nao foi possivel decodificar ${image.currentSrc}`),
            );
        });
    };

    if (image.complete) {
      if (image.naturalWidth > 0) decodeLoadedImage();
      else reject(new Error(`Nao foi possivel carregar ${image.currentSrc}`));
      return;
    }

    image.addEventListener("load", decodeLoadedImage, { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error(`Nao foi possivel carregar ${image.currentSrc}`)),
      { once: true },
    );
  });
}

export function hasProductDropMotion(image: string) {
  try {
    return (
      new URL(image, "https://bespoke.local").searchParams.get("motion") ===
      "product-drop"
    );
  } catch {
    return false;
  }
}

function initialDropDistance() {
  if (typeof window === "undefined") return 560;
  if (window.innerHeight <= 500 && window.innerWidth > 760) return 260;
  if (window.innerWidth <= 760) return Math.min(360, window.innerHeight * 0.58);
  return Math.min(640, window.innerHeight * 0.76);
}

function ProductImage({
  id,
  image,
  bounds,
}: {
  id: ProductDropConfig["id"];
  image: string;
  bounds: ProductDropConfig["bounds"];
}) {
  const clipId = `hero-product-clip-${id}`;

  return (
    <svg
      aria-hidden="true"
      className="hero__product-image"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`}
    >
      <defs>
        <clipPath clipPathUnits="userSpaceOnUse" id={clipId}>
          <path d={productClipPaths[id]} />
        </clipPath>
      </defs>
      <image
        clipPath={`url(#${clipId})`}
        height="878"
        href={image}
        preserveAspectRatio="xMidYMid meet"
        width="1536"
      />
    </svg>
  );
}

function ProductShadowImage({
  image,
  bounds,
}: {
  image: string;
  bounds: ProductDropConfig["shadowBounds"];
}) {
  return (
    <svg
      className="hero__product-shadow-image"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`}
    >
      <image
        height={heroSourceHeight}
        href={image}
        preserveAspectRatio="xMidYMid meet"
        width={heroSourceWidth}
      />
    </svg>
  );
}

export const HeroProductDropScene = memo(function HeroProductDropScene({
  image,
}: HeroProductDropSceneProps) {
  const reducedMotion = useReducedMotion();
  const playEntrance = useRef(!heroProductEntranceConsumed);
  const dropDistance = useRef(initialDropDistance());
  const backgroundRef = useRef<HTMLImageElement>(null);
  const sourceRef = useRef<HTMLImageElement>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [settled, setSettled] = useState(!playEntrance.current);
  const shouldAnimate = playEntrance.current && !reducedMotion;
  const productState = shouldAnimate
    ? mediaReady
      ? "visible"
      : "hidden"
    : "rest";
  const motionState = mediaFailed
    ? "failed"
    : !mediaReady
      ? "loading"
      : settled || !shouldAnimate
        ? "settled"
        : "running";

  useEffect(() => {
    if (!playEntrance.current) return;
    heroProductEntranceConsumed = true;
  }, []);

  useEffect(() => {
    if (reducedMotion) setSettled(true);
  }, [reducedMotion]);

  useEffect(() => {
    const removePreloads = [
      addImagePreload(heroProductBackground),
      addImagePreload(image),
    ];
    const background = backgroundRef.current;
    const source = sourceRef.current;
    let active = true;

    setMediaReady(false);
    setMediaFailed(false);
    setSettled(!shouldAnimate);
    if (!background || !source) return () => undefined;

    Promise.all([decodeImage(background), decodeImage(source)])
      .then(() => {
        if (active) setMediaReady(true);
      })
      .catch(() => {
        if (!active) return;
        setMediaFailed(true);
        setMediaReady(true);
        setSettled(true);
      });

    return () => {
      active = false;
      removePreloads.forEach((remove) => remove());
    };
  }, [image, shouldAnimate]);

  return (
    <div
      aria-hidden="true"
      className="hero__product-stage"
      data-motion-state={motionState}
    >
      <img
        alt=""
        className="hero__product-background"
        decoding="async"
        loading="eager"
        ref={backgroundRef}
        src={heroProductBackground}
      />
      <img
        alt=""
        className="hero__product-source-preload"
        decoding="async"
        loading="eager"
        ref={sourceRef}
        src={image}
      />

      {!mediaFailed ? (
        <div className="hero__product-frame">
          <div className="hero__product-motion">
            {productDropConfigs.map((product) => {
              const custom: ProductDropMotion = {
                ...product,
                distance: dropDistance.current,
              };
              const isLastProduct = product.id === "right";

              return (
                <Fragment key={product.id}>
                  <span
                    className="hero__product-shadow-anchor"
                    data-motion-product={product.id}
                    style={{
                      height: `${(product.shadowBounds.height / heroSourceHeight) * 100}%`,
                      left: `${(product.shadowBounds.left / heroSourceWidth) * 100}%`,
                      top: `${(product.shadowBounds.top / heroSourceHeight) * 100}%`,
                      width: `${(product.shadowBounds.width / heroSourceWidth) * 100}%`,
                    }}
                  >
                    <motion.span
                      animate={productState}
                      className="hero__product-shadow"
                      custom={custom}
                      initial={shouldAnimate ? "hidden" : false}
                      variants={productShadowVariants}
                    >
                      <ProductShadowImage
                        bounds={product.shadowBounds}
                        image={image}
                      />
                    </motion.span>
                  </span>
                  <motion.div
                    animate={productState}
                    className="hero__product-drop"
                    custom={custom}
                    data-motion-delay={product.delay}
                    data-motion-product={product.id}
                    initial={shouldAnimate ? "hidden" : false}
                    onAnimationComplete={(definition) => {
                      if (
                        shouldAnimate &&
                        isLastProduct &&
                        definition === "visible"
                      ) {
                        setSettled(true);
                      }
                    }}
                    style={{
                      height: `${(product.bounds.height / heroSourceHeight) * 100}%`,
                      left: `${(product.bounds.left / heroSourceWidth) * 100}%`,
                      top: `${(product.bounds.top / heroSourceHeight) * 100}%`,
                      willChange:
                        shouldAnimate && !settled
                          ? "transform, opacity"
                          : "auto",
                      width: `${(product.bounds.width / heroSourceWidth) * 100}%`,
                    }}
                    variants={productDropVariants}
                  >
                    <ProductImage
                      bounds={product.bounds}
                      id={product.id}
                      image={image}
                    />
                  </motion.div>
                </Fragment>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
});
