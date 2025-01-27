import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
export default defineConfig({
  // 帮助文档 https://cn.vite.dev/config/
  plugins: [react({
    babel:{
      plugins:[
        ["babel-plugin-react-compiler",{}]
      ]
    }
  }), tsconfigPaths()],
  // test: {
  //   globals: true,
  //   environment: 'jsdom',
  //   setupFiles: './vitest.setup.mjs',
  // },
  define:{
    // __BACKEND_API_URL__: JSON.stringify('http://localhost:8090'),
    // __BACKEND_Admin_URL__: JSON.stringify('http://localhost:8090/_/'),
    __BACKEND_API_URL__: JSON.stringify('http://localhost:29401'),
    __BACKEND_Admin_URL__: JSON.stringify('http://localhost:29401/_/'),
    __AttendanceRecord_TableName: JSON.stringify('attendance_record_test'),
    __Workers_TableName: JSON.stringify('workers_test'),
    __WorkTypes_TableName: JSON.stringify('workType_test'),
    __WorkHours_Day_ViewName: JSON.stringify('workHour_day_view_test'),
    __WorkHours_Month_ViewName: JSON.stringify('workHour_month_view_test'),
    __SalaryType_TableName: JSON.stringify('SalaryType_test'),
    __SystemName__: JSON.stringify('工人考勤系统'),
    __Backend_UserName__: JSON.stringify('shed2705@outlook.com'),
    __Backend_Password__: JSON.stringify('bPWU8GCMuqwKF9z'),
    __VERSION__: JSON.stringify('v2025.1.27.1524'),
  },
  // define:{
  //   __BACKEND_API_URL__: JSON.stringify('http://localhost:8090'),
  //   __BACKEND_Admin_URL__: JSON.stringify('http://localhost:8090/_/'),
  //   __AttendanceRecord_TableName: JSON.stringify('attendance_record'),
  //   __Workers_TableName: JSON.stringify('workers'),
  //   __WorkTypes_TableName: JSON.stringify('workType'),
  //   __WorkHours_Day_ViewName: JSON.stringify('workHour_day_view'),
  //   __WorkHours_Month_ViewName: JSON.stringify('workHour_month_view'),
  //   __SalaryType_TableName: JSON.stringify('SalaryType'),
  //   __SystemName__: JSON.stringify('工人考勤系统'),
  //   __Backend_UserName__: JSON.stringify('shed2705@outlook.com'),
  //   __Backend_Password__: JSON.stringify('bPWU8GCMuqwKF9z'),
  // },
  base: './', // 使用相对路径
  resolve: {
    alias: {
      // '@': '/src',
      '@': path.resolve(__dirname, './src'),
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
    },
  },
  server: {
    port: 5173,
    // open: true,
  },
  build: {
    outDir: 'dist',
    // assetsDir: 'assets',
    // emptyOutDir: true,

    // rollupOptions: {
    //   input: '/src/index.html',
    //   output: {
    //     entryFileNames: 'assets/js/[name].[hash].js',
    //     chunkFileNames: 'assets/js/[name].[hash].js',
    //     assetFileNames: 'assets/[name].[hash][extname]',
    //   },
    // },
  },
});
