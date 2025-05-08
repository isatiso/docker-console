FROM node:22.2.0


COPY lib/ /root/node
COPY entrypoint.sh /root/

VOLUME /docker-console
WORKDIR /docker-console

ENV NDC_ENVIRONMENT=container

ENTRYPOINT ["/root/entrypoint.sh"]
