import React from "react";
import ReactDOM from "react-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

import config from "./config.js";
import { WSHelper } from "./web.js";
import { DrawRobot } from "./robot";
import { parseMapFromSocket, parseMapFromLcm, normalizeList, downloadObjectAsJson } from "./map.js";
import { colourStringToRGB, getColor, GridCellCanvas } from "./drawing.js"
import { DriveControls } from "./driveControls.js";


/*******************
 *     BUTTONS
 *******************/

function StatusMessage(props) {
  var msg = [];
  msg.push("Robot Cell: (" + props.robotCell + ")");
  if (props.clickedCell.length > 0) {
    msg.push("Clicked Cell: (" + props.clickedCell + ")");
  }
  if (props.showField) {
    msg.push("Field: " + props.fieldVal.toFixed(4));
  }

  return (
    <div className="status-msg">
      {msg.join('\xa0\xa0\xa0')}
    </div>
  );
}

function ConnectionStatus(connection) {
  var msg = "Wait";
  var colour = "#ffd300";
  if (connection.status === true) {
    msg = "Connected";
    colour = "#00ff00";
  }
  else if (connection.status === false) {
    msg = "Not Connected";
    colour = "#ff0000";
  }

  return (
    <div className="status" style={{backgroundColor: colour}}>
      {msg}
    </div>
  );
}

/*******************
 *  CONTROL PANELS
 *******************/

function DriveControlPanel(props) {
  return (
    <div className="row px-5 text-center pt-3">
      <div className="button-wrapper col-lg-4">
        <span>Speed: {props.speed}</span> <br />
        <input type="range" min="1" max="100" value={props.speed}
               onChange={(evt) => props.onSpeedChange(evt)}></input>
      </div>
      <div className="button-wrapper top-spacing col-lg-4">
        <button className="button start-color" id="drive-start"
                onClick={() => props.driveControls.start()}>Start</button>
        <button className="button stop-color" id="drive-stop"
                onClick={() => props.driveControls.stop()}>Stop</button>
      </div>
      <div className="button-wrapper col-lg-4">
        <button className="button drive-turn drive-ctrl" id="turn-left"
                onClick={() => props.driveControls.drive(0, 0, -1, props.speed)}></button>
        <button className="button drive-move drive-ctrl" id="move-str"
                onClick={() => props.driveControls.drive(1, 0, 0, props.speed)}></button>
        <button className="button drive-turn drive-ctrl" id="turn-right"
                onClick={() => props.driveControls.drive(0, 0, 1, props.speed)}></button>
        <div className="drive-middle">
          <button className="button drive-move drive-ctrl" id="move-left"
                  onClick={() => props.driveControls.drive(0, -1, 0, props.speed)}></button>
          <button className="button drive-move drive-ctrl" id="move-right"
                  onClick={() => props.driveControls.drive(0, 1, 0, props.speed)}></button>
        </div>
        <button className="button drive-move drive-ctrl drive-bottom" id="move-back"
                onClick={() => props.driveControls.drive(-1, 0, 0, props.speed)}></button>
      </div>
    </div>
  );
}

