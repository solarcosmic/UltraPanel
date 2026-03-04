const express = require("express");
const path = require("path");
const Docker = require("dockerode");
var docker = new Docker();

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.listen(port, () => {
    console.log(`Running on 127.0.0.1:${port}`);
});