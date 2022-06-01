/********************
 * MOVE HELPERS
 ********************/

class DriveControls {
  constructor(wsInput) {
    this.ws = wsInput;
  }

  // Animation that changes the button to this color as long as the drive-keys are pressed down
  animation(name){
    const btn_element = document.getElementById(name);
    btn_element.classList.add("keydown-drivecolor");
  }

  // This is only for the start/stop buttons, as it is only meant to be pressed/clicked once or twice. 
  // Once clicked, it changes colors for 0.5 seconds, before going back to its orginal color
  animationStartStop(name){
    const btn_element = document.getElementById(name);
    btn_element.classList.add("dbutton-animation");
    setTimeout(function(){
      btn_element.classList.remove("dbutton-animation");
    }, 500)

    // This resets the colors for the drive keys when clicked, as when clicked with a mouse, they stay the same color until either "Stop" or "Start" is clicked
    const driveCtrls = document.getElementsByClassName("drive-ctrl")
    for (let index = 0; index < driveCtrls.length; index++) {
      const element = driveCtrls[index];
      element.classList.remove("keydown-drivecolor");
    }
  }

  // Once the drive-key is released, the color is then changed back to its inital state
  removeAnimationKey(name){
    const btn_element = document.getElementById(name);
    btn_element.classList.remove("keydown-drivecolor");
  }

  moveLeft(spd){
    console.log("Moving left...");
    // this.animation("move-left");
    this.ws.socket.emit("move", {'direction': "W", 'speed' : spd});
  }

  moveRight(spd){
    console.log("Moving right...");
    console.log(spd);
    // this.animation("move-right");
    this.ws.socket.emit("move", {'direction': "E", 'speed' : spd});
  }

  rotateLeft(spd){
    console.log("Turning left...");
    // this.animation("turn-left");
    this.ws.socket.emit("move", {'direction': "spinleft", 'speed' : spd});
  }

  rotateRight(spd){
    console.log("Turning right...");
    // this.animation("turn-right");
    this.ws.socket.emit("move", {'direction': "spinright", 'speed' : spd});
  }

  goStraight(spd){
    console.log("Moving forwards...");
    // this.animation("move-str");
    this.ws.socket.emit("move", {'direction': "N", 'speed' : spd});
  }

  goBack(spd){
    console.log("Moving backwards...");
    // this.animation("move-back");
    this.ws.socket.emit("move", {'direction': "S", 'speed' : spd});
  }

  //Currently "Start" is here for asthetic purposes, as it serves no functional purpose at the moment.
  start(){
    console.log("Start robot");
    this.animationStartStop("drive-start");
  }

  stop(){
    console.log("STOP robot it was about run into Popeye");
    this.animationStartStop("drive-stop");
    this.ws.socket.emit("stop", {'stop cmd': "stop"});
  }

  // This function does the same thing as stop(), expect that it is meant for the drive-keys when pressed with a key. 
  // When the key is lifted up, this function is called, which then removes the color change from that corresponding drive-button
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
