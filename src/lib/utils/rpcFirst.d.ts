// src/lib/utils/rpcFirst.d.ts
/**
 * Minimal type shim for rpcFirst (implemented in JS).
 * It runs an RPC; on 42883/missing fn (or provided error), it runs a fallback.
 * This keeps TypeScript happy in services that import it.
 */
declare module "@/lib/utils/rpcFirst" {
  export type RpcResult<T> = { data: T | null; error: any | null };

  const rpcFirst: <T>(
    tryRpc: () => Promise<RpcResult<T>>,
    fallback: () => Promise<RpcResult<T>>
  ) => Promise<RpcResult<T>>;

  export default rpcFirst;
}
