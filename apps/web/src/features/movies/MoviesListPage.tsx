import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { MoviePageDto, MovieSummaryDto } from "@ticket-seller/shared";
import { apiClient } from "../../lib/apiClient";
import { Spinner } from "../../ui/Spinner";
import { EmptyState } from "../../ui/EmptyState";
import { IconFilm, IconSearch } from "../../ui/icons";
import { HeroCarousel } from "./HeroCarousel";
import "./movies.css";

const ALL_GENRES = "Todos";
const PAGE_SIZE = 12;

export function MoviesListPage() {
  const [movies, setMovies] = useState<MovieSummaryDto[] | null>(null);
  const [genre, setGenre] = useState(ALL_GENRES);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.get<MoviePageDto>(`/movies?page=1&limit=${PAGE_SIZE}`).then((res) => {
      setMovies(res.items);
      setHasMore(res.hasMore);
      setPage(1);
    });
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;
    apiClient
      .get<MoviePageDto>(`/movies?page=${nextPage}&limit=${PAGE_SIZE}`)
      .then((res) => {
        setMovies((prev) => [...(prev ?? []), ...res.items]);
        setHasMore(res.hasMore);
        setPage(nextPage);
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [page, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const genres = useMemo(() => {
    if (!movies) return [];
    const set = new Set<string>();
    for (const movie of movies) {
      for (const g of movie.genres) set.add(g);
    }
    return [ALL_GENRES, ...Array.from(set).sort()];
  }, [movies]);

  const filtered = useMemo(() => {
    if (!movies) return [];
    return movies.filter((movie) => genre === ALL_GENRES || movie.genres.includes(genre));
  }, [movies, genre]);

  if (movies === null) return <Spinner label="Carregando cartaz…" />;

  return (
    <div>
      <HeroCarousel movies={movies} />

      <div className="container" style={{ paddingBlock: "var(--space-6)" }}>
        {movies.length === 0 && <h1 className="visually-hidden">Em cartaz</h1>}

        {movies.length > 0 && (
          <div className="section-header">
            <p className="section-eyebrow">Cartaz completo</p>
            <h2>Todos os filmes</h2>
          </div>
        )}

        {genres.length > 2 && (
          <div className="movie-genre-filters">
            {genres.map((g) => (
              <button
                key={g}
                type="button"
                className={`movie-genre-pill ${genre === g ? "active" : ""}`}
                onClick={() => setGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {movies.length === 0 ? (
          <EmptyState
            icon={<IconFilm width={40} height={40} color="var(--color-text-faint)" />}
            title="Nenhum filme em cartaz no momento"
            hint="Volte em breve — novas sessões aparecem aqui assim que o organizador publicar."
          />
        ) : (
          <>
            {filtered.length === 0 ? (
              <EmptyState
                icon={<IconSearch width={40} height={40} color="var(--color-text-faint)" />}
                title="Nenhum filme encontrado"
                hint={hasMore ? "Role pra baixo pra carregar mais filmes, ou escolha outro gênero." : "Tente outro gênero."}
              />
            ) : (
              <div className="movie-grid">
                {filtered.map((movie) => (
                  <Link key={movie.id} to={`/filmes/${movie.id}`} className="movie-card">
                    <div className="movie-card-poster">
                      <img src={movie.backdropUrl ?? movie.posterUrl} alt="" loading="lazy" />
                      {movie.certification && <span className="movie-card-certification">{movie.certification}</span>}
                      <div className="movie-card-scrim" aria-hidden="true" />
                      <div className="movie-card-overlay">
                        <h3>{movie.title}</h3>
                        <p className="movie-card-meta">
                          {movie.genres.slice(0, 2).join(", ")}
                          {movie.runtimeMinutes ? ` · ${movie.runtimeMinutes}min` : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {hasMore && (
              <div ref={sentinelRef} className="movie-grid-sentinel">
                {loadingMore && <Spinner label="Carregando mais filmes…" />}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
