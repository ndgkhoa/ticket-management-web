import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '~/components/ui';
import { ErrorState } from '~/components/errors/error-state';

export function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <ErrorState
      code="404"
      title={t('Errors.NotFoundTitle')}
      description={t('Errors.NotFoundDescription')}
      action={<Button onClick={() => void navigate({ to: '/' })}>{t('Common.BackToHome')}</Button>}
    />
  );
}
