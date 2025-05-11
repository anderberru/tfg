sudo apt-get update
sudo apt-get install -y unzip
sudo apt install python3-pip
sudo apt install python3.8-venv

cp /vagrant/programs/flower.zip ~/flower.zip
unzip ~/flower.zip -d ~/flower
rm ~/flower.zip
cd ~/flower

python3 -m venv venv-flwr-demo
source venv-flwr-demo/bin/activate
pip3 install -r requirements.txt
