#!/bin/bash
# Install Script for UltraPanel v1.0 tested on Debian 13 Trixie
# If the install script fails, try copy and paste the commands manually

sudo apt update -y
sudo apt install git curl wget nodejs npm -y

curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

sudo mkdir /root
git clone https://github.com/solarcosmic/UltraPanel.git /root/ultrapanel

cd /root/ultrapanel
npm i

# Prerequisites
docker pull marctv/minecraft-papermc-server:latest
docker pull ghcr.io/pumpkin-mc/pumpkin:master

echo ==========
echo UltraPanel installed.
echo You can run UltraPanel by doing:
echo
echo "cd /root/ultrapanel && node index.js"
echo
echo ==========
sudo node index.js