import lcm

from mbot_lcm_msgs import omni_motor_command_t
from mbot_lcm_msgs import occupancy_grid_t
from mbot_lcm_msgs import particles_t
from mbot_lcm_msgs import pose_xyt_t
from mbot_lcm_msgs import exploration_status_t
from mbot_lcm_msgs import reset_odometry_t
from mbot_lcm_msgs import mbot_state_t
from mbot_lcm_msgs import lidar_t
from mbot_lcm_msgs import planner_request_t
from mbot_lcm_msgs import robot_path_t
from mbot_lcm_msgs import mbot_system_reset_t
# from mbot_lcm_msgs import costmap_t
from app import lcm_settings

import time
import sys
import threading


class LcmCommunicationManager:
    def __init__(self, callback_dict={}):
        '''
        Runs the lcm handler thread

        :param callback_dict: contains lcm channel names as keys and
            callback functions as values. The functions are called when
            a message on their corresponding channel is handled. The decoded
            data will be passed to the callback function.
        '''
        self._lcm = lcm.LCM(lcm_settings.LCM_ADDRESS)
        self.subscriptions = []
        self._callback_dict = callback_dict

        ###################################
        # TODO: VERIFY AND FIX - ENSURE DATA IS SAVED
        self.__subscribe(lcm_settings.SLAM_MAP_CHANNEL, self._occupancy_grid_listener)
        self.__subscribe(lcm_settings.ODOMETRY_CHANNEL, self._position_listener)
        self.__subscribe(lcm_settings.EXPLORATION_STATUS_CHANNEL, self._exploration_status_listener)
        self.__subscribe(lcm_settings.FULL_STATE_CHANNEL, self.mbot_state_listener)
        self.__subscribe(lcm_settings.LIDAR_CHANNEL, self.lidar_listener)
        self.__subscribe(lcm_settings.SLAM_POSE_CHANNEL, self.pose_listener)
        self.__subscribe(lcm_settings.CONTROLLER_PATH_CHANNEL, self.path_listener)
        self.__subscribe(lcm_settings.SLAM_PARTICLES_CHANNEL, self.particle_listener)
        # self.__subscribe(lcm_settings.COSTMAP_CHANNEL, self.obstacle_listener)
        ###################################

    def request_current_map(self):
        return self._callback_dict[lcm_settings.SLAM_MAP_CHANNEL].request_current_map()

    def request_map_update(self, cells):
        return self._callback_dict[lcm_settings.SLAM_MAP_CHANNEL].request_map_update(cells)

    def update_callback(self, channel, function):
        self._callback_dict[channel] = function

    def __subscribe(self, channel, handler):
        self.subscriptions.append(self._lcm.subscribe(channel, handler))

    def run(self):
        self._lcm.handle()

    def emit_msgs(self):
        for channel in self._callback_dict.keys():
            self._callback_dict[channel].emit()

    def publish_motor_commands(self, vx, vy, wz):
        cmd = omni_motor_command_t()
        cmd.vx = vx; cmd.vy = vy; cmd.wz = wz
        cmd.utime = int(time.time() * 1000)
        self._lcm.publish(lcm_settings.MBOT_MOTOR_COMMAND_CHANNEL, cmd.encode())

    def publish_plan_data(self, goal:pose_xyt_t, plan:bool):
        goal_pose = pose_xyt_t()
        goal_pose.utime = int(time.time() * 1000)
        goal_pose.x = float(goal[0])
        goal_pose.y = float(goal[1])
        goal_pose.theta = 0.0

        total_pose = planner_request_t()
        total_pose.utime = int(time.time() * 1000)
        total_pose.goal = goal_pose
        total_pose.require_plan = plan

        self._lcm.publish(lcm_settings.PATH_REQUEST, total_pose.encode())

    def publish_slam_reset(self, mode, map_file=None):
        slam_reset = mbot_system_reset_t()
        slam_reset.utime = int(time.time() * 1000)
        slam_reset.slam_mode = int(mode)
        if map_file is not None:
            slam_reset.slam_map_location = map_file

        self._lcm.publish(lcm_settings.MBOT_SYSTEM_RESET, slam_reset.encode())

    def reset_odometry_publisher(self):
        cmd=reset_odometry_t()
        cmd.x=0.0
        cmd.y=0.0
        cmd.theta=0.0

        self._lcm.publish(lcm_settings.RESET_ODOMETRY_CHANNEL, cmd.encode())

    def _position_listener(self, channel, data):
        decoded_data = pose_xyt_t.decode(data)
        if channel in self._callback_dict.keys():
            self._callback_dict[channel](decoded_data)

    def _exploration_status_listener(self, channel, data):
        decoded_data = exploration_status_t.decode(data)
        if channel in self._callback_dict.keys():
            self._callback_dict[channel](decoded_data)

    def mbot_state_listener(self, channel, data):
        decoded_data = mbot_state_t.decode(data)
        if channel in self._callback_dict.keys():
            self._callback_dict[channel](decoded_data)

    def _occupancy_grid_listener(self, channel, data):
        decoded_data = occupancy_grid_t.decode(data)
        if channel in self._callback_dict.keys():
            self._callback_dict[channel](decoded_data)

    # Temporarily remove. Unclear if this is published by botlab.
    # def obstacle_listener(self, channel, data):
    #     decoded_data = costmap_t.decode(data)
    #     if channel in self._callback_dict.keys():
    #         self._callback_dict[channel](decoded_data)

    def lidar_listener(self, channel, data):
        decoded_data = lidar_t.decode(data)
        if channel in self._callback_dict.keys():
            self._callback_dict[channel](decoded_data)

    def pose_listener(self, channel, data):
        decoded_data = pose_xyt_t.decode(data)
        if channel in self._callback_dict.keys():
            self._callback_dict[channel](decoded_data)

    def path_listener(self, channel, data):
        decoded_data = robot_path_t.decode(data)
        if channel in self._callback_dict.keys():
            self._callback_dict[channel](decoded_data)

    def particle_listener(self, channel, data):
        decoded_data = particles_t.decode(data)
        if channel in self._callback_dict.keys():
            self._callback_dict[channel](decoded_data)
