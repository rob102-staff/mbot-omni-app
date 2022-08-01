import lcm
from lcmtypes.omni_motor_command_t import omni_motor_command_t
from lcmtypes.occupancy_grid_t import occupancy_grid_t
from lcmtypes.particles_t import particles_t
from lcmtypes.pose_xyt_t import pose_xyt_t
from lcmtypes.exploration_status_t import exploration_status_t
from lcmtypes.reset_odometry_t import reset_odometry_t
from lcmtypes.mbot_state_t import mbot_state_t
from lcmtypes.lidar_t import lidar_t
from lcmtypes.planner_request_t import planner_request_t
from lcmtypes.robot_path_t import robot_path_t
from lcmtypes.mbot_system_reset_t import mbot_system_reset_t
from app import lcm_settings

import time
import sys
import threading
from copy import deepcopy



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
        ###################################

        self.__lcm_thread = threading.Thread(target=self.__run_handle_loop)
        self.__lcm_thread.start()


    def update_callback(self, channel, function):
        self._callback_dict[channel] = function
    
    def __subscribe(self, channel, handler):
        self.subscriptions.append(self._lcm.subscribe(channel, handler))

    def __run_handle_loop(self): 
        while True: 
            self._lcm.handle()
    
    def publish_motor_commands(self, vx, vy, wz):
        cmd = omni_motor_command_t()
        cmd.vx = vx; cmd.vy = vy; cmd.wz = wz 
        cmd.utime = int(time.time() * 1000)
        self._lcm.publish(lcm_settings.MBOT_MOTOR_COMMAND_CHANNEL, cmd.encode())
        print(f"published: {vx}, {vy}, {wz} to the channel {lcm_settings.MBOT_MOTOR_COMMAND_CHANNEL}")  # TODO: remove. For testing

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
    
    def publish_initial_pose(self, x, y, theta):
        pose = pose_xyt_t()
        pose.utime = int(time.time() * 1000)
        pose.x = x
        pose.y = y
        pose.theta = theta
        self._lcm.publish(lcm_settings.INITIAL_POSE_CHANNEL, pose.encode())

    def publish_slam_reset(self, mode, mapdata = None):
        slam_reset = mbot_system_reset_t()
        slam_reset.utime = int(time.time() * 1000)
        slam_reset.slam_mode = int(mode)

        if mapdata is not None:
            map_obj = occupancy_grid_t()
            map_obj.origin_x = float(mapdata['origin'][0])
            map_obj.origin_y = float(mapdata['origin'][1])
            map_obj.meters_per_cell = float(mapdata['meters_per_cell'])
            map_obj.width = int(mapdata['width'])
            map_obj.height = int(mapdata['height'])
            map_obj.num_cells = int(mapdata['num_cells'])
            for i in range(map_obj.num_cells):
                val = mapdata['cells'][i]
                if val==0.5:
                    updated_val = 0
                else:
                    updated_val = min(int((val*256)-128), 127)
                map_obj.cells.append(updated_val)
            slam_reset.map_obj = map_obj

        self._lcm.publish(lcm_settings.MBOT_SYSTEM_RESET, slam_reset.encode())

    def reset_odometry_publisher(self):
        cmd=reset_odometry_t()
        cmd.x=0.0
        cmd.y=0.0
        cmd.theta=0.0

        self._lcm.publish(lcm_settings.RESET_ODOMETRY_CHANNEL, cmd.encode())

    # TODO: Implement start mapping publisher. 
    def start_mapping_publisher(self): 
        raise(Exception("Not Yet Implemented!"))

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

    def __del__(self): 
        print("joined thread")
        self.__lcm_thread.join()
        for s in self.subscriptions: self._lcm.unsubscribe(s)