import { useTranslation } from 'react-i18next';

export function ActionsHeader() {
  const { t } = useTranslation();
  return <div className="text-right">{t('Fields.Actions')}</div>;
}
