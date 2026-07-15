import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Popconfirm as AntPopconfirm } from 'antd';
import type { PopconfirmProps } from 'antd';

export const Popconfirm = memo((props: PopconfirmProps) => {
  const { t } = useTranslation();

  const popconfirmProps: PopconfirmProps = {
    destroyOnHidden: true,
    cancelText: t('Common.Cancel'),
    okText: t('Common.Confirm'),
    ...props,
  };

  return <AntPopconfirm {...popconfirmProps} />;
});
