import { useEffect, useMemo, useState } from "react";
import type { OrganizerMovieDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { MessageBar } from "../../ui/MessageBar";
import { Spinner } from "../../ui/Spinner";
import { IconPlus, IconSearch } from "../../ui/icons";
import { AddMovieModal } from "./AddMovieModal";
import { CreateSessionsModal } from "./CreateSessionsModal";

export function OrganizerMoviesPage() {
  const [movies, setMovies] = useState<OrganizerMovieDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [addMovieOpen, setAddMovieOpen] = useState(false);
  const [sessionsMovieId, setSessionsMovieId] = useState<string | null>(null);

  useEffect(() => {
    loadMovies();
  }, []);

  function loadMovies() {
    apiClient
      .get<OrganizerMovieDto[]>("/organizer/movies")
      .then(setMovies)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar filmes."));
  }

  const existingExternalRefs = useMemo(() => new Set((movies ?? []).map((m) => m.externalRef)), [movies]);

  const filtered = useMemo(() => {
    if (!movies) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return movies;
    return movies.filter((m) => m.title.toLowerCase().includes(q));
  }, [movies, filter]);

  function handleMovieAdded(movie: OrganizerMovieDto) {
    setMovies((prev) => {
      const exists = prev?.some((m) => m.id === movie.id);
      if (exists) return prev!.map((m) => (m.id === movie.id ? movie : m));
      return [movie, ...(prev ?? [])];
    });
  }

  return (
    <div className="organizer-page">
      <div className="organizer-page-header">
        <h1 className="organizer-page-title">Filmes</h1>
        <button type="button" className="btn btn-primary" onClick={() => setAddMovieOpen(true)}>
          <IconPlus width={16} height={16} />
          Adicionar filme
        </button>
      </div>

      {error && <MessageBar tone="danger">{error}</MessageBar>}

      {!movies ? (
        <Spinner label="Carregando filmes…" />
      ) : (
        <>
          <div className="organizer-filter-row">
            <IconSearch width={16} height={16} color="var(--color-text-faint)" />
            <input
              className="organizer-filter-input"
              placeholder="Filtrar por título…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="organizer-empty-hint">
              {movies.length === 0
                ? "Nenhum filme ainda — clique em \"Adicionar filme\" pra buscar na TMDb."
                : "Nenhum filme corresponde ao filtro."}
            </p>
          ) : (
            <div className="organizer-movie-list">
              {filtered.map((movie) => {
                const publishedCount = movie.screenings.filter((s) => s.status === "published").length;
                return (
                  <div key={movie.id} className="organizer-movie-row">
                    <img src={movie.posterUrl} alt="" className="organizer-movie-poster" />
                    <div className="organizer-movie-row-info">
                      <strong>{movie.title}</strong>
                      <span className="organizer-movie-row-meta mono">
                        {publishedCount} {publishedCount === 1 ? "sessão publicada" : "sessões publicadas"}
                      </span>
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={() => setSessionsMovieId(movie.id)}>
                      <IconPlus width={14} height={14} />
                      Nova sessão
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <AddMovieModal
        open={addMovieOpen}
        onClose={() => setAddMovieOpen(false)}
        existingExternalRefs={existingExternalRefs}
        onAdded={handleMovieAdded}
      />

      <CreateSessionsModal
        open={sessionsMovieId !== null}
        preselectedMovieId={sessionsMovieId ?? undefined}
        onClose={() => setSessionsMovieId(null)}
        onCreated={loadMovies}
      />
    </div>
  );
}
