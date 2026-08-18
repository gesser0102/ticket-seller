import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { RequireRole } from "./features/auth/RequireRole";
import { ClientOnlyRoute } from "./features/auth/ClientOnlyRoute";
import { AppShell } from "./ui/AppShell";
import { Spinner } from "./ui/Spinner";
import { LoginPage } from "./features/auth/LoginPage";
import { MoviesListPage } from "./features/movies/MoviesListPage";
import { MovieDetailPage } from "./features/movies/MovieDetailPage";
import { SeatSelectionPage } from "./features/seatmap/SeatSelectionPage";
import { TicketTypePage } from "./features/checkout/TicketTypePage";
import { CheckoutPage } from "./features/checkout/CheckoutPage";
import { MyTicketsPage } from "./features/tickets/MyTicketsPage";
import { AccountPage } from "./features/account/AccountPage";
import { SharedTicketPage } from "./features/tickets/SharedTicketPage";
import { OrganizerLayout } from "./features/organizer/OrganizerLayout";
import { OrganizerOverviewPage } from "./features/organizer/OrganizerOverviewPage";
import { OrganizerMoviesPage } from "./features/organizer/OrganizerMoviesPage";
import { OrganizerRoomsPage } from "./features/organizer/OrganizerRoomsPage";
import { OrganizerSessionsPage } from "./features/organizer/OrganizerSessionsPage";

const GatePage = lazy(() => import("./features/gate/GatePage").then((m) => ({ default: m.GatePage })));

export default function App() {
  return (
    <AuthProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<MoviesListPage />} />
          <Route path="/filmes/:movieId" element={<MovieDetailPage />} />
          <Route
            path="/sessoes/:screeningId/assentos"
            element={
              <ClientOnlyRoute>
                <SeatSelectionPage />
              </ClientOnlyRoute>
            }
          />
          <Route
            path="/checkout/:orderId/tipo-ingresso"
            element={
              <ClientOnlyRoute>
                <TicketTypePage />
              </ClientOnlyRoute>
            }
          />
          <Route
            path="/checkout/:orderId"
            element={
              <ClientOnlyRoute>
                <CheckoutPage />
              </ClientOnlyRoute>
            }
          />
          <Route path="/i/:token" element={<SharedTicketPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/tickets"
            element={
              <RequireRole roles={["client"]} requireRegistered>
                <MyTicketsPage />
              </RequireRole>
            }
          />
          <Route
            path="/conta"
            element={
              <RequireRole roles={["client"]} requireRegistered>
                <AccountPage />
              </RequireRole>
            }
          />
          <Route
            path="/gate"
            element={
              <RequireRole roles={["gate"]}>
                <Suspense fallback={<Spinner label="Carregando…" />}>
                  <GatePage />
                </Suspense>
              </RequireRole>
            }
          />
          <Route
            path="/organizer"
            element={
              <RequireRole roles={["organizer"]}>
                <OrganizerLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="visao-geral" replace />} />
            <Route path="visao-geral" element={<OrganizerOverviewPage />} />
            <Route path="filmes" element={<OrganizerMoviesPage />} />
            <Route path="salas" element={<OrganizerRoomsPage />} />
            <Route path="sessoes" element={<OrganizerSessionsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </AuthProvider>
  );
}
