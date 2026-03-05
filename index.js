const express = require("express");
const path = require("path");
const Docker = require("dockerode");
var docker = new Docker();

const app = express();
app.set("view engine", "ejs");
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.listen(port, () => {
    console.log(`Running on 127.0.0.1:${port}`);
    listContainers();
});

app.get('/', async (req, res) => {
    // From https://stackoverflow.com/a/57710329
    //res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    //res.header('Expires', '-1');
    //res.header('Pragma', 'no-cache');
    const containers = await listContainers();
    //console.log("Container List: " + JSON.stringify(containers, null, 2));
    res.render('panel', {
        active_containers: containers
    });
});

app.post("/api/send-signal", (req, res) => {
    const signal = req.body?.command;
    const serverId = req.body?.serverId;
    console.log(`Server with ID of ${serverId} has been sent signal '${signal}'.`);
    try {
        var container = docker.getContainer(serverId);
        if (container) {
            if (signal == "stop") {
                container.stop(function () { // (err, data)
                    console.log(`Server with ID of ${serverId} has been successfully stopped.`);
                });
            } else if (signal == "start") {
                container.start(function () {
                    console.log(`Server with ID of ${serverId} has been successfully started.`);
                });
            }
        }
    } catch (err) {
        console.error(err);
    }
});

app.get("/api/servers", async (req, res) => {
    const containers = await listContainers();
    res.json(containers);
});

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
        console.log("Error occurred: " + containers);
        return [];
    }
}