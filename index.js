const express = require("express");
const path = require("path");
const Docker = require("dockerode");
const kleur = require("kleur");
const { version } = require("./package.json");
var docker = new Docker();
var Convert = require("ansi-to-html");
var convert = new Convert();
const os = require("os");
const crypto = require("crypto");
const interfaces = os.networkInterfaces();

console.log(kleur.bold(`
▗▖ ▗▖█    ■   ▄▄▄ ▗▞▀▜▌▗▄▄▖ ▗▞▀▜▌▄▄▄▄  ▗▞▀▚▖█ 
▐▌ ▐▌█ ▗▄▟▙▄▖█    ▝▚▄▟▌▐▌ ▐▌▝▚▄▟▌█   █ ▐▛▀▀▘█ 
▐▌ ▐▌█   ▐▌  █         ▐▛▀▘      █   █ ▝▚▄▄▖█ 
▝▚▄▞▘█   ▐▌            ▐▌                   █ 
         ▐▌                                   

UltraPanel Control Interface v${version} (Beta - GPLv3)
`) + `2026 (c) solarcosmic\n`);

const ip = Object.values(interfaces).flat().find(iface => iface.family == "IPv4" && !iface.internal);
//console.log(ip)

const app = express();
app.set("view engine", "ejs");
const port = 3000;
infoLog(`Establishing connection on ${ip.address}:${port}.`);

const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// for forms: app.use(express.urlencoded({extended: true}));
/*app.listen(port, () => {
    console.log(`Running on 127.0.0.1:${port}`);
    listContainers();
});*/

http.listen(port, () => {
    infoLog(`Now listening on port :${port}.`);
});

io.on("connection", (socket) => {
    infoLog(`Client connected.`);
})

app.get('/', async (req, res) => {
    // From https://stackoverflow.com/a/57710329
    //res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    //res.header('Expires', '-1');
    //res.header('Pragma', 'no-cache');
    //const containers = await listContainers();
    //console.log("Container List: " + JSON.stringify(containers, null, 2));
    /*res.render('panel', {
        active_containers: containers
    });*/
    /*var container = await api_getServerById("22dc2ad12ceca9b039f296da6bd86924489e2db8c930ef1bc566ea5d11f5d753");
    var logs = await api_getContainerLogs("22dc2ad12ceca9b039f296da6bd86924489e2db8c930ef1bc566ea5d11f5d753");
    res.render('panel', {
        server: container,
        logs: logs
    });
    console.log(logs);*/
    res.render("panel");
});

app.get("/server/:shortId", async (req, res) => {
    const shortId = req.params.shortId;
    if (!shortId) res.json({success: false, error: "You must provide a valid ID"});
    var container = await api_getServerById(shortId);
    var logs = await api_getContainerLogs(shortId);
    res.render('console', {
        server: container,
        logs: logs
    });
    //console.log(logs);
});

app.get("/admin/create-server", async (req, res) => {
    res.render('create');
});

app.post("/api/admin/submit-create-server", async (req, res) => {
    const formData = req.body;
    const name = formData.data["server-name"] || "Untitled";
    const type = formData.data["server-type"] || "papermc";
    const port1 = formData.data["server-port-main"] || "25565";
    const port2 = formData.data["server-port-secondary"] || "19132";

    const mcTemplate = {
        Image: "marctv/minecraft-papermc-server:latest",
        OpenStdin: true,
        Tty: true,
        Env: ["MEMORYSIZE=1G"],
        ExposedPorts: {
            [`${port1}/tcp`]: {}, // TODO: change both ports
            [`${port2}/udp`]: {}  // so that the user can make multiple
        },
        HostConfig: {
            RestartPolicy: { Name: "unless-stopped" },
            PortBindings: {
                [`${port1}/tcp`]: [{ HostPort: port1 }],
                [`${port2}/udp`]: [{ HostPort: port2 }],
            },
            Binds: [`/root/${crypto.randomUUID()}:/data:rw`]
        },
    }


    const pumpkinTemplate = {
        Image: "ghcr.io/pumpkin-mc/pumpkin:master",
        OpenStdin: true,
        Tty: true,
        Env: ["MEMORYSIZE=1G"],
        ExposedPorts: {
            [`${port1}/tcp`]: {}, // TODO: change both ports
            [`${port2}/udp`]: {}  // so that the user can make multiple
        },
        HostConfig: {
            RestartPolicy: { Name: "unless-stopped" },
            PortBindings: {
                [`${port1}/tcp`]: [{ HostPort: port1 }],
                [`${port2}/udp`]: [{ HostPort: port2 }],
            },
            Binds: [`/root/${crypto.randomUUID()}:/server:rw`]
        },
    }

    var chosenTemplate = mcTemplate;
    if (type == "papermc") chosenTemplate = mcTemplate;
    if (type == "pumpkinmc") chosenTemplate = pumpkinTemplate;
    docker.createContainer({...chosenTemplate, name}, (err, cont) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        infoLog(`Creating server named ${name} using ${chosenTemplate.Image}. Running on main port ${port1} and secondary port ${port2}.`);
        cont.start((err2) => {
            if (err2) return res.status(500).json({ success: false, error: err2.message });
            infoLog(`Started server named ${name} successfully!`);
            res.json({success: true, serverId: cont.id});
        })
    })

    /*try {
        docker.createContainer(mcTemplate, { 
        }).then((container) => {
            infoLog("Container created!");
            return container.start();
        }).then((data) => {
            infoLog("Container started and detached.");
            res.json({success: true, serverId: "serverId"});
        })
    } catch (err) {
        infoLog("An error occurred while creating container: " + err.message);
    }*/

    //res.json({success: true, serverId: "serverId"});
})

