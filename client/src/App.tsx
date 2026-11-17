import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DbProvider } from './context/DbContext';
import { CustomControlsPage } from './pages/CustomControlsPage';
import { CustomScoreboardPage } from './pages/CustomScoreboardPage';
import { DashboardPage } from './pages/DashboardPage';
import { FibaSheetPage } from './pages/FibaSheetPage';
import { GamesPage } from './pages/GamesPage';
import { GameStatsPage } from './pages/GameStatsPage';
import { LogPage } from './pages/LogPage';
import { OfficiatingPage } from './pages/OfficiatingPage';
import { PlayerboardPage } from './pages/PlayerboardPage';
import { PlayersPage } from './pages/PlayersPage';
import { RulesPage } from './pages/RulesPage';
import { ScoreboardPage } from './pages/ScoreboardPage';
import { TeamsPage } from './pages/TeamsPage';

export default function App() {
  return (
    <DbProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/scoreboard" element={<ScoreboardPage />} />
            <Route path="/playerboard" element={<PlayerboardPage />} />
            <Route path="/custom-scoreboard" element={<CustomScoreboardPage />} />
            <Route path="/officiating" element={<OfficiatingPage />} />
            <Route path="/scoresheet" element={<Navigate to="/officiating" replace />} />
            <Route path="/controls" element={<Navigate to="/officiating" replace />} />
            <Route path="/custom-controls" element={<CustomControlsPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/:id/statistics" element={<GameStatsPage />} />
            <Route path="/games/:id/scoresheet" element={<FibaSheetPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </DbProvider>
  );
}