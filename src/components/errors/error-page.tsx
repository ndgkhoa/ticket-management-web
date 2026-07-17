import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '~/components/ui';
import { ErrorState } from '~/components/errors/error-state';

type Props = {
  /** Overrides the default description — e.g. a query's error message. */
  subTitle?: string;
};

export function ErrorPage({ subTitle }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <ErrorState
      code="500"
      title={t('Errors.ServerErrorTitle')}
      description={subTitle ?? t('Errors.ServerErrorDescription')}
      action={<Button onClick={() => void navigate({ to: '/' })}>{t('Common.BackToHome')}</Button>}
    />
  );
}
