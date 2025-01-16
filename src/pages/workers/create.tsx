import { Create, SaveButton, useForm } from "@refinedev/antd";
import { useCreateMany, useGo, useList, useResource } from "@refinedev/core";
import { Alert, Button, ConfigProvider, Form, Input, Segmented } from "antd";
import { useState } from "react";
export const WorkersCreate = () => {
  const { formProps, saveButtonProps } = useForm({});
  const { resources, resource } = useResource();
  const {
    data: namelist,
    isLoading,
    isError,
  } = useList({
    resource: resource?.name,
    pagination:{
      mode:"off"
    }
  });
  // console.log(namelist);
  const go = useGo();
  const { mutate } = useCreateMany({
    resource: resource?.name,
    successNotification(data, values, resource) {
      // console.log("mutate success", data, values, resource);
      go({
        to: {
          resource: resource,
          action: "list",
        },
        type: "push",
        // 根据hooks-redirection-index.ts
      });
      return {
        message: `Successfully created ${resource}`,
        description: "Success",
        type: "success",
      };
    },
    errorNotification(error, variables, resource) {
      // console.log("mutate error", error, variables, resource);
      return {
        message: `There was an error creating ${resource}(status code: ${error?.statusCode})`,
        description: "Failed to create record",
        type: "error",
      };
    },
    // mutationOptions: {
    // 这里不能设置，不然会覆盖refine的默认配置
    //   onSuccess(data, variables, context) {
    //     console.log("mutate success", data, variables, context);
    //   },
    //   onError(error, variables, context) {
    //     console.log("mutate error", error, variables, context);
    //   },
    // },
  });

  const [luru_type, setLuruType] = useState<"单人录入" | "批量录入">(
    "批量录入"
  );
  const [Textareavalue, setTextareaValue] = useState("");
  const process_value = async () => {
    // console.log(value);
    const names = Textareavalue.split("\n");
    // const names_list=await pb.collection("workers").getFullList();
    // 找出已经存在于数据库中的人名
    // const exist_names = names_list.map(item => item.name);
    // 提交其他人名到数据库
    // const new_names = names.filter(name => !exist_names.includes(name));
    // new_names.forEach(async name => {
    // await pb.collection("workers").create({"name": name});
    // });
    const data = names.map((name) => ({ name: name }));
    mutate({
      values: data,
      // errorNotification: (data, values, resource) => {
      // 使用createmany的话，即便只有一个错了，也会错，但是对的会被创建
      // 我们也无法知道那个对了那个错了，所以我们需要在此之前就检查错误
      // return {
      //   message: `Something went wrong when getting ${data?.id}`,
      //   description: "Error",
      //   type: "error",
      // };
      // },
    });
  };
  const [status, setStatus] = useState<"success" | "error" | "unknown">(
    "unknown"
  );
  const [ErrorMsg, setErrorMsg] = useState<string>("");
  function handle_textarea_change(event: any) {
    setTextareaValue(event.currentTarget.value);
    const value = event.currentTarget.value;
    if (value.trim() === "") {
      setStatus("unknown");
      return;
    }
    let names = value.split("\n");
    // 去除空的元素
    names = names.filter((name:string) => name.trim() !== "");
    const names_list = namelist?.data.map((item) => item.name);
    if (names_list) {
      const exist_names = names_list.filter((name) => names.includes(name));
      const new_names = names.filter((name) => !exist_names.includes(name));
      if (exist_names.length !== 0) {
        setStatus("error");
        setErrorMsg(
          `以下姓名已存在于数据库中：${exist_names.join("、")},请修改后再提交。`
        );
      } else if (new_names.length !== 0) {
        setStatus("success");
      }
      // else {
      //   setStatus('error');
      //   setErrorMsg('输入数据为空，请重新输入');
      // }
    }
  }

  const getAlertMessage = () => {
    switch (status) {
      case "success":
        return "校验通过";
      case "error":
        return "校验不通过";
      default:
        return "未知";
    }
  };
  const getAlertType = () => {
    switch (status) {
      case "success":
        return "success";
      case "error":
        return "error";
      default:
        return "info";
    }
  };
  const getAlertDescription = () => {
    switch (status) {
      case "success":
        return "数据校验通过，可以提交";
      case "error":
        // return '数据校验不通过，请检查输入';
        return ErrorMsg;
      default:
        return "输入数据以进行检查；空行将被忽略";
    }
  };
  function luru_component() {
    if (luru_type === "单人录入") {
      return (
        <Form {...formProps} layout="vertical">
          <Form.Item
            label={"姓名"}
            name={["name"]}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input
            onChange={handle_textarea_change}
            />
          </Form.Item>
          <Alert
            className="mt-2"
            message={getAlertMessage()}
            description={getAlertDescription()}
            type={getAlertType()}
            showIcon
          />
        </Form>
        
      );
    } else {
      return (
        <>
          <Input.TextArea
            // TODO ant design的普遍缺少label，如果有必要，可以更换到mantine ui中
            rows={4}
            value={Textareavalue}
            onChange={handle_textarea_change}
            placeholder="请输入批量录入的姓名，每行一个"
            className="mt-2"
          />
          <Alert
            className="mt-2"
            message={getAlertMessage()}
            description={getAlertDescription()}
            type={getAlertType()}
            showIcon
          />
        </>
      );
    }
  }

  return (
    <Create
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => (
        <>
          {luru_type === "单人录入" ? (
            <SaveButton
              {...saveButtonProps}
              // type="primary"
              // style={{ marginRight: 8 }}
              disabled={status === "error" || status === "unknown"}
            >
              保存
            </SaveButton>
          ) : luru_type === "批量录入" ? (
            <SaveButton onClick={process_value}
            disabled={status === "error" || status === "unknown"}
            >保存</SaveButton>
          ) : null}
        </>
      )}
    >
      <ConfigProvider
        theme={{
          components: {
            Segmented: {
              itemSelectedBg: "#228be6",
              // itemColor:"#ffffff",
              itemSelectedColor: "#ffffff",
            },
          },
        }}
      >
        <Segmented<string>
          options={["单人录入", "批量录入"]}
          block
          value={luru_type}
          onChange={(value) => {
            // console.log(value); // string
            setLuruType(value);
          }}
        />
      </ConfigProvider>
      {luru_component()}
    </Create>
  );
};
