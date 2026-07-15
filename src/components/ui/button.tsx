import { Button as AntButton } from 'antd';
import { forwardRef } from 'react';
import type { ButtonProps } from 'antd';
import type { Ref } from 'react';

type Props = ButtonProps;

export const Button = forwardRef((props: Props, ref: Ref<HTMLButtonElement>) => {
  return <AntButton ref={ref} {...props} />;
});
