import { useTranslation } from 'react-i18next';
import { App, Button, Flex, Form, Input } from 'antd';

import { Notification } from '~/utils';
import type {
  CreatePermissionBody,
  Permission,
} from '~/features/admin/permissions/types/Permission';
import { useCreatePermission } from '~/features/admin/permissions/hooks/mutations/use-create-permission';
import { useUpdatePermission } from '~/features/admin/permissions/hooks/mutations/use-update-permission';

interface Props {
  onCloseModal?: () => void;
  permission?: Permission;
}

type FormValues = CreatePermissionBody;

const PermissionForm = (props: Props) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreatePermission();
  const updateMutation = useUpdatePermission();

  const isEditSession = Boolean(props.permission?.Id);

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
    if (!props?.permission?.Id) return;

    updateMutation.mutate(
      {
        ...values,
        Id: props?.permission?.Id,
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
      id="permission-form"
      disabled={loading}
      form={form}
      layout="vertical"
      onFinish={isEditSession ? updateHandler : createHandler}
      initialValues={{
        ...props?.permission,
      }}
    >
      <Form.Item<FormValues>
        name="PermissionCode"
        label={t('Fields.PermissionCode')}
        rules={[
          { required: true, message: t('Validation.Required') },
          { max: 25, message: 'Tối đa 25 ký tự' },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item<FormValues>
        name="PermissionName"
        label={t('Fields.PermissionName')}
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

export default PermissionForm;
