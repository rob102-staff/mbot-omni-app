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

