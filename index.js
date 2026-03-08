const express = require("express");
const path = require("path");
const Docker = require("dockerode");
var docker = new Docker();

const app = express();
app.set("view engine", "ejs");
const port = 3000;

const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
/*app.listen(port, () => {
    console.log(`Running on 127.0.0.1:${port}`);
    listContainers();
});*/

http.listen(port, () => {
    console.log("Running HTTP + websocket on port " + port);
});

io.on("connection", (socket) => {
    console.log("Client connected");
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
    console.log(logs);
});

app.post("/api/send-signal", async (req, res) => {
    const signal = req.body?.command.toLowerCase();
    const serverId = req.body?.serverId;
    console.log(`Server with ID of ${serverId} has been sent signal '${signal}'.`);
    try {
        var container = docker.getContainer(serverId);
        if (container) {
            if (signal == "stop") {
                container.stop(function () { // (err, data)
                    console.log(`Server with ID of ${serverId} has been successfully stopped.`);
                    res.json({success: true});
                });
            } else if (signal == "start") {
                container.start(function () {
                    console.log(`Server with ID of ${serverId} has been successfully started.`);
                    res.json({success: true});
                });
            } else if (signal == "restart") {
                container.restart(function () {
                    console.log(`Server with ID of ${serverId} has been successfully restarted.`);
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
            console.log(ctInfo);
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
        console.log("Error occurred: " + error);
        return [];
    }
};

io.on("connection", (socket) => {
    socket.on("subscribeLogs", async (containerId) => {
        try {
            const server = docker.getContainer(containerId);
            const logStream = await server.logs({
                follow: true,
                stdout: true,
                stderr: true,
                tail: 100,
                timestamps: true
            });

            // Credit: GPT-4.1 (for the demux process)
            const { Writable } = require('stream');
            const outStream = new Writable({
                write(chunk, enc, callback) {
                    socket.emit("logs", chunk.toString("utf-8"));
                    callback();
                }
            });
            server.modem.demuxStream(logStream, outStream, outStream);

            socket.on("disconnect", () => {
                logStream.destroy();
            });
        } catch (e) {
            socket.emit("logs", "Error with log stream: " + e.message);
        }
    })
    socket.on("execCommand", async ({containerId, command}) => {
        try {
            const server = docker.getContainer(containerId);
            const exec = await server.exec({
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
            });
        } catch (e) {
            socket.emit("commandResult", "[UPD > Error]: " + e.message);
        }
    })
})