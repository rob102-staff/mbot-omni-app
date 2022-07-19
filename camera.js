const express = require('express')
const app = express();
const port = 7000;

// start capture
const videoStream = require('./src/videoStream');
videoStream.acceptConnections(app, {}, '/stream.mjpg', true);

app.use(express.static(__dirname+'/'));
app.listen(port, () => console.log(`Camera Listening. In your web browser, navigate to http://192.168.3.1:7000`));