/*******************
 *     CANVAS
 *******************/

 class DrawMap extends React.Component {
  constructor(props) {
    super(props);

    this.mapGrid = new GridCellCanvas();
    this.mapCanvas = React.createRef();
  }

  componentDidMount() {
    this.mapGrid.init(this.mapCanvas.current);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.cells !== this.props.cells;
  }

  componentDidUpdate() {
    this.mapGrid.setSize(this.props.width, this.props.height);
    this.mapGrid.drawCells(this.props.cells, this.props.prev_cells, config.MAP_COLOUR_LOW, config.MAP_COLOUR_HIGH);
  }

  render() {
    return (
      <canvas id="mapCanvas" ref={this.mapCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawCells extends React.Component {
  constructor(props) {
    super(props);

    this.pathUpdated = true;
    this.clickedUpdated = true;
    this.goalUpdated = true;

    this.cellGrid = new GridCellCanvas();
    this.cellsCanvas = React.createRef();
  }

  componentDidMount() {
    this.cellGrid.init(this.cellsCanvas.current);
  }

  drawPath() {
    for (var i in this.props.path) {
      this.cellGrid.drawCell(this.props.path[i], config.PATH_COLOUR, this.props.cellSize);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    this.pathUpdated = nextProps.path !== this.props.path;
    this.clickedUpdated = nextProps.clickedCell !== this.props.clickedCell;
    this.goalUpdated = nextProps.goalCell !== this.props.goalCell;

    if (this.clickedUpdated && this.props.clickedCell.length > 0) {
      this.cellGrid.clearCell(this.props.clickedCell, this.props.cellSize)
    }
    if (this.goalUpdated && this.props.goalCell.length > 0) {
      this.cellGrid.clearCell(this.props.goalCell, this.props.cellSize)
    }

    return (this.pathUpdated || this.clickedUpdated || this.goalUpdated);
  }

  componentDidUpdate() {
    // The first time the visited cells are null, the map was reset. Clear the
    // canvas. Make sure this is only done once using this.clear.
    this.cellGrid.clear();

    // If the map has been loaded, we can draw the cells.
    if (this.props.loaded) {
      // Draw the found path.
      if (this.pathUpdated) {
        this.drawPath();
      }

      // If there's a goal cell, clear it in case it was clicked then draw it.
      if (this.props.goalCell.length > 0) {
        this.cellGrid.clearCell(this.props.goalCell, this.props.cellSize);
        var colour = this.props.goalValid ? config.GOAL_CELL_COLOUR : config.BAD_GOAL_COLOUR;
        this.cellGrid.drawCell(this.props.goalCell,
                               colour, this.props.cellSize);
      }
    }
  }

  render() {
    return (
      <canvas ref={this.cellsCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawLasers extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidUpdate(){
    //initial setup to get canvas
    const canvas = document.getElementById("mapLasers");
    this.ctx = canvas.getContext('2d');
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.fillStyle = 'rgba(49, 227, 173, 0.5)'

    //checks if the mapping mode is engaged
    if(this.props.state.mappingMode){
      this.ctx.beginPath();

      //checks the robot's pose, and calculates its position on the map
      let xCell = this.props.state.xPose/this.props.state.metersPerCell
      let yCell = this.props.state.yPose/this.props.state.metersPerCell

      //Origin point
      if(this.props.state.metersPerCell > 0) {
        this.ctx.moveTo(400 + xCell, 400 - yCell);
      }
      else this.ctx.moveTo(400, 400)

      //All points of the mapped out area
      for(let i = 0; i < this.props.state.lidarLength; i++){
        let x = this.props.state.x_values[i];
        let y = this.props.state.y_values[i];
    
        if(x != 0 && y != 0) {
          if(this.props.state.metersPerCell > 0) {
            this.ctx.lineTo(400 + x + (xCell), 400 + y - (yCell));
          }
          else this.ctx.lineTo(400 + x, 400 + y);
        }
      }

      this.ctx.closePath()
      this.ctx.fill()
    }
  }

  render(){
    return(
      <canvas id="mapLasers" width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawPaths extends React.Component {
  constructor(props) {
    super(props);
  }

  render(){
    return(
      <canvas id="mapLine" width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawParticles extends React.Component {
  constructor(props) {
    super(props);
  }

  render(){
    return(
      <canvas id="mapParticles" width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

/*******************
 *   WHOLE PAGE
 *******************/

class MBotApp extends React.Component {
  constructor(props) {
    super(props);

    // React state.
    this.state = {
      connection: false,
      cells: [],
      prev_cells: [],
      width: 0,
      height: 0,
      num_cells: 0,
      origin: [0, 0],
      metersPerCell: 0,
      pixelsPerMeter: 0,
      cellSize: 0,
      mapLoaded: false,
      mapfile: null,
      path: [],
      clickedCell: [],
      goalCell: [],
      goalValid: true,
      speed: 50,
      darkMode: false,
      mappingMode: false,
      drivingMode: false,
      sideBarMode: false,
      poseClickMode: false,
      sideBarWidth: 0,
      omni: false,
      diff: false,
      // Robot parameters.
      x: config.MAP_DISPLAY_WIDTH / 2,
      y: config.MAP_DISPLAY_WIDTH / 2,
      xPose: 0,
      yPose: 0,
      theta: 0,
      lidarLength: 0,
      x_values: [],
      y_values: [],
      lasers: {},
      isRobotClicked: false,
      robot: true,
      particles: true,
      newMap: null,
    };

    this.ws = new WSHelper(config.HOST, config.PORT, config.ENDPOINT, config.CONNECT_PERIOD);
    this.ws.userHandleMessage = (evt) => { this.handleMessage(evt); };
    this.ws.statusCallback = (status) => { this.updateSocketStatus(status); };
    this.ws.userHandleMap = (evt) => { this.handleMap(evt); };
    this.ws.handleLaser = (evt) => { this.handleLasers(evt)};
    this.ws.handlePose = (evt) => { this.handlePoses(evt)};
    this.ws.handlePath = (evt) => { this.handlePaths(evt)}
    this.ws.handleParticle = (evt) => { this.handleParticles(evt)};

    this.driveControls = new DriveControls(this.ws);
    this.visitGrid = new GridCellCanvas();
    this.visitCellsCanvas = React.createRef();	
    this.clickCanvas = React.createRef();
  }

  /********************
   *  REACT FUNTIONS
   ********************/

  componentDidMount() {
    this.visitGrid.init(this.visitCellsCanvas.current);

    // Get the window size and watch for resize events.
    this.rect = this.clickCanvas.current.getBoundingClientRect();
    window.addEventListener('resize', (evt) => this.handleWindowChange(evt));
    window.addEventListener('scroll', (evt) => this.handleWindowChange(evt));

    // TODO: Discuss what other modes will enable drive control. Currently the
    // key presses active only when the drive toggle is toggled on.
    const controller =  {
      s: {pressed: false, fn: "back"},    
      w: {pressed: false, fn: "forward"},
      a: {pressed: false, fn: "left"},
      d: {pressed: false, fn: "right"},  
      e: {pressed: false, fn: "tright"},
      q: {pressed: false, fn: "tleft"}
    }

    let x = 0;
    let y = 0;
    let t = 0; 

    document.addEventListener('keydown', (evt) => {
      //handles a couple of shortcut keys
      this.handleKeyPressDown(evt)

      //First checks if the drive State is active, then adds speed values in rx, ry, and theta
      if(this.state.drivingMode)
      {
        if(controller[evt.key]){
          controller[evt.key].pressed = true
          if(controller[evt.key].fn == "back" && x > -1) x--; 
          if(controller[evt.key].fn == "forward" && x < 1) x++;
          if(controller[evt.key].fn == "left" && y > -1) y--;
          if(controller[evt.key].fn == "right" && y < 1) y++; 
          if(controller[evt.key].fn == "tleft" && t > -1) t--; 
          if(controller[evt.key].fn == "tright" && t < 1) t++; 
          this.driveControls.goKeyDown(evt.key);
        }

        //Updates drive commands to robot
        this.driveControls.drive(x, y, t, this.state.speed)
      }

    }, false);

    document.addEventListener('keyup', (evt) => {
      //First checks if the drive State is active, then substracts speed values in rx, ry, and theta
      if(this.state.drivingMode){
        if(controller[evt.key]){
          controller[evt.key].pressed = false
          if(controller[evt.key].fn == "back") x++;
          if(controller[evt.key].fn == "forward") x--;
          if(controller[evt.key].fn == "left") y++;
          if(controller[evt.key].fn == "right") y--;
          if(controller[evt.key].fn == "tleft") t++;
          if(controller[evt.key].fn == "tright") t--;
        }

        //animation for color change
        this.driveControls.stopKeyUp(evt.key);
        //Stops robot if it finds that all keys have been lifted up, acts as a failsafe to above logic
        let reset = true;
        for (const [key, value] of Object.entries(controller)) {
          if(value.pressed) reset = false
        }
        if(reset) {x = 0; y = 0; t = 0;}

        //code to update drive speeds
        this.driveControls.drive(x, y, t, this.state.speed)
      }

    }, false);
    // Try to connect to the websocket backend.
    this.ws.attemptConnection();
  }

  /*****************************
   *  COMPONENT EVENT HANDLERS
   *****************************/

  onFileChange(event) {
    this.setState({ mapfile: event.target.files[0] });
    this.resetCanvas()

    const fileSelector = document.querySelector('input[type="file"]');
    const reader = new FileReader()
    reader.onload = () => {
      this.onMapChange(JSON.parse(reader.result));
    }
    reader.readAsText(event.target.files[0])
  }

  onMapChange(map_upload){
    if(map_upload == null) return;
    this.ws.socket.emit('reset', {'mode' : 2, 'map':map_upload})
  }

  saveMap() {
    var name = prompt("What do you want to name the map? (.json will automatically be added to the end)");
    downloadObjectAsJson(this.state.newMap, name)
  }

  onFileUpload() {
    if (this.state.mapfile === null) return;

    var fr = new FileReader();
    fr.onload = (evt) => {
      var map = parseMap(fr.result);
      this.updateMap(map);
    }
    fr.readAsText(this.state.mapfile);

    var map_data = {type: "map_file",
                    data: { file_name: this.state.mapfile.name } };
    this.ws.send(map_data);
  }

  onFieldCheck() {
    this.setState({showField: !this.state.showField});
  }

  onGrabMap() {
    this.ws.socket.emit("map", {'test_key': "Need map. Please give."});
  }

  onMappingMode() {
    this.setState({mappingMode: !this.state.mappingMode});
  }

  onDrivingMode() {
    this.setState({drivingMode: !this.state.drivingMode});
  }

  onDarkMode(){
    var canvas = document.getElementById("canvas");
    var driveCtrls = document.getElementsByClassName("drive-ctrl")
    if (!this.state.darkMode){
      document.body.classList.add("new-background-color");
      canvas.classList.add("white-border", "canvas-color")
      for (let index = 0; index < driveCtrls.length; index++) {
        driveCtrls[index].classList.add("invert");
      }
    } else {
      document.body.classList.remove("new-background-color");
      canvas.classList.remove("white-border")
    
      for (let index = 0; index < driveCtrls.length; index++) {
        driveCtrls[index].classList.remove("invert");
      }
      canvas.classList.remove("canvas-color", "white-border");
    }
    this.setState({darkMode: !this.state.darkMode});
  } 

  onSpeedChange(event) {
    this.setState({speed: event.target.value});
  }

  onSideBar(){
    this.setState({sideBarMode: !this.state.sideBarMode})
    let widthBody = document.body.clientWidth
    let temp;
    if(this.state.sideBarMode) {
      if(widthBody <= 400) temp = 100 + "%"
      else if(widthBody <= 850) temp = 80 + "%"
      else temp = 35 + "%"
      this.setState({sideBarWidth: temp});
    }
    else this.setState({sideBarWidth: 0});
  }

  /***************************
   *  WINDOW EVENT HANDLERS
   ***************************/

   handleWindowChange(evt) {
    this.rect = this.clickCanvas.current.getBoundingClientRect();
    config.CANVAS_DISPLAY_WIDTH = document.documentElement.clientWidth * config.CANVAS_WIDTH_MODIFIER;  
    config.CANVAS_DISPLAY_HEIGHT = document.documentElement.clientHeight * config.CANVAS_HEIGHT_MODIFIER;
    this.setState({width: config.CANVAS_DISPLAY_WIDTH, height: config.CANVAS_DISPLAY_HEIGHT})
  }

  handleMapClick(event) {
    if (!this.state.mapLoaded) return;
    this.rect = this.clickCanvas.current.getBoundingClientRect();
    var x = event.clientX - this.rect.left;
    var y = this.rect.bottom - event.clientY;
    let cs = this.rect.width / this.state.width;
    let col = Math.floor(x / cs);
    let row = Math.floor(y / cs);
    this.setState({clickedCell: [col, row] });
    if(this.state.poseClickMode == 1){
      this.setState({initalPoseFirstClick: [col, row], poseClickMode: 2})
    }else if(this.state.poseClickMode == 2){
      this.sendInitialPose(row, col);
    }else{
      let plan = true;
      // Implement check for ctrl-click and whether an a* plan is required
      // if(event.type === "mousedown") plan = true;
      this.onPlan(row, col, plan);
    }
  }

  handleMouseDown(event) {
    var x = event.clientX - this.rect.left;
    var y = this.rect.bottom - event.clientY;
    var robotRadius = config.ROBOT_SIZE *this.state.pixelsPerMeter / 2;
    // if click is near robot, set isDown as true
    if (!this.state.poseClickMode && x < this.state.x + robotRadius && x > this.state.x - robotRadius &&
        y < this.state.y + robotRadius && y > this.state.y - robotRadius) {
      this.setState({ isRobotClicked: true });
    }
    else {
      this.handleMapClick(event);
    }
  }

  handleMouseMove(event) {
    if (!this.state.showField && !this.state.isRobotClicked) return;

    var x = event.clientX - this.rect.left;
    var y = this.rect.bottom - event.clientY;

    if (this.state.isRobotClicked) {
      this.setState({ x: x, y: y });
    }
    if (this.state.showField && this.state.fieldRaw.length > 0) {
      var cell = this.pixelsToCell(x, y);
      var idx = Math.max(Math.min(cell[1] + cell[0] * this.state.width, this.state.num_cells - 1), 0);
      this.setState({ fieldHoverVal: this.state.fieldRaw[idx] });
    }
  }

  handleMouseUp() {
    if (this.state.isRobotClicked == false) return;
    // this moves the robot along the path
    this.setState({isRobotClicked: false});
  }

  handleKeyPressDown(event) {
    var name = event.key;
    if (name == "p") this.onSideBar();
    if (name == "b") this.onDarkMode();
    if (name == "n") this.setState({mappingMode: !this.state.mappingMode});
    if (name == "m") this.setState({drivingMode: !this.state.drivingMode});
  }


 /********************
   *   WS HANDLERS
   ********************/

  handleMap(mapmsg) {
    var map = parseMapFromLcm(mapmsg)
    this.updateMap(map);
    this.setState({newMap: map})
  }

  handleMessage(msg) {
    // TODO: Handle messages from the websocket.
  }

  updateSocketStatus(status) {
    if (this.state.connection !== status) {
      this.setState({connection: status});
    }
  }

  handlePoses(evt){
    this.setState({xPose: evt.x, yPose: evt.y});
    this.setState({theta: evt.theta})

    //Sets the robot position
    if(this.state.metersPerCell > 0) {
      this.setRobotPos(400 + this.state.xPose/this.state.metersPerCell, 400 + this.state.yPose/this.state.metersPerCell)
    }
    else this.setRobotPos(400, 400)
    
  }

  handleLasers(evt) {
    this.setState({lidarLength: evt.ranges.length})
    
    let a = [];
    let b = [];
    let mPC;

    //sets a default value if metersPerCell isn't initialized yet (because mapping isn't engaged)
    if(!(this.state.metersPerCell) > 0) mPC = config.CELL_START_SIZE;
    else mPC = this.state.metersPerCell;

    for(let i = 0; i < this.state.lidarLength; i++) {
      a[i] = ((evt.ranges[i] * Math.cos(evt.thetas[i] - this.state.theta))) / mPC;
      b[i] = ((evt.ranges[i] * Math.sin(evt.thetas[i] - this.state.theta))) / mPC;
    } 

    this.setState({x_values : a, y_values : b})
  }

  handlePaths(evt) {
    const canvas = document.getElementById("mapLine");
    this.ctx = canvas.getContext('2d');
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    //Cycling through each path cell
    for(let i = 0; i < evt.path.length; i++) {  
      //Draws the point for the path
      this.ctx.beginPath();
      this.ctx.fillStyle = "rgb(255, 25, 25)";
      this.ctx.arc(config.ROBOT_START_X + (evt.path[i][0]/this.state.metersPerCell), 
                  (config.ROBOT_START_Y - (evt.path[i][1]/this.state.metersPerCell)), 
                   4, 0, 2 * Math.PI);

      //Draws a line between the points
      this.ctx.beginPath();
      if(i==0){
        this.ctx.moveTo(config.ROBOT_START_X+(this.state.xPose/this.state.metersPerCell), config.ROBOT_START_Y-(this.state.yPose/this.state.metersPerCell));
        this.ctx.lineTo(config.ROBOT_START_X + (evt.path[i][0]/this.state.metersPerCell), 
                        config.ROBOT_START_Y - (evt.path[i][1]/this.state.metersPerCell))
        this.ctx.strokeStyle = 'rgb(255, 25, 25)'
        this.ctx.stroke();
      }
      else{
        this.ctx.moveTo(config.ROBOT_START_X + (evt.path[i-1][0]/this.state.metersPerCell), 
                        config.ROBOT_START_X - (evt.path[i-1][1]/this.state.metersPerCell));
        this.ctx.lineTo(config.ROBOT_START_X + (evt.path[i][0]/this.state.metersPerCell), 
                        config.ROBOT_START_X - (evt.path[i][1]/this.state.metersPerCell))
        this.ctx.strokeStyle = 'rgb(255, 25, 25)'
        this.ctx.stroke();
      }
    }
  }
  
  handleParticles(evt){
    const canvas = document.getElementById("mapParticles");
    this.ctx = canvas.getContext('2d');
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    //Checks if Particle Checkbox is ticked
    if(this.state.particles){
      for (let index = 0; index < evt.num_particles; index+=20) {
        //Draws Particle for each instance
        this.ctx.beginPath();
        this.ctx.arc(config.ROBOT_START_X + (evt.particles[index][0]/this.state.metersPerCell), 
                     config.ROBOT_START_Y - (evt.particles[index][1]/this.state.metersPerCell), 
                     1, 0, 2 * Math.PI)
        this.ctx.fillStyle = 'green';
        this.ctx.fill();
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'green'
        this.ctx.stroke();      
      }
    }
  }

  resetCanvas(){
    const pathCanvas = document.getElementById("mapLine");
    this.ctx = pathCanvas.getContext('2d');
    this.ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
  }

  /**********************
   *   STATE SETTERS
   **********************/

  setRobotPos(x, y) {
    this.setState({x: x, y: y});
  }

  /**********************
   *   OTHER FUNCTIONS
   **********************/

   updateMap(result) {
    this.visitGrid.clear();
    var loaded = result.cells.length > 0;
    this.setState({prev_cells: this.state.cells,
                   cells: result.cells,
                   width: result.width,
                   height: result.height,
                   num_cells: result.num_cells,
                   origin: result.origin,
                   metersPerCell: result.meters_per_cell,
                   cellSize: config.MAP_DISPLAY_WIDTH / result.width,
                   pixelsPerMeter: config.MAP_DISPLAY_WIDTH / (result.width * result.meters_per_cell),
                   mapLoaded: loaded,
                   path: [],
                   clickedCell: [],
                   goalCell: [],
                   isRobotClicked: false});
  }

  changeOnmi() {
    this.setState({omni: !this.state.omni});
  }

  changeDiff() {
    this.setState({diff: !this.state.diff});
    if(this.state.omni && !this.state.diff) {
      this.setState({omni: !this.state.omni});
    }
  }

  changeRobot(){
    this.setState({robot: !this.state.robot})
  }

  changeParticles(){
    this.setState({particles: !this.state.particles})
  }

  onGoalClear() {
    this.setState({clickedCell: [],
                   goalCell: []});
  }

  setGoal(goal) {
    if (goal.length === 0) return false;

    var idx = goal[1] + goal[0] * this.state.width;
    var valid = this.state.cells[idx] < 0.5;

    this.setState({goalCell: goal, goalValid: valid});

    return valid;
  }

  onPlan(row, col, plan) {
    if (!this.setGoal([row, col])) return;
    // Clear visted canvas
    this.visitGrid.clear();
    var start_cell = this.pixelsToCell(this.state.x, this.state.y);
    var plan_data = {type: "plan",
                    data: {
                       goal: [row, col],
                       plan: plan
                     }
                   };
    this.ws.socket.emit("plan", {goal: [row, col], plan: plan})
  }

  anExamplePost() {
    this.ws.socket.emit("test", {'test_key': "test_value"});
  }

  posToPixels(x, y) {
    var u = (x * this.state.cellSize);
    var v = (y * this.state.cellSize);

    return [u, v];
  }

  pixelsToCell(u, v) {
    var row = Math.floor(v / this.state.cellSize);
    var col = Math.floor(u / this.state.cellSize);
    return [row, col];
  }

  //TODO: emit message to backend when the running mode is changed.
  sendInitialPose(row, col){

    var x = this.state.initalPoseFirstClick[0];
    var y = this.state.initalPoseFirstClick[1];
    var dx = col;
    var dy = row;
    var theta = Math.atan2(dy-y, dx-x);
    this.setState({poseClickMode: 0}); // reset pose click mode
    this.ws.socket.emit('initial_pose', {'x': start_cell[0], 'y':start_cell[1], 'theta':theta});
  }

  startInitialPoseMode(){
    this.setState({poseClickMode: 1});
  }

  stopMap(){
    console.log("Stopping map")
  }

  restartMap(){
    this.resetCanvas()
    this.ws.socket.emit('reset', {'mode' : 3})
  }

  render() {
    var canvasStyle = {
      width: config.CANVAS_DISPLAY_WIDTH,
      height: config.CANVAS_DISPLAY_HEIGHT
    };

    return (
      <>
        <div className="row mx-5">
          <div className="col-7">
            <h1>MBot Omni GUI</h1>
          </div>
          <div className="col-4"></div>
          <div className="col-1 very-small-top">
            <i className="fa-solid fa-bars fa-2xl pf" onClick={() => this.onSideBar()}></i>
          </div>
        </div>


        <div id="mySidenav" className="sidenav" style = {{width: this.state.sideBarWidth}}>
          <a href="#" className = "text-right" onClick={() => this.onSideBar()}>X</a>
          <div className="row field-toggle-wrapper top-spacing text-white mx-3 mt-4">
            <div className="col">
              <div className="row">
                <div className="col-8">
                  <span>Dark Mode</span>
                </div>
                <div className="col-4">
                  <label className="switch">
                    <input type="checkbox" id="myDark" onClick={() => this.onDarkMode()}/>
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
              <div className="row my-5">
                <div className="col-8">
                  <span className = "">Mapping Mode</span>
                </div>
                <div className="col-4">
                  <label className="switch">
                    <input type="checkbox" id="myCheck" onClick={() => this.onMappingMode()}/>
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
              {this.state.mappingMode &&
              <>
              <div className="row d-flex justify-content-center text-center">
                <label htmlFor="file-upload" className="custom-file-upload">
                  <i className="fa fa-cloud-upload"></i> Upload a Map
                </label>
                <input id="file-upload" type="file" onChange = {(event) => this.onFileChange(event)}/>
              </div>
              <div className="row mt-4 mb-5 text-left mx-2 text-center">
                <div className="col-6 text-small"> Draw Particles
                <input type="checkbox" className="mx-2" checked = {this.state.particles}
                  onChange={() => this.changeParticles()}/>
                </div>
                <div className="col-6"> Draw Robot
                  <input type="checkbox" className="mx-2" checked = {this.state.robot}
                  onChange={() => this.changeRobot()} />
                </div>
              </div>
              </>
              }

              <div className="row">
                <div className="col-8">
                  <span className = "">Drive Mode</span>
                </div>
                <div className="col-4">
                  <label className="switch">
                    <input type="checkbox" id="myDrive" onClick={() => this.onDrivingMode()}/>
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
              { this.state.drivingMode &&
              <div className="row mt-5 text-left mx-2">
                <div className="col-6 text-small">Omni-Drive
                <input type="checkbox" className="mx-2" checked={this.state.omni}
                  onChange={() => this.changeOnmi()}/>
                </div>
                <div className="col-6"> Diff-Drive
                  <input type="checkbox" className="mx-2" checked={this.state.diff}
                  onChange={() => this.changeDiff()} />
                </div>
              </div>
              }
              <div className="row my-5">
                <div className="col-8">
                  <span className = "field-toggle-wrapper">
                    Show Field:
                    </span>
                </div>
                <div className="col-4">
                  <label className="switch">
                    <input type="checkbox" id=""/>
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>



        <div className="pt-3">

          {this.state.mappingMode &&
            <div className="button-wrapper top-spacing d-flex justify-content-center">
              <button className="button start-color2" onClick={() => this.startInitialPoseMode()}>Send Initial Pose</button>
              <button className="button" onClick={() => this.restartMap()}>Reset Mapping</button>
              <label htmlFor="file-upload" className="button upload-color">
                  <i className="fa fa-cloud-upload"></i> Upload a Map
              </label>
              <input id="file-upload" type="file" onClick = {(event) => this.onFileChange(event)}/>
              <button className="button map-color" onClick={() => this.saveMap()}>Save Map</button>
              <button className="button stop-color2 me-3" onClick={() => this.stopMap()}>Stop Mapping</button>

            </div>
          }

          {this.state.drivingMode &&
            <DriveControlPanel driveControls={this.driveControls}
                                speed={this.state.speed}
                                onSpeedChange={(evt) => this.onSpeedChange(evt)} />
          }

        </div>

        <div className="status-wrapper mx-5 py-3">
          <StatusMessage robotCell={this.pixelsToCell(this.state.x, this.state.y)} clickedCell={this.state.clickedCell}
                         showField={this.state.showField} fieldVal={this.state.fieldHoverVal}/>
          <ConnectionStatus status={this.state.connection}/>
        </div>


        <div className="canvas-container" id = "canvas" style={canvasStyle}>
          <TransformWrapper>
            <TransformComponent>
              <div style={canvasStyle}>
                <DrawMap cells={this.state.cells} prev_cells={this.state.prev_cells} width={this.state.width} height={this.state.height} />
                
                <canvas ref={this.visitCellsCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_WIDTH}>
                </canvas>
                <DrawPaths />
                <DrawParticles/>
                <DrawLasers state = {this.state}/>
                <DrawCells loaded={this.state.mapLoaded} path={this.state.path} clickedCell={this.state.clickedCell}
                          goalCell={this.state.goalCell} goalValid={this.state.goalValid}
                          cellSize={this.state.cellSize} />
                
                {this.state.robot &&
                  <DrawRobot x={this.state.x} y={this.state.y} theta={this.state.theta}
                      pixelsPerMeter={this.state.pixelsPerMeter} /> 
                }

                <canvas ref={this.clickCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_WIDTH}
                        onMouseDown={(e) => this.handleMouseDown(e)}
                        onContextMenu={(e) => this.handleMouseDown(e)}
                        onMouseMove={(e) => this.handleMouseMove(e)}
                        onMouseUp={() => this.handleMouseUp()}
                        onScroll={() => this.handleZoom()}>
                </canvas>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>

      </>
    );
  }
}

export default MBotApp;
