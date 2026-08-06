import type { PropsWithChildren } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Variants,
} from "motion/react";

const easeOutQuart: [number, number, number, number] = [0.25, 1, 0.5, 1];
const easeOutQuint: [number, number, number, number] = [0.22, 1, 0.36, 1];
const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const motionTokens = {
  duration: {
    instant: 0.12,
    fast: 0.18,
    standard: 0.28,
    deliberate: 0.42,
    reveal: 0.72,
    entrance: 0.82,
  },
  easing: {
    outQuart: easeOutQuart,
    outQuint: easeOutQuint,
    outExpo: easeOutExpo,
  },
  distance: {
    page: 8,
    reveal: 24,
    editorial: 32,
    drawer: 12,
    card: 4,
  },
  stagger: {
    tight: 0.08,
    relaxed: 0.12,
  },
};

export type HomeMotionPreset =
  | "editorial"
  | "scroll"
  | "soft"
  | "cascade"
  | "structured"
  | "subtle"
  | "static";

export type HomeMotionIntensity = "subtle" | "balanced" | "expressive";

export function getHomeMotionVariants({
  enabled,
  preset,
  intensity,
}: {
  enabled: boolean;
  preset: HomeMotionPreset;
  intensity: HomeMotionIntensity;
}) {
  const active = enabled && preset !== "static";
  const intensityDistanceScale =
    intensity === "subtle" ? 0.68 : intensity === "expressive" ? 1.16 : 1;
  const presetDistanceScale =
    preset === "soft"
      ? 0.58
      : preset === "structured"
        ? 0.78
        : preset === "subtle"
          ? 0
          : preset === "editorial"
            ? 1.12
            : 1;
  const distanceScale = intensityDistanceScale * presetDistanceScale;
  const durationScale =
    preset === "soft"
      ? 1.08
      : preset === "subtle"
        ? 0.86
        : preset === "structured"
          ? 0.92
          : 1;
  const stagger =
    preset === "cascade"
      ? motionTokens.stagger.relaxed
      : preset === "scroll"
        ? 0
        : preset === "structured"
          ? motionTokens.stagger.tight
          : preset === "soft"
            ? 0.06
            : preset === "subtle"
              ? 0.04
              : 0.1;
  const duration = motionTokens.duration.reveal * durationScale;
  const entrance = motionTokens.duration.entrance * durationScale;
  const staggerDelay = (order: unknown) =>
    Math.min(Math.max(Number(order) || 0, 0), 3) * stagger;

  const hidden = (y: number) =>
    active ? { opacity: 0, y: y * distanceScale } : { opacity: 1, y: 0 };
  const visible = (customDuration = duration, delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: active ? delay : 0,
      duration: active ? customDuration : 0,
      ease: motionTokens.easing.outQuint,
    },
  });

  return {
    manifesto: {
      hidden: hidden(motionTokens.distance.editorial),
      visible: (order = 0) =>
        visible(entrance, preset === "cascade" ? staggerDelay(order) : 0),
    } satisfies Variants,
    navigationItem: {
      hidden: hidden(12),
      visible: (order = 0) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: active ? staggerDelay(order) : 0,
          duration: active ? duration * 0.9 : 0,
          ease: motionTokens.easing.outQuint,
        },
      }),
    } satisfies Variants,
    sectionContainer: {
      hidden: {},
      visible: { transition: { staggerChildren: active ? stagger : 0 } },
    } satisfies Variants,
    eyebrow: {
      hidden: active ? { opacity: 0 } : { opacity: 1 },
      visible: {
        opacity: 1,
        transition: {
          duration: active ? duration * 0.76 : 0,
          ease: motionTokens.easing.outQuart,
        },
      },
    } satisfies Variants,
    title: {
      hidden: hidden(16),
      visible: visible(duration),
    } satisfies Variants,
    action: {
      hidden: active
        ? { opacity: 0, x: -10 * distanceScale }
        : { opacity: 1, x: 0 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          duration: active ? duration * 0.88 : 0,
          ease: motionTokens.easing.outQuint,
        },
      },
    } satisfies Variants,
    card: {
      hidden: hidden(26),
      visible: (order = 0) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: active ? staggerDelay(order) : 0,
          duration: active ? duration : 0,
          ease: motionTokens.easing.outQuint,
        },
      }),
      hover: {
        y: active ? -motionTokens.distance.card : 0,
        transition: {
          duration: motionTokens.duration.fast,
          ease: motionTokens.easing.outQuart,
        },
      },
      exit: {
        opacity: 0,
        scale: 0.985,
        transition: {
          duration: motionTokens.duration.instant,
          ease: motionTokens.easing.outQuart,
        },
      },
      tap: {
        scale: 0.99,
        transition: {
          duration: motionTokens.duration.instant,
          ease: motionTokens.easing.outQuart,
        },
      },
    } satisfies Variants,
    footerContainer: {
      hidden: {},
      visible: { transition: { staggerChildren: active ? stagger : 0 } },
    } satisfies Variants,
    footerItem: {
      hidden: hidden(8),
      visible: visible(duration * 0.78),
    } satisfies Variants,
  };
}

