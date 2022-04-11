from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from app.lcm_message_publishers import LcmCommunicationManager

# The Flask app gets created here. Other Python functions and classes should be
# stored in the "src" folder.
app = Flask(__name__)
app.config['SECRET_KEY'] = 'development key'
socket = SocketIO(app , cors_allowed_origins='*')
CORS(app) 

lcm_manager = LcmCommunicationManager()

from app import routes
