import flask
from app import app, socket
import json

"""The routes module stores all the callback functions associated with each
endpoint that is exposed by the frontend. Add more here as needed (they must
start with '/app/'). For example, you might want to have a different endpoint
for drive commands, mapping commands, etc."""

# TODO: Substitute this with socket if needed!
# @app.route("/app/motor_cmd", methods=['POST'])
# def motors_cmd():
#     # This is a dictionary containing the JSON data sent from the frontend.
#     form_data = flask.request.get_json(force=True)
#     if flask.request.method == 'POST':
#         app.logger.info("Got message:", form_data)
#         return {}, 200
#     return {}, 200

@socket.on('connect')
def setup_connection():
    app.logger.info("Successfully connected!")

@socket.on('test')
def test_message(data):
    app.logger.info("The test message is received!!!")
    app.logger.info(data)
    socket.emit("message", json.dumps({'data':{'type':'server_test', 'server_test_key':'server_test_val'}}))


# TODO: Set up Flask SocketIO to send data/images
#   - import and setup main functions.
#   - Send a number that increments every 5 seconds. Make sure the socket is not closing.
#   - Read an image from file, encode it and send it. 
#   - Now we can setup LCM

@socket.on('map')
def send_map(data):
    # if data=="Need Map. Please give.":
    #     app.logger.info("Request for map has been received.")
    #     fin = open("testing.map","r")
    #     maplines = fin.readlines()
    #     socket.emit("message", json.dumps({maplines}))

    app.logger.info("Message received.")
    app.logger.info(data)

    try:
        with open("cropped_map_10-20-21.map","r") as fin:
            maplines = fin.readlines()
            socket.emit("map", json.dumps(maplines))
    except IOError:
        app.logger.info("Error. Cannot open file.")

    return maplines

    # return json.dump({'map': [0, 0, 0, 0]}, 2)
