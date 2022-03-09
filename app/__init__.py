from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

# The Flask app gets created here. Other Python functions and classes should be
# stored in the "src" folder.
app = Flask(__name__, static_folder='../../client/build/static')
app.config['SECRET_KEY'] = 'development key'
socket = SocketIO(app, cors_allowed_origins='*')
CORS(app)

from app import routes
