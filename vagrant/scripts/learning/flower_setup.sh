sudo apt-get update
sudo apt-get install -y unzip
sudo apt-get install -y python3-pip
#sudo apt-get install -y python3.8-venv
#sudo apt-get install -y python3.9 python3.9-venv python3.9-distutils

sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.9 python3.9-venv python3.9-dev python3.9-distutils

python3.9 -m venv ~/py39env
source ~/py39env/bin/activate

#echo "alias python=python3.9" >> ~/.bashrc
#echo "alias pip=pip3.9" >> ~/.bashrc
#echo "alias python3=python3.9" >> ~/.bashrc
#echo "alias pip3=pip3.9" >> ~/.bashrc
#echo "source ~/py39env/bin/activate" >> ~/.bashrc
#source ~/.bashrc

cp /vagrant/programs/flower.zip ~/flower.zip
unzip ~/flower.zip -d ~/
rm ~/flower.zip
#cd ~/flower

python -m venv ~/flower/venv-flwr-demo
source ~/flower/venv-flwr-demo/bin/activate
echo "source ~/flower/venv-flwr-demo/bin/activate" >> ~/.bashrc
pip install -r ~/flower/requirements.txt
pip uninstall -y tensorflow
pip install /vagrant/programs/tensorflow-2.7.1-cp39-cp39-linux_x86_64.whl
