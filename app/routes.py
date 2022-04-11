import flask
from app import app, socket
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
    except IOError:
        app.logger.info("Error. Cannot open file.")

    return maplines

@socket.on('move')
def test_message(data):
    app.logger.info("The test MOVEEEEE message is received!!!")
    app.logger.info(data)
    #socket.emit("message", json.dumps({'data':{'type':'server_test', 'server_test_key':'server_test_val'}}))