export const scrollRevealViewport = {
  cards: {
    amount: 0.16,
    margin: "0px 0px -4% 0px",
    once: true,
  },
  text: {
    amount: 0.32,
    margin: "0px 0px -6% 0px",
    once: true,
  },
  editorialLead: {
    amount: 0.1,
    margin: "0px 0px -8% 0px",
    once: true,
  },
  editorialLine: {
    amount: 0.1,
    margin: "0px 0px -8% 0px",
    once: true,
  },
  homeLinks: {
    amount: 0.1,
    margin: "0px 0px -5% 0px",
    once: true,
  },
  homeSection: {
    amount: 0.1,
    margin: "0px 0px -5% 0px",
    once: true,
  },
  homeCards: {
    amount: 0.08,
    margin: "0px 0px -2% 0px",
    once: true,
  },
} as const;

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: motionTokens.duration.standard,
      ease: motionTokens.easing.outQuart,
    },
  },
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: motionTokens.distance.reveal },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.reveal,
      ease: motionTokens.easing.outQuint,
    },
  },
  exit: {
    opacity: 0,
    y: motionTokens.distance.page,
    transition: {
      duration: motionTokens.duration.instant,
      ease: motionTokens.easing.outQuart,
    },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.04,
      staggerChildren: motionTokens.stagger.tight,
    },
  },
};

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: motionTokens.distance.reveal },
  visible: (order = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay:
        Math.min(Math.max(Number(order) || 0, 0), 3) *
        motionTokens.stagger.tight,
      duration: motionTokens.duration.reveal,
      ease: motionTokens.easing.outQuint,
    },
  }),
  hover: {
    y: -motionTokens.distance.card,
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.easing.outQuart,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.985,
    transition: {
      duration: motionTokens.duration.instant,
      ease: motionTokens.easing.outQuart,
    },
  },
  tap: {
    scale: 0.99,
    transition: {
      duration: motionTokens.duration.instant,
      ease: motionTokens.easing.outQuart,
    },
  },
};

export const drawerVariants: Variants = {
  closed: {
    opacity: 0,
    y: -motionTokens.distance.drawer,
    transition: {
      duration: motionTokens.duration.instant,
      ease: motionTokens.easing.outQuart,
    },
  },
  open: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.standard,
      ease: motionTokens.easing.outExpo,
    },
  },
};

const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: motionTokens.distance.page },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.easing.outQuart,
    },
  },
  exit: {
    opacity: 0,
    y: 0,
    transition: {
      duration: motionTokens.duration.instant,
      ease: motionTokens.easing.outQuart,
    },
  },
};

export function MotionProvider({ children }: PropsWithChildren) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function PageTransition({
  routeKey,
  children,
}: PropsWithChildren<{ routeKey: string }>) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        className="ds-page-transition"
        variants={pageTransitionVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
