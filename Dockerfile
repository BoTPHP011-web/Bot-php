FROM fatedier/frps:v0.54.0
COPY frps.ini /etc/frp/frps.ini
ENTRYPOINT ["/usr/bin/frps","-c", "/etc/frp/frps.ini"]
