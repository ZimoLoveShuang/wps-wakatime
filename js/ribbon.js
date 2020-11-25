const ide = 'WPS'
const ide_version = wps.Application.Build
const plugin = 'WPS-wakatime'
const plugin_version = '1.0.1'

var lastAction = 0
var lastFile = undefined
var debug = false

//这个函数在整个wps加载项中是第一个执行的
function OnAddinLoad(ribbonUI) {
    if (typeof (wps.ribbonUI) != "object") {
        wps.ribbonUI = ribbonUI
    }

    if (typeof (wps.Enum) != "object") { // 如果没有内置枚举值
        wps.Enum = WPS_Enum
    }

    var api_key = read_api_key()
    if (debug) {
        log(api_key)
    }

    // save
    wps.ApiEvent.AddApiEventListener("DocumentBeforeSave", (doc) => {
        if (debug) {
            log('DocumentBeforeSave')
        }
        handleAction(true);
    });
    wps.ApiEvent.AddApiEventListener("WorkbookBeforeSave", (doc) => {
        if (debug) {
            log('WorkbookBeforeSave')
        }
        handleAction(true);
    });
    wps.ApiEvent.AddApiEventListener("PresentationBeforeSave", (doc) => {
        if (debug) {
            log('PresentationBeforeSave')
        }
        handleAction(true);
    });

    // open
    wps.ApiEvent.AddApiEventListener("DocumentOpen", (doc) => {
        if (debug) {
            log('DocumentOpen')
        }
        handleAction(true);
    });
    wps.ApiEvent.AddApiEventListener("WorkbookOpen", (doc) => {
        if (debug) {
            log('WorkbookOpen')
        }
        handleAction(true);
    });
    wps.ApiEvent.AddApiEventListener("NewPresentation", (doc) => {
        if (debug) {
            log('PresentationOpen')
        }
        handleAction(true);
    });

    // window changed
    wps.ApiEvent.AddApiEventListener("WindowActivate", (doc) => {
        if (debug) {
            log('WindowActivate')
        }
        handleAction(true);
    });


    return true
}

// 读取api_key，如果不存在就创建
function read_api_key() {
    var userdir = wps.Env.GetHomePath()
    var config_path = userdir + '/.wakatime.cfg'
    var partten = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/
    try {
        var api_key = wps.FileSystem.readAsBinaryString(config_path)
        return partten.exec(api_key)[0]
    } catch (e) {
        if (debug) {
            log(e)
        }
        // 没有配置api_key
        wps.ShowDialog(GetUrlPath() + '/input.html', '输入api_key')
    }
}

function enoughTimePassed() {
    return lastAction + 120000 < Date.now();
}

// 发送心跳包
function sendHeartbeat(file, time, project, language, isWrite, lines) {
    var api_key = read_api_key()
    $.ajax({
        type: 'POST',
        url: 'https://api.wakatime.com/api/v1/users/current/heartbeats',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
            time: time / 1000,
            entity: file,
            type: 'file',
            project: project,
            language: language,
            is_write: isWrite ? true : false,
            lines: lines,
            plugin: plugin + '/' + plugin_version,
        }),
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': ide + '/' + ide_version + ' ' + plugin + '/' + plugin_version,
            'Authorization': 'Basic ' + window.btoa(api_key)
        },
        success: function (res) {
            if (debug) {
                log(res)
            }
        }
    })
    lastAction = time;
    lastFile = file;
}

function handleAction(isWrite) {
    var api_key = read_api_key()
    var currentDocument = wps.Application.ActiveDocument
    if (currentDocument == undefined) {
        currentDocument = wps.Application.ActiveWorkbook
    }
    if (currentDocument == undefined) {
        currentDocument = wps.Application.ActivePresentation
    }
    var time = Date.now()
    if (isWrite || enoughTimePassed() || lastFile !== currentDocument.FullName) {
        var language = undefined
        var project = undefined
        var lines = undefined
        sendHeartbeat(currentDocument.FullName, time, project, language, isWrite, lines, api_key)
    }
}

function log(content) {
    console.log(content)
    var tmpdir = wps.Env.GetTempPath()
    var logdir = tmpdir + '/wps-wakatime'
    if (!wps.FileSystem.Exists(logdir)) {
        wps.FileSystem.Mkdir(logdir)
    }
    var logfile = logdir + '/' + Date.now() + '.log'
    wps.FileSystem.writeAsBinaryString(logfile, JSON.stringify(content))
}