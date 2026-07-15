import { Input } from 'antd';
import type { InputProps } from 'antd';

import { useQueryParams } from '~/hooks/use-query-params';

export const SearchKeyword = (props: InputProps) => {
  const { queryParams, setQueryWithDebounce } = useQueryParams();
  return (
    <Input
      {...props}
      defaultValue={queryParams.keyword}
      onChange={(e) => setQueryWithDebounce({ keyword: e.target.value || undefined, page: 1 })}
    />
  );
};
