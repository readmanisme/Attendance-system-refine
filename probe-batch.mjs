import PocketBase from "pocketbase";
const pb = new PocketBase("http://localhost:29410");
try {
  const w = await pb.collection("workers_test").create({ name: "probe工2" });
  console.log("worker ok", w.id);
  const wt = await pb.collection("workType_test").create({ name: "probe工种2" });
  console.log("work ok", wt.id);
  const batch = pb.createBatch();
  batch.collection("attendance_record_test").create({
    worker_id: w.id, work: wt.id, work_date: "2026-09-10", work_minutes: 300,
  });
  batch.collection("attendance_record_test").create({
    worker_id: w.id, work: wt.id, work_date: "2026-09-10", work_minutes: 240,
  });
  const res = await batch.send();
  console.log("batch res", JSON.stringify(res));
  await pb.collection("workers_test").delete(w.id);
  await pb.collection("workType_test").delete(wt.id);
} catch (e) {
  console.log("ERR", e.status, JSON.stringify(e.response).slice(0, 2000));
}
