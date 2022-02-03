from flask import Flask

# The Flask app gets created here. Other Python functions and classes should be
# stored in the "src" folder.
app = Flask(__name__)

from app import routes
