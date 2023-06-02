import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowUp,
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowRotateLeft,
  faArrowRotateRight
} from '@fortawesome/free-solid-svg-icons'

import config from "./config.js";

/********************
 * MOVE PANEL
 ********************/

function XY(props){
  var msg = []
  msg.push(<p key="1" className="robot-info"> (X: {props.X}, Y: {props.Y})</p>)  
  return(
    <div className="">
      {msg}
    </div>
  )
}

class DriveControlPanel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      speed: 50,
      thing: 0,
      joystickX: 0, 
      joystickY: 0
    }


    this.controlMap = {
      s: {pressed: false, fn: "back"},
      w: {pressed: false, fn: "forward"},
      a: {pressed: false, fn: "left"},
      d: {pressed: false, fn: "right"},
      e: {pressed: false, fn: "tright"},
      q: {pressed: false, fn: "tleft"}
    };

    //The x, y, and theta values updated by the keyboard buttons
    this.x = 0;
    this.y = 0;
    this.t = 0;

    this.isThisMounted = false
  }

  componentDidMount() {
    this.isThisMounted = true
    // TODO: The event listener should be in the main app in case anyone else uses keys.
    document.addEventListener('keydown', (evt) => { this.handleKeyDown(evt); }, false);
    document.addEventListener('keyup', (evt) => { this.handleKeyUp(evt); }, false);
 
    setTimeout(() => {      
      let Joy1 = new JoyStick('joy1Div', {}, (stickData) => {
        if(this.isThisMounted){
          this.x = stickData.y/100
          this.y = -stickData.x/100
          this.setState({joystickX: stickData.x, joystickY: stickData.y})
          this.drive()
        }

      });
     }, 100);

  }

  componentWillUnmount(){
    this.isThisMounted = false
  }

  onSpeedChange(event) {
    this.setState({speed: event.target.value});
  }

  handleKeyDown(evt) {
    // First checks if the drive State is active, then adds speed values in rx, ry, and theta
    if(this.props.drivingMode)
    {
      if(this.controlMap[evt.key]){
        this.controlMap[evt.key].pressed = true
        if(this.controlMap[evt.key].fn == "back" && this.x > -1) this.x--;
        if(this.controlMap[evt.key].fn == "forward" && this.x < 1) this.x++;
        if(this.controlMap[evt.key].fn == "right" && this.y > -1) this.y--;
        if(this.controlMap[evt.key].fn == "left" && this.y < 1) this.y++;
        if(this.controlMap[evt.key].fn == "tright" && this.t > -1) this.t--;
        if(this.controlMap[evt.key].fn == "tleft" && this.t < 1) this.t++;
      }

      // Update drive speeds.
      this.drive();
    }
  }

  handleKeyUp(evt) {
    // First checks if the drive State is active, then substracts speed values in rx, ry, and theta
    if(this.props.drivingMode){
      if(this.controlMap[evt.key]){
        this.controlMap[evt.key].pressed = false
        if(this.controlMap[evt.key].fn == "back") this.x++;
        if(this.controlMap[evt.key].fn == "forward") this.x--;
        if(this.controlMap[evt.key].fn == "right") this.y++;
        if(this.controlMap[evt.key].fn == "left") this.y--;
        if(this.controlMap[evt.key].fn == "tright") this.t++;
        if(this.controlMap[evt.key].fn == "tleft") this.t--;
      }

      // Stops robot if it finds that all keys have been lifted up, acts as a failsafe to above logic
      let reset = true;
      for (const [key, value] of Object.entries(this.controlMap)) {
        if (value.pressed) reset = false;
      }
      if (reset) { this.x = 0; this.y = 0; this.t = 0; }

      // Update drive speeds.
      this.drive();
    }
  }

  stop(){
     this.props.ws.socket.emit("stop", {'stop cmd': "stop"});
  }

  drive(x=this.x, y=this.y, t=this.t, spd=this.state.speed){
    console.log(spd * x / 100., spd * y / 100., config.ANG_VEL_MULTIPLIER * spd * t / 100.)
    this.props.ws.socket.emit("move", {
                              'vx' : spd * x / 100.,
                              'vy' : spd * y / 100.,
                              'wz' : config.ANG_VEL_MULTIPLIER * spd * t / 100.
    })
  }

  driveClick(x, y, z){
    //When the drive button is clicked with the mouse, the robot will drive for 2 seconds
    this.drive(x, y, z, this.state.speed)
    setTimeout(() =>{
      this.drive(0, 0, 0)
    }, 2500)
  }

  render() {
    return (
      <div className="drive-panel-wrapper">
        <div className="drive-buttons">
          <button className="button drive-turn" id="turn-left"
                  onClick={() => this.driveClick(0, 0, 1)}>
            <FontAwesomeIcon icon={faArrowRotateLeft} />
          </button>
          <button className="button drive-move" id="move-str"
                  onClick={() => this.driveClick(1, 0, 0)}>
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
          <button className="button drive-turn" id="turn-right"
                  onClick={() => this.driveClick(0, 0, -1)}>
            <FontAwesomeIcon icon={faArrowRotateRight} />
          </button>

          <button className="button drive-move" id="move-left"
                  onClick={() => this.driveClick(0, 1, 0)}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <button className="button drive-move" id="move-right"
                  onClick={() => this.driveClick(0, -1, 0)}>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
          <button className="button drive-move" id="move-back"
                  onClick={() => this.driveClick(-1, 0, 0)}>
            <FontAwesomeIcon icon={faArrowDown} />
          </button>
        </div>
        <div className="button-wrapper-row top-spacing">
          <button className="button stop-color col-lg-12" id="drive-stop"
                  onClick={() => this.stop()}>Stop</button>
        </div>
        <div className="col-lg-12">
          <span>Speed: {this.state.speed} &nbsp;&nbsp;</span>
          <input type="range" min="1" max="100" value={this.state.speed}
                 onChange={(evt) => this.onSpeedChange(evt)}></input>
        </div>
        <div id="joy1Div" className={`temp`}> </div>
        <XY X={this.state.joystickX} Y={this.state.joystickY}/>
        {/* hello {this.joystickX} {this.joystickY} */}
      </div>
    );
  }
}

export { DriveControlPanel };
