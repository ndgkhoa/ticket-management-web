import { useTranslation } from 'react-i18next';

import logoMark from '/images/logo-mark.svg';
import { LoginForm } from '~/features/auth/components/login-form';

const SignIn = () => {
  const { t } = useTranslation();

  return (
    <>
      {/* React 19 hoists <title> to <head> natively — no Helmet needed. */}
      <title>{t('Common.Login')}</title>
      <div className="grid h-screen w-full place-items-center before:absolute before:top-0 before:right-0 before:left-0 before:-z-10 before:h-3/4 before:bg-[#4193a8] before:content-[''] after:absolute after:right-0 after:bottom-0 after:left-0 after:-z-10 after:h-1/4 after:bg-[#e8f4f4] after:content-['']">
        <div className="grid h-4/5 w-4/5 grid-cols-1 rounded-3xl bg-white lg:grid-cols-2">
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
          {/* A gradient rather than a photo: the previous background was a stock image
              of unclear provenance, and it cost a 69 KB request to decorate a panel
              that is hidden below `lg` anyway. */}
          <div
            aria-hidden="true"
            className="hidden rounded-r-3xl bg-gradient-to-br from-[#0958d9] via-[#4193a8] to-[#e8f4f4] lg:block"
          />
        </div>
      </div>
    </>
  );
};

export default SignIn;
