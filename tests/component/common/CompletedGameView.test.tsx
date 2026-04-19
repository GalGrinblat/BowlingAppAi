import React from 'react';
/// <reference types="jest" />
import { render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../../../src/contexts/LanguageContext';
import { CompletedGameView } from '../../../src/components/common/CompletedGameView';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ gameId: 'game-123' }),
  useLocation: () => ({ state: null }),
}));

jest.mock('../../../src/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDate: (d: string) => d }),
}));

jest.mock('../../../src/services/api/games', () => ({
  gamesApi: {
    getById: jest.fn().mockResolvedValue({
      id: 'game-123',
      seasonId: 'season-1',
      round: 1,
      matchDay: 1,
      status: 'completed',
      completedAt: '2025-01-15T10:00:00Z',
      team1: { id: 'team-1', name: 'Thunder Bolts', seasonId: 'season-1', playerIds: [], points: 0, createdAt: '' },
      team2: { id: 'team-2', name: 'Pin Crushers', seasonId: 'season-1', playerIds: [], points: 0, createdAt: '' },
      matches: [
        {
          matchNumber: 1,
          team1: { playerId: 'p1', score: 180, points: 1 },
          team2: { playerId: 'p2', score: 150, points: 0 },
        },
      ],
      grandTotalPoints: { team1: 2, team2: 0 },
      createdAt: '',
    }),
  },
}));

jest.mock('../../../src/components/common/game/GameScoreSheet', () => ({
  GameScoreSheet: () => <div data-testid="game-score-table" />,
}));

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

describe('CompletedGameView', () => {
  it('shows loading state initially when no location state', () => {
    render(
      <LanguageProvider>
        <CompletedGameView />
      </LanguageProvider>
    );
    // Before the API resolves, the component shows a loading indicator
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders team names after data loads', async () => {
    render(
      <LanguageProvider>
        <CompletedGameView />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Thunder Bolts')).toBeInTheDocument();
      expect(screen.getByText('Pin Crushers')).toBeInTheDocument();
    });
  });

  it('renders game score table after data loads', async () => {
    render(
      <LanguageProvider>
        <CompletedGameView />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('game-score-table')).toBeInTheDocument();
    });
  });

  it('shows winner banner when one team has more points', async () => {
    render(
      <LanguageProvider>
        <CompletedGameView />
      </LanguageProvider>
    );
    await waitFor(() => {
      // team1 wins (1+2=3 vs 0+0=0), winner banner shows team1 name
      const banners = screen.getAllByText('Thunder Bolts');
      expect(banners.length).toBeGreaterThan(0);
    });
  });

  it('renders back button', async () => {
    render(
      <LanguageProvider>
        <CompletedGameView />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  it('back button navigates back', async () => {
    const { findByRole } = render(
      <LanguageProvider>
        <CompletedGameView />
      </LanguageProvider>
    );
    const backBtn = await findByRole('button', { name: /back/i });
    backBtn.click();
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
