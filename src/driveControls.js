/********************
 * MOVE HELPERS
 ********************/

class DriveControls {
  constructor(wsInput) {
    this.ws = wsInput;
  }

  animation(name){
    const e = document.getElementById(name);
    e.classList.add("keydown-drivecolor");
  }

  animation2(name){
    const e = document.getElementById(name);
    e.classList.add("dbutton-animation");
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
  }

  removeAnimationKey(name){
    const e = document.getElementById(name);
    e.classList.remove("keydown-drivecolor");
  }

  moveLeft(spd){
    console.log("Moving left...");
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
    this.animation2("drive-start");
  }

  stop(){
    console.log("STOP robot it was about run into Popeye");
    this.animation2("drive-stop");
    this.ws.socket.emit("stop", {'stop cmd': "stop"});
  }

  stopKeyUp(name){
    console.log("STOP robot it was about run into Popeye");
    if(name == "w") this.removeAnimationKey("move-str");
    if(name == "a") this.removeAnimationKey("move-left");
    if(name == "s") this.removeAnimationKey("move-back");
    if(name == "d") this.removeAnimationKey("move-right");
    if(name == "q") this.removeAnimationKey("turn-left");
    if(name == "e") this.removeAnimationKey("turn-right");
    this.ws.socket.emit("stop", {'stop cmd': "stop"});
  }
}

export { DriveControls };
