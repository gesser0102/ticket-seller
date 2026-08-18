import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { MovieSummaryDto } from "@ticket-seller/shared";
import { IconChevronDown } from "../../ui/icons";

const MAX_SLIDES = 6;
const ROTATE_MS = 7000;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeroCarousel({ movies }: { movies: MovieSummaryDto[] }) {
  const slides = movies.slice(0, MAX_SLIDES);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(prefersReducedMotion());

  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion.current) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [slides.length, paused, active]);

  if (slides.length === 0) return null;

  const current = slides[active];

  function goTo(index: number) {
    setActive((index + slides.length) % slides.length);
  }

  const subtitle = [current.genres.slice(0, 3).join(", "), current.runtimeMinutes ? `${current.runtimeMinutes}min` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      className="hero-banner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container hero-banner-inner">
        <div className="hero-banner-media">
          <div className="hero-banner-media-frame">
            <img src={current.backdropUrl ?? current.posterUrl} alt="" />
          </div>
          {slides.length > 1 && (
            <button
              type="button"
              className="hero-banner-arrow hero-banner-arrow-prev"
              onClick={() => goTo(active - 1)}
              aria-label="Filme anterior"
            >
              <IconChevronDown width={18} height={18} style={{ transform: "rotate(90deg)" }} />
            </button>
          )}
          {slides.length > 1 && (
            <button
              type="button"
              className="hero-banner-arrow hero-banner-arrow-next"
              onClick={() => goTo(active + 1)}
              aria-label="Próximo filme"
            >
              <IconChevronDown width={18} height={18} style={{ transform: "rotate(-90deg)" }} />
            </button>
          )}
        </div>
        <div className="hero-banner-content" key={current.id}>
          <h1>{current.title}</h1>
          {subtitle && <p className="hero-banner-subtitle">{subtitle}</p>}
          <Link to={`/filmes/${current.id}`} className="btn hero-banner-btn">
            Ver sessões
          </Link>
        </div>
      </div>
    </section>
  );
}
