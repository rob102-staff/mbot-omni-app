"""LCM type definitions
This file automatically generated by lcm.
DO NOT MODIFY BY HAND!!!!
"""

try:
    import cStringIO.StringIO as BytesIO
except ImportError:
    from io import BytesIO
import struct

class mbot_wheel_ctrl_t(object):
    __slots__ = ["utime", "left_motor_pwm", "right_motor_pwm", "left_motor_vel_cmd", "right_motor_vel_cmd", "left_motor_vel", "right_motor_vel"]

    __typenames__ = ["int64_t", "float", "float", "float", "float", "float", "float"]

    __dimensions__ = [None, None, None, None, None, None, None]

    def __init__(self):
        self.utime = 0
        self.left_motor_pwm = 0.0
        self.right_motor_pwm = 0.0
        self.left_motor_vel_cmd = 0.0
        self.right_motor_vel_cmd = 0.0
        self.left_motor_vel = 0.0
        self.right_motor_vel = 0.0

    def encode(self):
        buf = BytesIO()
        buf.write(mbot_wheel_ctrl_t._get_packed_fingerprint())
        self._encode_one(buf)
        return buf.getvalue()

    def _encode_one(self, buf):
        buf.write(struct.pack(">qffffff", self.utime, self.left_motor_pwm, self.right_motor_pwm, self.left_motor_vel_cmd, self.right_motor_vel_cmd, self.left_motor_vel, self.right_motor_vel))

    def decode(data):
        if hasattr(data, 'read'):
            buf = data
        else:
            buf = BytesIO(data)
        if buf.read(8) != mbot_wheel_ctrl_t._get_packed_fingerprint():
            raise ValueError("Decode error")
        return mbot_wheel_ctrl_t._decode_one(buf)
    decode = staticmethod(decode)

    def _decode_one(buf):
        self = mbot_wheel_ctrl_t()
        self.utime, self.left_motor_pwm, self.right_motor_pwm, self.left_motor_vel_cmd, self.right_motor_vel_cmd, self.left_motor_vel, self.right_motor_vel = struct.unpack(">qffffff", buf.read(32))
        return self
    _decode_one = staticmethod(_decode_one)

    _hash = None
    def _get_hash_recursive(parents):
        if mbot_wheel_ctrl_t in parents: return 0
        tmphash = (0x4d910a44f6e5643d) & 0xffffffffffffffff
        tmphash  = (((tmphash<<1)&0xffffffffffffffff) + (tmphash>>63)) & 0xffffffffffffffff
        return tmphash
    _get_hash_recursive = staticmethod(_get_hash_recursive)
    _packed_fingerprint = None

    def _get_packed_fingerprint():
        if mbot_wheel_ctrl_t._packed_fingerprint is None:
            mbot_wheel_ctrl_t._packed_fingerprint = struct.pack(">Q", mbot_wheel_ctrl_t._get_hash_recursive([]))
        return mbot_wheel_ctrl_t._packed_fingerprint
    _get_packed_fingerprint = staticmethod(_get_packed_fingerprint)

