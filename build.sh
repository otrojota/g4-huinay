VERSION=0.05
docker buildx build --push --platform linux/amd64,linux/arm64 -t docker.homejota.net/hs/portal:latest -t docker.homejota.net/hs/portal:$VERSION .
