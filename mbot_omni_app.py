import sys
import signal
from app import app, socket, lcm_manager


def run():
    while True:
        # TODO: Use the non-blocking handle?
        lcm_manager.run()
        socket.sleep(1e-3)


def emit_msgs():
    while True:
        # TODO: Use the non-blocking handle?
        lcm_manager.emit_msgs()
        socket.sleep(0.5)


if __name__ == '__main__':
    # This script is called when you do `flask run`. In order to listen to
    # LCM, you will need to run a thread (or a scheduler) in the background
    # before calling run.
    socket.start_background_task(emit_msgs)
    socket.start_background_task(run)
    socket.run(app, host="0.0.0.0", port=5000)
