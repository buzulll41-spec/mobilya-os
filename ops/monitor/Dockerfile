FROM alpine:3.20

RUN apk add --no-cache curl jq

COPY monitor.sh /usr/local/bin/monitor.sh
RUN chmod +x /usr/local/bin/monitor.sh

CMD ["/usr/local/bin/monitor.sh"]
