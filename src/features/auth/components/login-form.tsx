import { useTranslation } from 'react-i18next';
import { Divider, Input, Button, Form, Flex, App } from 'antd';
import { useNavigate, useSearch } from '@tanstack/react-router';

import { GoogleIcon } from '~/components/icons';
import { useSignIn } from '~/features/auth/api/use-sign-in';

type LoginFormValues = {
  email: string;
  password: string;
};

export const LoginForm = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<LoginFormValues>();
  const navigate = useNavigate();

  const { mutate: signIn, isPending } = useSignIn();
  // Where the guard sent them from, already validated to an internal path by the
  // sign-in route schema. `strict: false` reads it without pinning this component to
  // that one route, so it also renders in isolation (tests) where there is no match.
  const { redirect } = useSearch({ strict: false }) as { redirect?: string };

  const onLogin = (values: LoginFormValues) => {
    signIn(values, {
      // Success sets no state here: the SDK emits SIGNED_IN and the auth store
      // reacts through onAuthStateChange. This component only navigates — back to
      // where the user was headed, or home.
      onSuccess: () => navigate({ to: redirect ?? '/' }),
      onError: () => message.error(t('Validation.Mismatch')),
    });
  };

  return (
    <>
      <Flex wrap align="center" gap="small">
        <Button
          disabled={isPending}
          className="flex-1"
          size="large"
          icon={<GoogleIcon className="h-6 w-6 max-w-6 min-w-6" />}
          type="default"
          onClick={() => message.info(t('App.FeatureComingSoon'))}
        >
          <span className="font-light"> {t('Login.Google')}</span>
        </Button>
      </Flex>
      <Divider plain>{t('Login.Or')}</Divider>
      <Form disabled={isPending} form={form} size="large" layout="vertical" onFinish={onLogin}>
        <Form.Item<LoginFormValues>
          name="email"
          label={t('Login.Email')}
          rules={[
            { required: true, message: t('Validation.Required') },
            { type: 'email', message: t('Validation.Email') },
          ]}
        >
          <Input autoComplete="username" size="large" />
        </Form.Item>
        <Form.Item<LoginFormValues>
          name="password"
          label={t('Login.Password')}
          rules={[{ required: true, message: t('Validation.Required') }]}
        >
          <Input.Password autoComplete="current-password" size="large" />
        </Form.Item>
        <Button
          loading={isPending}
          block
          className="mt-2"
          htmlType="submit"
          size="large"
          type="primary"
        >
          {t('Common.Login')}
        </Button>
      </Form>
    </>
  );
};
