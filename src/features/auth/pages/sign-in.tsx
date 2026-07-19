import { useTranslation } from 'react-i18next';

import logoMark from '/images/logo-mark.svg';
import { LoginForm } from '~/features/auth/components/login-form';

function SignIn() {
  const { t } = useTranslation();

  return (
    <>
      {/* React 19 hoists <title> to <head> natively — no Helmet needed. */}
      <title>{t('Common.Login')}</title>
      <div className="light text-foreground grid h-screen w-full place-items-center bg-slate-100 before:absolute before:top-0 before:right-0 before:left-0 before:-z-10 before:h-3/4 before:bg-[#e6edfa] before:content-[''] after:absolute after:right-0 after:bottom-0 after:left-0 after:-z-10 after:h-1/4 after:bg-[#f5f8fd] after:content-['']">
        <div className="grid h-4/5 w-4/5 grid-cols-1 rounded-3xl bg-white shadow-xl lg:grid-cols-2">
          <div className="p-4 pt-8">
            <div className="flex h-12 justify-center">
              {/* The mark, not the wordmark: the <h1> right below already says the name,
                  and a logo repeating it reads as a mistake. Decorative, so alt="". */}
              <img src={logoMark} alt="" className="h-full" />
            </div>
            <h1 className="mt-8 mb-12 text-center text-2xl">{t('App.Name')}</h1>
            <div className="mx-auto max-w-lg">
              <LoginForm />
            </div>
          </div>
          {/* Decorative brand panel (hidden below `lg`): a rich blue gradient with a
              placeholder illustration — swap `auth-illustration.svg` for the real art. */}
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

export default SignIn;
