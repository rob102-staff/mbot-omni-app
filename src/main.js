import React from "react";
import ReactDOM from "react-dom";

import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

import config from "./config.js";
import { WSHelper } from "./web.js";
import { parseMapFromSocket, normalizeList } from "./map.js";
import { colourStringToRGB, getColor, GridCellCanvas } from "./drawing.js"

// Global Variables
let drive_check = 0;

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
 *   ALGO SELECT
 *******************/

function AlgoForm(props) {
  var menu_items = [];
  var key, value;
  for (const algo in config.ALGO_TYPES)
  {
    var data = config.ALGO_TYPES[algo];
    menu_items.push(<MenuItem value={algo} key={data.label}>{data.name}</MenuItem>);
  }
  return (
    <FormControl className="algo-form">
      <InputLabel id="select-algo-label">Algorithm</InputLabel>
      <Select
        labelId="select-algo-label"
        id="select-algo"
        value={props.value}
        onChange={props.onChange}
      >
        {menu_items}
      </Select>
    </FormControl>
  );
}

/*******************
 *     ROBOT
 *******************/

class DrawRobot extends React.Component {
  constructor(props) {
    super(props);

    this.robotCanvas = null;
    this.robotCtx = null;

    this.robotPos = [config.MAP_DISPLAY_WIDTH / 2, config.MAP_DISPLAY_WIDTH / 2];
    this.robotSize = config.ROBOT_DEFAULT_SIZE;
    this.robotAngle = 0;

    this.robotImage = new Image(config.ROBOT_DEFAULT_SIZE, config.ROBOT_DEFAULT_SIZE);
    this.robotImage.src = '../assets/mbot.png';
  }

  componentDidMount() {
    this.robotCanvas = this.refs.robotCanvas;

    this.robotCtx = this.robotCanvas.getContext('2d');
    this.robotCtx.transform(1, 0, 0, -1, 0, 0);
    this.robotCtx.transform(1, 0, 0, 1, 0, -this.robotCanvas.width);

    // Apply the current transform since it will be cleared when first drawn.
    this.robotCtx.translate(this.robotPos[0], this.robotPos[1]);
    this.robotCtx.rotate(this.robotAngle);
  }

  drawRobot() {
    // Clear the robot position.
    this.robotCtx.clearRect(-this.robotSize / 2, -this.robotSize / 2, this.robotSize, this.robotSize);

    // Reset the canvas since the last draw.
    this.robotCtx.rotate(-this.robotAngle);
    this.robotCtx.translate(-this.robotPos[0], -this.robotPos[1]);

    if (this.props.loaded) {
      // this updates position
      this.robotPos = [this.props.x, this.props.y];
      this.robotSize = config.ROBOT_SIZE * this.props.pixelsPerMeter;
      this.robotAngle = this.props.theta;
    }

    this.robotCtx.translate(this.robotPos[0], this.robotPos[1]);
    this.robotCtx.rotate(this.robotAngle);

    // TODO: Scale the image once instead of every time.
    this.robotCtx.drawImage(this.robotImage, -this.robotSize / 2, -this.robotSize / 2, this.robotSize, this.robotSize);
  }

  componentDidUpdate() {
    this.drawRobot();
  }

  render() {
    return (
      <canvas ref="robotCanvas" width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_WIDTH}>
      </canvas>
    );
  }
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

class DrawField extends React.Component {
  constructor(props) {
    super(props);

    this.fieldGrid = new GridCellCanvas();
  }

  componentDidMount() {
    this.fieldGrid.init(this.refs.fieldCanvas);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.field !== this.props.field || nextProps.showField !== this.props.showField;
  }

  componentDidUpdate() {
    if (this.props.showField) {
      this.fieldGrid.setSize(this.props.width, this.props.height);
      this.fieldGrid.drawCells(this.props.field, config.FIELD_COLOUR_LOW, config.FIELD_COLOUR_HIGH, config.FIELD_ALPHA);
    }
    else {
      this.fieldGrid.clear();
    }
  }

