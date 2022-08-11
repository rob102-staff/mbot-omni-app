/*******************
 * DRAWING HELPERS
 *******************/

import config from "./config";

 function colourStringToRGB(colour_str) {
  var rgb = [parseInt(colour_str.substring(1, 3), 16),
             parseInt(colour_str.substring(3, 5), 16),
             parseInt(colour_str.substring(5, 7), 16)];
  return rgb;
}

function getColor(prob, colour_low, colour_high) {
  // Takes a probability (number from 0 to 1) and converts it into a color code
  var colour_low_a = colourStringToRGB(colour_low);
  var colour_high_a = colourStringToRGB(colour_high);

  var hex = function(x) {
    x = x.toString(16);
    return (x.length == 1) ? '0' + x : x;
  };

  var r = Math.ceil(colour_high_a[0] * prob + colour_low_a[0] * (1 - prob));
  var g = Math.ceil(colour_high_a[1] * prob + colour_low_a[1] * (1 - prob));
  var b = Math.ceil(colour_high_a[2] * prob + colour_low_a[2] * (1 - prob));

  var color = hex(r) + hex(g) + hex(b);
  return "#" + color;
}


class GridCellCanvas {
  constructor() {
    this.canvas = null;
    this.ctx = null;

    this.width = 0;
    this.height = 0;
    this.cellSize = 0;
  }

  init(canvas) {
    this.canvas = canvas;

    this.ctx = this.canvas.getContext('2d');
    this.ctx.transform(1, 0, 0, -1, 0, 0);
    this.ctx.transform(1, 0, 0, 1, 0, -this.canvas.width);

    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.cellSize = this.canvas.width / this.width;
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.cellSize = this.canvas.width / this.width;
  }

  getCellIdx(i, j) {
    return i + j * this.width;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawCell(cell, color, size = config.CELL_SIZE) {
    var i = cell[1];
    var j = cell[0];
    var start_x = i * size;
    var start_y = j * size;

    this.ctx.beginPath();
    this.ctx.fillStyle = color;
    this.ctx.fillRect(start_x, start_y, size, size);
  }

  drawCells(cells, prev_cells, colour_low, colour_high, alpha="ff") {

    // Bug: sometimes this happens for some reason. 
    if (cells.length !== this.width * this.height) {
      console.log("Error. Cannot render canvas: " + String(cells.length) + " != " + String(this.width*this.height));
      return;
    }
    for (var i = 0; i < this.width; i++) {
      for (var j = 0; j < this.height; j++) {
        var prob = cells[this.getCellIdx(i, j)];
        if (prob != prev_cells[this.getCellIdx(i, j)]){
          var color = getColor(prob, colour_low, colour_high);
          this.drawCell([j, i], color + alpha, this.cellSize);
        }
      }
    }
  }

  clearCell(cell, size) {
    var start_x = cell[1] * size;
    var start_y = cell[0] * size;

    this.ctx.clearRect(start_x, start_y, size, size);
  }

  drawLine(start_pos, end_pos, color = "red", line_width = 5) {
    this.ctx.beginPath();
    this.ctx.moveTo(start_pos[0], start_pos[1]);
    this.ctx.lineTo(end_pos[0], end_pos[1]);
    this.ctx.strokeStyle = color
    this.ctx.line_width = line_width;
    this.ctx.stroke();
  }

  drawLinesFromOrigin(start_pos, end_poses, color = "red", line_width = 5) {
    this.ctx.beginPath();
    for (var i = 0; i < end_poses.length; i++) {
      this.ctx.moveTo(start_pos[0], start_pos[1]);
      this.ctx.lineTo(end_poses[i][0], end_poses[i][1]);
    }
    this.ctx.strokeStyle = color
    this.ctx.line_width = line_width;
    this.ctx.stroke();
  }

  drawPath(path, robotPos, color = "rgb(255, 25, 25)", line_width = 5) {
    var pt1, pt2;

    for(let i = 0; i < path.length; i++) {  
      //Draws the point for the path
      this.ctx.beginPath();
      this.ctx.fillStyle = "rgb(255, 25, 25)";
      var start1 = posToPixels(path[i][0], path[i][1])
      this.ctx.arc(config.ROBOT_START_X + (start1[0]), 
                  (config.ROBOT_START_Y - (start1[1])), 
                   4, 0, 2 * Math.PI);

      //Draws a line between the points
      this.ctx.beginPath();
      // TODO: For this to work, need to use GridCellCanvas, which maintains
      // consistent transforms for the canvas. Use the drawPath() function.
      if(i==0){
        pt1 = this.posToPixels(this.state.x, this.state.y);
        pt2 = this.posToPixels(evt.path[i][0], evt.path[i][1]);
      }
      else{
        pt1 = this.posToPixels(evt.path[i-1][0], evt.path[i-1][1]);
        pt2 = this.posToPixels(evt.path[i][0], evt.path[i][1]);
      }

      this.ctx.moveTo(pt1[0], pt1[1]);
      this.ctx.lineTo(pt2[0], pt2[1]);

      this.ctx.line_width = line_width;
      this.ctx.strokeStyle = color
      this.ctx.stroke();
    }
  }

  drawCostMap (obstacleCells, color = "rgba(249, 79, 53, 0.35)"){
    for (let index = 0; index < obstacleCells[0].length; index++) {
      this.ctx.beginPath()
      this.ctx.strokeStyle = color;
      this.ctx.rect(obstacleCells[index][1], obstacleCells[index][0], 1, 1)
      this.ctx.stroke()
    }
  }

  drawParticles(particles, intensity = 20, color = 'green', size = 1){
    for (let index = 0; index < evt.num_particles; index+=intensity) {
      this.ctx.beginPath();
      this.ctx.arc(config.ROBOT_START_X + (particles[index][0]/this.state.metersPerCell), 
                   config.ROBOT_START_Y - (particles[index][1]/this.state.metersPerCell), 
                   size, 0, 2 * Math.PI)
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.lineWidth = size;
      this.ctx.strokeStyle = color;
      this.ctx.stroke();      
    }
  }
}

export { colourStringToRGB, getColor, GridCellCanvas };
