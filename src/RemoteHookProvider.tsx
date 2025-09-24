import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

type StateEntry = {
  id: string;
  value: any;
  notify: () => void;
};

type ArgSubscription = {
  id: string;
  args: any[];
  argNotifiers: Set<(args: any[]) => void>;
};

type RemoteHookContextType = {
  subscribe: (notify: () => void) => { id: string; unsubscribe: () => void };
  updateState: (id: string, value: any) => void;
  getState: (id: string) => any;
  registerHook: (id: string, hookFunction: (...args: any[]) => any) => void;
  updateArgs: (id: string, args: any[]) => void;
  subscribeToArgs: (id: string, callback: (args: any[]) => void) => () => void;
};

export const RemoteHookContext = createContext<RemoteHookContextType>({
  subscribe: () => ({ id: '', unsubscribe: () => {} }),
  updateState: () => {},
  getState: () => undefined,
  registerHook: () => {},
  updateArgs: () => {},
  subscribeToArgs: () => () => {}
});

// Fake component that executes the remote hook
function HookExecutor({
  id,
  hookFunction,
  updateState
}: {
  id: string;
  hookFunction: (...args: any[]) => any;
  updateState: (id: string, value: any) => void;
}) {
  const { subscribeToArgs } = useContext(RemoteHookContext);
  const [args, setArgs] = useState<any[]>([]);

  // Subscribe to argument changes
  useEffect(() => {
    const unsubscribe = subscribeToArgs(id, setArgs);
    return unsubscribe;
  }, [id, subscribeToArgs]);

  // Always call the hook with args (rules of hooks)
  const hookResult = hookFunction(...args);

  // Update state with the result
  useEffect(() => {
    updateState(id, { hookResult });
  }, [hookResult, id, updateState]);

  return null;
}

const RemoteHookProvider = ({ children }: PropsWithChildren) => {
  const state = useMemo(() => ({}), []) as { [id: string]: StateEntry };

  // React state to track available hooks (for re-rendering)
  const [availableHooks, setAvailableHooks] = useState<{ [id: string]: (...args: any[]) => any }>({});

  // Mutable state for arguments (no re-renders)
  const argSubscriptions = useMemo(() => ({}), []) as { [id: string]: ArgSubscription };

  // Cleanup all subscriptions when provider unmounts
  useEffect(() => {
    return () => {
      Object.keys(state).forEach(id => {
        delete state[id];
      });
    };
  }, [state]);

  const subscribe = useCallback((notify: () => void) => {
    const id = crypto.randomUUID();
    state[id] = { id, value: 0, notify };

    return {
      id,
      unsubscribe: () => {
        console.log('Unsubscribing id:', id);
        delete state[id];
        // Also remove from availableHooks and hookArgs to stop rendering HookExecutor
        setAvailableHooks(prev => {
          const { [id]: removed, ...rest } = prev;
          return rest;
        });
        delete argSubscriptions[id];
      }
    };
  }, []);


  const updateState = useCallback((id: string, value: any) => {
    const entry = state[id];
    if (!entry) {
      return;
    }

    // Merge with existing value
    entry.value = { ...entry.value, ...value };
    entry.notify();
  }, []);

  const getState = useCallback((id: string) => {
    return state[id]?.value;
  }, []);

  const registerHook = useCallback((id: string, hookFunction: (...args: any[]) => any) => {
    console.log('Registering hook for id:', id);
    setAvailableHooks(prev => ({
      ...prev,
      [id]: hookFunction
    }));
  }, []);

  const updateArgs = useCallback((id: string, args: any[]) => {
    if (!argSubscriptions[id]) {
      argSubscriptions[id] = { id, args, argNotifiers: new Set() };
    } else {
      argSubscriptions[id].args = args;
    }

    // Notify all arg subscribers for this ID
    argSubscriptions[id].argNotifiers.forEach(callback => {
      try {
        callback(args);
      } catch (err) {
        console.error('Error in arg subscriber callback:', err);
      }
    });
  }, [argSubscriptions]);

  const subscribeToArgs = useCallback((id: string, callback: (args: any[]) => void) => {
    if (!argSubscriptions[id]) {
      argSubscriptions[id] = { id, args: [], argNotifiers: new Set() };
    }

    argSubscriptions[id].argNotifiers.add(callback);

    // Call immediately with current args if available
    if (argSubscriptions[id].args.length > 0) {
      callback(argSubscriptions[id].args);
    }

    return () => {
      argSubscriptions[id]?.argNotifiers.delete(callback);
    };
  }, [argSubscriptions]);

  console.log({availableHooks, argSubscriptions});

  return (
    <RemoteHookContext.Provider value={{ subscribe, updateState, getState, registerHook, updateArgs, subscribeToArgs }}>
      {/* Render fake components to execute hooks */}
      {Object.entries(availableHooks).map(([id, hookFunction]) => (
        <HookExecutor
          key={id}
          id={id}
          hookFunction={hookFunction}
          updateState={updateState}
        />
      ))}
      {children}
    </RemoteHookContext.Provider>
  );
};

export default RemoteHookProvider;