  render() {
    return (
      <canvas ref="fieldCanvas" width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_WIDTH}>
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
      x: config.MAP_DISPLAY_WIDTH / 2,
      y: config.MAP_DISPLAY_WIDTH / 2,
      theta: 0,
      mapfile: null,
      path: [],
      clickedCell: [],
      goalCell: [],
      goalValid: true,
      field: [],
      fieldRaw: [],
      fieldHoverVal: 0,
      showField: false,
      isRobotClicked: false,
      algo: 'PFIELD'
    };

    this.ws = new WSHelper(config.HOST, config.PORT, config.ENDPOINT, config.CONNECT_PERIOD);
    this.ws.userHandleMessage = (evt) => { this.handleMessage(evt); };
    this.ws.statusCallback = (status) => { this.updateSocketStatus(status); };
    this.ws.userHandleMap = (evt) => { this.handleMap(evt); };

    this.visitGrid = new GridCellCanvas();
  }

  anExamplePost() {
    this.ws.socket.emit("test", {'test_key': "test_value"});
  }

  askForMap() {
    this.ws.socket.emit("map", {'test_key': "Need map. Please give."});
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

  componentDidMount() {
    this.visitGrid.init(this.refs.visitCellsCanvas);

    // Get the window size and watch for resize events.
    this.rect = this.refs.clickCanvas.getBoundingClientRect();
    window.addEventListener('resize', (evt) => this.handleWindowChange(evt));
    window.addEventListener('scroll', (evt) => this.handleWindowChange(evt));

    // Try to connect to the C++ backend.
    this.ws.attemptConnection();
  }

  handleMap(mapmsg) {
    var map=parseMapFromSocket(mapmsg)
    console.log("Parsed map.")
    this.updateMap(map);
    

  }

  handleMessage(msg) {
    console.log(msg)
    return msg
  }

  handleWindowChange(evt) {
    this.rect = this.refs.clickCanvas.getBoundingClientRect();
  }

  handlePath(msg) {
    this.setState({path: msg.path});
    this.i = 0;
    this.interval = setInterval(this.timer.bind(this), 100);
  }

  handleCells(msg) {
    this.visitGrid.drawCell(msg.cell, this.state.cellSize,
                            config.VISITED_CELL_COLOUR, config.SMALL_CELL_SCALE);
  }

  handleField(msg) {
    var rawField = msg.field.slice();
    this.setState({ field: normalizeList(msg.field), fieldRaw: rawField });
  }

  updateSocketStatus(status) {
    if (this.state.connection !== status) {
      this.setState({connection: status});
    }
  }

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
  };

  onMapClick(event) {
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
      this.onMapClick(event);
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

  timer() {
    var length = this.state.path.length;
    if(length > this.i) {
      //move robot to the next spot
      this.findDirection();
      this.i = this.i + 1;
    }
    else {
      clearInterval(this.interval);
    }
  }

  findDirection(){
    var newCoord = this.posToPixels(this.state.path[this.i][1], this.state.path[this.i][0]);
    if (newCoord[0] == this.state.x && newCoord[1] == this.state.y) return;
    this.setState({x: newCoord[0], y: newCoord[1]});
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

  onFieldCheck() {
    this.setState({showField: !this.state.showField});
  }

  handleAlgoSelect(event) {
    this.setState({algo: event.target.value});
  }

  onMapCheck() {
    const map_buttons = ["map1", "map2", "map3", "map4", "map5"];

    var checkBox = document.getElementById("myCheck");
    if (checkBox.checked == true){
      console.log("hello");
      for (let index = 0; index < map_buttons.length; index++) {
        const element = map_buttons[index];
        const e = document.getElementById(element);
        e.classList.remove("vis");
      }

    }
    else
    {
      for (let index = 0; index < map_buttons.length; index++) {
        const element = map_buttons[index];
        const e = document.getElementById(element);
        e.classList.add("vis")
      }
    }
    this.setState({showField: !this.state.showField});
  }

  onDriveCheck() {
    const map_buttons = ["drive1", "drive2", "drive3", "drive4", "drive5", "drive6", "drive7", "drive8", "drive9"];

    var checkBox = document.getElementById("myDrive");
    if (checkBox.checked == true){
      console.log("hello");
      for (let index = 0; index < map_buttons.length; index++) {
        const element = map_buttons[index];
        const e = document.getElementById(element);
        e.classList.remove("vis");
        }
      drive_check = 1;
    }
    else
    {
      for (let index = 0; index < map_buttons.length; index++) {
        const element = map_buttons[index];
        const e = document.getElementById(element);
        e.classList.add("vis")
      }
      drive_check = 0;
    }
  }
  
  onRange() {
    var slider = document.getElementById("myRange");
    var output = document.getElementById("demo");
    output.innerHTML = slider.value;
  }

  turnLeft(){
    console.log("Go left");
    const e = document.getElementById("drive4");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    //this.ws.socket.emit("test", {'test_key': "test_value"});
    this.ws.socket.emit("move", {'direction': "W"});
  }

  turnRight(){
    console.log("Go right");
    const e = document.getElementById("drive3");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    //this.ws.socket.emit("test", {'test_key': "test_value"});
    this.ws.socket.emit("move", {'direction': "E"});
  }

  angleLeft(){
    console.log("Left turn by 20 degrees");
    const e = document.getElementById("drive8");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    // this.ws.socket.emit("test", {'test_key': "test_value"});
    this.ws.socket.emit("move", {'direction': "spinleft"});
  }

  angleRight(){
    console.log("Right turn by 20 degrees");
    const e = document.getElementById("drive9");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    // this.ws.socket.emit("test", {'test_key': "test_value"});
    this.ws.socket.emit("move", {'direction': "spinright"});
  }

  goStraight(){
    console.log("Go forwards");
    const e = document.getElementById("drive1");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    this.ws.socket.emit("move", {'direction': "N"});
  }

  goBack(){
    console.log("Go back");
    const e = document.getElementById("drive2");
    e.classList.add("dbutton-animation")
    setTimeout(function(){
      e.classList.remove("dbutton-animation");
    }, 500)
    // this.ws.socket.emit("test", {'test_key': "test_value"});
    this.ws.socket.emit("move", {'direction': "S"});
  }

  goStart(){
    console.log("Start robot");
    const e = document.getElementById("drive6");
    e.classList.add("startbtn-animation")
    setTimeout(function(){
      e.classList.remove("startbtn-animation");
    }, 1000)
    // this.ws.socket.emit("test", {'test_key': "test_value"});
  }

  goStop(){
    console.log("STOP robot it was about run into Popeye");
    const e = document.getElementById("drive7");
    e.classList.add("stopbtn-animation")
    setTimeout(function(){
      e.classList.remove("stopbtn-animation");
    }, 1000)
    // this.ws.socket.emit("test", {'test_key': "test_value"});
    this.ws.socket.emit("stop", {'stop cmd': document.getElementById("myRange").value});
  }

  darkMode(){

    const map_buttons = ["drive1", "drive2", "drive3", "drive4", "drive8", "drive9"];

    var checkBox = document.getElementById("myDark");
    var canvas = document.getElementById("canvas");
    if (checkBox.checked == true){
      document.body.classList.add("new-background-color");
      canvas.classList.add("white-border")

      for (let index = 0; index < map_buttons.length; index++) {
        const element = map_buttons[index];
        const e = document.getElementById(element);
        e.classList.add("invert");
      }
    }else{
      document.body.classList.remove("new-background-color");
      canvas.classList.remove("white-border")
      
      for (let index = 0; index < map_buttons.length; index++) {
        const element = map_buttons[index];
        const e = document.getElementById(element);
        e.classList.remove("invert");      
      }
    }
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
          {/* This button is an example (not part of the original webapp) which sends a POST to the Flask server. */}
          <button className="button" onClick={() => this.askForMap()}>Grab Map</button>
          <button className="button" onClick={() => console.log(this.state)}>Check State</button>
        </div>

        <div className="button-wrapper top-spacing">
          <div className="field-toggle-wrapper top-spacing">
          <span>Dark Mode</span>
            <label className="switch">
              <input type="checkbox" id="myDark" onClick={() => this.darkMode()}/>
              <span className="slider round"></span>
            </label>
            <span className = "left-space">Mapping Mode</span>
            <label className="switch">
              <input type="checkbox" id="myCheck" onClick={() => this.onMapCheck()}/>
              <span className="slider round"></span>
            </label>
            <span className = "left-space">Drive Mode</span>
            <label className="switch">
              <input type="checkbox" id="myDrive" onClick={() => this.onDriveCheck()}/>
              <span className="slider round"></span>
            </label>
          </div>
          
          <button className="button vis start-color2" id= "map1" onClick={() => this.startmap()}>Start Mapping</button>
          <button className="button vis stop-color2" id= "map2" onClick={() => this.stopmap()}>Stop Mapping</button>
          <button className="button vis" id= "map3" onClick={() => this.restartmap()}>Restart Mapping</button>
          <button className="button vis" id= "map5" onClick={() => this.setpoint()}>Start Point</button>

          <button className="button vis" id= "map4" onClick={() => this.anExamplePost()}>Send Map</button>
        </div>

        <div className="top-and-bottom-space"></div>


        <div className="flex-container">
          <div className="button-wrapper flex-child vis" id = "drive5">
            <p id="">Current speed: <span id="demo">50</span></p>
            <input type="range" min="1" max="100" value="50" id="myRange" onInput={() => this.onRange()}></input>
          </div>
          <div className="button-wrapper flex-child top-spacing s">
            <button className="button start-color vis" id= "drive6" onClick={() => this.goStart()}>Start</button>
            <button className="button stop-color vis" id= "drive7" onClick={() => this.goStop()}>Stop</button>
          </div>
          <div className="button-wrapper flex-child">
          <button className="button vis" id= "drive8" onClick={() => this.angleLeft()}></button>
            <button className="button vis" id= "drive1" onClick={() => this.goStraight()}></button>
            <button className="button vis" id= "drive9" onClick={() => this.angleRight()}></button>
            <div className="" >
              <button className="button  vis" id= "drive4" onClick={() => this.turnLeft()}></button>
              <button className="button vis" id= "drive3" onClick={() => this.turnRight()}></button>
            </div>
            <button className="button  vis" id= "drive2" onClick={() => this.goBack()}></button>
          </div>
        </div>


        <div className="status-wrapper">
          <div className="field-toggle-wrapper">
            <span>Show Field:</span>
            <label className="switch">
              <input type="checkbox" onClick={() => this.onFieldCheck()}/>
              <span className="slider round"></span>
            </label>
          </div>
          <StatusMessage robotCell={this.pixelsToCell(this.state.x, this.state.y)} clickedCell={this.state.clickedCell}
                         showField={this.state.showField} fieldVal={this.state.fieldHoverVal}/>
          <ConnectionStatus status={this.state.connection}/>
        </div>

        <div className="canvas-container" id = "canvas" style={canvasStyle}>
          <DrawMap cells={this.state.cells} width={this.state.width} height={this.state.height} />
          <DrawField field={this.state.field} showField={this.state.showField}
                     width={this.state.width} height={this.state.height} />
          <canvas ref="visitCellsCanvas" width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_WIDTH}>
          </canvas>
          <DrawCells loaded={this.state.mapLoaded} path={this.state.path} clickedCell={this.state.clickedCell}
                     goalCell={this.state.goalCell} goalValid={this.state.goalValid}
                     cellSize={this.state.cellSize} />
          <DrawRobot x={this.state.x} y={this.state.y} theta={this.state.theta}
                     loaded={this.state.mapLoaded} pixelsPerMeter={this.state.pixelsPerMeter}
                     posToPixels={(x, y) => this.posToPixels(x, y)} />
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

// TODO: Discuss what other modes will enable drive control. Currently the key presses active only when the drive toggle is toggled on.
document.addEventListener('keydown', (event) => {
  var name = event.key;
  const p = new MBotApp;
  if(drive_check == 1){
    if (name == "a") p.turnLeft();
    if (name == "d") p.turnRight();
    if (name == "s") p.goBack();
    if (name == "w") p.goStraight();
    if (name == "q") p.angleLeft();
    if (name == "e") p.angleRight();
    if (name == "z") p.goStart();
    if (name == "x") p.goStop();
  }
}, false);

ReactDOM.render(
  <MBotApp />,
  document.getElementById('app-root')
);

