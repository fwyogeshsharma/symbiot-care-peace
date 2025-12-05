import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTranslation } from 'react-i18next';

export function ILQInfoDialog() {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-help inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-primary active:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={t('ilq.info.ariaLabel')}
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-72 max-w-[calc(100vw-2rem)] p-3">
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-sm">{t('ilq.info.title')}</p>
          <p>
            {t('ilq.info.description')}
          </p>
          <div className="space-y-1">
            <p className="font-medium">{t('ilq.info.components')}:</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>{t('ilq.info.healthVitals')}</li>
              <li>{t('ilq.info.physicalActivity')}</li>
              <li>{t('ilq.info.cognitiveFunction')}</li>
              <li>{t('ilq.info.environmentalSafety')}</li>
              <li>{t('ilq.info.emergencyResponse')}</li>
              <li>{t('ilq.info.socialEngagement')}</li>
            </ul>
          </div>
          <div className="flex gap-2 pt-1 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500" />85+</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-500" />70-84</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500" />55-69</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" />&lt;55</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
