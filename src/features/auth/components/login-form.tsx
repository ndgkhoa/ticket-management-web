import { useTranslation } from 'react-i18next';
import { Divider, Input, Button, Form, Flex, App } from 'antd';
import { useNavigate } from 'react-router-dom';

import { GoogleIcon } from '~/components/icons';
import { useLoginWithUserName } from '~/features/auth/hooks/mutations/use-login-with-username';
import { useAuthStore } from '~/stores/auth';
import { AuthProviders } from '~/features/auth/types/AuthProviders';

type LoginFormType = {
  UserName: string;
  Password: string;
};

export const LoginForm = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const { mutate: loginWithUserName, isPending: isLoginWithUserNamePending } =
    useLoginWithUserName();
  const { setAuth } = useAuthStore();

  const onLogin = (values: LoginFormType) => {
    loginWithUserName(values, {
      onSuccess: (response) => {
        setAuth({
          ...response.data.Data,
          isAuthenticated: true,
          provider: AuthProviders.Local,
        });
        navigate('/');
      },
      onError: () => {
        message.error(t('Validation.Mismatch'));
      },
    });
  };

  const disabled = isLoginWithUserNamePending;

  return (
    <>
      <Flex wrap align="center" gap="small">
        <Button
          disabled={disabled}
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
      <Form disabled={disabled} form={form} size="large" layout="vertical" onFinish={onLogin}>
        <Form.Item<LoginFormType>
          name="UserName"
          label={t('Login.UserName')}
          rules={[{ required: true, message: t('Validation.Required') }]}
        >
          <Input autoComplete="username" size="large" />
        </Form.Item>
        <Form.Item<LoginFormType>
          name="Password"
          label={t('Login.Password')}
          rules={[{ required: true, message: t('Validation.Required') }]}
        >
          <Input.Password autoComplete="current-password" size="large" />
        </Form.Item>
        <Button
          loading={isLoginWithUserNamePending}
          block
          className="mt-2"
          htmlType="submit"
          size="large"
          type="primary"
        >
          {t('Common.Login')}
        </Button>
      </Form>
      {/* <div className="mt-8 flex justify-center">
        <Select
          defaultValue="en"
          onChange={(value) => setLanguage(value)}
          options={[
            { value: 'vi', label: t('Common.Vi') },
            { value: 'en', label: t('Common.En') },
          ]}
        />
      </div> */}
    </>
  );
};
