FROM revmischa/janus:1.2

# bootstrap environment
ENV CONFIG_PATH="/root/janus/etc/janus"

# config files
ADD config/janus.cfg $CONFIG_PATH/
ADD config/janus.plugin.streaming.cfg $CONFIG_PATH/
ADD config/janus.transport.http.cfg $CONFIG_PATH/

CMD ["/root/janus/bin/janus"]
