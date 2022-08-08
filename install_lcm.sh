#!/bin/sh
# Install LCM files.
PY_INSTALL_DIR=$(python -c "from distutils import sysconfig as sc; print(sc.get_python_lib())")

lcm-gen -p --ppath $PY_INSTALL_DIR lcmtypes/*.lcm
