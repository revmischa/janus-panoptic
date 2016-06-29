FROM https://github.com/revmischa/docker-janus.git

# bootstrap environment
ENV CONFIG_PATH="/root/janus/etc/janus"

ADD config/janus.plugin.streaming.cfg $CONFIG_PATH/
ADD config/janus.plugin.transport.http.cfg $CONFIG_PATH/

CMD ["/root/janus/bin/janus"]
