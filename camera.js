const express = require('express')
const app = express();
const port = 7000;

// start capture
const videoStream = require('./src/videoStream');
videoStream.acceptConnections(app, {}, '/stream.mjpg', true);

app.use(express.static(__dirname+'/'));
app.listen(port, () => console.log(`Example app listening on port ${port}! In your web browser, navigate to http://<IP_ADDRESS_OF_THIS_SERVER>:3000`));