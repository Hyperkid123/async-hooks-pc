import { useState } from 'react';
import useRemoteHook from '../useRemoteHook';

const PassThroughHook = () => {
  const [passThroughHookValue, setPassThroughHookValue] = useState('');

  const passThroughHook = useRemoteHook<string>({
    scope: 'chrome',
    module: './useAsyncPassThrough',
    args: [passThroughHookValue]
  });

  return (
    <div>
      {typeof passThroughHook.hookResult !== 'undefined' ? (
        <>
          <h2>Async Pass Through Hook:</h2>
          <div>
            <pre>{JSON.stringify({
              id: passThroughHook.id,
              hookResult: passThroughHook.hookResult,
              loading: passThroughHook.loading,
              error: passThroughHook.error?.message
            }, null, 2)}</pre>
          </div>
          <h3>Input to Pass Through: {passThroughHook.hookResult}</h3>
          <input
            type="text"
            value={passThroughHookValue}
            onChange={e => setPassThroughHookValue(e.target.value)}
            placeholder="Type to pass through remote hook"
          />
        </>
      ) : null}
    </div>
  );
};

export default PassThroughHook;