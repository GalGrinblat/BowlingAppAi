import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { FormField } from '../../common/FormField';
import { MAX_BOWLING_SCORE } from '../../../constants/bowling';

interface HandicapConfigurationFormProps {
	useHandicap: boolean;
	handicapBasis: number;
	handicapPercentage: number;
	onUseHandicapChange: (value: boolean) => void;
	onHandicapBasisChange: (value: number) => void;
	onHandicapPercentageChange: (value: number) => void;
	showDescription?: boolean;
	disabled?: boolean;
}

/**
 * Shared Handicap Configuration Form Component
 * Used in both LeagueManagement and SeasonCreator for consistent handicap configuration
 */
export const HandicapConfigurationForm: React.FC<HandicapConfigurationFormProps> = ({
	useHandicap,
	handicapBasis,
	handicapPercentage,
	onUseHandicapChange,
	onHandicapBasisChange,
	onHandicapPercentageChange,
	showDescription = true,
	disabled = false
}) => {
	const { t } = useTranslation();

	return (
		<div className="border-t pt-4 mt-4">
			<h3 className="text-lg font-bold text-gray-800 mb-3">{t('leagues.handicap.Configuration')}</h3>
			{showDescription && (
				<p className="text-sm text-gray-600 mb-3">
					{t('leagues.handicap.ConfigurationDesc')}
				</p>
			)}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label className="flex items-center space-x-2 cursor-pointer">
						<input
							type="checkbox"
							checked={useHandicap}
							onChange={(e) => onUseHandicapChange(e.target.checked)}
							className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
							disabled={disabled}
						/>
						<span className="text-sm font-semibold text-gray-700">{t('leagues.handicap.use')}</span>
					</label>
					<p className="text-xs text-gray-500 mt-1">
						{t('leagues.handicap.enableDisable')}
					</p>
				</div>
				<FormField label={t('leagues.handicap.basis')} helperText={t('leagues.handicap.basisCalculation')}>
					<input type="number" min="0" max={MAX_BOWLING_SCORE} value={handicapBasis} onChange={(e) => onHandicapBasisChange(Number(e.target.value))} disabled={!useHandicap || disabled} className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent${(!useHandicap || disabled) ? ' bg-gray-100 cursor-not-allowed' : ''}`} />
				</FormField>
				<FormField label={t('leagues.handicap.percentage')} helperText={t('leagues.handicap.percentageExplanation')}>
					<input type="number" min="0" max="100" value={handicapPercentage} onChange={(e) => onHandicapPercentageChange(Number(e.target.value))} disabled={!useHandicap || disabled} className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent${(!useHandicap || disabled) ? ' bg-gray-100 cursor-not-allowed' : ''}`} />
				</FormField>
			</div>
		</div>
	);
};
