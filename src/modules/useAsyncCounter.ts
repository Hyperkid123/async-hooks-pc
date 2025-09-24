import { useState } from "react";

const useAsyncCounter = () => {
  const [count, setCount] = useState(0);

  return {
    count,
    setCount
  }
}

export default useAsyncCounter;