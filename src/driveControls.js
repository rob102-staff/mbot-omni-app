/********************
 * MOVE HELPERS
 ********************/

class DriveControls {
  constructor(wsInput) {
    this.ws = wsInput;
  }

  moveLeft(){
    console.log("Moving left...");
    this.ws.socket.emit("move", {'direction': "W"});
  }

  moveRight(){
    console.log("Moving right...");
    this.ws.socket.emit("move", {'direction': "E"});
  }

  rotateLeft(){
    console.log("Turning left...");
    this.ws.socket.emit("move", {'direction': "spinleft"});
  }

  rotateRight(){
    console.log("Turning right...");
    this.ws.socket.emit("move", {'direction': "spinright"});
  }

  goStraight(){
    console.log("Moving forwards...");
    this.ws.socket.emit("move", {'direction': "N"});
  }

  goBack(){
    console.log("Moving backwards...");
    this.ws.socket.emit("move", {'direction': "S"});
  }

  start(){
    console.log("Start robot");
  }

  stop(){
    console.log("STOP robot it was about run into Popeye");
    this.ws.socket.emit("stop", {'stop cmd': "stop"});
  }
}

export { DriveControls };