function infoLog(log) {
    console.log(kleur.grey(["["]) + kleur.green("INFO") + kleur.grey(`] ${log}`));
}

app.post("/api/send-signal", async (req, res) => {
    const signal = req.body?.command.toLowerCase();
    const serverId = req.body?.serverId;
    infoLog(`Server with ID of ${serverId} has been sent signal '${signal}'.`);
    try {
        var container = docker.getContainer(serverId);
        if (container) {
            if (signal == "stop") {
                container.stop(function () { // (err, data)
                    infoLog(`Server with ID of ${serverId} has been successfully stopped.`);
                    res.json({success: true});
                });
            } else if (signal == "start") {
                container.start(function () {
                    infoLog(`Server with ID of ${serverId} has been successfully started.`);
                    res.json({success: true});
                });
            } else if (signal == "restart") {
                container.restart(function () {
                    infoLog(`Server with ID of ${serverId} has been successfully restarted.`);
                    res.json({success: true});
                });
            }
        }
        //res.json({success: true}); I'm not sure if this supports async or not
    } catch (err) {
        console.error(err);
        res.status(500).json({success: false, error: err.message});
    }
});

app.post("/api/delete-server", async (req, res) => {
    try {
        if (req.body.affirm && req.body.serverId) {
            const container = docker.getContainer(req.body.serverId);
            if (!container) return res.status(500).json({success: false, error: "No such server!"});
            if (container.isRunning) await container.stop();
            await container.remove({force: req.body.force || false});
            console.log("Response sent - container is gone.");
            res.json({success: true});
        }
    } catch (err) {
        console.error(err);
        console.log("ERROR DETECTED");
        res.status(500).json({success: false, error: err.message});
    }
})

