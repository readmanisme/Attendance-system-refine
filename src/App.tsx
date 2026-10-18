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
import { Outlet, Route, Routes, HashRouter } from "react-router";
import { Header } from "./components/header";
import { ColorModeContextProvider } from "./contexts/color-mode";
import TestPage from "./pages/test-page/test-page";
import { dataProvider as pocketbaseDataProvider } from "./providers/pocketbase/dataProvider";
import logo from "@/public/logo-64.webp?inline";
import {
  IconChecks,
  IconUsers,
  IconClipboardData,
  IconMicroscope,
  IconCoinYen,
  IconReport,
  IconBriefcase,
  IconChartBar,
} from "@tabler/icons-react";
import { GlobalHelp } from "./components/GlobalHelp";
import { useTranslation } from "react-i18next";
import { getPb } from "@/utils/pocketbase";
import { useConfigStore } from "./stores";
import { Suspense, useMemo } from "react";
import React from "react";

// 🧩 懒加载页面
const QianDaoPage = React.lazy(() => import("./pages/qian-dao/qian-dao"));
const GongShiList = React.lazy(() => import("./pages/gong-shi/list_table"));
const TongJiPage = React.lazy(() => import("./pages/tong-ji/index"));
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

// 统一加载组件，可以考虑骨架屏
const RouteLoading = () => (
  <div className="flex items-center justify-center h-full min-h-96">
    <Spin size="large" />
  </div>
);

/** 常规 CRUD 页面的路由配置:同构的 组统一生成 */
interface CrudRouteItem {
  path: string;
  list: React.ComponentType;
  /** 有 create/edit 能力的资源才需要配 */
  create?: React.ComponentType;
  edit?: React.ComponentType;
}

// 懒加载页面的统一 Suspense 包装
const lazyRoute = (Comp: React.ComponentType) => (
  <Suspense fallback={<RouteLoading />}>
    <Comp />
  </Suspense>
);

const crudRoutes: CrudRouteItem[] = [
  { path: "/qiandao", list: QianDaoPage },
  { path: "/attendance-record", list: AttendanceRecordList, edit: AttendanceRecordEdit },
  { path: "/workers", list: WorkersList, create: WorkersCreate, edit: WorkersEdit },
  { path: "/workType", list: ListWorkType, create: CreateWorkType, edit: EditWorkType },
  { path: "/xinzi", list: SalaryTypeList, create: SalaryTypeCreate, edit: SalaryTypeEdit },
  { path: "/gongshi", list: GongShiList },
  { path: "/tongji", list: TongJiPage },
];
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
    ]
  : [];
// 开发路由（仅开发环境渲染）
const DevRoutes = import.meta.env.DEV ? (
  <>
    <Route path="/test-page" element={<TestPage />} />
  </>
) : (
  <></>
);
// 独立 Title 组件（Memo 避免重复渲染）
const AppTitle = React.memo(({ collapsed }: { collapsed: boolean }) => (
  <ThemedTitleV2
    collapsed={collapsed}
    icon={
      <Space data-testid="logoAndTitle">
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
  const { __BACKEND_API_URL__ } = useConfigStore();
  const pb = useMemo(() => getPb(__BACKEND_API_URL__), [__BACKEND_API_URL__]);
  const i18nProvider = useMemo(
    () => ({
      translate: (key: string, params: any) => t(key, params),
      changeLocale: (lang: string) => i18n.changeLanguage(lang),
      getLocale: () => i18n.language,
    }),
    [t, i18n],
  );
  return (
    <HashRouter>
      <ColorModeContextProvider>
        <AntdApp>
          <DevtoolsProvider>
            <Refine
              dataProvider={{
                default: pocketbaseDataProvider(pb),
              }}
              // @ts-expect-error,111
              i18nProvider={i18nProvider}
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
                    // canDelete: true,
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
                    // canDelete: true,
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
                  name: "tongji",
                  list: "/tongji",
                  meta: {
                    label: "统计图表",
                    dataProviderName: undefined,
                    icon: <IconChartBar />,
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

                  {/* 常规 CRUD 页面(由配置统一生成) */}
                  {crudRoutes.map(
                    ({ path, list: ListPage, create: CreatePage, edit: EditPage }) => (
                      <Route key={path} path={path}>
                        <Route index element={lazyRoute(ListPage)} />
                        {CreatePage ? (
                          <Route path="create" element={lazyRoute(CreatePage)} />
                        ) : null}
                        {EditPage ? <Route path="edit/:id" element={lazyRoute(EditPage)} /> : null}
                      </Route>
                    ),
                  )}

                  {/* 开发专用路由（懒加载 + 生产剔除） */}
                  {DevRoutes}

                  {/* 404 */}
                  <Route path="*" element={<ErrorComponent />} />
                </Route>
              </Routes>
              {/* </Suspense> */}
              <GlobalHelp />
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>{" "}
            <DevtoolsPanel />
          </DevtoolsProvider>
        </AntdApp>
      </ColorModeContextProvider>
    </HashRouter>
  );
}

export default App;
