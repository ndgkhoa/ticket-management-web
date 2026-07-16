import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';

const SignUp = () => {
  const { t } = useTranslation();

  return (
    <div className="text-2xl text-red-500">
      {/* React 19 hoists <title> to <head> natively — no Helmet needed. */}
      <title>{t('Common.Register')}</title>
      SignUp
      <Link to="/auth/sign-in">Sign In</Link>
    </div>
  );
};

export default SignUp;
