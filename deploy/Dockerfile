FROM node:22.2.0

WORKDIR /root/node

COPY lib/ /root/node

VOLUME /docker-console

ENTRYPOINT ["node", "index.js", "start"]
