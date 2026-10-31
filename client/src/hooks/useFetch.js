import { useCallback, useEffect, useState } from 'react';

// Loads data from a service call and reloads when `key` changes.
//   const { data, error, loading, reload } = useFetch(() => invoiceService.list(params), JSON.stringify(params))
export function useFetch(load, key) {
  const [state, setState] = useState({ data: null, error: '', loading: true });

  const reload = useCallback(() => {
    if (!load) return;
    setState((s) => ({ ...s, loading: true }));
    load()
      .then((data) => setState({ data, error: '', loading: false }))
      .catch((err) => setState({ data: null, error: err.message, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
