import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { MovieDetailDto, ScreeningSummaryDto } from "@ticket-seller/shared";
import { apiClient } from "../../lib/apiClient";
import { formatCents } from "../../lib/format";
import { Spinner } from "../../ui/Spinner";
import "./movies.css";

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

interface DateGroup {
  key: string;
  date: Date;
  screenings: ScreeningSummaryDto[];
}

function groupByDate(screenings: ScreeningSummaryDto[]): DateGroup[] {
  const groups = new Map<string, DateGroup>();
  for (const screening of screenings) {
    const date = new Date(screening.startsAt);
    const key = dateKey(date);
    if (!groups.has(key)) groups.set(key, { key, date, screenings: [] });
    groups.get(key)!.screenings.push(screening);
  }
  return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function groupByRoom(screenings: ScreeningSummaryDto[]): { venue: string; screenings: ScreeningSummaryDto[] }[] {
  const rooms = new Map<string, ScreeningSummaryDto[]>();
  for (const screening of screenings) {
    const list = rooms.get(screening.venue) ?? [];
    list.push(screening);
    rooms.set(screening.venue, list);
  }
  return Array.from(rooms.entries())
    .map(([venue, list]) => ({ venue, screenings: list.sort((a, b) => a.startsAt.localeCompare(b.startsAt)) }))
    .sort((a, b) => a.venue.localeCompare(b.venue));
}

export function MovieDetailPage() {
  const { movieId } = useParams<{ movieId: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<MovieDetailDto | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  useEffect(() => {
    if (!movieId) return;
    apiClient.get<MovieDetailDto>(`/movies/${movieId}`).then((data) => {
      setMovie(data);
      const groups = groupByDate(data.screenings);
      setSelectedDateKey(groups[0]?.key ?? null);
    });
  }, [movieId]);

  const dateGroups = useMemo(() => (movie ? groupByDate(movie.screenings) : []), [movie]);
  const selectedGroup = dateGroups.find((g) => g.key === selectedDateKey);
  const rooms = selectedGroup ? groupByRoom(selectedGroup.screenings) : [];

  if (!movie) return <Spinner label="Carregando filme…" />;

  const today = new Date();

  return (
    <div>
      <div className="movie-hero">
        <div
          className="movie-hero-bg"
          style={{ backgroundImage: `url(${movie.backdropUrl ?? movie.posterUrl})` }}
          aria-hidden="true"
        />
        <div className="movie-hero-scrim" aria-hidden="true" />
        <div className="container movie-detail-layout">
          <img src={movie.posterUrl} alt="" className="movie-detail-poster" />

          <div className="movie-detail-info">
            <h1>{movie.title}</h1>
            <div className="movie-detail-meta">
              {movie.certification && <span className="badge badge-muted">{movie.certification}</span>}
              <span>{movie.genres.join(", ")}</span>
              {movie.runtimeMinutes && <span>{movie.runtimeMinutes}min</span>}
            </div>

            <p className="movie-detail-synopsis">{movie.synopsis}</p>

            <div className="screening-calendar">
              <h3>Sessões</h3>

              {dateGroups.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-3)" }}>
                  Nenhuma sessão disponível no momento.
                </p>
              ) : (
                <>
                  <div className="screening-date-tabs">
                    {dateGroups.map((group) => (
                      <button
                        key={group.key}
                        className={`screening-date-tab ${group.key === selectedDateKey ? "active" : ""}`}
                        onClick={() => setSelectedDateKey(group.key)}
                      >
                        <span className="screening-date-tab-weekday">
                          {isSameDay(group.date, today) ? "Hoje" : weekdayFormatter.format(group.date)}
                        </span>
                        <span className="screening-date-tab-day">
                          {group.date.getDate().toString().padStart(2, "0")}/
                          {(group.date.getMonth() + 1).toString().padStart(2, "0")}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="screening-rooms">
                    {rooms.map((room) => (
                      <div key={room.venue}>
                        <span className="screening-room-name">{room.venue}</span>
                        <div className="screening-times">
                          {room.screenings.map((screening) => (
                            <button
                              key={screening.id}
                              className="screening-time-btn"
                              onClick={() => navigate(`/sessoes/${screening.id}/assentos`)}
                            >
                              {timeFormatter.format(new Date(screening.startsAt))}
                              <br />
                              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                {formatCents(screening.priceCents)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {movie.cast.length > 0 && (
        <div className="container movie-detail-cast-section">
          <h3>Elenco</h3>
          <div className="movie-detail-cast-grid">
            {movie.cast.map((member) => (
              <div key={member.name} className="movie-detail-cast-member">
                <div className="movie-detail-cast-photo">
                  {member.profileUrl ? (
                    <img src={member.profileUrl} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{member.name.charAt(0)}</span>
                  )}
                </div>
                <span className="movie-detail-cast-name">{member.name}</span>
                <span className="movie-detail-cast-character">{member.character}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
