/********************
 * MOVE HELPERS
 ********************/

class DRIVE_CONTROLS {
  constructor(wsInput) {
    this.ws = wsInput;
  }

  moveLeft(){
    console.log("Moving left...");
    const e = document.getElementById("drive4");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    this.ws.socket.emit("move", {'direction': "W"});
  }

  moveRight(){
    console.log("Moving right...");
    const e = document.getElementById("drive3");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    this.ws.socket.emit("move", {'direction': "E"});
  }

  rotateLeft(){
    console.log("Turning left...");
    const e = document.getElementById("drive8");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    this.ws.socket.emit("move", {'direction': "spinleft"});
  }

  rotateRight(){
    console.log("Turning right...");
    const e = document.getElementById("drive9");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    this.ws.socket.emit("move", {'direction': "spinright"});
  }

  goStraight(){
    console.log("Moiving forwards...");
    const e = document.getElementById("drive1");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    this.ws.socket.emit("move", {'direction': "N"});
  }

  goBack(){
    console.log("Moving backwards...");
    const e = document.getElementById("drive2");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    this.ws.socket.emit("move", {'direction': "S"});
  }

  start(){
    console.log("Start robot");
    const e = document.getElementById("drive6");
    e.classList.add("startbtn-animation")
    setTimeout(function(){
      e.classList.remove("startbtn-animation");
    }, 1000)
  }

  stop(){
    console.log("STOP robot it was about run into Popeye");
    const e = document.getElementById("drive7");
    e.classList.add("stopbtn-animation")
    setTimeout(function(){
      e.classList.remove("stopbtn-animation");
    }, 1000)
    this.ws.socket.emit("stop", {'stop cmd': document.getElementById("myRange").value});
  }
}

export { DRIVE_CONTROLS };
