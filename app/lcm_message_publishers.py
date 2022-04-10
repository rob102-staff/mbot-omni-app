import time
import sys
import lcm
sys.path.append("../")
from lcmtypes import omni_motor_command_t
from lcmtypes import occupancy_grid_t
from lcmtypes import pose_xyt_t
from lcmtypes import exploration_status_t
from lcmtypes import reset_odometry_t
from lcmtypes import mbot_state_t
# from lcm_channel_names import MBOT_MOTOR_COMMAND_CHANNEL

lcm_instance = lcm.LCM(LCM_ADDRESS)
def motor_command_publisher(vx, vy, wz):
    cmd = omni_motor_command_t
    cmd.vx = vx 
    cmd.vy = vy 
    cmd.wz = wz 
    cmd.utime = time.time()

    lc=lcm_instance.LCM()
    lc.publish("MBOT_MOTOR_COMMAND", cmd.encode())

def position_listener(channel, data): 
    lcmdata=pose_xyt_t.decode(data)

    utime=lcmdata.utime
    x=lcmdata.x
    y=lcmdata.y
    theta=lcmdata.theta

    return utime, x, y, theta

def map_listener(channel, data): 
    lcmdata=occupancy_grid_t.decode(data)

    utime=int(lcmdata.utime)
    origin_x=float(lcmdata.origin_x)
    origin_y=float(lcmdata.origin_y)
    meters_per_cell=int(lcmdata.meters_per_cell)
    width=int(lcmdata.width)
    height=int(lcmdata.height)
    num_cells=int(lcmdata.num_cells)
    cells=lcmdata.cells

    return utime, origin_x, origin_y, meters_per_cell, width, height, num_cells, cells

def exploration_status_listener(channel, data):
    lcmdata=exploration_status_t.decode(data)

    # STATE_INITIALIZING = 0
    # STATE_EXPLORING_MAP = 1
    # STATE_RETURNING_HOME = 2
    # STATE_COMPLETED_EXPLORATION = 3
    # STATE_FAILED_EXPLORATION = 4

    # STATUS_IN_PROGRESS = 0
    # STATUS_COMPLETE = 1
    # STATUS_FAILED = 2

    utime=lcmdata.utime
    team_number=lcmdata.team_number
    state=lcmdata.state
    status=lcmdata.status

    return utime, team_number, state, status

def reset_odometry_publisher():
    cmd=reset_odometry_t
    cmd.x=0.0
    cmd.y=0.0
    cmd.theta=0.0

    lc=lcm_instance.LCM()
    lc.publish("RESET_ODOMETRY", cmd.encode())

def mbot_state_listener(channel, data):
    lcmdata=mbot_state_t.decode(data)

    full_state=["utime", "x", "y", "theta", "tb_angles", "accel", "gyro", "mag", "temp", "last_yaw", "left_encoder_delta", "right_encoder_delta", "left_encoder_total", "right_encoder_total", "fwd_velocity", "turn_velocity", "left_velocity", "right_velocity", "left_cmd", "right_cmd"]

    "fwd_velocity", "turn_velocity", "left_velocity", "right_velocity", "left_cmd", "right_cmd"
    utime=lcmdata.utime
    x=lcmdata.x
    y=lcmdata.y
    theta=lcmdata.theta
    tb_angles=lcmdata.tb_angles
    accel=lcmdata.acel
    gyro=lcmdata.gyro
    mag=lcmdata.mag
    temp=lcmdata.temp
    last_yaw=lcmdata.last_yaw
    left_encoder_delta=lcmdata.last_encoder_delta
    right_encoder_delta=lcmdata.right_encoder_delta
    left_encoder_total=lcmdata.left_encoder_delta
    right_encoder_total=lcmdata.right_encoder_total
    fwd_velocity=lcmdata.fwd_velocity
    turn_velocity=lcmdata.turn_velocity
    left_velocity=lcmdata.left_velocity
    right_velocity=lcmdata.right_velocity
    left_cmd=lcmdata.left_cmd
    right_cmd=lcmdata.right_cmd

    return utime, x, y, theta, tb_angles, accel, gyro, mag, temp, last_yaw, left_encoder_delta, right_encoder_delta, left_encoder_total, right_encoder_total, fwd_velocity, turn_velocity, left_velocity, right_velocity, left_cmd, right_cmd
    

def start_mapping_publisher(): raise(Exception("Not Yet Implemented!"))
