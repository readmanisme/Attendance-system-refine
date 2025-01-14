import { GitHubBanner, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
  ErrorComponent,
  ThemedLayoutV2,
  ThemedSiderV2,
  useNotificationProvider,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerBindings, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import dataProvider from "@refinedev/simple-rest";
import { App as AntdApp } from "antd";
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
import {
  authProvider,
  dataProvider as pocketbaseDataProvider,
  liveProvider,
// } from "./providers/pocketbase";
} from "refine-pocketbase";
import { UnClockOutCreate,UnClockOutEdit,UnClockOutList,UnClockOutShow } from "./pages/unclockout";
import { AttendanceRecordCreate,AttendanceRecordEdit,AttendanceRecordList,AttendanceRecordShow } from "./pages/attendance-record";
import { MantineProvider } from '@mantine/core';
import QianDaoPage from "./pages/qian-dao/qian-dao";

const POCKETBASE_URL = "http://localhost:8090";
const pb = new PocketBase(POCKETBASE_URL);
function App() {
  return (
    <BrowserRouter>
      {/* <GitHubBanner /> */}
      <RefineKbarProvider>
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
                notificationProvider={useNotificationProvider}
                routerProvider={routerBindings}
                resources={[
                  {
                    name: "blog_posts",
                    list: "/blog-posts",
                    create: "/blog-posts/create",
                    edit: "/blog-posts/edit/:id",
                    show: "/blog-posts/show/:id",
                    meta: {
                      canDelete: true,
                      dataProviderName: "example",
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
                    },
                  },
                  {
                    name: "qiandao",
                    list: "/qiandao",
                    meta: {
                      label: "人员签到",
                      dataProviderName: undefined,
                    },
                  },
                  // {
                  //   name: "unclockout",
                  //   list: "/unclockout",
                  //   create: "/unclockout/create",
                  //   edit: "/unclockout/edit/:id",
                  //   show: "/unclockout/show/:id",
                  //   meta: {
                  //     canDelete: true,
                  //   }
                  // },
                  {
                    name: "attendance_record_test",
                    list: "/attendance-record",
                    create: "/attendance-record/create",
                    edit: "/attendance-record/edit/:id",
                    show: "/attendance-record/show/:id",
                    meta: {
                      canDelete: true,
                      label: "考勤记录",
                    },
                  },
                  {
                    name: "workers_test",
                    list: "/workers",
                    create: "/workers/create",
                    edit: "/workers/edit/:id",
                    show: "/workers/show/:id",
                    meta: {
                      canDelete: true,
                      label: "人员管理",
                    },
                  },
                  {
                    name: "pocketbase",
                    list: "/pocketbase",
                    // create: "/pocketbase/create",
                    meta: {
                      label: "PocketBase后台管理",
                      dataProviderName:undefined,
                    },
                  },
                  {
                    name: "测试页面",
                    list: "/test-page",
                    // create: "/test-page/create",
                    meta: {
                      dataProviderName:undefined,
                      },
                  },
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
                        Header={() => <Header sticky />}
                        Sider={(props) => <ThemedSiderV2 {...props} fixed />}
                      >
                        <Outlet />
                      </ThemedLayoutV2>
                    }
                  >
                    <Route
                      index
                      element={<NavigateToResource resource="blog_posts" />}
                    />
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
                    <Route path="/qiandao">
                    <Route index element={<QianDaoPage />} />
                      </Route>
                      <Route path="/unclockout">
                      <Route index element={<UnClockOutList />} />
                      <Route path="create" element={<UnClockOutCreate />} />
                      <Route path="edit/:id" element={<UnClockOutEdit />} />
                      <Route path="show/:id" element={<UnClockOutShow />} />
                      </Route>
                      <Route path="/attendance-record">
                      <Route index element={<AttendanceRecordList />} />
                      <Route path="create" element={<AttendanceRecordCreate />} />
                      <Route path="edit/:id" element={<AttendanceRecordEdit />} />
                      <Route path="show/:id" element={<AttendanceRecordShow />} />
                      </Route>
                    <Route path="/workers">
                      <Route index element={<WorkersList />} />
                      <Route path="create" element={<WorkersCreate />} />
                      <Route path="edit/:id" element={<WorkersEdit />} />
                      <Route path="show/:id" element={<WorkersShow />} />
                    </Route>
                    <Route path="/pocketbase">
                      <Route index element={<PocketBasePage />} />
                    </Route>
                    <Route path="/test-page" element={<TestPage />} />
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                </Routes>

                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
            {/* </MantineProvider> */}
          </AntdApp>
          {/* </MantineProvider> */}
        </ColorModeContextProvider>
        </MantineProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
