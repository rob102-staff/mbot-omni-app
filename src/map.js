/*******************
 * MAP HELPERS
 *******************/

function parseMapFromSocket(data) {
  var map = {};
  var datacells = [];
  var count = 0;

  for (let line of data.split(" ")) {
    if (line!="\n") {
      datacells.push(parseFloat(line.replace("[", "").replace("]", "").replace('"', '').replace("\\n", "")));
      count++;
    }
  }

  map.origin = [parseFloat(datacells.shift()), parseFloat(datacells.shift())];
  map.width = parseFloat(datacells.shift());
  map.height = parseFloat(datacells.shift());
  map.meters_per_cell = parseFloat(datacells.shift());
  map.num_cells = map.width * map.height;

  map.cells = normalizeList(datacells);

  if (map.cells.length!=map.width*map.height) {

  }

  return map;
}

function parseMapFromLcm(msg){
  var map = {};
  map.origin = msg["origin"]
  map.width = msg["width"]
  map.height = msg["height"]
  map.meters_per_cell = msg["meters_per_cell"]
  map.num_cells = msg["num_cells"]
  map.cells = normalizeList(msg["cells"])
  return map
}


function normalizeList(list) {
  if (list.length < 1) return list;
  if (list.length === 1) return [1];

  // Find min and max values.
  // Note: Using JavaScript's Math.min(...) and Math.min(...) causes issues if
  // the array is too big to unpack.
  var min_val = list[0];
  var max_val = list[0];

  for (var i = 1; i < list.length; i++) {
    min_val =  list[i] < min_val ? list[i] : min_val;
    max_val =  list[i] > max_val ? list[i] : max_val;
  }

  // Normalize the values.
  for (var i = 0; i < list.length; i++) {
    list[i] = (list[i] - min_val) / (max_val - min_val);
  }

  return list;
}

export { parseMapFromSocket, parseMapFromLcm, normalizeList };
