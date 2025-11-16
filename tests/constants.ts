import PocketBase from "pocketbase";
export const pb = new PocketBase("http://localhost:29401");


export const Backend_URL = "http://localhost:29401";
export const API_URL = "http://localhost:29401/api";
export const AttendanceRecord_TableName = "attendance_record_test";
export const Workers_TableName = "workers_test";
export const WorkTypes_TableName = "workType_test";
export const WorkHours_Day_ViewName = "workHour_day_view_test";
export const WorkHours_Month_ViewName = "workHour_month_view_test";
export const SalaryType_TableName = "SalaryType_test";
export const WorkerRecordNum_TableName = "worker_record_num";
export const WorkRecordNum_TableName = "work_record_num";
export const Backend_UserName = "shed2705@outlook.com";
export const Backend_Password = "bPWU8GCMuqwKF9z";

export const workers_url="/workers"
export const attendance_record_url="/attendance-record"
export const qiandao_url="/qiandao"
export const workType_url="/workType"
export const xinzi_url="/xinzi"
export const gongshi_url="/gongshi"