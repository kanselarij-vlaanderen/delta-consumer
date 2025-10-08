FROM semtech/mu-javascript-template:1.9.1
LABEL maintainer="redpencil.io <info@redpencil.io>"

ENV LOG_SPARQL_ALL=false
ENV DEBUG_AUTH_HEADERS=false

ENV DCR_WAIT_FOR_INITIAL_SYNC=false
ENV DCR_DISABLE_INITIAL_SYNC=true
ENV DCR_DELTA_FILE_FOLDER=/delta-files
ENV DCR_KEEP_DELTA_FILES=true
ENV DOWNLOAD_SHARE_LINKS=true
