import { useTranslation } from 'react-i18next';
import { App, Button, Flex, Form, Input } from 'antd';

import { Notification } from '~/utils';
import type { CreateRoleBody, Role } from '~/features/admin/roles/types/Role';
import { useCreateRole } from '~/features/admin/roles/hooks/mutations/use-create-role';
import { useUpdateRole } from '~/features/admin/roles/hooks/mutations/use-update-role';

interface Props {
  onCloseModal?: () => void;
  role?: Role;
}

type FormValues = CreateRoleBody;

const RoleForm = (props: Props) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const isEditSession = Boolean(props.role?.Id);

  const createHandler = (values: FormValues) => {
    createMutation.mutate(values, {
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
    if (!props?.role?.Id) return;

    updateMutation.mutate(
      {
        ...values,
        Id: props?.role?.Id,
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
      id="role-form"
      disabled={loading}
      form={form}
      layout="vertical"
      onFinish={isEditSession ? updateHandler : createHandler}
      initialValues={{
        ...props?.role,
      }}
    >
      <Form.Item<FormValues>
        name="RoleName"
        label={t('Fields.RoleName')}
        rules={[{ required: true, message: t('Validation.Required') }]}
      >
        <Input />
      </Form.Item>
      <Form.Item<FormValues> name="Description" label={t('Fields.Description')}>
        <Input.TextArea rows={6} />
      </Form.Item>

      <Flex gap="middle" align="center" justify="end">
        <Button onClick={props.onCloseModal}>{t('Common.Cancel')}</Button>
        <Button loading={loading} htmlType="submit" type="primary">
          {t('Common.Confirm')}
        </Button>
      </Flex>
    </Form>
  );
};

export default RoleForm;
