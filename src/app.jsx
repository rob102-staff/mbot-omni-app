import React from "react";
import ReactDOM from "react-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars,
         faArrowUp,
         faArrowDown,
         faArrowLeft,
         faArrowRight,
         faArrowRotateLeft,
         faArrowRotateRight } from '@fortawesome/free-solid-svg-icons'

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

import config from "./config.js";
import { normalizeAngle } from "./util";
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
      <div className="col-lg-12">
        <span>Speed: {props.speed}</span>
        <input type="range" min="1" max="100" value={props.speed}
               onChange={(evt) => props.onSpeedChange(evt)}></input>
      </div>
      <div className="button-wrapper-row top-spacing col-lg-12">
        <button className="button start-color col-lg-4" id="drive-start"
                onClick={() => props.driveControls.start()}>Start</button>
        <button className="button stop-color col-lg-4" id="drive-stop"
                onClick={() => props.driveControls.stop()}>Stop</button>
      </div>
      <div className="drive-buttons">
        <button className="button drive-turn" id="turn-left"
                onClick={() => props.driveControls.drive(0, 0, -1, props.speed)}>
          <FontAwesomeIcon icon={faArrowRotateLeft} />
        </button>
        <button className="button drive-move" id="move-str"
                onClick={() => props.driveControls.drive(1, 0, 0, props.speed)}>
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
        <button className="button drive-turn" id="turn-right"
                onClick={() => props.driveControls.drive(0, 0, 1, props.speed)}>
          <FontAwesomeIcon icon={faArrowRotateRight} />
        </button>

        <button className="button drive-move" id="move-left"
                onClick={() => props.driveControls.drive(0, -1, 0, props.speed)}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <button className="button drive-move" id="move-right"
                onClick={() => props.driveControls.drive(0, 1, 0, props.speed)}>
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
        <button className="button drive-move" id="move-back"
                onClick={() => props.driveControls.drive(-1, 0, 0, props.speed)}>
          <FontAwesomeIcon icon={faArrowDown} />
        </button>
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

    this.laserGrid = new GridCellCanvas();
    this.laserCanvas = React.createRef();
  }

  componentDidMount() {
    this.laserGrid.init(this.laserCanvas.current);
  }

  componentDidUpdate(){
    this.laserGrid.setSize(this.props.width, this.props.height);
    // Clear all the lines on the grid from before.
    this.laserGrid.clear();

    // Checks if the Laser mode is engaged
    this.laserGrid.drawLinesFromOrigin(this.props.origin, this.props.drawLasers, 'green');
    
  }

  render(){
    return(
      <canvas id="mapLasers" ref={this.laserCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawPaths extends React.Component {
  constructor(props) {
    super(props);

    this.pathGrid = new GridCellCanvas();
    this.pathCanvas = React.createRef();
  }

  componentDidMount() {
    this.pathGrid.init(this.pathCanvas.current);
  }

  shouldComponentUpdate(){
    if (this.props.path == null) return false;
    return true;
  }

  componentDidUpdate(){
    this.pathGrid.setSize(this.props.width, this.props.height);
    this.pathGrid.clear();
    this.pathGrid.drawPath(this.props.path)
  }

  render(){
    return(
      <canvas id="mapLine" ref={this.pathCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawParticles extends React.Component {
  constructor(props) {
    super(props);

    this.particleGrid = new GridCellCanvas();
    this.particleCanvas = React.createRef();
  }

  componentDidMount() {
    this.particleGrid.init(this.particleCanvas.current);
  }

  componentDidUpdate(){
    this.particleGrid.setSize(this.props.width, this.props.height);
    this.particleGrid.clear();
    this.particleGrid.drawParticles(this.props.particles)
  }

  render(){
    return(
      <canvas id="mapParticles" ref={this.particleCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawCostmap extends React.Component {
  constructor(props) {
    super(props);
    this.costmapGrid = new GridCellCanvas();
    this.costmapCanvas = React.createRef();
  }

  componentDidMount() {
    this.costmapGrid.init(this.costmapCanvas.current);
  }

  componentDidUpdate(){
    // if(this.props.state) {
      this.costmapGrid.setSize(this.props.width, this.props.height);
      this.costmapGrid.clear();
      this.costmapGrid.drawCostMap(this.props.cells)
    // }
  }

  render(){
    return(
      <canvas id="mapcostMaps" ref={this.costmapCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
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
      mappingMode: false,
      drivingMode: false,
      sideBarMode: true,
      sideBarWidth: 0,
      omni: false,
      diff: false,
      // Robot parameters.
      x: config.MAP_DISPLAY_WIDTH / 2,
      y: config.MAP_DISPLAY_WIDTH / 2,
      theta: 0,
      drawLasers: [],
      drawPaths: [],
      drawCostmap: [],
      drawParticles: [],
      isRobotClicked: false,
      laserDisplay:false, 
      robotDisplay: true,
      particleDisplay: true,
      costmapDisplay: false, 
      newMap: null
    };

    this.ws = new WSHelper(config.HOST, config.PORT, config.ENDPOINT, config.CONNECT_PERIOD);
    this.ws.userHandleMessage = (evt) => { this.handleMessage(evt); };
    this.ws.statusCallback = (status) => { this.updateSocketStatus(status); };
    this.ws.userHandleMap = (evt) => { this.handleMap(evt); };
    this.ws.handleLaser = (evt) => { this.handleLasers(evt)};
    this.ws.handlePose = (evt) => { this.handlePoses(evt)};
    this.ws.handlePath = (evt) => { this.handlePaths(evt)}
    this.ws.handleParticle = (evt) => { this.handleParticles(evt)};
    this.ws.handleObstacle = (evt) => { this.handleObstacles(evt)};

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
    this.handleWindowChange(null);

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
    //Sends a message to the backend to start SLAM in localization mode, with the passes map
    this.ws.socket.emit('reset', {'mode' : 2, 'map': map_upload})
  }

  saveMap() {
    var name = prompt("What do you want to name the map? (.json will automatically be added to the end)");
    downloadObjectAsJson(this.state.newMap, name)
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

  onSpeedChange(event) {
    this.setState({speed: event.target.value});
  }

  onSideBar(){
    this.setState({sideBarMode: !this.state.sideBarMode})
  }

  /***************************
   *  WINDOW EVENT HANDLERS
   ***************************/

   handleWindowChange(evt) {
    this.rect = this.clickCanvas.current.getBoundingClientRect();
  }

  handleMapClick(event) {
    if (!this.state.mapLoaded) return;
    let plan = true;

    this.rect = this.clickCanvas.current.getBoundingClientRect();
    
    var x = event.clientX - this.rect.left;
    var y = this.rect.bottom - event.clientY;
    let cs = this.rect.width / this.state.width;
    let col = Math.floor(x / cs);
    let row = Math.floor(y / cs);
    this.setState({clickedCell: [col, row] });
    // Implement check for ctrl-click and whether an a* plan is required
    // if(event.type === "mousedown") plan = true;
    this.onPlan(row, col, plan);
  }

  handleMouseDown(event) {
    var x = event.clientX - this.rect.left;
    var y = this.rect.bottom - event.clientY;
    var robotRadius = config.ROBOT_SIZE *this.state.pixelsPerMeter / 2;
    // if click is near robot, set isDown as true
    if (x < this.state.x + robotRadius && x > this.state.x - robotRadius &&
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
    if (name == "m") this.setState({mappingMode: !this.state.mappingMode});
    if (name == "n") this.setState({drivingMode: !this.state.drivingMode});
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
    // Sets the robot position
    if (this.state.mapLoaded > 0) {
      // Convert the robot position in meters in the map coordinates to pixels
      // in the canvas coordinates.
      var pix = this.posToPixels(evt.x, evt.y);
      this.setRobotPos(pix[0], pix[1], evt.theta);
    }
  }

  handleLasers(evt) {
    let lidarLength = evt.ranges.length

    let rays = [];
    for(let i = 0; i < lidarLength; i++) {
      // Convert the ray into pixel coordinates.
      let rayX = evt.ranges[i] * Math.cos(normalizeAngle(evt.thetas[i] + this.state.theta)) * this.state.pixelsPerMeter;
      let rayY = evt.ranges[i] * Math.sin(normalizeAngle(evt.thetas[i] + this.state.theta)) * this.state.pixelsPerMeter;
      // Shift by the current robot position.
      rayX += this.state.x;
      rayY += this.state.y;
      rays.push([rayX, rayY]);
    } 

    this.setState({drawLasers: rays, lidarLength: lidarLength})
  }

  handlePaths(evt) {
    var updated_path = [];

    for(let i = 0; i < evt.path.length; i++) {
      updated_path[i] = this.posToPixels(evt.path[i][0], evt.path[i][1])
    }

    this.setState({displayPaths: updated_path})
  }
  
  handleParticles(evt){
    var updated_pixels = [];
    for (let i = 0; i < evt.num_particles; i++) {
      updated_pixels[i] = this.posToPixels(evt.particles[i][0], evt.particles[i][1]);
      
    }
    this.setState({drawParticles: updated_pixels});
  }

  handleObstacles(evt){
    var updated_path = [];
    for(let i = 0; i < evt.distances.length; i++)
    {
      updated_path[i] = this.cellToPixels(evt.pairs[i][0], evt.pairs[i][1])
    }
    this.setState({drawCostmap: updated_path});
  }

  resetCanvas(){
    const pathCanvas = document.getElementById("mapLine");
    this.ctx = pathCanvas.getContext('2d');
    this.ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);

    const canvas = document.getElementById("mapcostmaps");
    this.ctx = canvas.getContext('2d');
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**********************
   *   STATE SETTERS
   **********************/

  setRobotPos(x, y, theta = 0) {
    this.setState({x: x, y: y, theta: theta});
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

  changeOmni() {
    this.setState({omni: !this.state.omni});
  }

  changeDiff() {
    this.setState({diff: !this.state.diff});
    if(this.state.omni && !this.state.diff) {
      this.setState({omni: !this.state.omni});
    }
  }

  changeRobot(){
    this.setState({robotDisplay: !this.state.robotDisplay})
  }

  changeLasers(){
    this.setState({laserDisplay: !this.state.laserDisplay})
  }

  changeParticles(){
    this.setState({particleDisplay: !this.state.particleDisplay})
  }

  changeCostMap(){
    this.setState({costmapDisplay: !this.state.costmapDisplay})
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
    var u = (x - this.state.origin[0]) * this.state.pixelsPerMeter;
    var v = (y - this.state.origin[1]) * this.state.pixelsPerMeter;
    return [u, v];
  }

  cellToPixels(x, y) {
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
  startmap(){
    console.log("Starting to map")
  }

  stopmap(){
    console.log("Stopping map")
  }

  restartmap(){
    // this.resetCanvas()
    this.ws.socket.emit('reset', {'mode' : 3})
  }

  render() {
    let sidebarClasses = ""
    if (!this.state.sideBarMode) {
      sidebarClasses += "inactive";
    }

    return (
      <div id="wrapper">
        <div id="main">

          <div id="canvas-container" ref={this.canvasWrapperRef}>
            <TransformWrapper>
              <TransformComponent>
                <div id="canvas-wrapper">
                  <DrawMap cells={this.state.cells} prev_cells={this.state.prev_cells} width={this.state.width} height={this.state.height}/>
                  <canvas ref={this.visitCellsCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
                  </canvas>
                  <DrawPaths xPos = {this.state.x} yPos = {this.state.y} path =  {this.state.displayPaths}/>
                  {this.state.costmapDisplay && 
                    <DrawCostmap cells = {this.state.drawCostmap} state = {this.state.costmapDisplay}/>}
                  {this.state.particleDisplay && 
                    <DrawParticles particles = {this.state.drawParticles}/>}
                  {this.state.laserDisplay && 
                    <DrawLasers mappingMode={this.state.mappingMode} width={this.state.width} height={this.state.height}
                              drawLasers={this.state.drawLasers} origin={[this.state.x, this.state.y]}/>}
                  {this.state.robotDisplay &&
                    <DrawRobot x={this.state.x} y={this.state.y} theta={this.state.theta}
                               pixelsPerMeter={this.state.pixelsPerMeter} />}
                  
                  <DrawCells loaded={this.state.mapLoaded} path={this.state.path} clickedCell={this.state.clickedCell}
                             goalCell={this.state.goalCell} goalValid={this.state.goalValid}
                             cellSize={this.state.cellSize} />

                  <canvas ref={this.clickCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}
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
        </div>

        <div id="sidenav" className={sidebarClasses}>
          <div className="status-wrapper mx-5 py-3">
            <StatusMessage robotCell={this.pixelsToCell(this.state.x, this.state.y)} clickedCell={this.state.clickedCell}
                           showField={this.state.showField} fieldVal={this.state.fieldHoverVal}/>
            <ConnectionStatus status={this.state.connection}/>
          </div>
          <div id="toggle-nav" onClick={() => this.onSideBar()}><FontAwesomeIcon icon={faBars} /></div>

          <div className="row field-toggle-wrapper top-spacing mx-3 mt-4">
            <div className="col">
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

              <div className="button-wrapper-col justify-content-center">
                {/* TODO: Implement intial pose branch into code*/}
                <button className="button start-color2" onClick={() => this.startmap()}>Set Inital Pose</button>
                <button className="button" onClick={() => this.restartmap()}>Reset Mapping</button>
                {/* TODO: Fix this button as it is not as wide as the other buttons*/}
                <label htmlFor="file-upload" className="button upload-color mb-3">
                  Upload a Map
                </label>
                <input id="file-upload" type="file" onChange = {(event) => this.onFileChange(event)}/>
                <button className="button map-color" onClick={() => this.saveMap()}>Save Map</button>
                <button className="button stop-color2" onClick={() => this.stopmap()}>Stop Mapping</button>
              </div>

              <div className="row mt-4 mb-5 text-left mx-2">
                <div className="col-6 text-small"> Draw Particles
                  <input type="checkbox" className="mx-2" checked={this.state.particleDisplay}
                         onChange={() => this.changeParticles()}/>
                </div>
                <div className="col-6"> Draw Robot
                  <input type="checkbox" className="mx-2" checked={this.state.robotDisplay}
                         onChange={() => this.changeRobot()} />
                </div>
              </div>
              <div className="row mt-4 mb-5 text-left mx-2">
                <div className="col-6 text-small"> Draw Costmap
                <input type="checkbox" className="mx-2" checked = {this.state.costmapDisplay}
                  onChange={() => this.changeCostMap()}/>
                </div>
                <div className="col-6"> Draw Lasers
                  <input type="checkbox" className="mx-2" checked = {this.state.laserDisplay}
                  onChange={() => this.changeLasers()} />
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
                {this.state.drivingMode &&
                  <div className="drive-panel-wrapper">
                    <DriveControlPanel driveControls={this.driveControls}
                                       speed={this.state.speed}
                                       onSpeedChange={(evt) => this.onSpeedChange(evt)} />
                  </div>
              }
              </div>

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
    </div>
    );
  }
}

export default MBotApp;
