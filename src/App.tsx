import { GitHubBanner, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

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
  dataProvider as pocketbaseDataProvider,
} from "./providers/pocketbase";
// } from "refine-pocketbase";
import {
  UnClockOutCreate,
  UnClockOutEdit,
  UnClockOutList,
  UnClockOutShow,
} from "./pages/unclockout";
import {
  AttendanceRecordCreate,
  AttendanceRecordEdit,
  AttendanceRecordList,
  AttendanceRecordShow,
} from "./pages/attendance-record";
import { MantineProvider } from "@mantine/core";
import logo from "@/public/logo.png";
import QianDaoPage from "./pages/qian-dao/qian-dao";
import XinZiList from "./pages/xin-zi/list";
import XinZiShow from "./pages/xin-zi/show";
import GongShiList from "./pages/gong-shi/list";
import ZhuYe from "./pages/zhu-ye/zhu-ye";
import { ShowWorkType,EditWorkType,CreateWorkType,ListWorkType } from "./pages/workType";
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
  IconBriefcase
} from "@tabler/icons-react";
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
                        icon: <IconList />,
                        // hide: true,
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
                        hide: true,
                      },
                    },
                    {
                      name:"zhuye",
                      list: "/zhuye",
                      meta: {
                        label: "主页",
                        dataProviderName: undefined,
                        icon: <IconHome />,
                        }
                    },
                    {
                      name: "qiandao",
                      list: "/qiandao",
                      meta: {
                        label: "人员签到",
                        dataProviderName: undefined,
                        icon: <IconChecks />,
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
                        icon: <IconClipboardData />,
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
                        icon: <IconUsers />,
                      },
                    },
                    {
                      name: "workType_test",
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
                      name:"xinzi",
                      list: "/xinzi",
                      show: "/xinzi/show/:id",
                      meta: {
                        label: "薪资计算",
                        dataProviderName: undefined,
                        icon: <IconCoinYen />,
                      },
                    },
                    {
                      name:"gongshi",
                      list: "/gongshi",
                      meta: {
                        label: "工时管理",
                        dataProviderName: undefined,
                        icon: <IconReport />,
                        }
                    },
                    {
                      name: "pocketbase",
                      list: "/pocketbase",
                      // create: "/pocketbase/create",
                      meta: {
                        label: "PocketBase后台管理",
                        dataProviderName: undefined,
                        icon: <IconLockSquareRounded />,
                      },
                    },
                    {
                      name: "测试页面",
                      list: "/test-page",
                      // create: "/test-page/create",
                      meta: {
                        dataProviderName: undefined,
                        icon: <IconMicroscope />,
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
                          Title={({ collapsed }) => (
                            <ThemedTitleV2
                              // collapsed is a boolean value that indicates whether the <Sidebar> is collapsed or not
                              collapsed={collapsed}
                              icon={
                                collapsed ? (
                                  <img
                                    src={logo}
                                    alt="Company Logo"
                                    width={32}
                                    height={32}
                                  />
                                ) : (
                                  <img
                                    src={logo}
                                    alt="Company Logo"
                                    width={32}
                                    height={32}
                                  />
                                )
                              }
                              text="工人考勤系统"
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
                      <Route path="/zhuye">
                      <Route index element={<ZhuYe/>} />
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
                      <Route index element={<ListWorkType/>} />
                      <Route path="create" element={<CreateWorkType/>} />
                      <Route path="edit/:id" element={<EditWorkType/>} />
                      <Route path="show/:id" element={<ShowWorkType/>} />
                      </Route>
                      <Route path="/xinzi">
                        <Route index element={<XinZiList />} />
                        <Route path="show/:id" element={<XinZiShow />} />
                        </Route>
                        <Route path="/gongshi">
                        <Route index element={<GongShiList />} />
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
