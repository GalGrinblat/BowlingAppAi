import * as React from 'react';
import { playersApi, teamsApi, seasonsApi } from '../../../services/api';
import { createPlayer, validatePlayer } from '../../../models';
import { Pagination, usePagination } from '../../common/Pagination';
import { useTranslation } from '../../../contexts/LanguageContext';
import { EmptyState } from '../../common/EmptyState';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ActionButton } from '../../common/ActionButton';
import { PageHeader } from '../../common/PageHeader';
import {
  exportToCSV,
  exportToJSON,
  parseJSONImport,
  parseCSVImport,
  booleanConverter
} from '../../../utils/importExportUtils';
import { getPlayerDisplayName } from '../../../utils/playerUtils';
import type { Player } from '../../../types/index';
import { PLAYER_SORT_OPTIONS } from '../../../constants/sortOptions';
import { sortByOption, SortOption } from '../../../utils/sortUtils';
import { PlayerForm } from './PlayerForm';
import { ImportPreviewModal } from './ImportPreviewModal';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../../contexts/AdminDataContext';

const DEFAULT_SORT_OPTION: SortOption<Player> = { key: 'lastName', labelKey: 'sort.lastNameAsc', direction: 'asc' };

export const PlayerRegistry: React.FC = () => {
  const navigate = useNavigate();
  const { players, isLoadingPlayers, loadPlayers } = useAdminData();
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    firstName: '',
    middleName: '',
    lastName: '',
    active: true
  });
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importData, setImportData] = React.useState<Player[]>([]);
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const [sortOption, setSortOption] = React.useState(PLAYER_SORT_OPTIONS[0]);

  const activePagination = usePagination(20);
  const inactivePagination = usePagination(20);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const playerData = createPlayer(formData);
    const validation = validatePlayer(playerData);

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const displayName = getPlayerDisplayName(playerData);
    const existingPlayer = players.find(p =>
      p.firstName.toLowerCase() === playerData.firstName.toLowerCase() &&
      p.lastName.toLowerCase() === playerData.lastName.toLowerCase() &&
      p.id !== editingId
    );

    if (existingPlayer) {
      alert(`❌ ${t('players.duplicateName')}`);
      return;
    }

    if (editingId) {
      await playersApi.update(editingId, playerData);
      alert(`✅ "${displayName}" ${t('players.updated')}`);
      setEditingId(null);
    } else {
      await playersApi.create(playerData);
      alert(`✅ "${displayName}" ${t('players.created')}`);
    }

    setFormData({ firstName: '', middleName: '', lastName: '', active: true });
    setIsAdding(false);
    await loadPlayers();
  };

  const handleEdit = (player: Player) => {
    setFormData({
      firstName: player.firstName,
      middleName: player.middleName || '',
      lastName: player.lastName,
      active: player.active
    });
    setEditingId(player.id);
  };

  const handleDelete = async (id: string) => {
    const player = await playersApi.getById(id);

    const allTeams = await teamsApi.getAll();
    const teamsWithPlayer = allTeams.filter(team => team.playerIds.includes(id));

    if (teamsWithPlayer.length > 0) {
      const seasonNames = await Promise.all(
        teamsWithPlayer.map(async team => {
          const season = await seasonsApi.getById(team.seasonId);
          return season ? season.name : 'Unknown Season';
        })
      );

      const playerDisplayName = player ? getPlayerDisplayName(player) : 'Unknown';
      alert(`❌ ${t('players.cannotDeleteAssigned')} "${playerDisplayName}" (${teamsWithPlayer.length} ${t('players.assignedToTeams')}):\n\n${[...new Set(seasonNames)].map(s => `• ${s}`).join('\n')}\n\n${t('players.removeFromTeamsFirst')}`);
      return;
    }

    const playerDisplayName = player ? getPlayerDisplayName(player) : 'Unknown';
    if (confirm(`⚠️ ${t('players.deleteConfirm')} "${playerDisplayName}"?\n\n${t('common.deleteWarning')}`)) {
      await playersApi.delete(id);
      alert(`✅ "${playerDisplayName}" ${t('players.deleted')}`);
      await loadPlayers();
    }
  };

  const handleCancel = () => {
    setFormData({ firstName: '', middleName: '', lastName: '', active: true });
    setIsAdding(false);
    setEditingId(null);
  };

  // Import/Export handlers
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          handleParseImport(content, 'json');
        } else if (file.name.endsWith('.csv')) {
          handleParseImport(content, 'csv');
        } else {
          alert('Please upload a CSV or JSON file');
        }
      } catch (error) {
        alert(`Error reading file: ${error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const playerValidator = (item: Record<string, unknown>) => {
    if (!item.firstName) return { valid: false, error: 'Missing required field \'firstName\'' };
    if (!item.lastName) return { valid: false, error: 'Missing required field \'lastName\'' };
    if (item.active === undefined) item.active = true;
    return validatePlayer(item);
  };

  const handleParseImport = (content: string, format: 'json' | 'csv') => {
    try {
      const result = format === 'json'
        ? parseJSONImport<Player>(content, playerValidator)
        : parseCSVImport<Player>(content, playerValidator, ['id', 'createdAt'], { active: booleanConverter });

      setImportData(result.validData);
      setImportErrors(result.errors);
      setShowImportModal(true);
    } catch (error) {
      alert(String(error));
    }
  };

  const handleConfirmImport = async () => {
    let successCount = 0;
    let duplicateCount = 0;

    for (const playerData of importData) {
      const existingPlayer = players.find(p =>
        p.firstName.toLowerCase() === playerData.firstName.toLowerCase() &&
        p.lastName.toLowerCase() === playerData.lastName.toLowerCase()
      );

      if (existingPlayer) {
        duplicateCount++;
        continue;
      }

      await playersApi.create(playerData);
      successCount++;
    }

    setShowImportModal(false);
    setImportData([]);
    setImportErrors([]);
    await loadPlayers();

    let message = `✅ ${t('players.importComplete')}\n\n`;
    message += `• ${successCount} ${t('players.playersImported')}\n`;
    if (duplicateCount > 0) {
      message += `• ${duplicateCount} ${t('players.duplicatesSkipped')}\n`;
    }
    if (importErrors.length > 0) {
      message += `• ${importErrors.length} ${t('players.errorsDetails')}`;
    }
    alert(message);
  };

  const handleCancelImport = () => {
    setShowImportModal(false);
    setImportData([]);
    setImportErrors([]);
  };

  const filteredPlayers = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return players.filter(p =>
      p.firstName.toLowerCase().includes(term) ||
      p.lastName.toLowerCase().includes(term) ||
      getPlayerDisplayName(p).toLowerCase().includes(term)
    );
  }, [players, searchTerm]);

  const sortedPlayers = React.useMemo(
    () => sortByOption(filteredPlayers, sortOption ?? DEFAULT_SORT_OPTION),
    [filteredPlayers, sortOption]
  );

  const activePlayers = React.useMemo(() => sortedPlayers.filter(p => p.active), [sortedPlayers]);
  const inactivePlayers = React.useMemo(() => sortedPlayers.filter(p => !p.active), [sortedPlayers]);

  React.useEffect(() => {
    activePagination.resetPage();
    inactivePagination.resetPage();
    // activePagination and inactivePagination are stable refs from usePagination
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const paginatedActivePlayers = activePagination.paginate(activePlayers);
  const paginatedInactivePlayers = inactivePagination.paginate(inactivePlayers);

  if (isLoadingPlayers) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('players.title')}
          subtitle="Loading players..."
          back={{ label: t('common.backToDashboard'), onClick: () => navigate('/admin') }}
        />
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading players data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('players.title')}
        subtitle={t('players.totalPlayers').replace('{{count}}', String(players.length))}
        back={{ label: t('common.backToDashboard'), onClick: () => navigate('/admin') }}
      />

      {/* Add/Edit Form or Search/Sort/Import Controls */}
      {isAdding ? (
        <PlayerForm
          formData={formData}
          isEditing={!!editingId}
          onFormDataChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <>
          {/* Import/Export Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('players.importExport')}</h3>
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => exportToCSV(players, 'players')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
                >
                  📥 {t('players.exportCSV')}
                </button>
                <button
                  onClick={() => exportToJSON(players, 'players')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
                >
                  📥 {t('players.exportJSON')}
                </button>
              </div>
              <div>
                <label className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold cursor-pointer flex items-center gap-2 inline-block">
                  📤 {t('players.importFile')}
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              💡 {t('players.importExportHelp')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <input
              type="text"
              placeholder={t('players.searchPlayers')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setIsAdding(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                + {t('players.addPlayer')}
              </button>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-4 my-4">
            <label htmlFor="sortPlayers" className="text-sm font-semibold text-gray-700">{t('sort.by')}:</label>
            <select
              id="sortPlayers"
              value={sortOption?.labelKey}
              onChange={e => {
                const selected = PLAYER_SORT_OPTIONS.find(opt => opt.labelKey === e.target.value);
                if (selected) setSortOption(selected);
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              {PLAYER_SORT_OPTIONS.map(opt => (
                <option key={opt.labelKey} value={opt.labelKey}>{t(opt.labelKey)}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Active Players List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {t('players.activePlayers')} (<span className="ltr-content">{activePlayers.length}</span>)
          </h2>
        </div>
        {activePlayers.length === 0 ? (
          <EmptyState message={t('players.noActivePlayers')} />
        ) : (
          <div className="p-6 space-y-2">
            {paginatedActivePlayers.map((player: Player) =>
              editingId === player.id ? (
                <div key={player.id} className="border-2 border-blue-400 rounded-xl">
                  <PlayerForm
                    formData={formData}
                    isEditing={true}
                    onFormDataChange={setFormData}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                  />
                </div>
              ) : (
                <div key={player.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{getPlayerDisplayName(player)}</h3>
                    </div>
                    <div className="flex gap-2">
                      <ActionButton variant="edit" label={t('common.edit')} onClick={() => handleEdit(player)} />
                      <ActionButton variant="delete" label={t('common.delete')} onClick={() => handleDelete(player.id)} />
                    </div>
                  </div>
                </div>
              )
            )}
            <Pagination
              currentPage={activePagination.currentPage}
              totalItems={activePlayers.length}
              itemsPerPage={activePagination.itemsPerPage}
              onPageChange={activePagination.setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Inactive Players */}
      {inactivePlayers.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {t('players.inactivePlayers')} (<span className="ltr-content">{inactivePlayers.length}</span>)
            </h2>
          </div>
          <div className="p-6 space-y-2">
            {paginatedInactivePlayers.map((player: Player) =>
              editingId === player.id ? (
                <div key={player.id} className="border-2 border-blue-400 rounded-xl">
                  <PlayerForm
                    formData={formData}
                    isEditing={true}
                    onFormDataChange={setFormData}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                  />
                </div>
              ) : (
                <div key={player.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-600">{getPlayerDisplayName(player)}</h3>
                    </div>
                    <div className="flex gap-2">
                      <ActionButton variant="edit" label={t('common.edit')} onClick={() => handleEdit(player)} />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
          <Pagination
            currentPage={inactivePagination.currentPage}
            totalItems={inactivePlayers.length}
            itemsPerPage={inactivePagination.itemsPerPage}
            onPageChange={inactivePagination.setCurrentPage}
          />
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportModal && (
        <ImportPreviewModal
          importData={importData}
          importErrors={importErrors}
          existingPlayers={players}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
        />
      )}
    </div>
  );
};
