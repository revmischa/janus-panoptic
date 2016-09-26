TCP_PORTS = 7088 8088 7889 8089 8188 7188
UDP_PORTS = 5009

fwd_tcp := $(shell PORT_FORWARD=""; for port in $(TCP_PORTS); do PORT_FORWARD="$$PORT_FORWARD -p 0.0.0.0:$$port:$$port"; done; echo $$PORT_FORWARD)
fwd_udp := $(shell PORT_FORWARD=""; for port in $(UDP_PORTS); do PORT_FORWARD="$$PORT_FORWARD -p 0.0.0.0:$$port:$$port/udp"; done; echo $$PORT_FORWARD)
fwd := $(fwd_tcp) $(fwd_udp)

TEMPLATE_NAME ?= janus-panoptic

run: image
	docker run -ti $(fwd) -t $(TEMPLATE_NAME)

daemon: image
	docker run -d $(fwd) -t $(TEMPLATE_NAME)

ports:
	@ echo "forward $(fwd)"

shell: image
	docker run -a stdin -a stdout -i -t $(TEMPLATE_NAME) /bin/bash

image:
	docker build -t $(TEMPLATE_NAME) .

stop:
	docker ps | grep janus | cut -f1 -d' ' | xargs docker stop

serve:
	cd www && python -m SimpleHTTPServer

s3 s3upload:
	aws s3 sync --region us-west-2 www/ s3://live.hard.chat/

# centos:
# sudo yum -y install http://li.nux.ro/download/nux/dextop/el7/x86_64/nux-dextop-release-0-5.el7.nux.noarch.rpm
# sudo yum -y install gstreamer1-plugins-good gstreamer1-plugins-ugly
GST_DST ?= 127.0.0.1
gst-demo:
	gst-launch-1.0 \
	videotestsrc ! \
	video/x-raw,width=640,height=480,framerate=20/1 ! \
	videoscale ! videorate ! videoconvert ! timeoverlay ! \
	x264enc tune=zerolatency ! queue ! rtph264pay config-interval=1 ! udpsink host=$(GST_DST) port=5009