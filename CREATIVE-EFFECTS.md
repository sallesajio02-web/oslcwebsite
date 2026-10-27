# Creative effects

Implemented in `src/creative.tsx` and `src/creative.css`, coordinated by `src/motion.ts`.

- `FlowerBloom`: thirteen individually unfolding shaded SVG petals, a bud-like closed start and gentle sway.
- `FloatingPetals`: up to five drifting petals inside a bounded decorative area.
- `ParticleField`: up to twelve deterministic drifting particles; mobile shows at most four.
- `FabricWave`: layered silk-like ribbons, an SVG curve morph where supported and a drawn thread. Unsupported path morphing retains the static shape and transform motion.
- `TextReveal`: staggered word masks with a separate accessible copy of the original text. No splitting or substitution of product data.
- `CreativeScene`: coordinated hero, Men, Women, Kids and banner arrangements.
- `SectionTransition`: flowing fabric or drawn textile stitch divider.
- `AnimatedReveal`: reusable wrapper integrated with the existing scroll observer.

Decorative effects accept `intensity` (0–1), `size` (pixels), `speed` (.25–3), `visible` and `className`. Particle/petal components also accept bounded `count`. Hero photography and product images remain existing real stock photographs; decorative SVGs are not used as product/factory photos.

Placement reserves separate space for department accents and the desktop banner flower. Hero fabric texture is low-opacity, while petals and particles stay in bounded areas. Decorations are hidden from assistive technology and cannot intercept pointer input. Hero text and collection links have short entrances; there is no blocking intro. New effects use no additional dependencies, scroll handlers, video or canvas loops.

Intersection Observer activates ambient regions on approach, blooms flowers once and pauses motion when regions leave view. Hidden tabs pause animations. Reduced-motion mode hides drifting particles/petals and texture motion, disables animation and shows static flowers/ribbons. Without an observer, content stays visible and decorations stay static. Mobile reduces particle count and removes the banner flower. Font sizes remain at least 14px.

Files changed: `src/creative.tsx`, `src/creative.css`, `src/motion.ts`, `src/public.tsx`, `src/collections.tsx`, `src/main.tsx`, `tests/interactions.test.tsx`.

Validation: TypeScript/Vite production build, 16 tests covering API/database workflows and DOM interactions, plus successful HTTP responses from every existing page. Tests cover bounds, accessibility markup, observer cleanup, off-screen pause, hidden-tab state and reduced-motion fallback. Live browser rendering, browser-console checks, actual mobile layout and low-powered-device performance remain unverified because no browser surface was available. Review those before public deployment.
