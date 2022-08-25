import sys
import signal
from app import app, socket, lcm_manager

EMIT_PERIOD = 0.1


def run():
    while True:
        try:
            # TODO: Use the non-blocking handle? Might help with killing the thread.
            lcm_manager.run()
        except:
            break
        socket.sleep(1e-3)


def emit_msgs():
    while True:
        lcm_manager.emit_msgs()
        socket.sleep(EMIT_PERIOD)


if __name__ == '__main__':
    # This script is called when you do `flask run`. In order to listen to
    # LCM, you will need to run a thread (or a scheduler) in the background
    # before calling run.
    socket.start_background_task(emit_msgs)
    socket.start_background_task(run)
    socket.run(app, host="0.0.0.0", port=5000)
