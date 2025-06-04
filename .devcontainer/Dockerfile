# Stage 1: Get Deno binary
FROM denoland/deno:bin AS deno
# Stage 2: Main development environment
FROM mcr.microsoft.com/devcontainers/base:debian
# Copy Deno binary from Stage 1
COPY --from=deno /deno /usr/local/bin/deno

ARG USERNAME=vscode
ARG DOCKER_GROUP_ID
RUN if [ -n "$DOCKER_GROUP_ID" ]; then \
      if getent group docker > /dev/null; then \
        groupmod -g $DOCKER_GROUP_ID docker; \
      else \
        groupadd --gid $DOCKER_GROUP_ID docker; \
      fi && \
      usermod -aG docker $USERNAME; \
    fi