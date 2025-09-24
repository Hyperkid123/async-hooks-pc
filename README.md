# Federated Remote Hooks

An experimental React implementation for consuming remote React hooks from federated modules at runtime, enabling dynamic hook composition across micro-frontends without build-time dependencies.

## What is this?

This project explores the possibility of using React hooks that are loaded dynamically from remote federated modules (via module federation). Instead of importing hooks at build time, we load and execute them at runtime from unknown hosts, enabling true micro-frontend autonomy.

## Why Remote Hooks?

Traditional micro-frontends share components, but sharing stateful logic (hooks) requires build-time coupling. Remote hooks enable:

- **Runtime Hook Discovery**: Load hooks from unknown federated modules
- **Stateful Logic Sharing**: Share complex state management across micro-frontends
- **Dynamic Composition**: Compose hook behavior without knowing the implementation
- **Zero Build Dependencies**: No shared packages or build-time coupling

## How it Works

### Architecture

The system uses a subscription-based state manager with "fake" components to execute remote hooks while following React's rules of hooks:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  useRemoteHook  │───▶│RemoteHookProvider│───▶│  HookExecutor   │
│                 │    │                  │    │(fake component) │
│ - Loading state │    │ - Subscriptions  │    │ - Executes hook │
│ - Hook results  │    │ - State manager  │    │ - Returns null  │
│ - Arguments     │    │ - Arg management │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Performance Optimizations

**Hybrid State Management**:
- **Hook Functions**: React state (rare changes, allows provider re-renders)
- **Arguments**: Mutable subscriptions (frequent changes, no provider re-renders)

This prevents unnecessary re-renders when hook arguments change frequently.

### Example Usage

```tsx
// Load a remote counter hook
const counterHook = useRemoteHook<{count: number; setCount: (n: number) => void}>({
  scope: 'chrome',
  module: './useAsyncCounter'
});

// Load a remote hook with arguments
const passThroughHook = useRemoteHook<string>({
  scope: 'chrome',
  module: './useAsyncPassThrough',
  args: [inputValue]
});

// Use the hook results
if (counterHook.loading) return <div>Loading...</div>;
if (counterHook.error) return <div>Error: {counterHook.error.message}</div>;

return (
  <div>
    <p>Count: {counterHook.hookResult?.count}</p>
    <button onClick={() => counterHook.hookResult?.setCount(5)}>
      Set to 5
    </button>
  </div>
);
```

## Key Features

### ✅ Dynamic Hook Loading
- Load hooks from federated modules at runtime
- No build-time dependencies on remote hook implementations
- Support for any hook that follows React's rules of hooks

### ✅ Argument Management
- Pass arguments to remote hooks
- Automatic re-execution when arguments change
- Efficient subscription system prevents unnecessary re-renders

### ✅ Isolated State
- Each `useRemoteHook` instance gets unique state
- No state sharing between different hook instances
- Proper cleanup when components unmount

### ✅ Performance Optimized
- Targeted re-renders only for affected components
- Mutable subscription system for frequent argument changes
- React state for rare hook function changes

### ✅ Error Handling
- Loading states during hook fetching
- Error boundaries for failed hook loads
- Graceful fallbacks for missing modules

## Components

### `useRemoteHook<T>(config)`
Main hook for consuming remote federated hooks.

**Parameters**:
- `scope`: Federated module scope (e.g., 'chrome')
- `module`: Module path (e.g., './useAsyncCounter')
- `importName?`: Named import (optional, defaults to default export)
- `args?`: Arguments to pass to the remote hook

**Returns**:
- `loading`: Boolean indicating if hook is still loading
- `error`: Error object if hook loading failed
- `hookResult`: The result returned by the remote hook

### `RemoteHookProvider`
Context provider that manages hook subscriptions and executions.

**Features**:
- Subscription-based state management
- Automatic cleanup on unmount
- Performance-optimized argument handling
- Fake component rendering for hook execution

## Technical Implementation

### Why "Fake" Components (HookExecutors)?

The `HookExecutor` components solve a fundamental problem with React's Rules of Hooks. We cannot conditionally call hooks, which means we can't do this:

```tsx
// ❌ This violates Rules of Hooks
const useRemoteHook = () => {
  const [hookFunction, setHookFunction] = useState(null);

  // This is INVALID - conditional hook call
  if (hookFunction) {
    const result = hookFunction(); // Can't call hooks conditionally!
    return result;
  }
}
```

React requires hooks to be called:
1. **In the same order every time**
2. **Only from React function components or custom hooks**
3. **Never inside loops, conditions, or nested functions**

Since we load hook functions asynchronously and don't know what they are until runtime, we need a way to execute them that follows these rules.

**Solution: Fake Components**

`HookExecutor` components act as "vessels" that always call the remote hook unconditionally:

```tsx
// ✅ This follows Rules of Hooks
function HookExecutor({ hookFunction }) {
  // Always call the hook (never conditional)
  const result = hookFunction();

  // Update parent with results
  useEffect(() => {
    notifyParent(result);
  }, [result]);

  return null; // "Fake" - renders nothing
}
```

This pattern ensures:
- **Hooks are always called** in the same order (never conditional)
- **Each remote hook gets its own component context** for proper state isolation
- **React's reconciliation works correctly** with consistent hook calls
- **Remote hooks can use any React features** (useState, useEffect, etc.)

### RemoteHookProvider Implementation Details

The provider manages the entire lifecycle of remote hooks through a hybrid state management approach:

#### State Management Architecture

```tsx
const RemoteHookProvider = () => {
  // Mutable state (no re-renders)
  const state = useMemo(() => ({}), []) as { [id: string]: StateEntry };

  // React state for hook functions (triggers re-renders)
  const [availableHooks, setAvailableHooks] = useState<{ [id: string]: Function }>({});

  // Mutable subscriptions for arguments (no re-renders)
  const argSubscriptions = useMemo(() => ({}), []) as { [id: string]: ArgSubscription };
};
```

