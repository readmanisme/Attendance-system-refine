// register a global middleware
routerUse((e) => {
    // 去除响应头中的X-Frame-Options，以便iframe嵌入
    // https://pocketbase.io/jsvm/interfaces/http.Header.html
    // 其他地方没有谈过del方法
	// 2026年10月20日，暂时没用处
    e.response.header().del('X-Frame-Options')
    return e.next()
})