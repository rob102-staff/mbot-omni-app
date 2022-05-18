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


@socket.on('move')
def test_message(data):
    spd = int(data["speed"])/100
    print(spd)

    if data["direction"] == "N":
        lcm_manager.publish_motor_commands((spd),0,0)
    if data["direction"] == "E":
        lcm_manager.publish_motor_commands(0,(spd),0)
    if data["direction"] == "S":
        lcm_manager.publish_motor_commands(-(spd),0,0)
    if data["direction"] == "W":
        lcm_manager.publish_motor_commands(0,-(spd),0)
    if data["direction"] == "spinleft":
        lcm_manager.publish_motor_commands(0,0,(2*spd))
    if data["direction"] == "spinright":
        lcm_manager.publish_motor_commands(0,0,-(2*spd))
        
    app.logger.info(data)
    
    #socket.emit("message", json.dumps({'data':{'type':'server_test', 'server_test_key':'server_test_val'}}))
    
@socket.on('stop')
def test_message(data):
    app.logger.info("STOP!!!")
    app.logger.info(data)
    lcm_manager.publish_motor_commands(0,0,0)

