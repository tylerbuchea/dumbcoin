FROM node:6

VOLUME /dumbcoin

WORKDIR /dumbcoin

ENTRYPOINT node bin/dumbcoin.js

EXPOSE 3001