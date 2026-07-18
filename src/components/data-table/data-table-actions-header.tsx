import { useTranslation } from 'react-i18next';

/**
 * The header for a row-actions column — right-aligned to sit over the edit/delete controls
 * (which are `justify-end` in their cells). Shared so every table's actions column lines up
 * the same way, flush to the right, instead of each screen re-aligning it by hand.
 */
export function ActionsHeader() {
  const { t } = useTranslation();
  return <div className="text-right">{t('Fields.Actions')}</div>;
}
