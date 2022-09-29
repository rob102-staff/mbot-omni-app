import flask
from app import app, socket, lcm_manager, connection_manager
import json
import time

from flask import Flask, send_file, render_template

HOSTFILE = "/etc/hostname"


@socket.on('connect')
def setup_connection():
    connection_manager.connected = True
    app.logger.info("Successfully connected!")
    # Read the robot's host name.
    with open(HOSTFILE, 'r') as f:
        name = f.read()

    # Send the name to the front end.
    name = name.strip().upper()
    if len(name) > 0:
        socket.emit("hostname", {"name": name})
    return True

# @socket.on('hello')
# def hello():
#     print("djfl")

# @app.route('/mbot-bin/maps/current.map', methods=['GET', 'POST'])
# @app.route('/download')
# def download():
#     path = "/mbot-bin/maps/current.map"
#     return send_file(path, as_attachment=True)
#     # uploads = os.path.join(current_app.root_path, app.config['UPLOAD_FOLDER'])
#     # return send_from_directory(directory=uploads, filename=filename)

# @app.route('/mbot-bin/maps/current.map', methods=['GET', 'POST'])
# def download():
#     filename = "hello.map"
#     # Appending app path to upload folder path within app root folder
#     uploads = os.path.join(current_app.root_path, app.config['../../mbot-bin/maps/current.map'])
#     # Returning file from appended path
#     return send_from_directory(directory=uploads, filename=filename)

@socket.on('disconnect')
def setup_connection():
    connection_manager.connected = False
    app.logger.info("Disconnected!")


@socket.on('request_map')
def request_map():
    app.logger.info("Returning current map.")
    return lcm_manager.request_current_map()


@socket.on('request_map_update')
def request_map_update(data):
    app.logger.info("Updating map")
    return lcm_manager.request_map_update(data["cells"])


@socket.on('plan')
def plan_cb(data):
    goal = data["goal"]
    plan = data["plan"]

    lcm_manager.publish_plan_data(goal, plan)

    app.logger.info(data)


@socket.on('reset')
def reset_slam(data):
    map_file = None
    retain_pose = False if "retain_pose" not in data.keys() else data["retain_pose"]
    if "map_file" in data.keys():
        map_file = data["map_file"]
    lcm_manager.publish_slam_reset(data["mode"], map_file, retain_pose)


@socket.on('move')
def move_robot(data):
    lcm_manager.publish_motor_commands(data["vx"], data["vy"], data["wz"])

    app.logger.info(data)


@socket.on('stop')
def stop_robot(data):
    app.logger.info("STOP!!!")
    app.logger.info(data)
    lcm_manager.publish_motor_commands(0,0,0)

