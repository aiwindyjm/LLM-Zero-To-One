FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS node-runtime
FROM python:3.12-slim-bookworm@sha256:782412e85d0f0984994c290652577d4018aff08145c85b262bb63dc0c7522254 AS runtime
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && npm install --global pnpm@10.34.5 && pip install --no-cache-dir uv==0.12.17 && groupadd --gid 1000 node && useradd --uid 1000 --gid node --create-home node
WORKDIR /app
ENV LLM_CONTAINER=1 HOST=0.0.0.0 LLM_DATA_DIR=/data LLM_RUNNER_PYTHON=/opt/runner/bin/python UV_PROJECT_ENVIRONMENT=/opt/runner PYTHONDONTWRITEBYTECODE=1
COPY runner/pyproject.toml runner/uv.lock ./runner/
ARG RUNNER_PROFILE=cpu
RUN --mount=type=cache,target=/root/.cache/uv UV_HTTP_TIMEOUT=600 UV_CONCURRENT_DOWNLOADS=4 uv sync --project runner --python /usr/local/bin/python3 --extra ${RUNNER_PROFILE} --frozen --link-mode=copy
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources && apt-get -o Acquire::Retries=3 update && apt-get -o Acquire::Retries=3 install -y --no-install-recommends g++ make && rm -rf /var/lib/apt/lists/*
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile --store-dir=/pnpm/store
COPY --chown=node:node . .
RUN mkdir -p /data && chown node:node /data /app /app/node_modules /app/apps/web/node_modules

FROM runtime AS development
USER node
CMD ["pnpm", "dev"]

FROM runtime AS production
RUN pnpm build
USER node
EXPOSE 4310
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s CMD node -e "fetch('http://127.0.0.1:4310/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]
