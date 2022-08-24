import flask
from app import app, socket, lcm_manager
import json
import time

@socket.on('connect')
def setup_connection():
    app.logger.info("Successfully connected!")


@socket.on('disconnect')
def setup_connection():
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
    if "map_file" in data.keys():
        map_file = data["map_file"]
    lcm_manager.publish_slam_reset(data["mode"], map_file)


@socket.on('move')
def move_robot(data):
    spd = int(data["speed"])/100

    x = data["rx"]
    y = data["ry"]
    theta = data["theta"]

    lcm_manager.publish_motor_commands((x * spd), -(y * spd), -(2.5 * theta * spd))

    app.logger.info(data)


@socket.on('stop')
def stop_robot(data):
    app.logger.info("STOP!!!")
    app.logger.info(data)
    lcm_manager.publish_motor_commands(0,0,0)

