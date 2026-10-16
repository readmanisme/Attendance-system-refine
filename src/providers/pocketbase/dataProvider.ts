/** biome-ignore-all lint/suspicious/noExplicitAny: this is fine */
import type {
  CreateResponse,
  CustomResponse,
  DataProvider,
  GetListResponse,
  GetOneResponse,
  UpdateResponse,
} from "@refinedev/core";
import type PocketBase from "pocketbase";
import type { RecordListOptions, SendOptions } from "pocketbase";
import { isClientResponseError, toHttpError } from "./utils";
import { transformFilter } from "./filters";

/** 把 PocketBase SDK 的错误统一转成 refine 认识的 HTTP 错误再抛出 */
const rethrow = (e: unknown): never => {
  throw isClientResponseError(e) ? toHttpError(e) : e;
};

export const dataProvider = (pb: PocketBase): DataProvider => ({
  // https://refine.dev/docs/data/data-provider/
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    const { currentPage = 1, pageSize = 10, mode = "server" } = pagination ?? {};
    // refine v5用currentPage，v4用current
    const sort = sorters?.map((s) => `${s.order === "desc" ? "-" : ""}${s.field}`).join(",");
    const options: RecordListOptions = {
      requestKey: meta?.requestKey ?? null,
      ...(sort ? { sort } : {}),
      ...(filters ? { filter: transformFilter(filters) } : {}),
      ...(meta?.expand ? { expand: meta?.expand.join(",") } : {}),
      ...(meta?.fields ? { fields: meta?.fields?.join(",") } : {}),
    };
    const collection = pb.collection(resource);
    try {
      if (mode === "server") {
        const { items, totalItems } = await collection.getList(currentPage, pageSize, options);

        return {
          data: items,
          total: totalItems,
        } as GetListResponse<any>;
      } else {
        // getFullList 会自动翻页直到取完
        const items = await collection.getFullList(options);

        return {
          data: items,
          total: items.length,
        } as GetListResponse<any>;
      }
    } catch (e: unknown) {
      return rethrow(e);
    }
  },

  create: async ({ resource, variables, meta }) => {
    try {
      const data = await pb.collection(resource).create(variables as Record<string, unknown>, {
        requestKey: meta?.requestKey ?? null,
      });

      return { data } as CreateResponse<any>;
    } catch (e: unknown) {
      return rethrow(e);
    }
  },

  createMany: async ({ resource, variables, meta }) => {
    try {
      const batch = pb.createBatch();
      variables.forEach((variable) => {
        batch.collection(resource).create(variable as Record<string, unknown>, {
          requestKey: meta?.requestKey ?? null,
        });
      });
      const results = await batch.send(); //{"body": 一个object,"status": 200}
      const data = results.map((result) => result.body);
      // 测试可以，非成功会直接catch，不用自行判断
      return { data } as CreateResponse<any>;
    } catch (e: unknown) {
      return rethrow(e);
    }
  },

  update: async ({ resource, id, variables, meta }) => {
    try {
      const data = await pb
        .collection(resource)
        .update(id as string, variables as Record<string, unknown>, {
          requestKey: meta?.requestKey ?? null,
        });

      return { data } as UpdateResponse<any>;
    } catch (e: unknown) {
      return rethrow(e);
    }
  },

  // 因为refine的useUpdateMany是一次性升级多个id的相同的字段为相同的内容，所以并不符合需求，所以我根据情况来实现。
  updateMany: async ({ resource, ids, variables, meta }) => {
    // meta.type === "diff": 每个 id 应用各自的 values;否则所有 ids 应用同一份 variables
    const updates: Array<[id: string, values: unknown]> =
      meta?.type === "diff"
        ? (meta.updates as Array<{ id: string; values: unknown }>).map((u) => [u.id, u.values])
        : (ids ?? []).map((id) => [id as string, variables]);
    try {
      const batch = pb.createBatch();
      updates.forEach(([id, values]) => {
        batch.collection(resource).update(id, values as Record<string, unknown>, {
          requestKey: meta?.requestKey ?? null,
        });
      });
      const results = await batch.send(); //{"body": 一个object,"status": 200}
      const data = results.map((result) => result.body);
      return { data } as UpdateResponse<any>;
    } catch (e: unknown) {
      return rethrow(e);
    }
  },

  getOne: async ({ resource, id, meta }) => {
    try {
      const data = await pb.collection(resource).getOne(id as string, {
        requestKey: meta?.requestKey ?? null,
        ...(meta?.expand ? { expand: meta?.expand.join(",") } : {}),
        ...(meta?.fields ? { fields: meta?.fields.join(",") } : {}),
      });

      return { data } as GetOneResponse<any>;
    } catch (e: unknown) {
      return rethrow(e);
    }
  },

  // 因为pocketbase没有实现一次性获取多个id的api，所以getMany无法实现,但是可以利用过滤器实现
  getMany: async ({ resource, ids, meta }) => {
    try {
      const data = await pb.collection(resource).getList(1, ids.length, {
        filter: ids.map((id) => `id="${id}"`).join("||"),
        requestKey: meta?.requestKey ?? null,
        ...(meta?.expand ? { expand: meta?.expand.join(",") } : {}),
        ...(meta?.fields ? { fields: meta?.fields.join(",") } : {}),
      });

      return { data } as GetOneResponse<any>;
    } catch (e: unknown) {
      return rethrow(e);
    }
  },

  deleteOne: async ({ resource, id, meta }) => {
    try {
      const deleted = await pb
        .collection(resource)
        .delete(id as string, { requestKey: meta?.requestKey ?? null });

      return { data: deleted ? { id } : undefined } as any;
    } catch (e: unknown) {
      return rethrow(e);
    }
  },

  deleteMany: async ({ resource, ids, meta }) => {
    // 测试的时候报错了，那是因为pb实例不是管理员级别，而你设置了基础工作类型不能删除，所以会报错
    try {
      const batch = pb.createBatch();
      ids.forEach((id) => {
        batch.collection(resource).delete(id as string, { requestKey: meta?.requestKey ?? null });
      });
      await batch.send(); //{"body": null,"status": 204}
      return { data: ids } as any; //报错那就一个都删不了，不用判断每个的状态
    } catch (e: unknown) {
      return rethrow(e);
    }
  },

  getApiUrl: () => {
    return pb.baseURL;
  },
  custom: async ({ url, method, payload, query, headers }) => {
    try {
      const options: SendOptions = {
        method: method,
        headers: headers,
        body: payload,
        query: query as Record<string, any>,
      };
      const response = await pb.send(new URL(url).pathname, options);
      return {
        data: response,
      } as CustomResponse<any>;
    } catch (e: unknown) {
      return rethrow(e);
    }
  },
});
