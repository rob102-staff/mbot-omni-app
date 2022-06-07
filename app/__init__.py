from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from app import lcm_settings
from app.lcm_manager import LcmCommunicationManager
from app.lcm_callbacks import LidarReader, OccupancyGridEmiter, PoseFinder

# The Flask app gets created here. Other Python functions and classes should be
# stored in the "src" folder.
app = Flask(__name__)
app.config['SECRET_KEY'] = 'development key'
socket = SocketIO(app , cors_allowed_origins='*')
CORS(app) 

lcm_callback_dict = {
    lcm_settings.SLAM_MAP_CHANNEL: OccupancyGridEmiter(socket, 'map', period=0.5),
    lcm_settings.LIDAR_CHANNEL: LidarReader(socket, 'lidar', period=0.5),
    lcm_settings.SLAM_POSE_CHANNEL: PoseFinder(socket, 'pose', period=0.5)
}

lcm_manager = LcmCommunicationManager(lcm_callback_dict)

from app import routes