from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

# The Flask app gets created here. Other Python functions and classes should be
# stored in the "src" folder.
app = Flask(__name__)
app.config['SECRET_KEY'] = 'development key'  # TODO: Verify necessity of this key
socket = SocketIO(app , cors_allowed_origins='*')
CORS(app)  # TODO: Verify necessity of CORS while using localhost

from app import routes
