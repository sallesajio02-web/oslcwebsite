import { useId, type CSSProperties, type ReactNode } from "react";

export interface EffectOptions {
  intensity?: number;
  size?: number;
  speed?: number;
  visible?: boolean;
  className?: string;
}
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
function style(options: EffectOptions, size: number): CSSProperties {
  return {
    "--effect-intensity": clamp(options.intensity ?? 0.65, 0, 1),
    "--effect-size": clamp(options.size ?? size, 1, 1200) + "px",
    "--effect-speed": clamp(options.speed ?? 1, 0.25, 3),
    "--effect-cycle": 12 / clamp(options.speed ?? 1, 0.25, 3) + "s",
  } as CSSProperties;
}
const enabled = (options: EffectOptions) =>
  options.visible !== false && options.intensity !== 0;

/** Shaded SVG petals, not a product or facility image. No interactive content. */
export function FlowerBloom(options: EffectOptions) {
  const id = useId().replaceAll(":", "");
  if (!enabled(options)) return null;
  const petals = [
    ...Array.from({ length: 8 }, (_, i) => ({ angle: i * 45, inner: false })),
    ...Array.from({ length: 5 }, (_, i) => ({
      angle: i * 72 + 18,
      inner: true,
    })),
  ];
  return (
    <span
      className={"flower-bloom " + (options.className || "")}
      style={style(options, 96)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 180 180" focusable="false">
        <defs>
          <radialGradient id={id + "petal"} cx="35%" cy="20%" r="85%">
            <stop stopColor="#fffef9" />
            <stop offset=".5" stopColor="#f0e9dc" />
            <stop offset=".86" stopColor="#d4c7b6" />
            <stop offset="1" stopColor="#9d9488" />
          </radialGradient>
          <radialGradient id={id + "heart"}>
            <stop stopColor="#f2e6c8" />
            <stop offset=".65" stopColor="#b6a27d" />
            <stop offset="1" stopColor="#655c4e" />
          </radialGradient>
        </defs>
        <g className="flower-sway">
          <path
            className="flower-stem"
            d="M89 155 Q103 122 91 92 M94 128 Q119 113 126 126 Q111 140 94 128 M92 139 Q68 122 62 133 Q73 146 92 139"
            fill="#b8bbae"
            stroke="#939d8f"
            strokeWidth="1"
          />
          <g transform="translate(90 86)">
            {petals.map((petal, i) => (
              <g key={i} transform={`rotate(${petal.angle})`}>
                <g
                  className={"flower-petal" + (petal.inner ? " inner" : "")}
                  style={{ "--petal-delay": i * 0.055 + "s" } as CSSProperties}
                >
                  <path
                    d={
                      petal.inner
                        ? "M0 7 C-22 -1 -27 -27 -13 -39 C-4 -47 12 -39 18 -27 C26 -10 14 4 0 7Z"
                        : "M0 10 C-25 -2 -35 -36 -24 -54 C-17 -68 10 -68 24 -54 C39 -36 26 -2 0 10Z"
                    }
                    fill={`url(#${id}petal)`}
                    stroke="#a79c8e"
                    strokeOpacity=".15"
                    strokeWidth=".6"
                  />
                  <path
                    d={
                      petal.inner ? "M0 2 Q-4 -17 0 -35" : "M0 2 Q-4 -29 0 -57"
                    }
                    fill="none"
                    stroke="#fffef7"
                    strokeOpacity=".62"
                    strokeWidth=".8"
                  />
                </g>
              </g>
            ))}
            <circle className="flower-heart" r="10" fill={`url(#${id}heart)`} />
            {Array.from({ length: 7 }, (_, i) => (
              <circle
                key={i}
                cx={Math.cos(i * 0.9) * 6}
                cy={Math.sin(i * 0.9) * 6}
                r="1"
                fill="#e9dcc0"
              />
            ))}
          </g>
        </g>
      </svg>
    </span>
  );
}

export function FloatingPetals(options: EffectOptions & { count?: number }) {
  if (!enabled(options)) return null;
  const count = Math.round(clamp(options.count ?? 3, 1, 5));
  return (
    <span
      className={"floating-petals " + (options.className || "")}
      style={style(options, 16)}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          className="floating-petal"
          key={i}
          style={
            {
              "--petal-x": 12 + i * 29 + "%",
              "--petal-y": 10 + i * 11 + "%",
              "--drift": (i % 2 ? -1 : 1) * (18 + i * 6) + "px",
              animationDelay: -(i * 2.9) + "s",
              animationDuration:
                (13 + i * 2) / clamp(options.speed ?? 1, 0.25, 3) + "s",
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function ParticleField(
  options: EffectOptions & { count?: number; playful?: boolean },
) {
  if (!enabled(options)) return null;
  const count = Math.round(clamp(options.count ?? 7, 1, 12));
  return (
    <span
      className={
        "particle-field " +
        (options.playful ? " playful " : " ") +
        (options.className || "")
      }
      style={style(options, 4)}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          className="ambient-particle"
          key={i}
          style={
            {
              left: ((i * 37 + 13) % 94) + "%",
              top: ((i * 29 + 19) % 76) + "%",
              "--drift": (i % 2 ? -1 : 1) * (10 + i * 2) + "px",
              animationDelay: -(i * 1.7) + "s",
              animationDuration:
                (8 + (i % 4) * 2) / clamp(options.speed ?? 1, 0.25, 3) + "s",
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function FabricWave(
  options: EffectOptions & { tone?: "light" | "navy" },
) {
  const id = useId().replaceAll(":", "");
  if (!enabled(options)) return null;
  return (
    <span
      className={
        "fabric-wave " +
        (options.tone === "navy" ? "navy " : "") +
        (options.className || "")
      }
      style={style(options, 100)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1440 180" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id={id + "silk"} x1="0" y1="0" x2="0" y2="1">
            <stop
              stopColor={options.tone === "navy" ? "#234363" : "#d8d4cb"}
              stopOpacity=".12"
            />
            <stop
              offset=".5"
              stopColor={options.tone === "navy" ? "#5c7892" : "#ffffff"}
              stopOpacity=".85"
            />
            <stop
              offset="1"
              stopColor={options.tone === "navy" ? "#142b4a" : "#bcb5a7"}
              stopOpacity=".2"
            />
          </linearGradient>
        </defs>
        <path
          className="fabric-ribbon ribbon-one"
          d="M-60 87 C180 8 290 166 550 86 S1020 8 1500 89 L1500 140 C1120 63 970 181 710 129 S170 66 -60 138Z"
          fill={`url(#${id}silk)`}
        />
        <path
          className="fabric-ribbon ribbon-two"
          d="M-60 115 C190 28 370 163 660 94 S1110 39 1500 103 L1500 135 C1110 66 880 168 660 125 S160 66 -60 150Z"
          fill={`url(#${id}silk)`}
        />
        <path
          className="fabric-thread"
          d="M-50 98 C210 16 350 159 640 88 S1110 28 1490 105"
          fill="none"
          stroke={options.tone === "navy" ? "#8ea4b9" : "#b9ae9c"}
          strokeOpacity=".45"
          strokeWidth="1.4"
        />
      </svg>
    </span>
  );
}

export function TextReveal({
  text,
  load = false,
  ...options
}: EffectOptions & { text: string; load?: boolean }) {
  if (options.visible === false) return null;
  return (
    <span
      className={
        "text-reveal " +
        (load ? "text-reveal-load " : "") +
        (options.className || "")
      }
      style={
        {
          "--word-duration": 0.65 / clamp(options.speed ?? 1, 0.25, 3) + "s",
        } as CSSProperties
      }
    >
      <span className="reveal-readable">{text}</span>
      <span aria-hidden="true">
        {text.split(/\s+/).map((word, i) => (
          <span key={i}>
            <span className="word-mask">
              <span
                className="reveal-word"
                style={
                  {
                    "--word-delay": Math.min(i * 32, 210) + "ms",
                  } as CSSProperties
                }
              >
                {word}
              </span>
            </span>{" "}
          </span>
        ))}
      </span>
    </span>
  );
}

export function AnimatedReveal({
  children,
  ...options
}: EffectOptions & { children: ReactNode }) {
  if (options.visible === false) return null;
  return (
    <div
      className={"animated-reveal " + (options.className || "")}
      style={style(options, 100)}
    >
      {children}
    </div>
  );
}

export function CreativeScene({
  variant = "hero",
  fabricImage,
  ...options
}: EffectOptions & {
  variant?: "hero" | "men" | "women" | "kids" | "bloom";
  fabricImage?: string;
}) {
  if (!enabled(options)) return null;
  return (
    <div
      className={
        "ambient-zone creative-scene creative-" +
        variant +
        " " +
        (options.className || "")
      }
      style={style(options, 120)}
      aria-hidden="true"
    >
      {variant === "hero" && (
        <>
          {fabricImage && (
            <span
              className="hero-fabric-texture"
              style={{ backgroundImage: `url("${fabricImage}")` }}
            />
          )}
          <FabricWave {...options} />
          <ParticleField {...options} size={3} count={7} />
        </>
      )}
      {variant === "men" && <FabricWave {...options} tone="navy" />}
      {(variant === "women" || variant === "bloom") && (
        <>
          <FlowerBloom {...options} />
          <FloatingPetals {...options} size={13} count={3} />
        </>
      )}
      {variant === "kids" && (
        <ParticleField {...options} size={8} count={5} playful />
      )}
    </div>
  );
}

export function SectionTransition({
  variant = "fabric",
  ...options
}: EffectOptions & { variant?: "fabric" | "stitch" }) {
  if (!enabled(options)) return null;
  return (
    <div
      className={
        "ambient-zone section-transition transition-" +
        variant +
        " " +
        (options.className || "")
      }
      style={style(options, 76)}
      aria-hidden="true"
    >
      {variant === "fabric" ? (
        <FabricWave {...options} />
      ) : (
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" focusable="false">
          <path
            className="stitch-draw"
            d="M0 30 C200 2 300 58 600 30 S1000 2 1200 30"
            fill="none"
            stroke="#142b4a"
            strokeOpacity=".28"
            strokeWidth="1"
          />
          <path
            className="stitch-draw secondary"
            d="M0 36 C200 8 300 64 600 36 S1000 8 1200 36"
            fill="none"
            stroke="#687386"
            strokeOpacity=".3"
            strokeWidth="1"
            strokeDasharray="3 7"
          />
        </svg>
      )}
    </div>
  );
}
