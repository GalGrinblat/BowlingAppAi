import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationApi, utilApi } from '../../services/api';
import { useTranslation } from '../../contexts/LanguageContext';
import { FormField } from '../common/FormField';
import { PageHeader } from '../common/PageHeader';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useAdminData } from '../../contexts/AdminDataContext';

import type { Organization } from '../../types/index';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { loadDashboardData } = useAdminData();
  const { t, setLanguage } = useTranslation();
  const { formatDate } = useDateFormat();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    language: 'en' | 'he';
  }>({
    name: '',
    language: 'en'
  });

  const loadOrganization = useCallback(async () => {
    const org = await organizationApi.get();
    setOrganization(org);
    setFormData({
      name: org.name,
      language: org.language || 'en'
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrganization();
  }, [loadOrganization]);

  const handleSave = async () => {
    await organizationApi.update({
      name: formData.name,
      language: formData.language
    });
    setLanguage(formData.language); // Update context
    setIsEditing(false);
    await loadOrganization();
    await loadDashboardData();

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('languageChanged'));
  };

  if (!organization) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.organizationSettings')}
        back={{ label: t('common.backToDashboard'), onClick: () => navigate('/admin') }}
      />

      {/* Organization Info */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{t('settings.organizationSettings')}</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              {t('common.edit')}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <FormField label={t('settings.organizationName')}>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder={t('settings.organizationName')} />
            </FormField>
            <FormField label={t('settings.language')} helperText={formData.language === 'he' ? 'השפה תשתנה לעברית' : 'Language will change to English'}>
              <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value as 'en' | 'he' })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="en">{t('settings.english')}</option>
                <option value="he">{t('settings.hebrew')}</option>
              </select>
            </FormField>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                {t('common.save')}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({ 
                    name: organization.name,
                    language: organization.language || 'en'
                  });
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t('settings.organizationName')}</p>
              <p className="text-lg font-semibold text-gray-800">{organization.name}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t('settings.language')}</p>
              <p className="text-lg font-semibold text-gray-800">
                {organization.language === 'he' ? t('settings.hebrew') : t('settings.english')}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t('settings.created')}</p>
              <p className="text-lg font-semibold text-gray-800">
                {formatDate(organization.createdAt)}
              </p>
            </div>
            {organization.updatedAt && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{t('settings.lastUpdated')}</p>
                <p className="text-lg font-semibold text-gray-800">
                  {formatDate(organization.updatedAt)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* System Information */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('settings.systemInfo')}</h2>
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 mb-1">{t('settings.storageType')}</p>
            <p className="text-lg font-semibold text-blue-900">{t('settings.localStorage')}</p>
            <p className="text-xs text-blue-600 mt-1">{t('settings.localStorageDesc')}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-700 mb-1">⚠️ {t('settings.important')}</p>
            <p className="text-sm text-yellow-900">
              {t('settings.dataWarning')}
            </p>
            <ul className="text-sm text-yellow-900 mt-2 ml-4 list-disc">
              <li>{t('settings.warningItem1')}</li>
              <li>{t('settings.warningItem2')}</li>
              <li>{t('settings.warningItem3')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{t('settings.dangerZone')}</h2>
        <div className="space-y-3">
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700 mb-2 font-semibold">{t('settings.clearDataTitle')}</p>
            <p className="text-sm text-red-600 mb-3">
              {t('settings.clearDataDesc')}
            </p>
            <button
              onClick={() => {
                if (confirm(t('settings.confirmDeleteAll'))) {
                  if (confirm(t('settings.finalWarning'))) {
                    utilApi.clearAll();
                    navigate('/', { replace: true });
                  }
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
            >
              {t('settings.deleteAllButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
