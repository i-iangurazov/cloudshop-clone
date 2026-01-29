import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export type RequestContext = {
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export const runWithRequestContext = async <T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<T> => storage.run({ requestId }, fn);

export const getRequestId = () => storage.getStore()?.requestId;

export const ensureRequestId = (headerValue?: string | null) =>
  headerValue ?? randomUUID();
