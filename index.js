const express = require("express");
const path = require("path");
const Docker = require("dockerode");
var docker = new Docker();

const app = express();
app.set("view engine", "ejs");
const port = 3000;

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
    console.log("Container List: " + JSON.stringify(containers, null, 2));
    res.render('panel', {
        active_containers: containers
    });
});

async function listContainers() {
    try {
        const containers = await docker.listContainers({all: true});
        const containerIds = containers.map(ctInfo => {
            //return ctInfo.Names[0].substring(1) || ctInfo.Id;
            return ctInfo;
        });
        return containerIds;
    } catch (error) {
        console.log("Error occurred: " + containers);
        return [];
    }
}