LCM = lcm-gen
LCMTYPES_NAMES := $(shell ls *.lcm)
LCMTYPES_PY := $(LCMTYPES_NAMES:%.lcm=%.py)
ALL = $(LCMTYPES_PY)

all: $(ALL)

%.py: %.lcm
	$(LCM) -p  $<

clean: 
	rm *.py