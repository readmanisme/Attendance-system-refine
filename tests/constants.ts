/** playwright 测试专用 pk 库端口(库在 pocketbase-for-playwright-test/, schema-only) */
export const PB_TEST_PORT = 29410;
export const Backend_URL = `http://localhost:${PB_TEST_PORT}`;
export const API_URL = `${Backend_URL}/api`;
export const AttendanceRecord_TableName = "attendance_record_test";
export const Workers_TableName = "workers_test";
export const WorkTypes_TableName = "workType_test";
export const WorkHours_Day_ViewName = "workHour_day_view_test";
export const WorkHours_Month_ViewName = "workHour_month_view_test";
export const SalaryType_TableName = "SalaryType_test";
export const WorkerRecordNum_TableName = "worker_record_num";
export const WorkRecordNum_TableName = "work_record_num";

export const workers_url = "/#/workers";
export const attendance_record_url = "/#/attendance-record";
export const qiandao_url = "/#/qiandao";
export const workType_url = "/#/workType";
export const xinzi_url = "/#/xinzi";
export const gongshi_url = "/#/gongshi";

/**
 * 打开页面。前端 API 地址由 URL 参数 ?pb-port= 决定(src/stores/index.ts),
 * 所以必须始终带上测试端口参数，页面才知道连测试后端。
 * 形如: /?pb-port=29410#/qiandao —— 端口参数后面必须直接跟"#"，
 * 否则参数值会带上分隔用的"/"(如"29410/")导致后端地址错误。
 */
export function appUrl(path: string = "qiandao"): string {
  const hashPath = `#/${path.replace(/^[#/]+/, "")}`;
  return `/?pb-port=${PB_TEST_PORT}${hashPath}`;
}
