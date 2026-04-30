import type { Player } from '../types/index';

export function getPlayerDisplayName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

