/********************
 * MOVE HELPERS
 ********************/
// import {MBotApp} from "./app";

class DriveControls {
  constructor(wsInput) {
    this.ws = wsInput;
  }

  animation(name){
    const e = document.getElementById(name);
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
  }

  moveLeft(spd){
    console.log("Moving left...");
    // console.log(MBotApp.state.speed);
    this.animation("move-left");
    this.ws.socket.emit("move", {'direction': "W", 'speed' : spd});
  }

  moveRight(spd){
    console.log("Moving right...");
    this.animation("move-right");
    this.ws.socket.emit("move", {'direction': "E", 'speed' : spd});
  }

  rotateLeft(spd){
    console.log("Turning left...");
    this.animation("turn-left");
    this.ws.socket.emit("move", {'direction': "spinleft", 'speed' : spd});
  }

  rotateRight(spd){
    console.log("Turning right...");
    this.animation("turn-right");
    this.ws.socket.emit("move", {'direction': "spinright", 'speed' : spd});
  }

  goStraight(spd){
    console.log("Moving forwards...");
    this.animation("move-str");
    this.ws.socket.emit("move", {'direction': "N", 'speed' : spd});
  }

  goBack(spd){
    console.log("Moving backwards...");
    this.animation("move-back");
    this.ws.socket.emit("move", {'direction': "S", 'speed' : spd});
  }

  start(){
    console.log("Start robot");
    this.animation("drive-start");
  }

  stop(){
    console.log("STOP robot it was about run into Popeye");
    this.animation("drive-stop");
    this.ws.socket.emit("stop", {'stop cmd': "stop"});
  }
}

export { DriveControls };
