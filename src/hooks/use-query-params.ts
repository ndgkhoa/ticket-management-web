import { useEffect, useMemo, useRef } from 'react';
import {
  useQueryParams as useQueryParamsLib,
  NumberParam,
  StringParam,
  withDefault,
} from 'use-query-params';
import debounce from 'lodash/debounce';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_KEYWORD = undefined;

const DEBOUNCE_TIME = 500;

export const useQueryParams = () => {
  const [queryParams, setQueryParams] = useQueryParamsLib({
    page: withDefault(NumberParam, DEFAULT_PAGE),
    pageSize: withDefault(NumberParam, DEFAULT_PAGE_SIZE),
    keyword: withDefault(StringParam, DEFAULT_KEYWORD),
  });

  /**
   * `setQueryParams` is not referentially stable across renders, so it is read
   * through a ref. That keeps the debounced setter below out of its dependency
   * list, which is what lets the setter be created exactly once.
   */
  const setQueryParamsRef = useRef(setQueryParams);
  useEffect(() => {
    setQueryParamsRef.current = setQueryParams;
  });

  /**
   * The debounced setter must survive re-renders. Creating it inline would build a
   * fresh closure — and a fresh timer — every render, so a re-render mid-typing
   * would split the pending timer and let two writes through instead of one.
   */
  const setQueryWithDebounce = useMemo(
    () =>
      debounce((params: Partial<typeof queryParams>) => {
        setQueryParamsRef.current(params);
      }, DEBOUNCE_TIME),
    []
  );

  // Drop any in-flight write on unmount, so a pending debounce cannot fire against
  // a torn-down component.
  useEffect(() => () => setQueryWithDebounce.cancel(), [setQueryWithDebounce]);

  return { queryParams, setQueryParams, setQueryWithDebounce };
};
