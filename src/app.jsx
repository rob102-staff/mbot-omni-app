import React from "react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'

// import InputLabel from '@mui/material/InputLabel';
// import MenuItem from '@mui/material/MenuItem';
// import FormControl from '@mui/material/FormControl';
// import Select from '@mui/material/Select';

import config from "./config.js";
import { normalizeAngle } from "./util";
import { WSHelper } from "./web.js";
import { DrawRobot } from "./robot";
import { DrawMap, DrawCells, DrawLasers, DrawPaths, DrawParticles, DrawCostmap } from "./canvas";
import { parseMapFromLcm, downloadObjectAsJson } from "./map.js";
import { GridCellCanvas } from "./drawing.js"
import { DriveControlPanel } from "./driveControls";


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

function ToggleSelect(props) {
  return (
    <div className="row my-4 text-left">
      <div className="col-8">
        <span>{props.label}</span>
      </div>
      <div className="col-4">
        <label className="switch">
          <input type="checkbox" className="mx-2" checked={props.checked}
                 onChange={() => props.onChange()}/>
          <span className="slider round"></span>
        </label>
      </div>
    </div>
  );
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
      newMap: null,
      localMapFileLocation: "current.map"
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

    // this.ws = new ws(this.ws);
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

    // Try to connect to the websocket backend.
    this.ws.attemptConnection();
  }


  onFileChange(event) {
    this.setState({ mapfile: event.target.files[0] });

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

  onSideBar(){
    this.setState({sideBarMode: !this.state.sideBarMode})
  }

  onSetPose(){
    console.log("Set pose. Not implemented.");
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
    var mappingMode = result.slam_mode != 2;  // We are in mapping mode if the state is not localization_only (=2).
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
                   isRobotClicked: false,
                   mappingMode: mappingMode,
                   localMapFileLocation: result.slam_map_location});
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

  resetMap(){
    this.ws.socket.emit('reset', {'mode' : 3});
  }

  render() {
    let sidebarClasses = "";
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
          <div id="toggle-nav" onClick={() => this.onSideBar()}><FontAwesomeIcon icon={faBars} /></div>
          <div className="inner">
            <div className="status-wrapper">
              <ConnectionStatus status={this.state.connection}/>
              <StatusMessage robotCell={this.pixelsToCell(this.state.x, this.state.y)} clickedCell={this.state.clickedCell}
                             showField={this.state.showField} fieldVal={this.state.fieldHoverVal}/>
            </div>

            <div className="row field-toggle-wrapper">
              <div className="col">
                <ToggleSelect label={"Mapping Mode"} checked={this.state.mappingMode}
                              onChange={ () => this.onMappingMode() }/>

                <div className="button-wrapper-col">
                  {/* TODO: Implement intial pose branch into code*/}
                  <button className="button start-color2" onClick={() => this.onSetPose()}>Set Inital Pose</button>
                  <button className="button" onClick={() => this.resetMap()}>Reset Mapping</button>
                  <label htmlFor="file-upload" className="button upload-color mb-3">
                    Upload a Map
                  </label>
                  <input id="file-upload" type="file" onChange = {(event) => this.onFileChange(event)}/>
                  <button className="button map-color" onClick={() => this.saveMap()}>Save Map</button>
                </div>

                { /* Checkboxes for map visualization. */}
                <ToggleSelect label={"Draw Particles"} checked={this.state.particleDisplay}
                              onChange={ () => this.changeParticles() }/>
                <ToggleSelect label={"Draw Robot"} checked={this.state.robotDisplay}
                              onChange={ () => this.changeRobot() }/>
                {// Remove temporarily since backend doesn't publish this.
                /* <ToggleSelect label={"Draw Costmap"} checked={this.state.costmapDisplay}
                                 onChange={ () => this.changeCostMap() }/> */ }
                <ToggleSelect label={"Draw Lasers"} checked={this.state.laserDisplay}
                              onChange={ () => this.changeLasers() }/>

                { /* Drive mode and control panel. */}
                <ToggleSelect label={"Drive Mode"} checked={this.state.drivingMode}
                              onChange={ () => this.onDrivingMode() }/>
                {this.state.drivingMode &&
                  <DriveControlPanel ws={this.ws} drivingMode={this.state.drivingMode} />
                }

              </div>
            </div>
          </div>
        </div>
    </div>
    );
  }
}

export default MBotApp;