**Why This Hybrid Approach?**

1. **Hook Functions** (React State):
   - Change rarely (only when new hooks are loaded)
   - Need to trigger provider re-renders to create new HookExecutor components
   - Use `setAvailableHooks()` to add/remove hook functions

2. **Hook Arguments** (Mutable Subscriptions):
   - Change frequently (user input, props updates)
   - Should NOT trigger provider re-renders (performance)
   - Use direct mutation + callback notifications

3. **Hook Results** (Mutable State):
   - Updated by HookExecutors after hook execution
   - Accessed via `getState(id)` by consumer components
   - No provider re-renders needed

#### Subscription Lifecycle

```tsx
// 1. Component subscribes
const { id, unsubscribe } = subscribe(forceUpdate);

// 2. Hook loads asynchronously
const hookFunction = await getModule(scope, module);
registerHook(id, hookFunction); // Triggers provider re-render

// 3. HookExecutor renders and subscribes to args
const unsubscribeArgs = subscribeToArgs(id, setArgs);

// 4. Hook executes and updates results
const result = hookFunction(...args);
updateState(id, { hookResult: result }); // No provider re-render

// 5. Consumer gets results
const data = getState(id); // Gets latest results
```

### useRemoteHook Implementation Details

The consumer hook manages the subscription lifecycle and provides a clean API:

#### Hook Lifecycle

```tsx
const useRemoteHook = ({ scope, module, importName, args = [] }) => {
  const [id, setId] = useState('');
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    // 1. Subscribe to state changes
    const { id, unsubscribe } = subscribe(forceUpdate);
    setId(id);

    // 2. Track mount state to prevent race conditions
    let isMounted = true;

    // 3. Load hook asynchronously
    const loadHook = async () => {
      try {
        const hookFunction = await getModule(scope, module, importName);

        // Only update if still mounted (prevents orphaned registrations)
        if (isMounted) {
          updateState(id, { loading: false, error: null });
          updateArgs(id, args); // Set initial args
          registerHook(id, hookFunction); // Create HookExecutor
        }
      } catch (error) {
        if (isMounted) {
          updateState(id, { loading: false, error });
        }
      }
    };

    // 4. Start loading
    updateState(id, { loading: true, error: null });
    loadHook();

    // 5. Cleanup on unmount
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [scope, module, importName]);

  // Handle argument updates
  useEffect(() => {
    if (id) {
      updateArgs(id, args); // Triggers HookExecutor re-render
    }
  }, [id, args]);

  return {
    id,
    loading: getState(id)?.loading ?? true,
    error: getState(id)?.error,
    hookResult: getState(id)?.hookResult
  };
};
```

#### Race Condition Prevention

The `isMounted` flag prevents a critical race condition:

```tsx
// Without isMounted flag:
// 1. Component mounts → starts async loading
// 2. Component unmounts (React strict mode) → calls unsubscribe
// 3. Async loading completes → still calls registerHook!
// 4. Orphaned HookExecutor created → memory leak

// With isMounted flag:
// 1. Component mounts → starts async loading
// 2. Component unmounts → sets isMounted = false
// 3. Async loading completes → checks isMounted → skips registration ✅
```

#### Argument Change Detection

```tsx
// Shallow comparison to detect argument changes
const argsRef = useRef(args);
const hasChanged = args.length !== argsRef.current.length ||
  args.some((arg, index) => arg !== argsRef.current[index]);

if (hasChanged) {
  argsRef.current = args;
  updateArgs(id, args); // Only update if actually changed
}
```

This prevents infinite re-renders when args arrays are recreated on every render but contain the same values.

### Federated Module Integration
Built on `@scalprum/core` for federated module loading:
- Dynamic imports from remote hosts
- Module federation support
- Runtime host discovery

## Development

### Setup

Install the dependencies:

```bash
npm install
```

### Get started

Start the dev server, and the app will be available at [http://localhost:8080](http://localhost:8080).

```bash
npm run dev
```

Build the app for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Testing Remote Hooks
The sandbox includes examples of:
- **Counter Hook**: Stateful hook with no arguments
- **PassThrough Hook**: Hook with dynamic arguments that re-executes on change

### Performance Monitoring
Use React DevTools Profiler to monitor:
- Component re-render patterns
- Performance impact of argument changes
- Hook loading times

## Experimental Status

This is an **experimental** project exploring the boundaries of what's possible with React hooks and module federation. Key considerations:

### Benefits
- True runtime composition of hook logic
- No build-time coupling between micro-frontends
- Dynamic hook discovery and execution
- Maintains React's programming model

### Limitations
- Requires "fake" components for hook execution
- Remote hooks must follow rules of hooks strictly
- Performance overhead for subscription management
- Complex debugging across federated boundaries

### Use Cases
- Micro-frontend architectures with shared state logic
- Plugin systems with hook-based APIs
- Dynamic form builders with remote validation hooks
- Multi-tenant applications with tenant-specific hooks

## Future Explorations

- Server-side rendering support for remote hooks
- Type safety across federated hook boundaries
- Development tools for remote hook debugging
- Caching strategies for frequently used hooks
- Integration with state management libraries

---

This experiment pushes the boundaries of React's composition model into the federated module domain, enabling new patterns for micro-frontend architectures while maintaining the familiar hook-based programming model.

## Learn more

To learn more about the underlying technologies:

- [Rspack documentation](https://rspack.dev) - explore Rspack features and APIs.
- [Module Federation](https://module-federation.github.io/) - learn about federated modules
- [Scalprum](https://github.com/scalprum/scaffolding) - federated module loading utilities