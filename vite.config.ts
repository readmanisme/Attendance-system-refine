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
