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
import { App as AntdApp, Avatar, Space, Spin, Typography } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { Header } from "./components/header";
import { ColorModeContextProvider } from "./contexts/color-mode";
import  TestPage  from "./pages/test-page/test-page";
// import { WorkersCreate } from "./pages/workers/create";
// import { WorkersEdit } from "./pages/workers/edit";
// import { WorkersList } from "./pages/workers/list";
import { dataProvider as pocketbaseDataProvider } from "./providers/pocketbase/dataProvider";
// import { AttendanceRecordEdit } from "./pages/attendance-record/edit";
// import { AttendanceRecordList } from "./pages/attendance-record/list";
import { MantineProvider } from "@mantine/core";
import logo from "@/public/logo-64.webp?inline";
// import QianDaoPage from "./pages/qian-dao/qiandao";
// import GongShiList from "./pages/gong-shi/list_table";-
import { SampleList, SampleCreate, SampleEdit, SampleShow } from "./pages/Inferencer_example";
// import { EditWorkType } from "./pages/workType/edit";
// import { CreateWorkType } from "./pages/workType/create";
// import { ListWorkType } from "./pages/workType/list";
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
// import { SalaryTypeCreate } from "./pages/xin-zi/create";
// import { SalaryTypeEdit } from "./pages/xin-zi/edit";
// import { SalaryTypeList } from "./pages/xin-zi/list";
import { GlobalHelp } from "./components/GlobalHelp";
import { useTranslation } from "react-i18next";
import { getPb } from "@/utils/pocketbase";
import { useSomeStore } from "./stores";
import { Suspense, useMemo } from "react";
import React from "react";

// 🧩 懒加载页面
const QianDaoPage = React.lazy(() => import("./pages/qian-dao/qian-dao"));
const GongShiList = React.lazy(() => import("./pages/gong-shi/list_table"));
const WorkersList = React.lazy(() => import("./pages/workers/list"));
const WorkersCreate = React.lazy(() => import("./pages/workers/create"));
const WorkersEdit = React.lazy(() => import("./pages/workers/edit"));
const AttendanceRecordList = React.lazy(() => import("./pages/attendance-record/list"));
const AttendanceRecordEdit = React.lazy(() => import("./pages/attendance-record/edit"));
const ListWorkType = React.lazy(() => import("./pages/workType/list"));
const CreateWorkType = React.lazy(() => import("./pages/workType/create"));
const EditWorkType = React.lazy(() => import("./pages/workType/edit"));
const SalaryTypeList = React.lazy(() => import("./pages/xin-zi/list"));
const SalaryTypeCreate = React.lazy(() => import("./pages/xin-zi/create"));
const SalaryTypeEdit = React.lazy(() => import("./pages/xin-zi/edit"));

// const TestPage = React.lazy(() => import("./pages/test-page/test-page"));
// const SampleList = React.lazy(() =>
//   import("./pages/Inferencer_example").then((m) => ({ default: m.SampleList }))
// );
// const SampleCreate = React.lazy(() =>
//   import("./pages/Inferencer_example").then((m) => ({ default: m.SampleCreate }))
// );
// const SampleEdit = React.lazy(() =>
//   import("./pages/Inferencer_example").then((m) => ({ default: m.SampleEdit }))
// );
// const SampleShow = React.lazy(() =>
//   import("./pages/Inferencer_example").then((m) => ({ default: m.SampleShow }))
// );

// 统一 Loading 组件（可替换为 Skeleton）
const RouteLoading = () => (
  <div className="flex items-center justify-center h-full min-h-96">
    <Spin size="large"/>
  </div>
);
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
// 开发路由（仅开发环境渲染 + 懒加载）
const DevRoutes = import.meta.env.DEV ? (
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
// 独立 Title 组件（Memo 避免重复渲染）
const AppTitle = React.memo(({ collapsed }: { collapsed: boolean }) => (
  <ThemedTitleV2
    collapsed={collapsed}
    icon={
      <Space>
        <Avatar src={logo} alt="Company Logo" size={collapsed ? "default" : "large"} />
        {!collapsed && (
          <Typography.Text className="whitespace-nowrap">{__SystemName__}</Typography.Text>
        )}
      </Space>
    }
    text={null}
  />
));
function App() {
  const { t, i18n } = useTranslation();
  const { __BACKEND_API_URL__ } = useSomeStore();
  const pb = useMemo(() => getPb(__BACKEND_API_URL__), [__BACKEND_API_URL__]);
  const i18nProvider = useMemo(
    () => ({
      translate: (key: string, params: any) => t(key, params),
      changeLocale: (lang: string) => i18n.changeLanguage(lang),
      getLocale: () => i18n.language,
    }),
    [t, i18n]
  );
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
                // @ts-expect-error,111
                i18nProvider={i18nProvider}
                notificationProvider={useNotificationProvider()}
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
                }}
              >
                {/* <Suspense fallback={<Spin size="large" fullscreen />}> */}
                <Routes>
                  <Route
                    element={
                      <ThemedLayoutV2
                        Title={AppTitle}
                        Header={() => <Header sticky />}
                        Sider={(props) => <ThemedSiderV2 {...props} fixed />}
                      >
                        <Outlet />
                      </ThemedLayoutV2>
                    }
                  >
                    {/* 首页重定向 */}
                    <Route index element={<NavigateToResource resource="qiandao" />} />

                    {/* 人员签到 */}
                    <Route path="/qiandao">
                      <Route
                        index
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <QianDaoPage />
                          </Suspense>
                        }
                      />
                    </Route>

                    {/* 考勤记录 */}
                    <Route path="/attendance-record">
                      <Route
                        index
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <AttendanceRecordList />
                          </Suspense>
                        }
                      />
                      <Route
                        path="edit/:id"
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <AttendanceRecordEdit />
                          </Suspense>
                        }
                      />
                    </Route>

                    {/* 人员管理 */}
                    <Route path="/workers">
                      <Route
                        index
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <WorkersList />
                          </Suspense>
                        }
                      />
                      <Route
                        path="create"
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <WorkersCreate />
                          </Suspense>
                        }
                      />
                      <Route
                        path="edit/:id"
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <WorkersEdit />
                          </Suspense>
                        }
                      />
                    </Route>

                    {/* 工作管理 */}
                    <Route path="/workType">
                      <Route
                        index
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <ListWorkType />
                          </Suspense>
                        }
                      />
                      <Route
                        path="create"
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <CreateWorkType />
                          </Suspense>
                        }
                      />
                      <Route
                        path="edit/:id"
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <EditWorkType />
                          </Suspense>
                        }
                      />
                    </Route>

                    {/* 薪资设置 */}
                    <Route path="/xinzi">
                      <Route
                        index
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <SalaryTypeList />
                          </Suspense>
                        }
                      />
                      <Route
                        path="create"
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <SalaryTypeCreate />
                          </Suspense>
                        }
                      />
                      <Route
                        path="edit/:id"
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <SalaryTypeEdit />
                          </Suspense>
                        }
                      />
                    </Route>

                    {/* 工时&薪资显示 */}
                    <Route path="/gongshi">
                      <Route
                        index
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <GongShiList />
                          </Suspense>
                        }
                      />
                    </Route>

                    {/* 开发专用路由（懒加载 + 生产剔除） */}
                    {DevRoutes} 

                    {/* 404 */}
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                </Routes>
                {/* </Suspense> */}
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
