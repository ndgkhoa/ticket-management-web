import { useTranslation } from 'react-i18next';

import logoMark from '/images/logo-mark.svg';
import { SignUpForm } from '~/features/auth/components/sign-up-form';

function SignUp() {
  const { t } = useTranslation();

  return (
    <>
      {}
      <title>{t('Common.Register')}</title>
      <div className="light text-foreground grid h-screen w-full place-items-center bg-slate-100 before:absolute before:top-0 before:right-0 before:left-0 before:-z-10 before:h-3/4 before:bg-[#e6edfa] before:content-[''] after:absolute after:right-0 after:bottom-0 after:left-0 after:-z-10 after:h-1/4 after:bg-[#f5f8fd] after:content-['']">
        <div className="grid h-4/5 w-4/5 grid-cols-1 rounded-3xl bg-white shadow-xl lg:grid-cols-2">
          <div className="overflow-y-auto p-4 pt-8">
            <div className="flex h-12 justify-center">
              <img src={logoMark} alt="" className="h-full" />
            </div>
            <h1 className="mt-6 mb-8 text-center text-2xl">{t('App.Name')}</h1>
            <div className="mx-auto max-w-lg">
              <SignUpForm />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="hidden items-center justify-center rounded-r-3xl bg-gradient-to-br from-[#0958d9] via-[#1d4ed8] to-[#0a2e6b] p-12 lg:flex"
          >
            <img src="/images/auth-illustration.svg" alt="" className="w-full max-w-sm" />
          </div>
        </div>
      </div>
    </>
  );
}

export default SignUp;
