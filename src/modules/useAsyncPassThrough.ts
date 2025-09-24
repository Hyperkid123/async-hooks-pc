import { useMemo } from "react";

const useAsyncCounter = (value: string) => {
  const innerValue = useMemo(() => value || 'default', [value]);

  return innerValue;
}

export default useAsyncCounter;