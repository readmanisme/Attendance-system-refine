//这种方式似乎比另一个版本的更好
routerUse((e) => {
    if (e.request.url.path == "/api/health") {
        return $apis.skipSuccessActivityLog().func(e);
    }

    return e.next()
})