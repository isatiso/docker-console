FROM node:22.2.0

COPY lib/ /root/node
COPY package.json /root/node/
COPY yarn.lock /root/node/
COPY entrypoint.sh /root/
COPY .bashrc /root/.bashrc

WORKDIR /root/node

RUN yarn install --production --frozen-lockfile

VOLUME /docker-console
WORKDIR /docker-console

ENV NDC_ENVIRONMENT=container
ENV SHELL=/bin/bash
ENV FORCE_COLOR=1

ENTRYPOINT ["/root/entrypoint.sh"]
