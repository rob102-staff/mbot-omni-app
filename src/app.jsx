import React from "react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'

import config from "./config.js";
import { normalizeAngle } from "./util";
import { WSHelper } from "./web.js";
import { DrawRobot } from "./robot";
import { DrawCells, DrawLasers, DrawPaths, DrawParticles, DrawCostmap } from "./canvas";
import { parseMapFromLcm, downloadObjectAsJson } from "./map.js";
import { getColor, GridCellCanvas } from "./drawing.js"
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
      // Map parameters.
      width: 0,
      height: 0,
      origin: [0, 0],
      metersPerCell: 0,
      pixelsPerMeter: 0,
      cellSize: 0,
      mapLoaded: false,
      mapfile: null,
      goalCell: [],
      goalValid: true,
      localMapFileLocation: "current.map",
      // Mode variables.
      mappingMode: false,
      drivingMode: false,
      sideBarMode: true,
      omni: false,
      diff: false,
      // Robot parameters.
      x: config.MAP_DISPLAY_WIDTH / 2,
      y: config.MAP_DISPLAY_WIDTH / 2,
      theta: 0,
      // Visualization elements.
      path: [],
      clickedCell: [],
      drawLasers: [],
      drawPaths: [],
      drawCostmap: [],
      drawParticles: [],
      // Flags to display elements.
      laserDisplay: false,
      robotDisplay: true,
      particleDisplay: false,
      costmapDisplay: false,
    };

    this.mapCells = [];

    this.ws = new WSHelper(config.HOST, config.PORT, config.ENDPOINT, config.CONNECT_PERIOD);
    this.ws.statusCallback = (status) => { this.updateSocketStatus(status); };
    this.ws.userOnConnect = (evt) => { this.onWSConnect(evt); };
    this.ws.userHandleMap = (evt) => { this.handleMap(evt); };
    this.ws.handleMapUpdate = (evt) => { this.handleMapUpdate(evt); };
    this.ws.handleLaser = (evt) => { this.handleLasers(evt)};
    this.ws.handlePose = (evt) => { this.handlePoses(evt)};
    this.ws.handlePath = (evt) => { this.handlePaths(evt)}
    this.ws.handleParticle = (evt) => { this.handleParticles(evt)};
    this.ws.handleObstacle = (evt) => { this.handleObstacles(evt)};

    this.visitGrid = new GridCellCanvas();
    this.visitCellsCanvas = React.createRef();
    this.clickCanvas = React.createRef();
    this.mapGrid = new GridCellCanvas();
    this.mapCanvas = React.createRef();

    this.requestInterval = null;

    // this.last_time = performance.now();
  }

  /********************
   *  REACT FUNTIONS
   ********************/

  componentDidMount() {
    this.visitGrid.init(this.visitCellsCanvas.current);
    this.mapGrid.init(this.mapCanvas.current);
    this.handleWindowChange(null);

    // Get the window size and watch for resize events.
    this.rect = this.clickCanvas.current.getBoundingClientRect();
    window.addEventListener('resize', (evt) => this.handleWindowChange(evt));
    window.addEventListener('scroll', (evt) => this.handleWindowChange(evt));

    // Try to connect to the websocket backend.
    this.ws.attemptConnection();

    this.requestInterval = setInterval(() => {
      this.requestMap();
    }, config.MAP_UPDATE_PERIOD);
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
    // downloadObjectAsJson(this.state.newMap, name)
  }

  onMappingMode() {
    if (this.state.mappingMode) {
      // If we're mapping, we need to reset the robot to localization only mode.
      this.ws.socket.emit('reset', {'mode' : 2});

      // Stop asking for map.
      clearInterval(this.requestInterval);
      this.requestInterval = null;

      this.setState({mappingMode: false});
    }
    else {
      // If we are not mapping, we need to tell the robot to start mapping.
      if (!confirm("This will overwrite the current map. Are you sure?")) return;
      this.ws.socket.emit('reset', {'mode' : 3});

      // Start asking for map.
      this.requestInterval = setInterval(() => {
        this.requestMap();
      }, config.MAP_UPDATE_PERIOD);

      this.setState({mappingMode: true});
    }
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

  onResetMap(){
    if (this.state.mappingMode) {
      // Get user confirmation that the map should be cleared.
      if (!confirm("This will clear the current map. Are you sure?")) return;
      // Reset in full SLAM mode, if in mapping mode.
      this.ws.socket.emit('reset', {'mode' : 3});
    }
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

  /********************
   *   WS HANDLERS
   ********************/

  onWSConnect(evt) {
    this.requestMap();
  }

  handleMap(mapmsg) {
    console.log("got map, skipping")
    // TODO: Cleanup
    // var starttime = performance.now();
    // var map = parseMapFromLcm(mapmsg)
    // this.updateMap(map);
    // var endtime = performance.now();
    // console.log("since last update", endtime - this.last_time, "process time", endtime - starttime);
    // this.last_time = endtime;
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

      // Lasers come in lidar frame (origin same as robot frame but + theta is CW)
      // First tranform into robot frame
      var theta = -1 * evt.thetas[i];
      // Convert the ray into pixel coordinates.
      let rayX = evt.ranges[i] * Math.cos(normalizeAngle(theta + this.state.theta)) * this.state.pixelsPerMeter;
      let rayY = evt.ranges[i] * Math.sin(normalizeAngle(theta + this.state.theta)) * this.state.pixelsPerMeter;
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

  updateMap(result) {
    this.visitGrid.clear();
    var mappingMode = result.slam_mode != 2;  // We are in mapping mode if the state is not localization_only (=2).
    var loaded = result.cells.length > 0;


    if (this.requestInterval !== null && !mappingMode) {
      // If we are not in mapping mode, stop asking for map.
      clearInterval(this.requestInterval);
      this.requestInterval = null;
    }
    else if (this.requestInterval === null && mappingMode) {
      // If we are in mapping mode, start asking for map.
      this.requestInterval = setInterval(() => {
        this.requestMap();
      }, config.MAP_UPDATE_PERIOD);
    }

    if (loaded) {
      // Update the map grid.
      this.mapGrid.setSize(result.width, result.height);
      this.mapGrid.updateCells(result.cells, this.mapCells, config.MAP_COLOUR_LOW, config.MAP_COLOUR_HIGH);
    }

    this.mapCells = result.cells;

    this.setState({width: result.width,
                   height: result.height,
                   origin: result.origin,
                   metersPerCell: result.meters_per_cell,
                   cellSize: config.MAP_DISPLAY_WIDTH / result.width,
                   pixelsPerMeter: config.MAP_DISPLAY_WIDTH / (result.width * result.meters_per_cell),
                   mapLoaded: loaded,
                   path: [],
                   goalCell: [],
                   mappingMode: mappingMode,
                   localMapFileLocation: result.slam_map_location});
  }

  resetMapData() {
    this.mapCells = [];

    this.setState({
      width: 0,
      height: 0,
      origin: [0, 0],
      metersPerCell: 0,
      pixelsPerMeter: 0,
      cellSize: 0,
      mapLoaded: false,
      mapfile: null,
      goalCell: [],
      goalValid: true,
      localMapFileLocation: "current.map",
    });
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
    var valid = this.mapCells[idx] < 0;

    this.setState({goalCell: goal, goalValid: valid});

    return valid;
  }

  /**********************
   *   OTHER FUNCTIONS
   **********************/

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

  requestMap() {
    if (!this.ws.status()) return;
    var starttime = performance.now();
    this.ws.socket.emit('request_map', (response) => {
      if (Object.keys(response).length === 0) {
        console.log("Map not yet available.");
        this.resetMapData();
        console.log("request map DONE", performance.now() - starttime);
        return;
      }
      // TODO: If there is no map yet, add a timer that continues to ask for it.
      var map = parseMapFromLcm(response);
      this.updateMap(map);

      console.log("request map DONE", performance.now() - starttime);
    });
  }

  requestMapUpdate() {
    if (!this.ws.status()) return;
    if (!this.state.mapLoaded) return;
    var starttime = performance.now();
    this.ws.socket.emit('request_map_update', {"cells": this.mapCells}, (response) => {
      console.log("Processing map update", response);
      if (response.indices.length === 0) {
        console.log("No updates to make.");
        return;
      }

      // TODO: If there is no map yet, add a timer that continues to ask for it.
      console.log("UPDATE", response.indices.length);
      for (var i = 0; i < response.values.length; i++) {
        var idx = response.indices[i];
        var cell = this.mapGrid.idxToCell(idx);
        this.mapCells[idx] = response.values[i];
        var prob = (response.values[i] + 127.) / 255.;
        var color = getColor(prob, config.MAP_COLOUR_LOW, config.MAP_COLOUR_HIGH);
        this.mapGrid.drawCell(cell, color, this.mapGrid.cellSize);
      }
      console.log("request map update DONE", performance.now() - starttime);
    });
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
                  <canvas id="mapCanvas" ref={this.mapCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
                  </canvas>
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
                          onClick={(e) => this.handleMapClick(e)}
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
              <StatusMessage robotCell={this.pixelsToCell(this.state.x, this.state.y)} clickedCell={this.state.clickedCell} />
            </div>

            <div className="row">
              <div className="col">
                <ToggleSelect label={"Mapping Mode"} checked={this.state.mappingMode}
                              onChange={ () => this.onMappingMode() }/>

                <div className="button-wrapper-col">
                  {/* TODO: Implement intial pose branch into code*/}
                  <button className="button start-color2" onClick={() => this.onSetPose()}>Set Inital Pose</button>
                  <button className="button" onClick={() => this.onResetMap()}>Reset Map</button>
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
