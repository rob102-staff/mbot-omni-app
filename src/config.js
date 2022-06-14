let width_modifier = 0.95
let height_modifier = 0.85

var config = {
    // Connection info.
    HOST: "localhost",
    PORT: 5000,
    ENDPOINT: "",
    CONNECT_PERIOD: 5000,     // ms

    // Sim info
    MAP_DISPLAY_WIDTH: 800,      // px
    MAP_DISPLAY_HEIGHT: 800,    // px
    CANVAS_WIDTH_MODIFIER: width_modifier, // %
    CANVAS_HEIGHT_MODIFIER: height_modifier, // %
    CANVAS_DISPLAY_WIDTH: document.documentElement.clientWidth * width_modifier,      // px
    CANVAS_DISPLAY_HEIGHT: document.documentElement.clientHeight * height_modifier,    // px
    ROBOT_SIZE: 0.274,         // m, diameter
    ROBOT_DEFAULT_SIZE: 100,  // px

    // Display info
    MAP_COLOUR_HIGH: "#000000",      // Black
    //MAP_COLOUR_HIGH: "#00274C",        // Michigan blue
    MAP_COLOUR_LOW: "#ffffff",        // White
    FIELD_COLOUR_HIGH: "#444444",    // White
    FIELD_COLOUR_LOW: "#ffffff",    // Grey
    FIELD_ALPHA: "99",
    PATH_COLOUR: "#00B2A9",            // Taubman Teal
    VISITED_CELL_COLOUR: "#989C97",   // Angell Hall Ash
    CLICKED_CELL_COLOUR: "#FFCB05",  // Maize
    GOAL_CELL_COLOUR: "#00ff00",
    BAD_GOAL_COLOUR: "#ff0000",
    SMALL_CELL_SCALE: 0.8,
    CELL_SIZE: 4
};

export default config;