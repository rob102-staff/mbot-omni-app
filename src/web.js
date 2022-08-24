import { io } from "socket.io-client";

/********************
 * WEBSOCKET HELPERS
 ********************/

class WSHelper {
  constructor(host, port, endpoint, reconnect_delay = 5000) {
    this.socket = null;
    this.uri = "http://" + "" + ":" + port + "/" + endpoint;
    this.attempting_connection = false;
    this.connectInterval = null;
    this.connect_period = reconnect_delay;

    this.statusCallback = (status) => {console.warn("statusCallback is not yet set up.")};
    this.userOnConnect = (evt) => {};
    this.userHandleMap = (evt) => {console.warn("userHandleMap is not yet set up.")};
    this.handleMapUpdate = (evt) => {console.warn("handleMapUpdate is not yet set up.")};
    this.handleLaser = (evt) => {console.warn("handleLaser is not yet set up.")};
    this.handlePose = (evt) => {console.warn("handlePose is not yet set up.")};
    this.handlePath = (evt) => {console.warn("handlePath is not yet set up.")};
    this.handleParticle = (evt) => {console.warn("handleParticle is not yet set up.")};
    this.handleObstacle = (evt) => {console.warn("handleObstacle is not yet set up.")};
  }

  connect() {
    if (this.socket !== null) {
      if (this.socket.connected === true){
        return true
      }
    }

    this.socket = io(this.uri);

    this.socket.on('connect', (evt) => this.handleOpen(evt));
    this.socket.on('disconnect', (evt) => this.attemptConnection());
    this.socket.on('error', (evt) => { this.statusCallback(this.status()); });
    this.socket.on('map', (evt) => this.userHandleMap(evt));
    this.socket.on('map_update', (evt) => this.handleMapUpdate(evt));
    this.socket.on('lidar', (evt) => this.handleLaser(evt));
    this.socket.on('path', (evt) => this.handlePath(evt));
    this.socket.on('pose', (evt) => this.handlePose(evt))
    this.socket.on('particles', (evt) => this.handleParticle(evt))
    this.socket.on('obstacles', (evt) => this.handleObstacle(evt))

    return this.status();
  }

  attemptConnection() {
    console.log("Attempting to connect socket...")
    // If we aren't already trying to connect, try now.
    if (!this.attempting_connection) {
      // Try to connect. If we fail, start an interval to keep trying.
      if (!this.connect()) {
        console.log("Failed to connect!")
        this.connectInterval = setInterval(() => {
          this.connect();
        }, this.connect_period);

        this.attempting_connection = true;
      }
    }

    this.statusCallback(this.status());
  }

  handleOpen(evt) {
    console.log("Socket connection open to:", this.uri);

    if (this.connectInterval !== null) {
      clearInterval(this.connectInterval);
    }
    this.attempting_connection = false;

    this.statusCallback(this.status());
    this.userOnConnect(evt);
  }

  status() {
    if (this.socket === null) return false;
    return this.socket.connected;
  }

  send(data) {
    if (this.status() !== true) return;
    this.socket.send(JSON.stringify(data));
  }
}

export { WSHelper };