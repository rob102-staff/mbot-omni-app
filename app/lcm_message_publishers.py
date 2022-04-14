import time
import sys
import lcm
from lcmtypes.omni_motor_command_t import omni_motor_command_t
from lcmtypes.occupancy_grid_t import occupancy_grid_t
from lcmtypes.pose_xyt_t import pose_xyt_t
from lcmtypes.exploration_status_t import exploration_status_t
from lcmtypes.reset_odometry_t import reset_odometry_t
from lcmtypes.mbot_state_t import mbot_state_t
from app.lcm_settings import LCM_ADDRESS, MBOT_MOTOR_COMMAND_CHANNEL, SLAM_MAP_CHANNEL, ODOMETRY_CHANNEL, EXPLORATION_STATUS_CHANNEL, FULL_STATE_CHANNEL, RESET_ODOMETRY_CHANNEL
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
        self._lcm = lcm.LCM(LCM_ADDRESS)
        self.subscriptions = []
        self._callback_dict = callback_dict
        
        ###################################
        # TODO: VERIFY AND FIX - ENSURE DATA IS SAVED
        self.__subscribe(SLAM_MAP_CHANNEL, self.example_occupancy_grid_handler)
        self.__subscribe(ODOMETRY_CHANNEL, self.position_listener)
        self.__subscribe(EXPLORATION_STATUS_CHANNEL, self.exploration_status_listener)
        self.__subscribe(FULL_STATE_CHANNEL, self.mbot_state_listener)
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
        self._lcm.publish(MBOT_MOTOR_COMMAND_CHANNEL, cmd.encode())
        print(f"published: {vx}, {vy}, {wz} to the channel {MBOT_MOTOR_COMMAND_CHANNEL}")  # TODO: remove. For testing

    def reset_odometry_publisher(self):
        cmd=reset_odometry_t()
        cmd.x=0.0
        cmd.y=0.0
        cmd.theta=0.0

        self._lcm.publish(RESET_ODOMETRY_CHANNEL, cmd.encode())
        print("Resetted odometry.") # TODO: Remove. For testing.

    # TODO: Implement start mapping publisher. 
    def start_mapping_publisher(self): 
        raise(Exception("Not Yet Implemented!"))

    def position_listener(self, channel, data): 
        decoded_data=pose_xyt_t.decode(data)
        if channel in self._callback_dict.keys(): 
            self._callback_dict[channel](decoded_data)
        #print("Received pose!")  # TODO: remove

    def exploration_status_listener(self, channel, data): 
        decoded_data=exploration_status_t.decode(data)
        if channel in self._callback_dict.keys(): 
            self._callback_dict[channel](decoded_data)
        print("Received exploration status!")  # TODO: remove

    def mbot_state_listener(self, channel, data): 
        decoded_data=mbot_state_t.decode(data)
        if channel in self._callback_dict.keys(): 
            self._callback_dict[channel](decoded_data)
        print("Received full state!")  # TODO: remove
        
    # TODO: remove this. Only for testing.
    def publish_empty_grid(self):  
        g = occupancy_grid_t()
        self._lcm.publish(SLAM_MAP_CHANNEL, g.encode())

    # TODO: validate and fix! remove example from the name afterwards.
    def example_occupancy_grid_handler(self, channel, data):
        decoded_data = occupancy_grid_t.decode(data)
        if channel in self._callback_dict.keys(): 
            self._callback_dict[channel](decoded_data)
        print("Received map!")  # TODO: remove

    def __del__(self):
        print("joined thread")
        self.__lcm_thread.join()
        for s in self.subscriptions: self._lcm.unsubscribe(s)
