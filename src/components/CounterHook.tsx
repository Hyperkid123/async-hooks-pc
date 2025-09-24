import React from 'react';
import useRemoteHook from '../useRemoteHook';

const CounterHook = () => {
  const counterHook = useRemoteHook<{count: number; setCount: React.Dispatch<React.SetStateAction<number>>}>({
    scope: 'chrome',
    module: './useAsyncCounter'
  });

  // Show loading/error states
  if (counterHook.loading) return <div>Loading counter hook...</div>;
  if (counterHook.error) return <div>Error loading counter hook: {counterHook.error.message}</div>;

  return (
    <div>
      <h2>Remote Hook Info:</h2>
      <div>
        <pre>{JSON.stringify({
          id: counterHook.id,
          hookResult: counterHook.hookResult,
          loading: counterHook.loading,
          error: counterHook.error?.message
        }, null, 2)}</pre>
      </div>
      {typeof counterHook.hookResult !== 'undefined' ? (
        <div>
          <h3>Counter from Remote Hook:</h3>
          <p>Count: {counterHook.hookResult.count}</p>
          <button onClick={() => counterHook.hookResult?.setCount(prev => prev - 1)}>-</button>
          <button onClick={() => counterHook.hookResult?.setCount(prev => prev + 1)}>+</button>
        </div>
      ) : null}
    </div>
  );
};

export default CounterHook;