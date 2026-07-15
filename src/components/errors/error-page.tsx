import { Button, Result } from 'antd';
import type { ResultProps } from 'antd';

export const ErrorPage = (props: ResultProps) => {
  return (
    <Result
      status="500"
      title="500"
      subTitle={props.subTitle || 'Sorry, something went wrong.'}
      extra={<Button type="primary">Back Home</Button>}
    />
  );
};
