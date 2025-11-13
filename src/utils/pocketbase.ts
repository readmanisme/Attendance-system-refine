// src/lib/pocketbase.js
import PocketBase from "pocketbase";

const instances = new Map();

export const getPb = (apiUrl: string) => {
  if (!instances.has(apiUrl)) {
    instances.set(apiUrl, new PocketBase(apiUrl));
  }
  return instances.get(apiUrl);
};
