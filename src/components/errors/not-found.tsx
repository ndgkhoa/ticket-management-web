import { Result } from 'antd';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '~/components/ui';

export const NotFound = () => {
  const navigate = useNavigate();
  const onBack = () => {
    void navigate({ to: '/' });
  };
  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry, the page you visited does not exist."
      extra={
        <Button type="primary" onClick={onBack}>
          Trở về trang chủ
        </Button>
      }
    />
  );
};
