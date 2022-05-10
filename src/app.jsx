import React from "react";
import ReactDOM from "react-dom";

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

import config from "./config.js";
import { WSHelper } from "./web.js";
import { DrawRobot } from "./robot";
import { parseMapFromSocket, parseMapFromLcm, normalizeList } from "./map.js";
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
 *     CANVAS
 *******************/

class DrawMap extends React.Component {
  constructor(props) {
    super(props);

    this.mapGrid = new GridCellCanvas();
  }

  componentDidMount() {
    this.mapGrid.init(this.refs.mapCanvas);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.cells !== this.props.cells;
  }

  componentDidUpdate() {
    this.mapGrid.setSize(this.props.width, this.props.height);
    this.mapGrid.drawCells(this.props.cells, config.MAP_COLOUR_LOW, config.MAP_COLOUR_HIGH);
  }

  render() {
    return (
      <canvas ref="mapCanvas" width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_WIDTH}>
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
  }

  componentDidMount() {
    this.cellGrid.init(this.refs.cellsCanvas);
  }

  drawPath() {
    for (var i in this.props.path) {
      this.cellGrid.drawCell(this.props.path[i], this.props.cellSize,
                             config.PATH_COLOUR, config.SMALL_CELL_SCALE);
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

      // If there's a clicked cell, draw it.
      if (this.props.clickedCell.length > 0) {
        this.cellGrid.drawCell(this.props.clickedCell, this.props.cellSize,
                               config.CLICKED_CELL_COLOUR, config.SMALL_CELL_SCALE);
      }

      // If there's a goal cell, clear it in case it was clicked then draw it.
      if (this.props.goalCell.length > 0) {
        this.cellGrid.clearCell(this.props.goalCell, this.props.cellSize);
        var colour = this.props.goalValid ? config.GOAL_CELL_COLOUR : config.BAD_GOAL_COLOUR;
        this.cellGrid.drawCell(this.props.goalCell, this.props.cellSize,
                               colour, config.SMALL_CELL_SCALE);
      }
    }
  }

  render() {
    return (
      <canvas ref="cellsCanvas" width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_WIDTH}>
      </canvas>
    );
  }
}

