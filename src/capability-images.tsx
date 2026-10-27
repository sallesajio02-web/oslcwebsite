import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { SiteImage } from "./site-image";

export function CapabilityImages({ name, image, images = [] }: {
  name: string; image: string; images?: string[];
}) {
  const slides = [...new Set([image, ...images].filter(Boolean))];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (slides.length < 2 || paused || !playing) return;
    const timer = window.setInterval(() => setActive(i => (i + 1) % slides.length), 3500);
    return () => window.clearInterval(timer);
  }, [slides.length, paused, playing]);
  return (
    <div className="capability-slideshow"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}>
      <SiteImage src={slides[active] || image} alt={name + (slides.length > 1 ? ` — image ${active + 1} of ${slides.length}` : "")} loading="lazy" />
      {slides.length > 1 && (
        <div className="capability-slideshow-controls" aria-label={`${name} images`}>
          <button type="button" aria-label={playing ? "Pause image rotation" : "Play image rotation"}
            onClick={() => setPlaying(p => !p)}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
        </div>
      )}
    </div>
  );
}
