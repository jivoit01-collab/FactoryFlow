import { useMemo, useState } from 'react';

import { useDebounce } from '@/shared/hooks';

import type { FAListParams } from '../types';
import { monthParams } from '../utils/faGrpo.utils';

/**
 * Search, month and page state for one Fixed Asset GRPO list, turned into the
 * query params the backend reads (`search`, `year` + `month`, `page`,
 * `page_size`). Changing the search or the month goes back to page 1.
 */
export function useFAListState(extra: FAListParams = {}) {
  const [search, setSearchRaw] = useState('');
  const [month, setMonthRaw] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(25);
  const debouncedSearch = useDebounce(search, 300);

  const extraKey = JSON.stringify(extra);
  const params = useMemo<FAListParams>(
    () => ({
      ...(JSON.parse(extraKey) as FAListParams),
      ...monthParams(month),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      page,
      page_size: pageSize,
    }),
    [extraKey, month, debouncedSearch, page, pageSize],
  );

  return {
    params,
    search,
    setSearch: (value: string) => {
      setSearchRaw(value);
      setPage(1);
    },
    month,
    setMonth: (value: string) => {
      setMonthRaw(value);
      setPage(1);
    },
    page,
    setPage,
    pageSize,
    setPageSize: (value: number) => {
      setPageSizeRaw(value);
      setPage(1);
    },
  };
}
