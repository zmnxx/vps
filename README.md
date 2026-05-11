


在线管理 ufw


bash <(curl -Ls https://raw.githubusercontent.com/zmnxx/vps/main/ufw)

在线管理 docker nginx


bash <(curl -Ls https://raw.githubusercontent.com/zmnxx/vps/main/docker-nginx)


DD系统


curl -O https://raw.githubusercontent.com/bin456789/reinstall/main/reinstall.sh && \
bash reinstall.sh debian 12 \
--ssh-key "" \
--ssh-port 22

重启指令

reboot

重装完运行必要软件指令

apt update
apt upgrade -y

apt install -y vim htop unzip zip tar net-tools curl wget git nano ca-certificates gnupg lsb-release bash-completion