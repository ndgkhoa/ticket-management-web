import { App } from 'antd';
import React from 'react';
import type { ModalFuncProps } from 'antd';

interface Props {
  children: React.ReactElement<{ onClick: () => void }>;
  onOk?: ModalFuncProps['onOk'];
  onCancel?: ModalFuncProps['onCancel'];
  modalFuncProps?: ModalFuncProps;
  title?: string;
  content?: string;
}

export const ConfirmationButton = ({
  title,
  content,
  children,
  onOk,
  onCancel,
  modalFuncProps,
}: Props) => {
  const { modal } = App.useApp();

  const onClick = () => {
    modal.confirm({
      title: title || 'Cảnh báo',
      content: content || 'Bạn có chắc chắn thực hiện hành động này?',
      okText: 'Xác nhận',
      cancelText: 'Hủy bỏ',
      ...modalFuncProps,
      onOk,
      onCancel,
    });
  };

  return <>{React.cloneElement(children, { onClick })}</>;
};
