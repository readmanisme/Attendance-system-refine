import { Create, SaveButton, useForm } from "@refinedev/antd";
import { useCreateMany, useGo, useList, useResource } from "@refinedev/core";
import { Alert, ConfigProvider, Form, Input, Segmented, Tag } from "antd";
import { useState } from "react";
export const WorkersCreate = () => {
  const { formProps, saveButtonProps } = useForm({});
  const { resource } = useResource();
  const { data: namelist } = useList({
    resource: resource?.name,
    pagination: {
      mode: "off",
    },
  });
  // console.log(namelist);
  const go = useGo();
  const { mutate } = useCreateMany({
    resource: resource?.name,
    successNotification(_data, _values, resource) {
      // console.log("mutate success", data, values, resource);
      go({
        to: {
          resource: resource!,
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
  const [Inputvalue, setInputValue] = useState("");
  const process_value = async () => {
    const names = Textareavalue.split("\n");
    const data = names
      .filter((name) => name.trim() !== "") // 过滤掉空行
      .map((name) => ({ name: name }));
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
  const [ErrorMsg, setErrorMsg] = useState<React.ReactNode | string>("");
  function handle_textarea_change(event: any) {
    let value = "";
    if (event === null) {
      if (luru_type === "单人录入") {
        // 此时类型还未变过来
        value = Textareavalue;
      } else {
        value = Inputvalue;
      }
    } else {
      if (luru_type === "单人录入") {
        setInputValue(event.currentTarget.value);
        value = event.currentTarget.value;
      } else {
        setTextareaValue(event.currentTarget.value);
        value = event.currentTarget.value;
      }
    }
    if (value.trim() === "") {
      setStatus("unknown");
      return;
    }
    let names = value.split("\n");
    // 去除空的元素
    names = names.filter((name: string) => name.trim() !== "");
    const names_list = namelist?.data.map((item) => item.name);
    if (names_list) {
      // 检查是否存在包含下划线的名字
      const has_underline_name = names.some((name) => name.includes("_"));
      if (has_underline_name) {
        setStatus("error");
        setErrorMsg(<span>
          以下mention中包含下划线，请修改后再提交：
          {names.map((name, index) => (
            <Tag color="red" key={index}>
              {name}
            </Tag>
          ))}
        </span>
        );
        return;
      }
      let exist_names = names_list.filter((name) => names.includes(name));
      const new_names = names.filter((name) => !exist_names.includes(name));
      // 检查new_names里面自身有没有重复的名字，有的话加入到exist_names中
      const duplicates = new_names.filter(
        (name, index) => new_names.indexOf(name) !== index
      );
      exist_names = exist_names.concat(duplicates);
      if (exist_names.length !== 0) {
        setStatus("error");
        setErrorMsg(
          <span>
            以下姓名已存在于数据库中：
            {exist_names.map((name, index) => (
              <Tag color="red" key={index}>
                {name}
              </Tag>
            ))}
            ，请修改后再提交。
          </span>
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
            <Input value={Inputvalue} onChange={handle_textarea_change} />
          </Form.Item>
          <Alert message="要求：姓名不能为空, 不能包含下划线, 且不能与已有姓名重复" />
          <Alert
            className="mt-2!"
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
            rows={20}
            value={Textareavalue}
            onChange={handle_textarea_change}
            placeholder="请输入批量录入的姓名，每行一个"
            className="mt-2! mb-2!"
          />
          <Alert message="要求：姓名不能为空, 不能包含下划线, 且不能与已有姓名重复" />
          <Alert
            className="mt-2!"
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
            <SaveButton
              onClick={process_value}
              disabled={status === "error" || status === "unknown"}
            >
              保存
            </SaveButton>
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
            setLuruType(value as "单人录入" | "批量录入");
            setStatus("unknown");
            setErrorMsg("");
            handle_textarea_change(null);
          }}
        />
      </ConfigProvider>
      {luru_component()}
    </Create>
  );
};
