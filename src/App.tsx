import { Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import {
  ErrorComponent,
  ThemedLayout as ThemedLayoutV2,
  ThemedSider as ThemedSiderV2,
  ThemedTitle as ThemedTitleV2,
  useNotificationProvider,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerBindings, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { App as AntdApp, Avatar, Space, Typography } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { Header } from "./components/header";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { TestPage } from "./pages/test-page/test-page";
import { WorkersCreate } from "./pages/workers/create";
import { WorkersEdit } from "./pages/workers/edit";
import { WorkersList } from "./pages/workers/list";
import { dataProvider as pocketbaseDataProvider } from "./providers/pocketbase/dataProvider";
import { AttendanceRecordEdit } from "./pages/attendance-record/edit";
import { AttendanceRecordList } from "./pages/attendance-record/list";
import { MantineProvider } from "@mantine/core";
import logo from "@/public/logo-64.webp?inline";
import QianDaoPage from "./pages/qian-dao/qian-dao";
import GongShiList from "./pages/gong-shi/list_table";
import {
  SampleList,
  SampleCreate,
  SampleEdit,
  SampleShow,
} from "./pages/Inferencer_example";
import { EditWorkType } from "./pages/workType/edit";
import { CreateWorkType } from "./pages/workType/create";
import { ListWorkType } from "./pages/workType/list";
import {
  IconChecks,
  IconUsers,
  IconClipboardData,
  IconMicroscope,
  IconCoinYen,
  IconReport,
  IconBriefcase,
  IconCode,
} from "@tabler/icons-react";
import { SalaryTypeCreate } from "./pages/xin-zi/create";
import { SalaryTypeEdit } from "./pages/xin-zi/edit";
import { SalaryTypeList } from "./pages/xin-zi/list";
import { GlobalHelp } from "./components/GlobalHelp";
import { useTranslation } from "react-i18next";
import { getPb } from "@/utils/pocketbase";
import { useSomeStore } from "./stores";
const devOnlyRoutesConfig = import.meta.env.DEV
  ? [
      {
        name: "测试页面",
        list: "/test-page",
        meta: {
          dataProviderName: undefined,
          icon: <IconMicroscope />,
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
        },
      },
    ]
  : [];
const devOnlyRoutes = import.meta.env.DEV ? (
  <>
    <Route path="/test-page" element={<TestPage />} />
    <Route path="/Inferencer_example">
      <Route index element={<SampleList />} />
      <Route path="create" element={<SampleCreate />} />
      <Route path="edit/:id" element={<SampleEdit />} />
      <Route path="show/:id" element={<SampleShow />} />
    </Route>
  </>
) : (
  <></>
);
function App() {
  const { t, i18n } = useTranslation();
  const {__BACKEND_API_URL__ }= useSomeStore();
  const pb = getPb(__BACKEND_API_URL__);
  const i18nProvider = {
    //@ts-expect-error,正常的
    translate: (key: string, params: object) => t(key, params),
    changeLocale: (lang: string) => i18n.changeLanguage(lang),
    getLocale: () => i18n.language,
  };
  return (
    <BrowserRouter>
      <MantineProvider>
        <ColorModeContextProvider>
          <AntdApp>
            <DevtoolsProvider>
              <Refine
                dataProvider={{
                  default: pocketbaseDataProvider(pb),
                }}
                i18nProvider={i18nProvider}
                // eslint-disable-next-line react-hooks/react-compiler
                notificationProvider={useNotificationProvider}
                routerProvider={routerBindings}
                resources={[
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
                  ...devOnlyRoutesConfig,
                ]}
                options={{
                  syncWithLocation: false,
                  warnWhenUnsavedChanges: true,
                  projectId: "1LFZhY-g5ZTkQ-8ndYcP",
                  reactQuery: {
                    clientConfig: {
                      defaultOptions: {
                        queries: {
                          staleTime: Infinity, //根据源代码，不会覆盖refine自己的设置
                          gcTime: 30 * 60 * 1000,
                        },
                      },
                    },
                  },
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
                                <Space>
                                  <Avatar
                                    src={logo}
                                    alt="Company Logo"
                                    size="default"
                                  />
                                  <Typography.Text className="whitespace-nowrap ">
                                    {__SystemName__}
                                  </Typography.Text>
                                </Space>
                              ) : (
                                <Space>
                                  <Avatar
                                    src={logo}
                                    alt="Company Logo"
                                    size="large"
                                  />
                                  <Typography.Text className="whitespace-nowrap ">
                                    {__SystemName__}
                                  </Typography.Text>
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
                    <Route path="/qiandao">
                      <Route index element={<QianDaoPage />} />
                    </Route>
                    <Route path="/attendance-record">
                      <Route index element={<AttendanceRecordList />} />
                      {/* <Route
                        path="create"
                        element={<AttendanceRecordCreate />}
                      /> */}
                      <Route
                        path="edit/:id"
                        element={<AttendanceRecordEdit />}
                      />
                      {/* <Route
                        path="show/:id"
                        element={<AttendanceRecordShow />}
                      /> */}
                    </Route>
                    <Route path="/workers">
                      <Route index element={<WorkersList />} />
                      <Route path="create" element={<WorkersCreate />} />
                      <Route path="edit/:id" element={<WorkersEdit />} />
                      {/* <Route path="show/:id" element={<WorkersShow />} /> */}
                    </Route>
                    <Route path="/workType">
                      <Route index element={<ListWorkType />} />
                      <Route path="create" element={<CreateWorkType />} />
                      <Route path="edit/:id" element={<EditWorkType />} />
                      {/* <Route path="show/:id" element={<ShowWorkType />} /> */}
                    </Route>
                    <Route path="/xinzi">
                      <Route index element={<SalaryTypeList />} />
                      {/* <Route path="show/:id" element={<SalaryTypeShow />} /> */}
                      <Route path="create" element={<SalaryTypeCreate />} />
                      <Route path="edit/:id" element={<SalaryTypeEdit />} />
                    </Route>
                    <Route path="/gongshi">
                      <Route index element={<GongShiList />} />
                    </Route>
                    {devOnlyRoutes}
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                </Routes>
                <GlobalHelp />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />;
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </AntdApp>
        </ColorModeContextProvider>
      </MantineProvider>
    </BrowserRouter>
  );
}

export default App;
