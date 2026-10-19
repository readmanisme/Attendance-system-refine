onBootstrap((e) => {
  e.next();
  console.log("屏蔽health检查日志");
});
onModelCreate((e) => {
	if (e.model.data?.get("url") === "/api/health") {
    // 直接访问url会得到undefined
		return
	}
    e.next()
}, "_logs")
