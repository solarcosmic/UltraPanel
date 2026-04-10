# UltraPanel
A proof-of-concept game panel written in NodeJS that communicates with Docker.

<img width="1721" height="761" alt="Screenshot_20260411_001326" src="https://github.com/user-attachments/assets/084c5821-588d-46ce-80fe-3b210f23979e" />


## What's UltraPanel?
UltraPanel is a simple panel system that I wanted to work on to kind of experiment with how Docker works. It's in its very early stages, but check out what it can do!
- Spin up Minecraft servers
- Allow you to allocate ports
- Name servers
- Delete servers
- View console logs and run commands!
- Send power commands

## How to Run
1. Download the install script [here](https://github.com/solarcosmic/UltraPanel/blob/main/setup.sh) or in the [releases](https://github.com/solarcosmic/UltraPanel/releases) tab.
2. Run the script. If you would like a one-liner, for example:
```bash
wget https://raw.githubusercontent.com/solarcosmic/UltraPanel/refs/heads/main/setup.sh
sudo chmod +x setup.sh
sudo ./setup.sh
```
The above command downloads the script, provides valid permissions, then executes the setup script (which installs a few dependencies such as NodeJS and NPM, then Docker). You may need sudo permissions.

3. Your panel should be available at (your machine IP):3000! If you need to start the panel again, you should be able to use this command:

```bash
node /root/ultrapanel/index.js
```

**NOTE:** This is very much a proof-of-concept panel and should NOT be used commercially and may contain security concerns.
