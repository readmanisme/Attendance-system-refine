// src/lib/pocketbase.js
import PocketBase from "pocketbase";

const instances = new Map<string, PocketBase>();

export const getPb = (apiUrl: string): PocketBase => {
  if (!instances.has(apiUrl)) {
    instances.set(apiUrl, new PocketBase(apiUrl));
  }
  return instances.get(apiUrl)!;
};
