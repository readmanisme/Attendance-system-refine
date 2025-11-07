import { Action, IResourceItem, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import {
  ErrorComponent,
  ThemedLayoutV2,
  ThemedSiderV2,
  ThemedTitleV2,
  useNotificationProvider,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerBindings, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import dataProvider from "@refinedev/simple-rest";
import { App as AntdApp, Avatar, Space,Typography } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { Header } from "./components/header";
import { ColorModeContextProvider } from "./contexts/color-mode";
import {
  BlogPostCreate,
  BlogPostEdit,
  BlogPostList,
  BlogPostShow,
} from "./pages/blog-posts";
import {
  CategoryCreate,
  CategoryEdit,
  CategoryList,
  CategoryShow,
} from "./pages/categories";
import { TestPage } from "./pages/test-page/test-page";
import {
  WorkersCreate,
  WorkersEdit,
  WorkersList,
  WorkersShow,
} from "./pages/workers";
import PocketBasePage from "./pages/background/pocketbase";
import PocketBase from "pocketbase";
import { dataProvider as pocketbaseDataProvider } from "./providers/pocketbase";
// } from "refine-pocketbase";
import {
  AttendanceRecordCreate,
  AttendanceRecordEdit,
  AttendanceRecordList,
  AttendanceRecordShow,
} from "./pages/attendance-record";
import { Badge, MantineProvider } from "@mantine/core";
import logo from "@/public/logo.png";
import QianDaoPage from "./pages/qian-dao/qian-dao";
// import XinZiList from "./pages/xin-zi/list";
// import XinZiShow from "./pages/xin-zi/show";
import GongShiList from "./pages/gong-shi/list_table";
// import ZhuYe from "./pages/zhu-ye/zhu-ye";
import {
  SampleList,
  SampleCreate,
  SampleEdit,
  SampleShow,
} from "./pages/Inferencer_example";
import {
  ShowWorkType,
  EditWorkType,
  CreateWorkType,
  ListWorkType,
} from "./pages/workType";
import {
  IconChecks,
  IconUsers,
  IconList,
  IconClipboardData,
  IconLockSquareRounded,
  IconMicroscope,
  IconCoinYen,
  IconReport,
  IconHome,
  IconBriefcase,
  IconCode,
} from "@tabler/icons-react";
import {
  SalaryTypeList,
  SalaryTypeCreate,
  SalaryTypeEdit,
  SalaryTypeShow,
} from "./pages/xin-zi";
import { GlobalHelp } from "./components/GlobalHelp";
import { useTranslation } from "react-i18next";
const pb = new PocketBase(__BACKEND_API_URL__);
function get_sample_resource_or_route(
  type: "resource" | "route",
  location: "front" | "behind"
) {
  if (import.meta.env.PROD) {
    if (type === "resource") {
      return [];
    } else if (type === "route") {
      return;
    }
  } else if (type === "resource") {
    if (location === "front") {
      return [
        {
          name: "blog_posts",
          list: "/blog-posts",
          create: "/blog-posts/create",
          edit: "/blog-posts/edit/:id",
          show: "/blog-posts/show/:id",
          meta: {
            canDelete: true,
            dataProviderName: "example",
            icon: <IconList />,
          },
        },
        {
          name: "categories",
          list: "/categories",
          create: "/categories/create",
          edit: "/categories/edit/:id",
          show: "/categories/show/:id",
          meta: {
            canDelete: true,
            dataProviderName: "example",
            icon: <IconList />,
          },
        },
      ];
    } else if (location === "behind") {
      return [
        {
          name: "测试页面",
          list: "/test-page",
          // create: "/test-page/create",
          meta: {
            dataProviderName: undefined,
            icon: <IconMicroscope />,
            hide: !import.meta.env.DEV,
          },
        },
        {
          name: "Inferencer生成",
          list: "/Inferencer_example",
          create: "/Inferencer_example/create",
          edit: "/Inferencer_example/edit/:id",
          show: "/Inferencer_example/show/:id",
          meta: {
            icon: <IconCode />,
            hide: !import.meta.env.DEV,
          },
        },
      ];
    }
  } else if (type === "route") {
    if (location === "front") {
      return (
        <>
          <Route path="/blog-posts">
            <Route index element={<BlogPostList />} />
            <Route path="create" element={<BlogPostCreate />} />
            <Route path="edit/:id" element={<BlogPostEdit />} />
            <Route path="show/:id" element={<BlogPostShow />} />
          </Route>
          <Route path="/categories">
            <Route index element={<CategoryList />} />
            <Route path="create" element={<CategoryCreate />} />
            <Route path="edit/:id" element={<CategoryEdit />} />
            <Route path="show/:id" element={<CategoryShow />} />
          </Route>
        </>
      );
    } else if (location === "behind") {
      return (
        <>
          {" "}
          <Route path="/test-page" element={<TestPage />} />
          <Route path="/Inferencer_example">
            <Route index element={<SampleList />} />
            <Route path="create" element={<SampleCreate />} />
            <Route path="edit/:id" element={<SampleEdit />} />
            <Route path="show/:id" element={<SampleShow />} />
          </Route>
        </>
      );
    }
  }
}
const customTitleHandler = ({
    // DocumentTitleHandler是比useDocumentTitle强大与方便的多的文档标题处理器
  // https://refine.dev/docs/routing/integrations/react-router/#properties-3
  resource,
  action,
}: { resource?: IResourceItem | undefined; action?: Action | undefined; params?: Record<string, string | undefined> | undefined; pathname?: string | undefined; autoGeneratedTitle: string; }) => {
  let title = __SystemName__; // Default title

  const actionPrefixMatcher = {
    create: "创建中 ",
    clone: `复制中 `,
    edit: `编辑中 `,
    show: `现实中 `,
    list: "",
  };
  const identifier = resource?.meta?.label ?? resource?.name;
  if (action) {
    title = `${identifier} ${actionPrefixMatcher[action]}| ${__SystemName__}`;
  }
  return title;
};
import i18n from "./i18nProvider";
function App() {
  const { t, i18n: i18n2 } = useTranslation();
  const i18nProvider = {
    //@ts-expect-error,正常的
    translate: (key: string, params: object) => t(key, params),
    changeLocale: (lang: string) => i18n.changeLanguage(lang),
    getLocale: () => i18n2.language,
  };
  return (
    <BrowserRouter>
      {/* <GitHubBanner /> */}
      {/* <RefineKbarProvider> */}
        <MantineProvider>
          <ColorModeContextProvider>
            {/* <MantineProvider> */}
            <AntdApp>
              {/* <MantineProvider> */}
              <DevtoolsProvider>
                <Refine
                  dataProvider={{
                    default: pocketbaseDataProvider(pb),
                    example: dataProvider("https://api.fake-rest.refine.dev"),
                  }}
                  i18nProvider={i18nProvider}
                  // eslint-disable-next-line react-hooks/react-compiler
                  notificationProvider={useNotificationProvider}
                  routerProvider={routerBindings}
                  resources={[
                    ...get_sample_resource_or_route("resource", "front")  as IResourceItem[],
                    // {
                    //   name: "zhuye",
                    //   list: "/zhuye",
                    //   meta: {
                    //     label: "主页",
                    //     dataProviderName: undefined,
                    //     icon: <IconHome />,
                    //   },
                    // },
                    {
                      name: "qiandao",
                      list: "/qiandao",
                      meta: {
                        label: "人员签到",
                        dataProviderName: undefined,
                        icon: <IconChecks />,
                      },
                    },
                    {
                      name: __AttendanceRecord_TableName,
                      list: "/attendance-record",
                      create: "/attendance-record/create",
                      edit: "/attendance-record/edit/:id",
                      show: "/attendance-record/show/:id",
                      meta: {
                        canDelete: true,
                        label: "考勤记录",
                        icon: <IconClipboardData />,
                      },
                    },
                    {
                      name: __Workers_TableName,
                      list: "/workers",
                      create: "/workers/create",
                      edit: "/workers/edit/:id",
                      show: "/workers/show/:id",
                      meta: {
                        canDelete: true,
                        label: "人员管理",
                        icon: <IconUsers />,
                      },
                    },
                    {
                      name: __WorkTypes_TableName,
                      list: "/workType",
                      create: "/workType/create",
                      edit: "/workType/edit/:id",
                      show: "/workType/show/:id",
                      meta: {
                        canDelete: true,
                        label: "工作管理",
                        icon: <IconBriefcase />,
                      },
                    },
                    {
                      name: __SalaryType_TableName,
                      list: "/xinzi",
                      show: "/xinzi/show/:id",
                      create: "/xinzi/create",
                      edit: "/xinzi/edit/:id",
                      meta: {
                        label: "薪资设置",
                        icon: <IconCoinYen />,
                      },
                    },
                    {
                      name: "gongshi",
                      list: "/gongshi",
                      meta: {
                        label: "工时&薪资显示",
                        dataProviderName: undefined,
                        icon: <IconReport />,
                      },
                    },
                    {
                      name: "pocketbase",
                      list: "/pocketbase",
                      meta: {
                        label: "后台管理",
                        dataProviderName: undefined,
                        icon: <IconLockSquareRounded />,
                      },
                    },
                    ...get_sample_resource_or_route("resource", "behind") as IResourceItem[],
                  ]}
                  options={{
                    syncWithLocation: true,
                    warnWhenUnsavedChanges: true,
                    useNewQueryKeys: true,
                    projectId: "1LFZhY-g5ZTkQ-8ndYcP",
                  }}
                >
                  <Routes>
                    <Route
                      element={
                        <ThemedLayoutV2
                          Title={({ collapsed }) => (
                            <ThemedTitleV2
                              // collapsed is a boolean value that indicates whether the <Sidebar> is collapsed or not
                              collapsed={collapsed}
                              icon={
                                collapsed ? (
                                  <Space
                                  >
                                  <Avatar
                                    src={logo}
                                    alt="Company Logo"
                                    size="default"
                                    // width={64}
                                    // height={64}
                                  />
                                  <Typography.Text className="whitespace-nowrap ">{__SystemName__}</Typography.Text>
                                  <Badge color="blue" variant="light" style={{ width: 120 }}>{__VERSION__}</Badge>
                                  </Space>
                                ) : (
                                  <Space
                                  >
                                  <Avatar
                                    src={logo}
                                    alt="Company Logo"
                                    size="large"
                                    // width={64}
                                    // height={64}
                                  />
                                  <Typography.Text className="whitespace-nowrap ">{__SystemName__}</Typography.Text>
                                  <Badge color="blue" variant="light" style={{ width: 120 }}>{__VERSION__}</Badge>
                                  </Space>
                                )
                              }
                              text={null}
                            />
                          )}
                          Header={() => <Header sticky />}
                          Sider={(props) => <ThemedSiderV2 {...props} fixed />}
                        >
                          <Outlet />
                        </ThemedLayoutV2>
                      }
                    >
                      <Route
                        index
                        element={<NavigateToResource resource="qiandao" />}
                      />
                      {get_sample_resource_or_route("route", "front") as React.ReactNode}
                      {/* <Route path="/zhuye">
                        <Route index element={<ZhuYe />} />
                      </Route> */}
                      <Route path="/qiandao">
                        <Route index element={<QianDaoPage />} />
                      </Route>
                      <Route path="/attendance-record">
                        <Route index element={<AttendanceRecordList />} />
                        <Route
                          path="create"
                          element={<AttendanceRecordCreate />}
                        />
                        <Route
                          path="edit/:id"
                          element={<AttendanceRecordEdit />}
                        />
                        <Route
                          path="show/:id"
                          element={<AttendanceRecordShow />}
                        />
                      </Route>
                      <Route path="/workers">
                        <Route index element={<WorkersList />} />
                        <Route path="create" element={<WorkersCreate />} />
                        <Route path="edit/:id" element={<WorkersEdit />} />
                        <Route path="show/:id" element={<WorkersShow />} />
                      </Route>
                      <Route path="/workType">
                        <Route index element={<ListWorkType />} />
                        <Route path="create" element={<CreateWorkType />} />
                        <Route path="edit/:id" element={<EditWorkType />} />
                        <Route path="show/:id" element={<ShowWorkType />} />
                      </Route>
                      <Route path="/xinzi">
                        <Route index element={<SalaryTypeList />} />
                        <Route path="show/:id" element={<SalaryTypeShow />} />
                        <Route path="create" element={<SalaryTypeCreate />} />
                        <Route path="edit/:id" element={<SalaryTypeEdit />} />
                      </Route>
                      <Route path="/gongshi">
                        <Route index element={<GongShiList />} />
                      </Route>
                      <Route path="/pocketbase">
                        <Route index element={<PocketBasePage />} />
                      </Route>
                      {get_sample_resource_or_route("route", "behind") as React.ReactNode}
                      <Route path="*" element={<ErrorComponent />} />
                    </Route>
                  </Routes>
                  <GlobalHelp />
                  {/* <RefineKbar /> */}
                  <UnsavedChangesNotifier />
                  {/* <DocumentTitleHandler handler={customTitleHandler} />; */}
                  <DocumentTitleHandler />;
                </Refine>
                <DevtoolsPanel />
              </DevtoolsProvider>
              {/* </MantineProvider> */}
            </AntdApp>
            {/* </MantineProvider> */}
          </ColorModeContextProvider>
        </MantineProvider>
      {/* </RefineKbarProvider> */}
    </BrowserRouter>
  );
}

export default App;
