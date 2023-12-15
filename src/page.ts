import { ContentToPageEvent, PageMessage, PageToContentEvent } from "./common/comms";
import { InnerLevelSiebelApp, SiebelMethodConfig, SiebelMethodResponseCallback, SiebelPropertySet, SiebelService, T, getSiebelApp, getTheApplication } from "./common/siebel";


const SIEBEL_SETUP_MONITOR_TIMEOUT = 50;

document.addEventListener(ContentToPageEvent, (e) => {
    sblds_setup((e as CustomEvent).detail);
});

sblds_setup(false);

function sblds_setup(force: boolean) {
    if (getSiebelApp()) {
        sblds_overwriteSiebelApi();
    } else if (force) {
        setTimeout(() => {
            if (!getSiebelApp()) {
                return;
            }
    
            sblds_overwriteSiebelApi();
        }, SIEBEL_SETUP_MONITOR_TIMEOUT);
    }
}


function sblds_overwriteSiebelApi() {
    const app0 = getSiebelApp();
    if (app0) {
        sblds_overwriteSiebelApiOnRoot(app0.S_App);
    }
    const app1 = getTheApplication();
    if (app1) {
        sblds_overwriteSiebelApiOnRoot(app1());
    }
}


function sblds_sendToContentScript(msg: PageMessage) {
    document.dispatchEvent(new CustomEvent(PageToContentEvent, {
        detail: msg
    }));
}


function sblds_overwriteSiebelApiOnRoot(app: InnerLevelSiebelApp) {
    if (app.__withApiTracking) {
        return;
    }
    app.__withApiTracking = true;

    sblds_overwriteSetProfileAttr(app);
    sblds_overwriteGetProfileAttr(app);
    sblds_overwriteGotoView(app);
    sblds_overwriteGetService(app);
}


function sblds_overwriteSetProfileAttr(app: InnerLevelSiebelApp) {
    const originalSetProfileAttr = app.SetProfileAttr;
    app.SetProfileAttr = (name: string, value: any): boolean => {
        const beginTm = Date.now();
        const result = originalSetProfileAttr.call(app, name, value);
        const now = Date.now();
        const msg: PageMessage = {
            attribute: {
                retrieve: false,
                name,
                value,
                delay: now - beginTm,
            },
            when: now,
        };
        sblds_sendToContentScript(msg);
        return result;
    };
}


function sblds_overwriteGetProfileAttr(app: InnerLevelSiebelApp) {
    const originalGetProfileAttr = app.GetProfileAttr;
    app.GetProfileAttr = (name: string): string => {
        const beginTm = Date.now();
        const result = originalGetProfileAttr.call(app, name);
        const now = Date.now();
        const msg: PageMessage = {
            attribute: {
                retrieve: true,
                name,
                value: result,
                delay: now - beginTm,
            },
            when: now,
        };
        sblds_sendToContentScript(msg);
        return result;
    };
}


function sblds_overwriteGotoView(app: InnerLevelSiebelApp) {
    const originalGotoView = app.GotoView;
    app.GotoView = (view: string, viewId?: string, strURL?: string, strTarget?: string) => {
        originalGotoView.call(app, view, viewId, strURL, strTarget);
        const msg: PageMessage = {
            visit: {
                view, viewId, strURL, strTarget,
            },
            when: Date.now(),
        };
        sblds_sendToContentScript(msg);
    };
}


function sblds_overwriteGetService(app: InnerLevelSiebelApp) {
    const originalGetService = app.GetService;
    app.GetService = (serviceName: string): SiebelService => {
        let service = originalGetService.call(app, serviceName);
        if (service && !service.__withApiTracking) {
            service.__withApiTracking = true;
            const originalInvokeMethod = service.InvokeMethod;
            service.InvokeMethod = (methodName: string, input: SiebelPropertySet, config?: SiebelMethodConfig): SiebelPropertySet => {
                const id = makeId();
                const beginTm = Date.now();
                if (config) {
                    if (config.errcb) {
                        const errcb = config.errcb;
                        config.errcb = (name: string, request: SiebelPropertySet, response: SiebelPropertySet) => {
                            sblds_onAsyncApiResponse(errcb, serviceName, false, beginTm, id, name, request, response, config);
                        };
                    }
                    if (config.cb) {
                        const cb = config.cb;
                        config.cb = (name: string, request: SiebelPropertySet, response: SiebelPropertySet) => {
                            sblds_onAsyncApiResponse(cb, serviceName, true, beginTm, id, name, request, response, config);
                        };
                    }
                }

                const msg: PageMessage = {
                    api: {
                        id,
                        success: true,
                        async: false,
                        service: serviceName,
                        method: methodName,
                        request: T(input),
                        delay: 0,
                    },
                    when: beginTm,
                };
                sblds_sendToContentScript(msg);

                const result = originalInvokeMethod.call(service, methodName, input, config);
                if (!config || !config.cb) {
                    const now = Date.now();
                    const msg: PageMessage = {
                        api: {
                            id,
                            success: true,
                            async: false,
                            service: serviceName,
                            method: methodName,
                            request: T(input),
                            response: T(result),
                            delay: now - beginTm,
                        },
                        when: now,
                    };
                    sblds_sendToContentScript(msg);
                }
                return result;
            };
        }
        return service;
    };
}

function sblds_onAsyncApiResponse(
    fn: SiebelMethodResponseCallback, service: string, success: boolean, beginTm: number, id: string,
    name: string, request: SiebelPropertySet, response: SiebelPropertySet,
    config: SiebelMethodConfig
) {
    const now = Date.now();
    const msg: PageMessage = {
        api: {
            id,
            success,
            async: config.async,
            service,
            method: name,
            request: T(request),
            response: T(response),
            delay: now - beginTm,
        },
        when: now,
    };
    sblds_sendToContentScript(msg);
    if (config.scope) {
        fn.call(config.scope, name, request, response);
    } else {
        fn(name, request, response);
    }
}


function makeId() {
    const s0 = ('' + Math.random()).substring(2);
    const s1 = ('' + Math.random()).substring(2);
    return s0 + s1;
}
