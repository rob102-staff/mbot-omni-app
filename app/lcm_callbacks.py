import time
import threading

class OccupancyGridEmiter():
    def __init__(self, socket, event_name, period):
        self.__socket           = socket
        self.__event_name       = event_name
        self.__period           = period
        self.__map_available    = False
        self.__map              = None

        self.__lock   = threading.Lock()
        self.__thread = threading.Thread(target=self.__run)
        self.__stop_thread = False
        self.__thread.start()

    def __lcm_map_to_dict(self):
        return {
            "utime" : self.__map.utime, 
            "origin" : [self.__map.origin_x , self.__map.origin_y],
            "meters_per_cell" : self.__map.meters_per_cell,
            "width" : self.__map.width,
            "height" : self.__map.height,
            "num_cells" : self.__map.num_cells,
            "cells" : self.__map.cells
        }

    def __run(self):
        while not self.__stop_thread:
            time.sleep(self.__period)
            if self.__map_available:
                self.__lock.acquire()
                self.__socket.emit(self.__event_name, self.__lcm_map_to_dict())
                self.__map_available = False
                self.__lock.release()

    def __call__(self, data):
        self.__lock.acquire()
        self.__map = data
        self.__map_available = True
        self.__lock.release()

    def __del__(self):
        self.__stop_thread = True
        self.__thread.join()