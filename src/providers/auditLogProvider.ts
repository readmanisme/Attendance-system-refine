import { AuditLogProvider } from "@refinedev/core";

export const auditLogProvider: AuditLogProvider = {
  get: async (params) => {
    // const { resource, meta, action, author, metaData } = params;

    // const response = await fetch(
    //   `https://example.com/api/audit-logs/${resource}/${meta.id}`,
    //   {
    //     method: "GET",
    //   },
    // );

    // const data = await response.json();

    // return data;
  },
  // Ideally, audit logs should be created in the backend.
  // It's not reliable source of truth as it can be manipulated by the user.
  create: async (params) => {
    const { resource, meta, action, author, data, previousData } = params;

    console.log(resource); // "produts", "posts", etc.
    console.log(meta); // { id: "1" }, { id: "2" }, etc.
    console.log(action); // "create", "update", "delete"
    // author object is `useGetIdentity` hook's return value.
    console.log(author); // { id: "1", name: "John Doe" }
    console.log(data); // { name: "Product 1", price: 100 }
    console.log(previousData); // { name: "Product 1", price: 50 }

    await fetch("https://example.com/api/audit-logs", {
      method: "POST",
      body: JSON.stringify(params),
    });

    return { success: true };
  },
  update: async (params) => {
    // const { id, name, ...rest } = params;
    // console.log(id); // "1"
    // console.log(name); // "Created Product 1"
    // console.log(rest); // { foo: "bar" }

    // await fetch(`https://example.com/api/audit-logs/${id}`, {
    //   method: "PATCH",
    //   body: JSON.stringify(params),
    // });

    // return { success: true };
  },
};