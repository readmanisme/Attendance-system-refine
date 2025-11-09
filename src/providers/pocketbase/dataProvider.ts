import {
  CreateResponse,
  CustomResponse,
  DataProvider,
  GetListResponse,
  GetOneResponse,
  UpdateResponse,
} from "@refinedev/core";
import PocketBase, { RecordListOptions, SendOptions } from "pocketbase";
import { isClientResponseError, toHttpError } from "./utils";
import { transformFilter } from "./filters";

export const dataProvider = (pb: PocketBase): DataProvider => ({
  // https://refine.dev/docs/data/data-provider/
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    const { current = 1, pageSize = 10, mode = "server" } = pagination ?? {};

    const sort = sorters
      ?.map((s) => `${s.order === "desc" ? "-" : ""}${s.field}`)
      .join(",");
    // console.log("untransformed filters", filters)
    const options: RecordListOptions = {
      requestKey: meta?.requestKey ?? null,
      ...(sort ? { sort } : {}),
      ...(filters ? { filter: transformFilter(filters) } : {}),
      ...(meta?.expand ? { expand: meta?.expand.join(",") } : {}),
      ...(meta?.fields ? { fields: meta?.fields?.join(",") } : {}),
    };
    // console.log("options", options)
    const collection = pb.collection(resource);
    try {
      if (mode === "server") {
        const { items, totalItems } = await collection.getList(
          current,
          pageSize,
          options
        );

        return {
          data: items,
          total: totalItems,
        } as GetListResponse<any>;
      } else {
        const items = await collection.getFullList(options);

        return {
          data: items,
          total: items.length,
        } as GetListResponse<any>;
      }
    } catch (e: unknown) {
      if (isClientResponseError(e)) {
        throw toHttpError(e);
      }
      throw e;
    }
  },

  create: async ({ resource, variables, meta }) => {
    try {
      const data = await pb
        .collection(resource)
        .create(variables as Record<string, unknown>, {
          requestKey: meta?.requestKey ?? null,
        });

      return { data } as CreateResponse<any>;
    } catch (e: unknown) {
      if (isClientResponseError(e)) {
        throw toHttpError(e);
      }
      throw e;
    }
  },

  createMany: async ({ resource, variables, meta }) => {
    // 2025年11月9日，应该没问题
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
      if (isClientResponseError(e)) {
        throw toHttpError(e);
      }
      throw e;
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
      if (isClientResponseError(e)) {
        throw toHttpError(e);
      }
      throw e;
    }
  },

  // 因为refine的useUpdateMany是一次性升级多个id的相同的字段为相同的内容，所以并不符合需求
  updateMany: async ({ resource, ids, variables, meta }) => {
    // You can handle the request according to your API requirements.
    if (meta?.type === "diff") {
      // 升级但是每个内容不一样
      try {
        const batch = pb.createBatch();
        meta.updates.forEach((update) => {
          batch
            .collection(resource)
            .update(
              update.id as string,
              update.values as Record<string, unknown>,
              {
                requestKey: meta?.requestKey ?? null,
              }
            );
        });
        const results = await batch.send(); //{"body": 一个object,"status": 200}
        const data = results.map((result) => result.body);
        return { data } as UpdateResponse<any>;
      } catch (e: unknown) {
        if (isClientResponseError(e)) {
          throw toHttpError(e);
        }
        throw e;
      }
    } else {
      // 下面的是升级但是每个升级内容一样
      try {
        const batch = pb.createBatch();
        ids.forEach((id) => {
          batch
            .collection(resource)
            .update(id as string, variables as Record<string, unknown>, {
              requestKey: meta?.requestKey ?? null,
            });
        });
        const results = await batch.send(); //{"body": 一个object,"status": 200}
        const data = results.map((result) => result.body);
        return { data } as UpdateResponse<any>;
      } catch (e: unknown) {
        if (isClientResponseError(e)) {
          throw toHttpError(e);
        }
        throw e;
      }
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
      if (isClientResponseError(e)) {
        throw toHttpError(e);
      }
      throw e;
    }
  },

  // 因为pocketbase没有实现一次性获取多个id的api，所以getMany无法实现,但是可以利用过滤器实现
  getMany: async ({ resource, ids, meta }) => {
    // 2025年11月9日，应该没问题
    try {
      const data = await pb.collection(resource).getList(1, ids.length, {
        filters: ids.map((id) => `id="${id}"`).join("||"),
        requestKey: meta?.requestKey ?? null,
        ...(meta?.expand ? { expand: meta?.expand.join(",") } : {}),
        ...(meta?.fields ? { fields: meta?.fields.join(",") } : {}),
      });

      return { data } as GetOneResponse<any>;
    } catch (e: unknown) {
      if (isClientResponseError(e)) {
        throw toHttpError(e);
      }
      throw e;
    }
  },

  deleteOne: async ({ resource, id, meta }) => {
    try {
      const deleted = await pb
        .collection(resource)
        .delete(id as string, { requestKey: meta?.requestKey ?? null });

      return { data: deleted ? { id } : undefined } as any;
    } catch (e) {
      if (isClientResponseError(e)) {
        throw toHttpError(e);
      }
      throw e;
    }
  },

  deleteMany: async ({ resource, ids, variables, meta }) => {
    // 2025年11月9日。测试的时候报错了，那是因为pb实例不是管理员级别，而你设置了基础工作类型不能删除，所以会报错
    try {
      const batch = pb.createBatch();
      ids.forEach((id) => {
        batch
          .collection(resource)
          .delete(id as string, { requestKey: meta?.requestKey ?? null });
      });
      const results = await batch.send(); //{"body": null,"status": 204}
      return { data: ids } as any; //报错那就一个都删不了，不用判断每个的状态
    } catch (e) {
      if (isClientResponseError(e)) {
        throw toHttpError(e);
      }
      throw e;
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
      if (isClientResponseError(e)) {
        throw toHttpError(e);
      }
      throw e;
    }
  },
});
