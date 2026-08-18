import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { OrganizerMovieDto, TmdbSearchResponseDto, TmdbSearchResultDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { Modal } from "../../ui/Modal";
import { MessageBar } from "../../ui/MessageBar";
import { Spinner } from "../../ui/Spinner";
import { IconFilm, IconPlus, IconSearch } from "../../ui/icons";

interface AddMovieModalProps {
  open: boolean;
  onClose: () => void;
  existingExternalRefs: Set<string>;
  onAdded: (movie: OrganizerMovieDto) => void;
}

export function AddMovieModal({ open, onClose, existingExternalRefs, onAdded }: AddMovieModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResultDto[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingRef, setAddingRef] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const runSearch = useCallback(
    async (pageToLoad: number, replace: boolean) => {
      const seq = ++requestSeq.current;
      if (replace) setBusy(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const qs = query.trim() ? `&query=${encodeURIComponent(query.trim())}` : "";
        const response = await apiClient.get<TmdbSearchResponseDto>(`/organizer/tmdb/search?page=${pageToLoad}${qs}`);
        if (seq !== requestSeq.current) return;
        setResults((prev) => (replace ? response.results : [...(prev ?? []), ...response.results]));
        setPage(response.page);
        setTotalPages(response.totalPages);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setError(err instanceof ApiError ? err.message : "Falha ao buscar na TMDb.");
      } finally {
        if (seq === requestSeq.current) {
          setBusy(false);
          setLoadingMore(false);
        }
      }
    },
    [query],
  );

  useEffect(() => {
    if (open && results === null) {
      runSearch(1, true);
    }
  }, [open, results, runSearch]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(1, true);
  }

  async function handleAdd(result: TmdbSearchResultDto) {
    setAddingRef(result.externalRef);
    setError(null);
    try {
      const movie = await apiClient.post<OrganizerMovieDto>("/organizer/movies", { externalRef: result.externalRef });
      onAdded(movie);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao adicionar filme.");
    } finally {
      setAddingRef(null);
    }
  }

  function handleClose() {
    onClose();
  }

  return (
    <Modal open={open} title="Adicionar filme" onClose={handleClose} wide>
      <form onSubmit={handleSubmit} className="organizer-search-form">
        <input
          className="mono"
          placeholder="Buscar por título (vazio = em cartaz na TMDb)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={busy}
          autoFocus
        />
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          <IconSearch width={16} height={16} />
          {busy ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {error && <MessageBar tone="danger">{error}</MessageBar>}

      {busy && !results && <Spinner label="Buscando na TMDb…" />}

      {results && (
        <>
          {results.length === 0 && <p className="organizer-empty-hint">Nenhum filme encontrado.</p>}
          <div className="organizer-results-list">
            {results.map((result) => {
              const alreadyAdded = existingExternalRefs.has(result.externalRef);
              return (
                <div key={result.externalRef} className="organizer-result-card">
                  {result.posterUrl ? (
                    <img src={result.posterUrl} alt="" />
                  ) : (
                    <div className="organizer-result-poster-empty">
                      <IconFilm width={24} height={24} color="var(--color-text-faint)" />
                    </div>
                  )}
                  <div className="organizer-result-info">
                    <strong>
                      {result.title} {result.releaseYear && <span className="mono">({result.releaseYear})</span>}
                    </strong>
                    <p>{result.overview || "Sem sinopse disponível."}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={addingRef === result.externalRef || alreadyAdded}
                    onClick={() => handleAdd(result)}
                  >
                    <IconPlus width={14} height={14} />
                    {addingRef === result.externalRef ? "Adicionando…" : alreadyAdded ? "Já adicionado" : "Adicionar"}
                  </button>
                </div>
              );
            })}
          </div>

          {page < totalPages && (
            <button type="button" className="btn btn-ghost btn-block" disabled={loadingMore} onClick={() => runSearch(page + 1, false)}>
              {loadingMore ? "Carregando…" : `Carregar mais (página ${page + 1} de ${totalPages})`}
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
