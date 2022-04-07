import time
import sys
import lcm
sys.path.append("../")
from lcmtypes import omni_motor_command_t
from lcm_channel_names import MBOT_MOTOR_COMMAND_CHANNEL

lcm_instance = lcm.LCM(LCM_ADDRESS)
def motor_command_publisher(vx, vy, wz):
    cmd = omni_motor_command_t
    cmd.vx = vx 
    cmd.vy = vy 
    cmd.wz = wz 
    cmd.utime = time.time()
    lc.publish("MBOT_MOTOR_COMMAND", path_cmd.encode())

# TODO: create such function templates.
def other_publisher(): raise(Exception("Not Yet Implemented!"))