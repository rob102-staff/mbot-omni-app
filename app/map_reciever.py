import lcm
from lcmtypes import occupancy_grid_t

#  TODO: receive map over LCM
#   - Use LCM logplayer to send a map. Subscribe to the appropriate channel
#   - Encode the map into a format that can be sent over websocket.

def grabMap(event):
    # Check to confirm that the channel is the right channel.
    if event.channel=="SLAM_MAP":
        # If so, grab the data and set it as a occupancy_grid_t LCM type.
        data=occupancy_grid_t.decode(event.data)

        # Now extract the data from the struct.
        utime=int(data.utime)
    
        origin_x=float(data.origin_x)
        origin_y=float(data.origin_y)
    
        meters_per_cell=int(data.meters_per_cell)
        width=int(data.width)
        height=int(data.height)
        num_cells=int(data.num_cells)
        
        cells=data.cells

        # Send it off for further processing.
        return utime, origin_x, origin_y, meters_per_cell, width, height, num_cells, cells

def mapToProperArray(event):
    # Check to confirm that the channel is the right channel.
    if event.channel=="SLAM_MAP":
        utime, origin_x, origin_y, meters_per_cell, width, height, num_cells, cells=grabMap(event)
        mapArray=[]

        mapArray.push(origin_x)
        mapArray.push(origin_y)
        mapArray.push(width)
        mapArray.push(height)
        mapArray.push(meters_per_cell)

        for cell in cells:
            mapArray.push(cell)

        return mapArray

lc = lcm.LCM()
subscription = lc.subscribe("EXAMPLE", grabMap)

try:
    while True:
        lc.handle()
except KeyboardInterrupt:
    pass

lc.unsubscribe(subscription)