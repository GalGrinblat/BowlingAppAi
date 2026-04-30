import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('../../../src/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

Object.defineProperty(global, 'import', {
  value: { meta: { env: { VITE_SUPABASE_URL: 'test', VITE_SUPABASE_ANON_KEY: 'test' } } },
  configurable: true,
});

import { LanguageProvider } from '../../../src/contexts/LanguageContext';
import { ToastProvider } from '../../../src/contexts/ToastContext';
import { StandingsFilterControls } from '../../../src/components/admin/season/StandingsFilterControls';

const matchDayEvents = [
  { round: 1, matchDay: 1 },
  { round: 1, matchDay: 2 },
];

const getMatchDayLabel = (round: number, matchDay: number) => `Round ${round} MD ${matchDay}`;

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider><LanguageProvider>{children}</LanguageProvider></ToastProvider>
);

describe('StandingsFilterControls', () => {
  it('renders title and print button', () => {
    render(
      <StandingsFilterControls
        title="Team Standings"
        standingsFilter={null}
        setStandingsFilter={jest.fn()}
        completedMatchDayEvents={matchDayEvents}
        getMatchDayLabel={getMatchDayLabel}
        onPrint={jest.fn()}
      />,
      { wrapper }
    );
    expect(screen.getByText('Team Standings')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('renders select when there are completed match day events', () => {
    render(
      <StandingsFilterControls
        title="Team Standings"
        standingsFilter={null}
        setStandingsFilter={jest.fn()}
        completedMatchDayEvents={matchDayEvents}
        getMatchDayLabel={getMatchDayLabel}
        onPrint={jest.fn()}
      />,
      { wrapper }
    );
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('does not render select when there are no completed match day events', () => {
    render(
      <StandingsFilterControls
        title="Team Standings"
        standingsFilter={null}
        setStandingsFilter={jest.fn()}
        completedMatchDayEvents={[]}
        getMatchDayLabel={getMatchDayLabel}
        onPrint={jest.fn()}
      />,
      { wrapper }
    );
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('calls onPrint when print button is clicked', () => {
    const onPrint = jest.fn();
    render(
      <StandingsFilterControls
        title="Team Standings"
        standingsFilter={null}
        setStandingsFilter={jest.fn()}
        completedMatchDayEvents={matchDayEvents}
        getMatchDayLabel={getMatchDayLabel}
        onPrint={onPrint}
      />,
      { wrapper }
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onPrint).toHaveBeenCalledTimes(1);
  });

  it('calls setStandingsFilter with null when empty option selected', () => {
    const setStandingsFilter = jest.fn();
    render(
      <StandingsFilterControls
        title="Team Standings"
        standingsFilter={{ round: 1, matchDay: 1 }}
        setStandingsFilter={setStandingsFilter}
        completedMatchDayEvents={matchDayEvents}
        getMatchDayLabel={getMatchDayLabel}
        onPrint={jest.fn()}
      />,
      { wrapper }
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(setStandingsFilter).toHaveBeenCalledWith(null);
  });

  it('calls setStandingsFilter with parsed round/matchDay when option selected', () => {
    const setStandingsFilter = jest.fn();
    render(
      <StandingsFilterControls
        title="Team Standings"
        standingsFilter={null}
        setStandingsFilter={setStandingsFilter}
        completedMatchDayEvents={matchDayEvents}
        getMatchDayLabel={getMatchDayLabel}
        onPrint={jest.fn()}
      />,
      { wrapper }
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1-2' } });
    expect(setStandingsFilter).toHaveBeenCalledWith({ round: 1, matchDay: 2 });
  });
});
