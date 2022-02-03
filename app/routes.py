import flask
from app import app

"""The routes module stores all the callback functions associated with each
endpoint that is exposed by the frontend. Add more here as needed (they must
start with '/app/'). For example, you might want to have a different endpoint
for drive commands, mapping commands, etc."""


@app.route("/app/motor_cmd", methods=['POST'])
def motors_cmd():
    # This is a dictionary containing the JSON data sent from the frontend.
    form_data = flask.request.get_json(force=True)

    if flask.request.method == 'POST':
        app.logger.info("Got message:", form_data)
        return {}, 200

    return {}, 200