function MapFileSelect(props) {
  return (
    <div className="file-input-wrapper">
      <input className="file-input" type="file" onChange={props.onChange} />
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
      // Robot parameters.
      x: config.MAP_DISPLAY_WIDTH / 2,
      y: config.MAP_DISPLAY_WIDTH / 2,
      theta: 0,
      isRobotClicked: false
    };

    this.ws = new WSHelper(config.HOST, config.PORT, config.ENDPOINT, config.CONNECT_PERIOD);
    this.ws.userHandleMessage = (evt) => { this.handleMessage(evt); };
    this.ws.statusCallback = (status) => { this.updateSocketStatus(status); };
    this.ws.userHandleMap = (evt) => { this.handleMap(evt); };

    this.driveControls = new DriveControls(this.ws);
    this.visitGrid = new GridCellCanvas();
  }

  /********************
   *  REACT FUNTIONS
   ********************/

  componentDidMount() {
    this.visitGrid.init(this.refs.visitCellsCanvas);

    // Get the window size and watch for resize events.
    this.rect = this.refs.clickCanvas.getBoundingClientRect();
    window.addEventListener('resize', (evt) => this.handleWindowChange(evt));
    window.addEventListener('scroll', (evt) => this.handleWindowChange(evt));

    // TODO: Discuss what other modes will enable drive control. Currently the
    // key presses active only when the drive toggle is toggled on.
    document.addEventListener('keydown', (evt) => this.handleKeyPress(evt), false);

    // Try to connect to the websocket backend.
    this.ws.attemptConnection();
  }

  /*****************************
   *  COMPONENT EVENT HANDLERS
   *****************************/

  onFileChange(event) {
    this.setState({ mapfile: event.target.files[0] });
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
    const map_buttons = ["drive1", "drive2", "drive3", "drive4", "drive8", "drive9"];

    var canvas = document.getElementById("canvas");
    if (!this.state.darkMode){
      document.body.classList.add("new-background-color");
      canvas.classList.add("white-border")

      for (let index = 0; index < map_buttons.length; index++) {
        const element = map_buttons[index];
        const e = document.getElementById(element);
        e.classList.add("invert");
      }
    } else {
      document.body.classList.remove("new-background-color");
      canvas.classList.remove("white-border")

      for (let index = 0; index < map_buttons.length; index++) {
        const element = map_buttons[index];
        const e = document.getElementById(element);
        e.classList.remove("invert");
      }
    }

    this.setState({darkMode: !this.state.darkMode});
  }

  onSpeedChange(event) {
    this.setState({speed: event.target.value});
  }

  /***************************
   *  WINDOW EVENT HANDLERS
   ***************************/

  handleWindowChange(evt) {
    this.rect = this.refs.clickCanvas.getBoundingClientRect();
  }

  handleMapClick(event) {
    if (!this.state.mapLoaded) return;

    var x = event.clientX - this.rect.left;
    var y = this.rect.bottom - event.clientY;
    this.setState({ clickedCell: this.pixelsToCell(x, y) });
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

  handleKeyPress(event) {
    var name = event.key;
    if (this.state.drivingMode) {
      if (name == "a") this.turnLeft();
      if (name == "d") this.turnRight();
      if (name == "s") this.goBack();
      if (name == "w") this.goStraight();
      if (name == "q") this.angleLeft();
      if (name == "e") this.angleRight();
      if (name == "z") this.goStart();
      if (name == "x") this.goStop();
    }
  }

  /********************
   *   WS HANDLERS
   ********************/

  handleMap(mapmsg) {
    var map = parseMapFromLcm(mapmsg)
    console.log("Parsed map.")
    this.updateMap(map);
  }

  handleMessage(msg) {
    // TODO: Handle messages from the websocket.
    console.log("Received message:", msg)
  }

  updateSocketStatus(status) {
    if (this.state.connection !== status) {
      this.setState({connection: status});
    }
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
    this.setState({cells: result.cells,
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

  onPlan() {
    // If goal isn't valid, don't plan.
    if (!this.setGoal(this.state.clickedCell)) return;
    // Clear visted canvas
    this.visitGrid.clear();
    var start_cell = this.pixelsToCell(this.state.x, this.state.y);
    var plan_data = {type: "plan",
                     data: {
                        map_name: this.state.mapfile.name,
                        goal: "[" + this.state.clickedCell[0] + " " + this.state.clickedCell[1] + "]",
                        start: "[" + start_cell[0] + " " + start_cell[1] + "]",
                        algo: config.ALGO_TYPES[this.state.algo].label
                      }
                    };
    this.ws.send(plan_data);
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
  startmap(){
    console.log("Starting to map")
  }

  stopmap(){
    console.log("Stopping map")
  }

  restartmap(){
    console.log("Resetting map")
  }

  setpoint(){
    console.log("Setting start point")
  }

  render() {
    var canvasStyle = {
      width: config.MAP_DISPLAY_WIDTH + "px",
      height: config.MAP_DISPLAY_WIDTH + "px",
    };

    return (
      <div>
        <div className="button-wrapper">
          <button className="button" onClick={() => this.onGrabMap()}>Grab Map</button>
        </div>

        <div className="state-toggle-wrapper">
          <div className="toggle-wrapper">
            <span>Dark Mode:</span>
            <label className="switch">
              <input type="checkbox" onClick={() => this.onDarkMode()}/>
              <span className="slider round"></span>
            </label>
          </div>

          <div className="toggle-wrapper">
            <span>Mapping Mode:</span>
            <label className="switch">
              <input type="checkbox" onClick={() => this.onMappingMode()}/>
              <span className="slider round"></span>
            </label>
          </div>

          <div className="toggle-wrapper">
            <span>Drive Mode:</span>
            <label className="switch">
              <input type="checkbox" onClick={() => this.onDrivingMode()}/>
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        {this.state.mappingMode &&
          <div className="button-wrapper top-spacing">
            <button className="button start-color2" onClick={() => this.startmap()}>Start Mapping</button>
            <button className="button stop-color2" onClick={() => this.stopmap()}>Stop Mapping</button>
            <button className="button" onClick={() => this.restartmap()}>Restart Mapping</button>
            <button className="button" onClick={() => this.setpoint()}>Start Point</button>
          </div>
        }

        {this.state.drivingMode &&
          <div className="flex-container">
            <div className="button-wrapper flex-child" id = "drive5">
              <span>Speed: </span>
              <input type="range" min="1" max="100" value={this.state.speed}
                     onChange={(evt) => this.onSpeedChange(evt)}></input>
            </div>
            <div className="button-wrapper flex-child top-spacing">
              <button className="button start-color" id="drive6" onClick={() => this.driveControls.start()}>Start</button>
              <button className="button stop-color" id="drive7" onClick={() => this.driveControls.stop()}>Stop</button>
            </div>
            <div className="button-wrapper flex-child">
            <button className="button" id="drive8" onClick={() => this.driveControls.rotateLeft()}></button>
              <button className="button" id="drive1" onClick={() => this.driveControls.goStraight()}></button>
              <button className="button" id="drive9" onClick={() => this.driveControls.rotateRight()}></button>
              <div className="" >
                <button className="button" id="drive4" onClick={() => this.driveControls.moveLeft()}></button>
                <button className="button" id="drive3" onClick={() => this.driveControls.moveRight()}></button>
              </div>
              <button className="button" id="drive2" onClick={() => this.driveControls.goBack()}></button>
            </div>
          </div>
        }

        <div className="status-wrapper">
          <StatusMessage robotCell={this.pixelsToCell(this.state.x, this.state.y)} clickedCell={this.state.clickedCell}
                         showField={this.state.showField} fieldVal={this.state.fieldHoverVal}/>
          <ConnectionStatus status={this.state.connection}/>
        </div>

        <div className="canvas-container" id = "canvas" style={canvasStyle}>
          <DrawMap cells={this.state.cells} width={this.state.width} height={this.state.height} />
          <canvas ref="visitCellsCanvas" width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_WIDTH}>
          </canvas>
          <DrawCells loaded={this.state.mapLoaded} path={this.state.path} clickedCell={this.state.clickedCell}
                     goalCell={this.state.goalCell} goalValid={this.state.goalValid}
                     cellSize={this.state.cellSize} />
          <DrawRobot x={this.state.x} y={this.state.y} theta={this.state.theta}
                     pixelsPerMeter={this.state.pixelsPerMeter} />
          <canvas ref="clickCanvas" width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_WIDTH}
                  onMouseDown={(e) => this.handleMouseDown(e)}
                  onMouseMove={(e) => this.handleMouseMove(e)}
                  onMouseUp={() => this.handleMouseUp()}>
          </canvas>
        </div>
      </div>
    );
  }
}

export default MBotApp;
