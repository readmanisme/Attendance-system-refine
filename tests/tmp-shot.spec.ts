import { test } from "@playwright/test";
import dayjs from "dayjs";
import { appUrl } from "./constants";
import { TestDB } from "./helpers/pb";

const db = new TestDB();

test.afterEach(async () => {
  await db.cleanup();
});

test("截图: 概览/时间/关系/个人", async ({ page }) => {
  await db.ensureBaseWork();
  const names = ["张伟", "李强", "王芳", "赵敏", "刘洋", "陈军"];
  const works = ["搬运", "挖土", "砌墙", "浇筑"];
  const workers = [];
  for (const n of names) workers.push(await db.seedWorker(n));
  const wts = [];
  for (const w of works) wts.push(await db.seedWorkType(w));
  await db.seedSalary({ workTypeId: wts[0].id, salaryNum: 22 });
  await db.seedSalary({ workTypeId: wts[1].id, salaryNum: 25 });

  const months = [2, 1, 0].map((i) => dayjs().subtract(i, "month"));
  for (const m of months) {
    for (let d = 1; d <= 20; d++) {
      const day = m.date(d).format("YYYY-MM-DD");
      const count = 2 + ((d * 7) % 4);
      for (let k = 0; k < count; k++) {
        const w = workers[(d + k) % workers.length];
        const t = wts[(d + k * 3) % wts.length];
        const minutes = [480, 540, 600, 240, 300][(d + k) % 5];
        await db.seedRecord({ worker_id: w.id, work: t.id, work_date: day, work_minutes: minutes });
      }
    }
  }

  await page.goto(appUrl("tongji"));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "logs/shot-overview.png" });
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "logs/shot-overview2.png" });

  await page.getByRole("tab", { name: "时间模式" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "logs/shot-time.png" });
  await page.mouse.wheel(0, 1600);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "logs/shot-time2.png" });

  await page.getByRole("tab", { name: "关系分析" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "logs/shot-relation.png" });

  await page.getByRole("tab", { name: "个人分析" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "logs/shot-personal.png" });
});
