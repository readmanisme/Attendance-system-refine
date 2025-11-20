// src/lib/pocketbase.js
import PocketBase from "pocketbase";

const instances = new Map<string, PocketBase>();

export const getPbAdmin = async (apiUrl: string): Promise<PocketBase> => {
  if (!instances.has(apiUrl)) {
    const pb = new PocketBase(apiUrl);
    await pb.collection("_superusers").authWithPassword(__Backend_UserName__, __Backend_Password__);
    instances.set(apiUrl, pb);
  }
  return instances.get(apiUrl)!;
};
