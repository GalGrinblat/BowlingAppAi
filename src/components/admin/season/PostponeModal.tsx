import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { Modal } from '../../common/Modal';
import { FormField } from '../../common/FormField';
import { useDateFormat } from '../../../hooks/useDateFormat';
import type { ScheduleMatchDay } from '../../../types/index';

interface PostponeModalProps {
  selectedMatchDay: number | null;
  schedule: ScheduleMatchDay[] | undefined;
  postponeWeeks: number;
  onPostponeWeeksChange: (weeks: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PostponeModal: React.FC<PostponeModalProps> = ({
  selectedMatchDay, schedule, postponeWeeks,
  onPostponeWeeksChange, onConfirm, onCancel
}) => {
  const { t } = useTranslation();
  const { formatMatchDate } = useDateFormat();

  const scheduleEntry = schedule?.find((s: ScheduleMatchDay) => s.matchDay === selectedMatchDay);

  return (
    <Modal
      isOpen
      title={t('seasons.postponeMatchDay').replace('{{matchDay}}', String(selectedMatchDay))}
      footer={
        <>
          <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold">
            {t('seasons.postpone')}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-2">
        {t('seasons.currentDate')}: {scheduleEntry?.date
          ? formatMatchDate(scheduleEntry.date)
          : t('seasons.notScheduled')}
      </p>
      <p className="text-sm text-gray-600 mb-4">
        {t('seasons.subsequentShift')}
      </p>

      <FormField label={t('seasons.postponeByWeeks')}>
        <input type="number" min="1" max="10" value={postponeWeeks} onChange={(e) => onPostponeWeeksChange(parseInt(e.target.value) || 1)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
      </FormField>

      {postponeWeeks > 0 && scheduleEntry?.date && (
        <p className="text-sm text-gray-500 mt-2">
          {t('seasons.newDate')}: {(() => {
            const newDate = new Date(new Date(scheduleEntry.date).getTime() + postponeWeeks * 7 * 24 * 60 * 60 * 1000);
            return formatMatchDate(newDate.toISOString());
          })()}
        </p>
      )}
    </Modal>
  );
};
