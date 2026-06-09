FROM docker.io/library/node:26-slim

RUN npm install -g typescript typescript-language-server svelte-language-server

CMD ["bash"]

# podman run -dit --name uc-dev --replace --pid=host -v /home/greyecho/Repos/UnrequitedEcho/Unrequited-Colors:/home/greyecho/Repos/UnrequitedEcho/Unrequited-Colors -p 5173:5173 -w /home/greyecho/Repos/UnrequitedEcho/Unrequited-Colors uc-dev-img
# podman exec -i uc-dev npm run dev -- --host