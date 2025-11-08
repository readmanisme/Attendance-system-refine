// pb_hooks/main.pb.js
routerUse((e) => {
    if (e.request.url.path == "/api/health") {
        return $apis.skipSuccessActivityLog().func(e);
    }

    return e.next()
})