/**
 * 注册 loader(供 `node --import ./scripts/perf-audit/register.mjs ...` 使用)。
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./loader.mjs", pathToFileURL(import.meta.filename));
