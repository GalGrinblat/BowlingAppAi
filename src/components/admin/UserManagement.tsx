import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi, playersApi, allowedEmailsApi, type DatabaseUser, type AllowedEmail } from '../../services/api';
import type { Player } from '../../types/index';
import { useTranslation } from '../../contexts/LanguageContext';
import { FormField } from '../common/FormField';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { PageHeader } from '../common/PageHeader';
import { useDateFormat } from '../../hooks/useDateFormat';
import { logger } from '../../utils/logger';
import { getPlayerDisplayName } from '../../utils/playerUtils';

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'player'>('player');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmailNotes, setNewEmailNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, playersData, allowedEmailsData] = await Promise.all([
        usersApi.getAll(),
        playersApi.getAll(),
        allowedEmailsApi.getAll()
      ]);
      setUsers(usersData);
      setPlayers(playersData.filter(p => p.active));
      setAllowedEmails(allowedEmailsData);
    } catch (error) {
      logger.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: DatabaseUser) => {
    setEditingUser(user.id);
    setSelectedRole(user.role);
    setSelectedPlayer(user.playerId || '');
  };

  const handleSaveUser = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      // Update role if changed
      if (selectedRole !== user.role) {
        await usersApi.updateRole(userId, selectedRole);
      }

      // Update player link if changed
      const newPlayerId = selectedPlayer || null;
      if (newPlayerId !== user.playerId) {
        await usersApi.linkPlayer(userId, newPlayerId);
      }

      alert(t('userManagement.userUpdatedSuccess'));
      setEditingUser(null);
      await loadData();
    } catch (error) {
      logger.error('Error updating user:', error);
      alert(t('userManagement.userUpdateFailed'));
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setSelectedRole('player');
    setSelectedPlayer('');
  };

  const getPlayerName = (playerId: string | null): string => {
    if (!playerId) return t('userManagement.notLinked');
    const player = players.find(p => p.id === playerId);
    return player ? getPlayerDisplayName(player) : t('userManagement.unknownPlayer');
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      alert(t('userManagement.emailRequired'));
      return;
    }

    // RFC 5321 email validation with length limit
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (newEmail.trim().length > 254 || !emailRegex.test(newEmail.trim())) {
      alert(t('userManagement.emailInvalid'));
      return;
    }

    try {
      await allowedEmailsApi.add(newEmail.trim(), newEmailNotes.trim() || undefined);
      alert(t('userManagement.emailAddedSuccess'));
      setNewEmail('');
      setNewEmailNotes('');
      await loadData();
    } catch (error) {
      logger.error('Error adding email:', error);
      alert(t('userManagement.emailAddFailed'));
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(t('userManagement.confirmRemoveEmail').replace('{{email}}', email))) {
      return;
    }

    try {
      await allowedEmailsApi.remove(email);
      alert(t('userManagement.emailRemovedSuccess'));
      await loadData();
    } catch (error) {
      logger.error('Error removing email:', error);
      alert(t('userManagement.emailRemoveFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('userManagement.title')}
        subtitle={t('userManagement.subtitle')}
        back={{ label: t('common.backToDashboard'), onClick: () => navigate('/admin') }}
      />

      {/* Info Card */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-2">{t('userManagement.guideTitle')}</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• {t('userManagement.guideEmailWhitelist')}</li>
          <li>• {t('userManagement.guideAdminRole')}</li>
          <li>• {t('userManagement.guidePlayerRole')}</li>
          <li>• {t('userManagement.guideNewUsers')}</li>
          <li>• {t('userManagement.guideLinkPlayers')}</li>
        </ul>
      </div>

      {/* Email Whitelist */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {t('userManagement.emailWhitelistCount').replace('{{count}}', allowedEmails.length.toString())}
          </h2>
          <p className="text-sm text-gray-600">
            {t('userManagement.emailWhitelistDesc')}
          </p>
        </div>

        {/* Add Email Form */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('userManagement.addEmailTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t('userManagement.emailAddressLabel')}>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t('userManagement.emailAddressPlaceholder')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </FormField>
            <FormField label={t('userManagement.notesLabel')}>
              <input type="text" value={newEmailNotes} onChange={(e) => setNewEmailNotes(e.target.value)} placeholder={t('userManagement.notesPlaceholder')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </FormField>
          </div>
          <button
            onClick={handleAddEmail}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            {t('userManagement.addToWhitelist')}
          </button>
        </div>

        {/* Email List */}
        <div className="divide-y divide-gray-200">
          {allowedEmails.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="mb-2">{t('userManagement.noEmailsInWhitelist')}</p>
              <p className="text-sm">{t('userManagement.noEmailsWarning')}</p>
            </div>
          ) : (
            allowedEmails.map((email) => (
              <div key={email.email} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{email.email}</h3>
                      {users.some(u => u.email === email.email) && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          {t('userManagement.registered')}
                        </span>
                      )}
                    </div>
                    {email.notes && (
                      <p className="text-sm text-gray-600">{email.notes}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {t('userManagement.addedOn').replace('{{date}}', formatDate(email.addedAt))}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveEmail(email.email)}
                    className="ml-4 px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold"
                  >
                    {t('common.remove')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {t('userManagement.allUsersTitle').replace('{{count}}', users.length.toString())}
          </h2>
        </div>

        {users.length === 0 ? (
          <p className="text-gray-500 text-center py-12">{t('userManagement.noUsersFound')}</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                {editingUser === user.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">{t('userManagement.email')}</p>
                      <p className="text-gray-900">{user.email}</p>
                    </div>

                    <FormField label={t('userManagement.roleLabel')}>
                      <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'player')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="player">{t('userManagement.rolePlayer')}</option>
                        <option value="admin">{t('userManagement.roleAdmin')}</option>
                      </select>
                    </FormField>

                    {selectedRole === 'player' && (
                      <FormField label={t('userManagement.linkPlayerLabel')} helperText={t('userManagement.linkPlayerHelp')}>
                        <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="">{t('userManagement.notLinked')}</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>{getPlayerDisplayName(player)}</option>
                          ))}
                        </select>
                      </FormField>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleSaveUser(user.id)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                      >
                        {t('common.save')}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{user.email}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {user.role === 'admin' ? t('userManagement.roleAdmin').toUpperCase() : t('userManagement.rolePlayer').toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">{t('userManagement.playerAccountLabel')}</span>{' '}
                          <span className={user.playerId ? 'text-green-600' : 'text-gray-400'}>
                            {getPlayerName(user.playerId)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">{t('userManagement.joinedLabel')}</span>{' '}
                          {formatDate(user.createdAt)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleEditUser(user)}
                      className="ml-4 px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold"
                    >
                      {t('common.edit')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
