var config = {
    // Connection info.
    HOST: "localhost",
    PORT: 5000,
    ENDPOINT: "",
    CONNECT_PERIOD: 5000,     // ms

    // Sim info
    MAP_DISPLAY_WIDTH: 100,      // %
    MAP_DISPLAY_HEIGHT: 800,    // px
    ROBOT_SIZE: 0.274,         // m, diameter
    ROBOT_DEFAULT_SIZE: 100,  // px

    // Display info
    MAP_COLOUR_HIGH: "#00274C",        // Michigan blue
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
};

export default config;
