# 工时字段迁移 runbook(签到/签退 → work_date + work_minutes)

## 背景

原设计把"工时"编码成 `check_in`/`check_out` 两个时间(录入时自动伪造 7:00 开始)。
历史上没有任何一条真实打卡时间,数据已全部迁移为两条新字段:

- `work_date`: text,"YYYY-MM-DD",本地日历日
- `work_minutes`: number,整数分钟(工时 × 60;20 分钟就是 20)

视图 `workHour_day_view_test` / `workHour_month_view_test` 已改为 `SUM(work_minutes)/60.0`
(视图输出字段名 `work_date` / `work_month` / `total_work_hours` 保持不变,前端展示逻辑兼容)。

## 脚本用法

```powershell
# 在仓库根目录
# 1) 先试跑(不改任何数据,只打印计划)
node scripts/migrate-hours/migrate.ts --url http://127.0.0.1:29401 --email <超管> --password <密码> --dry-run

# 2) 实跑(幂等,重复运行只会做校验)
node scripts/migrate-hours/migrate.ts --url http://127.0.0.1:29401 --email <超管> --password <密码>
```

参数说明:

| 参数 | 说明 |
|---|---|
| `--url` | PocketBase 地址 |
| `--table` | 考勤表名,默认 `attendance_record_test` |
| `--day-view` / `--month-view` | 两个工时视图名 |
| `--email` / `--password` | 超管账号;也可用环境变量 `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` |
| `--dry-run` | 只打印计划不动数据 |
| `--keep-old-fields` | 临时保留 check_in/check_out(调试用),默认删除 |

脚本会自动探测新版(`_superusers`)和旧版(`/api/admins`)登录端点,新旧 PocketBase 都能跑。

## 迁移内容(脚本自动完成)

1. 新增 `work_date`(text) / `work_minutes`(number) 字段
2. 每条记录:`work_date` = 本地时区 check_in 日期;`work_minutes` = |check_out − check_in| 分
3. 同 (worker_id, work_date, work) 合并为一条(分钟求和,保留 created 最早的那条,其余删除)
4. 两个工时视图改写为 `SUM(work_minutes)/60.0`
5. 添加唯一索引 (worker_id, work_date, work)
6. 删除 `check_in` / `check_out` 字段
7. 自校验:迁移前后按合并键的工时合计逐键比对 + day 视图逐日比对;报告写入
   `scripts/migrate-hours/report-*.json`,不一致退出码 2

## 生产环境操作步骤

1. **备份**:停止 PocketBase,复制整个 `pb_data` 目录到别处(如 `pb_data_备份_2026xx`)。
2. 重新启动 PocketBase。
3. 先 `--dry-run` 看计划是否符合预期(记录总数/合并组数)。
4. 实跑,确认最后一行 `✅ 迁移与校验通过`。
5. 部署新版本前端(旧版页面读 `check_in` 字段会直接报错,所以**迁移和新版本要一起上**)。
6. 在生产抽查:打开"人员签到"页面,对比纸质记录的某一天工时合计。

## 若需要回滚

用步骤 1 的 `pb_data` 备份整个还原,再启动旧版本即可(数据文件级回滚,最简单)。
