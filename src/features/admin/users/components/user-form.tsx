import { useTranslation } from 'react-i18next';
import { App, Button, Flex, Form, Input } from 'antd';

import { Regexes, Notification } from '~/utils';
import { UserAvatar } from '~/features/admin/users/components/user-avatar';
import type { CreateUserBody, User } from '~/features/admin/users/types/User';
import { useCreateUser } from '~/features/admin/users/hooks/mutations/use-create-user';
import { useUpdateUser } from '~/features/admin/users/hooks/mutations/use-update-user';

interface Props {
  onCloseModal?: () => void;
  user?: User;
}

type FormValues = CreateUserBody;

const UserForm = (props: Props) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const isEditSession = Boolean(props.user?.Id);

  const createHandler = (values: FormValues) => {
    const formData = new FormData();
    formData.append('Avatar', values.Avatar);
    formData.append('UserName', values.UserName);
    formData.append('Email', values.Email);
    formData.append('FullName', values.FullName);
    formData.append('PhoneNumber', values.PhoneNumber);

    createMutation.mutate(formData, {
      onSuccess(response) {
        createMutation.invalidate();
        message.success(Notification.success(response).message);
        props?.onCloseModal?.();
      },
      onError(error) {
        message.error(Notification.error(error).message);
      },
    });
  };
  const updateHandler = (values: FormValues) => {
    if (!props?.user?.Id) return;
    const formData = new FormData();
    formData.append('Avatar', values.Avatar);
    formData.append('UserName', values.UserName);
    formData.append('Email', values.Email);
    formData.append('FullName', values.FullName);
    formData.append('PhoneNumber', values.PhoneNumber);
    updateMutation.mutate(
      {
        Id: props?.user?.Id,
        formData,
      },
      {
        onSuccess(response) {
          updateMutation.invalidate();
          message.success(Notification.success(response).message);
          props?.onCloseModal?.();
        },
        onError(error) {
          message.error(Notification.error(error).message);
        },
      }
    );
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form
      id="user-form"
      disabled={loading}
      form={form}
      layout="vertical"
      onFinish={isEditSession ? updateHandler : createHandler}
      initialValues={{
        ...props?.user,
      }}
    >
      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        <Form.Item
          name="Avatar"
          className="grid place-items-center md:col-span-2 xl:col-span-1 xl:row-span-3"
        >
          <UserAvatar src={props.user?.Avatar} />
        </Form.Item>
        <Form.Item<FormValues>
          name="UserName"
          label={t('Login.UserName')}
          rules={[
            { required: true, message: t('Validation.Required') },
            { pattern: Regexes.username, message: t('Validation.UserName') },
          ]}
        >
          <Input placeholder="UserName" />
        </Form.Item>
        <Form.Item<FormValues>
          name="Email"
          label={t('Login.Email')}
          rules={[
            { required: true, message: t('Validation.Required') },
            { type: 'email', message: t('Validation.Email') },
          ]}
        >
          <Input placeholder="Email" />
        </Form.Item>
        <Form.Item<FormValues>
          name="FullName"
          label={t('Fields.FullName')}
          rules={[{ required: true, message: t('Validation.Required') }]}
        >
          <Input placeholder="FullName" />
        </Form.Item>
        <Form.Item<FormValues>
          name="PhoneNumber"
          label={t('Login.PhoneNumber')}
          rules={[
            { required: true, message: t('Validation.Required') },
            { pattern: Regexes.phone, message: t('Validation.PhoneNumber') },
          ]}
        >
          <Input placeholder="PhoneNumber" />
        </Form.Item>
      </div>

      <Flex gap="middle" align="center" justify="end">
        <Button onClick={props.onCloseModal}>{t('Common.Cancel')}</Button>
        <Button loading={loading} htmlType="submit" type="primary">
          {t('Common.Confirm')}
        </Button>
      </Flex>
    </Form>
  );
};

export default UserForm;