app.get("/api/server-status/:id", async (req, res) => {
    const serverId = req.params.id;
    try {
        var container = docker.getContainer(serverId);
        if (!container) throw Error("Server with ID not found. Is the correct ID used?");
        container.inspect((err, data) => {
            if (err) throw Error(err);
            // Credit: GPT-4.1 (for doing the tcp/udp detection thing as I was on a time crunch)
            const ports = data.NetworkSettings.Ports || {};
            let mainPort = 25565;

            const udpEntry = Object.entries(ports).find(
                ([key, val]) => key.endsWith('/tcp') && Array.isArray(val) && val.length > 0 && val[0]?.HostPort
            );
            if (udpEntry) {
                mainPort = udpEntry[1][0].HostPort;
            } else {
                const tcpEntry = Object.entries(ports).find(
                    ([key, val]) => key.endsWith('/udp') && Array.isArray(val) && val.length > 0 && val[0]?.HostPort
                );
                if (tcpEntry) {
                    mainPort = tcpEntry[1][0].HostPort;
                }
            }

            res.json({
                success: true,
                status: data.State.Status,
                isRunning: data.State.Running,
                mainPort: mainPort,
                ip: ip.address || "127.0.0.1"
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({success: false, error: err.message});
    }
});

app.get("/api/servers", async (req, res) => {
    res.json(await api_getServers());
});

async function api_getServers() {
    return await listContainers() || {};
}

async function api_getServerById(id) {
    // TODO: instead of looping through the whole server list, pick it out individually and parse that way
    const serverList = await api_getServers();
    for (const obj of serverList) {
        if (obj.id == id) {
            return obj;
        }
    }
    return null;
}

// Credit: GPT 4.1 (for the thing)
async function api_getContainerLogs(id) {
    const container = docker.getContainer(id);
    const data = await container.logs({
        stdout: true,
        stderr: true,
        tail: 'all',
        timestamps: true
    });
    if (Buffer.isBuffer(data)) {
        return data.toString('utf-8');
    } else if (typeof data === 'string') {
        return data;
    } else if (data && typeof data.pipe === 'function') {
        return await new Promise((resolve, reject) => {
            let logs = '';
            data.on('data', chunk => {
                logs += chunk.toString('utf-8');
            });
            data.on('end', () => resolve(logs));
            data.on('error', reject);
        });
    } else {
        return '';
    }
};

async function api_sendCommand(serverId, command) {
    const server = docker.getContainer(serverId);
    const exec = await container.exec({
        Cmd: ["/bin/sh", "-c", command],
        AttachStdout: true,
        AttachStderr: true
    });
    exec.start((err, stream) => {
        if (err) {
            return {success: false, error: err.message};
        };
        let output = "";

        // stuff here
    });
    server.exec({Cmd: ['ls'], AttachStdout: true, AttachStderr: true}, (err, exec) => {
        if (err) return;
        exec.start((err, stream) => {
            // stuff here
        });
    })
};

async function listContainers() {
    try {
        const containers = await docker.listContainers({all: true});
        const containerIds = containers.map(ctInfo => {
            //return ctInfo.Names[0].substring(1) || ctInfo.Id;
            //console.log(ctInfo);
            return {
                id: ctInfo.Id,
                shortId: ctInfo.Id.substring(0, 12),
                name: ctInfo.Names[0].substring(1),
                state: ctInfo.State,
                status: ctInfo.Status,
                command: ctInfo.Command,
                created: ctInfo.Created,
                image: ctInfo.Image,
                ports: ctInfo.Ports
            };
        });
        return containerIds;
    } catch (error) {
        infoLog("Error occurred: " + error);
        return [];
    }
};

io.on("connection", (socket) => {
    var logStream = null;
    socket.on("subscribeLogs", async (containerId) => {
        if (logStream) {
            try {
                logStream.destroy();
            } catch (err) {}
            logStream = null;
        }
        try {
            const server = docker.getContainer(containerId);
            const info = await server.inspect();
            const isTty = !!info.Config.Tty;
            logStream = await server.logs({
                follow: true,
                stdout: true,
                stderr: true,
                tail: 100,
                timestamps: true
            });

            if (isTty) {
                logStream.on("data", (chunk) => {
                    socket.emit("logs", convert.toHtml(chunk.toString()));
                })
            } else {
                // Credit: GPT-4.1 (for the demux process)
                const { Writable } = require('stream');
                const outStream = new Writable({
                    write(chunk, enc, callback) {
                        socket.emit("logs", convert.toHtml(chunk.toString()));
                        callback();
                    }
                });
                server.modem.demuxStream(logStream, outStream, outStream);
            }

            logStream.on("end", () => {
                socket.emit("logStreamEnded");
            });
            logStream.on("error", (e) => {
                socket.emit("logs", "Log stream error: " + e.message);
            });

            socket.on("disconnect", () => {
                try { logStream?.destroy(); } catch (e) {}
            });
        } catch (e) {
            socket.emit("logs", "Error with log stream: " + e.message);
        }
    })
    socket.on("execCommand", async ({containerId, command}) => {
        try {
            const server = docker.getContainer(containerId);
            /*const exec = await server.exec({
                Cmd: ["/bin/sh", "-c", command],
                AttachStdout: true,
                AttachStderr: true
            });
            exec.start((err, stream) => {
                if (err) {
                    socket.emit("commandResult", "[UPD > Error]: " + err.message);
                    return {success: false, error: err.message};
                };
                let output = "";
                stream.on("data", chunk => output += chunk.toString("utf-8"));
                stream.on("end", () => socket.emit("commandResult", output));
                // stuff here
            });*/
            const options = {
                stream: true,
                stdin: true,
                stdout: true,
                stderr: true
            };
            server.attach(options, (err, stream) => {
                if (err) {
                    socket.emit("commandResult", "[UPD > Error]: " + err.message);
                    return {success: false, error: err.message};
                };
                stream.write(command + "\n");
                var output = "";
                stream.on("data", chunk => output += chunk.toString("utf-8"));
                stream.on("end", () => socket.emit("commandResult", output));
            })
        } catch (e) {
            socket.emit("commandResult", "[UPD > Error]: " + e.message);
        }
    })
});
docker.getEvents({}, (err, stream) => {
    stream.on("data", (chunk) => {
        try {
            const event = JSON.parse(chunk.toString("utf-8"));
            if (event.Type == "container") {
                //console.log("event fired");
                //console.log(event);
                //console.log(event.id);
                io.emit("containerStatus", {
                    id: event.Actor.ID || "testing",
                    action: event.Action,
                    status: event.status
                });
            }
        } catch (err) {
            // ignore?
        }
    })
});