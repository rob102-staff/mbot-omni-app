import flask
from app import app, socket, lcm_manager
import json

@socket.on('connect')
def setup_connection():
    app.logger.info("Successfully connected!")

@socket.on('test')
def test_message(data):
    app.logger.info("The test message is received!!!")
    app.logger.info(data)
    socket.emit("message", json.dumps({'data':{'type':'server_test', 'server_test_key':'server_test_val'}}))

@socket.on('map')
def send_map(data):
    app.logger.info("Message received.")
    app.logger.info(data)

    try:
        with open("cropped_map_10-20-21.map","r") as fin:
            maplines = fin.readlines()
            socket.emit("map", json.dumps(maplines))
        return maplines
    except IOError:
        app.logger.info("Error. Cannot open file.")


@socket.on('plan')
def plan_cb(data):
    goal = data["goal"]
    plan = data["plan"]

    lcm_manager.publish_plan_data(goal, plan)

    app.logger.info(data)

@socket.on('reset')
def reset_slam(data):
    # Checks if the user wants to reset to localization mode (2) or reset Full SLAM
    if(data["mode"] == 2):
        lcm_manager.publish_slam_reset(data["mode"], data["map"])
    else:
        lcm_manager.publish_slam_reset(data["mode"])

@socket.on('move')
def test_message(data):
    spd = int(data["speed"])/100

    x = data["rx"]
    y = data["ry"]
    theta = data["theta"]

    lcm_manager.publish_motor_commands((x * spd), -(y * spd), -(2.5 * theta * spd))
        
    app.logger.info(data)
    
    #socket.emit("message", json.dumps({'data':{'type':'server_test', 'server_test_key':'server_test_val'}}))
    
@socket.on('stop')
def test_message(data):
    app.logger.info("STOP!!!")
    app.logger.info(data)
    lcm_manager.publish_motor_commands(0,0,0)

@socket.on('initial_pose')
def send_intial_pose(data):
    lcm_manager.publish_initial_pose(data['x'], data['y'], data['theta'])

